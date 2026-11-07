import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createDefaultState } from '../core.js';

// Optional real-layout regression. Point these at isolated test dependencies;
// never attach to the user's browser or the running Harness page.
// CHEN_SCROLL_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs
// CHEN_SCROLL_REACT_UMD_DIR=/absolute/path/to/node_modules (React 18 UMD)
// CHEN_SCROLL_BROWSER=/absolute/path/to/chrome-headless-shell (optional)
const configured = process.env.CHEN_SCROLL_PLAYWRIGHT && process.env.CHEN_SCROLL_REACT_UMD_DIR;
const clientPath = fileURLToPath(new URL('../client.js', import.meta.url));

const fixture = `<!doctype html><html><head><style>
html,body{height:100%;margin:0}body{overflow:hidden;font:14px Arial,sans-serif;
--dsw-alias-bg-base:#f7f8fa;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#eee;
--dsw-alias-label-primary:#17202a;--dsw-alias-label-secondary:#637080;
--dsw-alias-border-l1:#dce0e5;--dsw-alias-brand-primary:#486ea7;
--dsw-alias-state-success-primary:#409875;--dsw-alias-state-warn-primary:#ad8030}
#host{height:100%;overflow:auto}#host-header{height:72px}#slot{height:calc(100vh - 72px);display:flex;flex-direction:column;min-height:0}#root{height:100%;min-height:0;display:flex;flex-direction:column}#host-tail{height:240px}
</style></head><body><div id="host"><div id="host-header">Isolated host fixture</div><div id="slot"><div id="root"></div></div><div id="host-tail"></div></div></body></html>`;

