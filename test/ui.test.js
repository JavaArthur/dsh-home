import test from 'node:test';
import assert from 'node:assert/strict';
import { browserConfigured, launchBrowser, mountHome } from './ui-harness.js';

// These tests execute client.js and core.js. Every request is intercepted in an
// isolated context; no Host data or real Flomo business writes are possible.
test('refined production Home interactions in an isolated browser', { skip: !browserConfigured }, async (t) => {
  const browser = await launchBrowser();
  t.after(() => browser.close());
  async function fixture(options) { const ui = await mountHome(browser, options); t.after(() => ui.close()); return ui; }
  async function notes(page) { await page.locator('.ch-view-tabs button').nth(1).click(); await page.locator('.ch-note-input').waitFor(); }

  await t.test('mobile summary reaches timer without moving the document; both themes fit', async () => {
    for (const theme of ['light', 'dark']) {
      const { page, errors } = await fixture({ width: 375, height: 812, theme });
      assert.equal(await page.locator('.ch-home').evaluate((el) => el.scrollWidth - el.clientWidth), 0);
      const top = await page.locator('[data-card="tasks"]').evaluate((el) => el.getBoundingClientRect().top);
      assert.ok(top < 600, `Tasks should begin in the mobile viewport, got ${top}`);
      await page.locator('.ch-summary-focus').click();
      const position = await page.evaluate(() => ({ scroll: document.querySelector('.ch-home').scrollTop, outer: window.scrollY, focus: document.activeElement.closest('.ch-timer-actions') !== null }));
      assert.ok(position.scroll > 0); assert.equal(position.outer, 0); assert.equal(position.focus, true);
      assert.deepEqual(errors, []);
    }
  });

  await t.test('task creation/completion and timer pause survive an actual page reload', async () => {
    const ui = await fixture({ empty: true }); const { page } = ui;
    await page.locator('.ch-taskform input').fill('隔离测试：完成作品草稿');
    await page.locator('.ch-taskform button').click();
    await page.waitForFunction(() => document.querySelectorAll('.ch-task').length === 1);
    const task = ui.state().tasks[0]; assert.equal(task.title, '隔离测试：完成作品草稿');
    await page.locator('.ch-task-ops button').first().click();
    await page.waitForFunction(() => document.querySelector('.ch-timer-actions button').textContent.includes('暂停'));
    const id = ui.state().timer.id; assert.equal(ui.state().timer.taskId, task.id);
    await page.clock.fastForward(12000);
    await page.locator('.ch-timer-actions button').first().click();
    await page.waitForFunction(() => document.querySelector('.ch-timer-actions button').textContent.includes('继续'));
    assert.equal(ui.state().timer.status, 'paused'); assert.equal(ui.state().timer.id, id);
    const remaining = ui.state().timer.remainingMs;
    assert.ok(remaining <= 1488000 && remaining > 1480000, `remaining=${remaining}`);
    await ui.reload();
    assert.equal(await page.locator('.ch-task-title').textContent(), task.title);
    assert.match(await page.locator('.ch-timer-actions button').first().textContent(), /继续/);
    assert.equal(ui.state().timer.remainingMs, remaining);
    await page.locator('.ch-check').click();
    await page.waitForFunction(() => document.querySelector('.ch-task-foot').textContent.includes('已完成 (1)'));
    assert.equal(ui.state().tasks[0].done, true); assert.deepEqual(ui.errors, []);
  });

  await t.test('failed dashboard save retains task draft and persisted state, then recovers', async () => {
    const ui = await fixture(); const { page, controls } = ui; const count = ui.state().tasks.length;
    controls.homeFailure = true;
    await page.locator('.ch-taskform input').fill('保留这条尚未保存的输入');
    await page.locator('.ch-taskform button').click();
    await page.locator('.ch-banner[role="alert"]').waitFor();
    assert.equal(ui.state().tasks.length, count);
    assert.equal(await page.locator('.ch-taskform input').inputValue(), '保留这条尚未保存的输入');
    controls.homeFailure = false;
    await page.locator('.ch-taskform button').click();
    await page.waitForFunction(() => document.querySelector('.ch-taskform input').value === '');
    assert.equal(ui.state().tasks.length, count + 1); assert.deepEqual(ui.errors, []);
  });

  await t.test('in-flight Flomo write lock persists before send and through a real reload', async () => {
    const ui = await fixture(); const { page } = ui; let createCount = 0, release;
    await page.route('**/api/dsh-home/notes', async (route) => {
      if (route.request().postDataJSON()?.action !== 'create') return route.fallback();
      createCount++;
      // Never forward to Flomo. Hold the request across navigation to reproduce
      // the ambiguous window where the remote service could already have saved.
      await new Promise((resolve) => { release = async () => { try { await route.abort(); } catch {} finally { resolve(); } }; });
    });
    await notes(page);
    await page.locator('.ch-note-input').fill('隔离测试的未确认草稿');
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1')));
    await page.locator('.ch-note-save').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1')).uncertain === true);
    assert.equal(createCount, 1);
    const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1')));
    assert.equal(pending.requestId, before.requestId); assert.ok(pending.uncertainAfter > 0);
    await ui.reload(); await release(); await notes(page);
    assert.equal(await page.locator('.ch-note-input').inputValue(), before.content);
    assert.equal(await page.locator('.ch-note-input').isDisabled(), true);
    assert.equal(await page.locator('.ch-note-save').isDisabled(), true);
    assert.match(await page.locator('.ch-note-feedback[role="alert"]').textContent(), /保存结果尚不确定/);
    // The reload performed an unfiltered read, but only explicit acknowledgement
    // unlocks editing. It never silently repeats the create.
    await page.getByRole('button', { name: '我已核对，继续编辑', exact: true }).click();
    assert.equal(await page.locator('.ch-note-input').isDisabled(), false);
    assert.equal(createCount, 1);
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1')))).requestId, before.requestId);
    await page.locator('.ch-note-input').fill('核对后修改的草稿');
    assert.notEqual((await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1')))).requestId, before.requestId);
    assert.deepEqual(ui.errors, []);
  });

  await t.test('a failed pre-send draft lock never sends Flomo; storage recovery allows one save', async () => {
    const ui = await fixture(); const { page } = ui; let createCount = 0;
    await page.route('**/api/dsh-home/notes', async (route) => {
      const action = route.request().postDataJSON();
      if (action?.action !== 'create') return route.fallback();
      createCount++;
      return route.fulfill({ json: { note: { id: 'fixture-receipt-only', content: action.content, tags: [], files: [], createdAt: Date.parse('2026-11-08T09:30:00+08:00') } } });
    });
    await notes(page);
    await page.locator('.ch-note-input').fill('磁盘仍有草稿但下一次锁写入失败');
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1')));
    await page.evaluate(() => {
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'dsh-home:flomo-draft:v1') throw new DOMException('fixture quota failure', 'QuotaExceededError'); return window.__originalSetItem.call(this, key, value); };
    });
    await page.locator('.ch-note-save').click();
    await page.waitForFunction(() => document.querySelector('.ch-note-feedback[role="alert"]')?.textContent.includes('本次尚未发送'));
    assert.equal(createCount, 0);
    assert.equal(await page.locator('.ch-note-input').inputValue(), before.content);
    assert.equal(await page.locator('.ch-note-input').isDisabled(), false);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-home:flomo-draft:v1'))), before);
    await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
    await page.locator('.ch-note-save').click();
    await page.locator('.ch-note-success').waitFor();
    assert.equal(createCount, 1);
    assert.equal(await page.locator('.ch-note-input').inputValue(), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('dsh-home:flomo-draft:v1')), null);
    assert.equal(await page.locator('[data-note-id="fixture-receipt-only"]').count(), 1);
    assert.deepEqual(ui.errors, []);
  });

  await t.test('empty, no-results and fetch failure stay distinct and keep the composer usable', async () => {
    const ui = await fixture({ empty: true }); const { page } = ui;
    await notes(page);
    assert.match(await page.locator('.ch-notes-empty').textContent(), /这里还没有笔记/);
    await page.locator('.ch-note-input').fill('切换与失败都不应该抹掉');
    await page.locator('.ch-notes-search input').fill('不会匹配的词');
    await page.locator('.ch-notes-search button').click();
    await page.waitForFunction(() => document.querySelector('.ch-notes-empty').textContent.includes('没有找到'));
    ui.controls.notesFailure = true;
    await page.locator('.ch-notes-toolbar > button').click();
    await page.locator('.ch-notes-error[role="alert"]').waitFor();
    assert.equal(await page.locator('.ch-notes-empty').count(), 0);
    assert.equal(await page.locator('.ch-note-input').inputValue(), '切换与失败都不应该抹掉');
    assert.equal(await page.locator('.ch-note-input').isDisabled(), false);
    assert.deepEqual(ui.errors, []);
  });

  await t.test('initial loading and connection error provide recoverable states', async () => {
    const loading = await fixture({ delayed: true });
    await loading.page.locator('.ch-loading[aria-busy="true"] [role="status"]').waitFor();
    assert.equal(await loading.page.locator('.ch-topbar').count(), 0);
    loading.controls.delayed = false; loading.controls.release();
    await loading.page.locator('.ch-topbar').waitFor();
    const failed = await fixture({ homeFailure: true });
    await failed.page.locator('.ch-loading [role="alert"]').waitFor();
    failed.controls.homeFailure = false;
    await failed.page.locator('.ch-loading button').click();
    await failed.page.locator('.ch-topbar').waitFor();
    assert.deepEqual([...loading.errors, ...failed.errors], []);
  });

  await t.test('background dialog skips hidden upload input, traps focus and restores its trigger', async () => {
    const { page, errors } = await fixture();
    const trigger = page.locator('.ch-topbar button[aria-label="换背景"]');
    await trigger.click(); await page.locator('[role="dialog"]').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.getClientRects().length > 0), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[role="dialog"]').count(), 0);
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
    assert.equal(await page.evaluate(() => window.scrollY), 0); assert.deepEqual(errors, []);
  });
});