async function mount(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const state = createDefaultState();
  const calls = [], errors = [];
  const notes = Array.from({ length: 30 }, (_, i) => ({
    id: `fixture-note-${i}`, content: `Fixture note ${i}\n${'A paragraph for real browser layout.\n'.repeat(12)}`,
    createdAt: Date.now() - i * 3600000, updatedAt: Date.now() - i * 3600000,
    tags: ['fixture'], url: 'https://flomoapp.com', contentTruncated: false, files: [],
  }));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON();
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: fixture });
    if (url.pathname === '/api/chen-home' && route.request().method() === 'GET') return route.fulfill({ json: state });
    if (url.pathname === '/api/chen-home/notes' && body?.action === 'list') {
      calls.push(body);
      return route.fulfill({ json: { configured: true, notes, hasMore: false, nextBefore: null, syncedAt: Date.now() } });
    }
    if (url.pathname.startsWith('/api/chen-home/assets') || url.hostname === 'www.google.com') return route.fulfill({ status: 404, body: '' });
    errors.push(`Unexpected request: ${route.request().method()} ${url.pathname}`);
    return route.abort();
  });
  await page.goto('https://chen-home.test/');
  await page.addScriptTag({ path: join(process.env.CHEN_SCROLL_REACT_UMD_DIR, 'react/umd/react.development.js') });
  await page.addScriptTag({ path: join(process.env.CHEN_SCROLL_REACT_UMD_DIR, 'react-dom/umd/react-dom.development.js') });
  await page.evaluate(() => {
    const dictionaries = {}, snapshot = { active: 'en' };
    window.__wheelEvents = [];
    document.addEventListener('wheel', (event) => window.__wheelEvents.push({ trusted: event.isTrusted, deltaY: event.deltaY }), { passive: true });
    const ctx = {
      effect: (effect) => effect(),
      locale: { register: (namespace, locale, messages) => { dictionaries[locale] = messages; }, subscribe: () => () => {}, getSnapshot: () => snapshot, bind: () => (key) => dictionaries.en?.[key] || key },
      uiWorkspace: { startSession: () => { throw new Error('No session actions in scroll tests'); } },
      slots: { inject: (name, register) => register(), register: (options, component) => { if (options.name === 'main') window.__main = component; } },
    };
    window.__ModuleLoader__ = { load: ({ factory }) => factory((name) => { if (name !== 'react') throw new Error(name); return window.React; }).apply(ctx) };
  });
  await page.addScriptTag({ path: clientPath });
  await page.evaluate(() => window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(window.__main)));
  await page.getByRole('button', { name: 'Write a note', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.ch-note-card').length === 30);
  return { page, context, calls, errors };
}

async function metrics(page) {
  return page.evaluate(() => {
    const home = document.querySelector('.ch-home'), host = document.getElementById('host');
    const input = document.querySelector('.ch-note-input'), rect = input.getBoundingClientRect(), homeRect = home.getBoundingClientRect();
    return { top: home.scrollTop, max: home.scrollHeight - home.clientHeight, host: host.scrollTop, document: document.scrollingElement.scrollTop, height: home.clientHeight, homeTop: homeRect.top, inputTop: rect.top, inputBottom: rect.bottom, active: document.activeElement.className, horizontal: home.scrollWidth - home.clientWidth };
  });
}

async function wheel(page, deltaY) {
  const box = await page.locator('.ch-home').boundingBox();
  await page.mouse.move(box.x + box.width - 24, Math.max(100, box.y + box.height / 2));
  await page.mouse.wheel(0, deltaY);
  // Wheel scrolling is asynchronous in Chromium. Sample after compositor frames.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  await page.waitForTimeout(80);
}

async function showTab(page, name) {
  // Arrange only the plugin's scroll offset; clicks below are real browser input.
  const previousOffset = await page.evaluate(() => {
    const home = document.querySelector('.ch-home'), nav = document.querySelector('.ch-viewbar');
    home.scrollTop += nav.getBoundingClientRect().top - home.getBoundingClientRect().top - 24;
    return home.scrollTop;
  });
  await page.locator('.ch-view-tabs').getByRole('button', { name, exact: true }).click();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return previousOffset;
}

test('production Home scroll behavior in an isolated headless browser', { skip: configured ? false : 'Set CHEN_SCROLL_PLAYWRIGHT and CHEN_SCROLL_REACT_UMD_DIR for real browser regression', timeout: 60000 }, async (t) => {
  const { chromium } = await import(pathToFileURL(process.env.CHEN_SCROLL_PLAYWRIGHT).href);
  const browser = await chromium.launch({ headless: true, ...(process.env.CHEN_SCROLL_BROWSER ? { executablePath: process.env.CHEN_SCROLL_BROWSER } : {}) });
  t.after(() => browser.close());
  for (const viewport of [{ width: 1440, height: 900 }, { width: 960, height: 700 }, { width: 390, height: 844 }]) {
    await t.test(`${viewport.width}px: wheel works and does not scroll an ancestor at either boundary`, async () => {
      const { page, context, calls, errors } = await mount(browser, viewport);
      try {
        await showTab(page, 'Notes timeline');
        await page.locator('.ch-home').evaluate((home) => { home.scrollTop = 0; });
        await wheel(page, 400);
        const middle = await metrics(page);
        assert.ok(middle.top > 100, `Wheel should move production root: ${JSON.stringify(middle)}`);
        assert.equal(middle.host, 0);
        await page.locator('.ch-home').evaluate((home) => { home.scrollTop = home.scrollHeight; });
        await wheel(page, 600);
        const bottom = await metrics(page);
        assert.equal(bottom.host, 0, `Bottom wheel escaped plugin: ${JSON.stringify(bottom)}`);
        await page.locator('.ch-home').evaluate((home) => { home.scrollTop = 0; });
        await page.locator('#host').evaluate((host) => { host.scrollTop = 40; });
        await wheel(page, -600);
        const top = await metrics(page);
        assert.equal(top.host, 40, `Top wheel escaped plugin: ${JSON.stringify(top)}`);
        assert.equal(top.document, 0);
        assert.equal(top.horizontal, 0);
        assert.ok(await page.evaluate(() => window.__wheelEvents.some((event) => event.trusted && event.deltaY !== 0)));
        assert.ok(calls.every((call) => call.action === 'list'));
        assert.deepEqual(errors, []);
        t.diagnostic(`${viewport.width}px wheel: middle=${middle.top}, bottom=${bottom.top}/${bottom.max}, ancestors unchanged`);
      } finally { await context.close(); }
    });
    await t.test(`${viewport.width}px: ordinary tab switches do not repeat a previous record action`, async () => {
      const { page, context } = await mount(browser, viewport);
      try {
        await page.getByRole('button', { name: 'Write a note', exact: true }).click();
        await page.waitForFunction(() => document.activeElement.classList.contains('ch-note-input'));
        await page.locator('#host').evaluate((host) => { host.scrollTop = 0; });
        await showTab(page, 'Workspace');
        await showTab(page, 'Notes timeline');
        const active = await page.locator('.ch-view-tabs .ch-selected').evaluate((button) => ({ isFocused: button === document.activeElement, actual: document.activeElement.className }));
        assert.equal(active.isFocused, true, `A plain tab click repeated record focus: ${JSON.stringify(active)}`);
      } finally { await context.close(); }
    });
    await t.test(`${viewport.width}px: record focus stays local; view switching preserves draft and scroll`, async () => {
      const { page, context, errors } = await mount(browser, viewport);
      try {
        await page.getByRole('button', { name: 'Write a note', exact: true }).click();
        await page.waitForFunction(() => document.activeElement.classList.contains('ch-note-input'));
        const record = await metrics(page);
        assert.equal(record.host, 0, `Record action scrolled host: ${JSON.stringify(record)}`);
        assert.equal(record.document, 0);
        assert.ok(record.inputTop >= record.homeTop && record.inputBottom <= record.homeTop + record.height, `Composer must be visible: ${JSON.stringify(record)}`);
        await page.locator('.ch-note-input').fill('Unsaved fixture draft');
        const previousOffset = await showTab(page, 'Workspace');
        await showTab(page, 'Notes timeline');
        assert.equal(await page.locator('.ch-view-tabs .ch-selected').evaluate((button) => button === document.activeElement), true, 'A plain tab click must not repeat the previous record focus');
        assert.equal(await page.locator('.ch-note-input').inputValue(), 'Unsaved fixture draft');
        const returned = await metrics(page);
        assert.ok(Math.abs(returned.top - previousOffset) <= 1, `Notes scroll position changed from ${previousOffset} to ${returned.top}`);
        assert.equal(returned.host, 0);
        assert.deepEqual(errors, []);
        t.diagnostic(`${viewport.width}px record: root=${record.top}, host=${record.host}, textarea=${record.inputTop}..${record.inputBottom}`);
      } finally { await context.close(); }
    });
  }
});
