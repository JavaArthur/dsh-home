import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, createHomeService, HomeStateSchema } from '../core.js';
import { createHomeFetchHandler, createHomeTool, HOME_TOOL_PARAMETERS } from '../index.js';

function setup(state) {
  let stored = structuredClone(state);
  return { get: () => stored, set: async (value) => { stored = value; } };
}

test('legacy v0.1 data gains wallpaper defaults without losing tasks, sort or timer', async () => {
  const old = createDefaultState();
  delete old.settings.background;
  delete old.settings.backgroundRotation;
  delete old.settings.backgroundLibrary;
  old.revision = 36;
  old.tasks.push({ id: 'user-task', title: 'Personal task', area: '生活', done: true, createdAt: 1234 });
  old.layout = ['focus', 'tasks', 'rhythm', 'projects'];
  old.timer.status = 'paused'; old.timer.remainingMs = 10000;
  const storage = setup(old);
  const service = createHomeService(storage);
  const current = await service.run({ action: 'get' });
  assert.deepEqual(current.settings.background, { type: 'ocean', url: '', dim: 24 });
  assert.deepEqual(current.settings.backgroundRotation, { mode: 'off', intervalMinutes: 30, lastChangedAt: 0 });
  assert.deepEqual(current.settings.backgroundLibrary, []);
  assert.deepEqual(current.tasks, old.tasks);
  assert.deepEqual(current.layout, old.layout);
  assert.deepEqual(current.timer, old.timer);
  assert.equal(current.revision, 36);
  const after = await service.run({ action: 'settings.update', settings: { background: { type: 'forest', url: '', dim: 35 } } });
  assert.equal(after.revision, 37);
  assert.deepEqual(after.tasks, old.tasks);
  assert.deepEqual(after.focusLog, old.focusLog);
  assert.deepEqual((await createHomeService(storage).run({ action: 'get' })).settings.background, after.settings.background);
});

test('unrelated settings edits retain the selected wallpaper', async () => {
  const service = createHomeService(setup(createDefaultState()));
  await service.run({ action: 'settings.update', settings: { background: { type: 'dusk', url: '', dim: 40 } } });
  const next = await service.run({ action: 'settings.update', settings: { dailyGoal: 6 } });
  assert.deepEqual(next.settings.background, { type: 'dusk', url: '', dim: 40 });
});

test('custom wallpaper accepts https or owned upload references, rejects unsafe and oversized data', async () => {
  const service = createHomeService(setup(createDefaultState()));
  for (const url of ['https://example.com/photo.jpg', '/api/dsh-home/wallpaper?id=' + 'a'.repeat(64)]) {
    await service.run({ action: 'settings.update', settings: { background: { type: 'custom', url, dim: 20 } } });
  }
  for (const url of ['', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'file:///etc/passwd', 'http://example.com/a', 'https://name:secret@example.com/a', '/api/other']) {
    await assert.rejects(service.run({ action: 'settings.update', settings: { background: { type: 'custom', url, dim: 20 } } }), error => error.status === 400);
  }
  for (const dim of [-1, 81, 0.5]) await assert.rejects(service.run({ action: 'settings.update', settings: { background: { type: 'ocean', url: '', dim } } }));
});

function rotationFixture(initial = createDefaultState(), initialTime = Date.parse('2026-11-08T12:00:00+08:00')) {
  let stored = structuredClone(initial);
  let clock = initialTime;
  let writes = 0;
  let failNext = false;
  const adapter = {
    get: () => structuredClone(stored),
    set: async (value) => {
      await Promise.resolve();
      if (failNext) { failNext = false; throw new Error('disk full'); }
      stored = structuredClone(value); writes += 1;
    },
    now: () => clock,
    makeId: () => 'rotation-task',
  };
  return { service: createHomeService(adapter), reload: () => createHomeService(adapter),
    time: () => clock, advance: (ms) => { clock += ms; }, setTime: (ms) => { clock = ms; },
    writes: () => writes, stored: () => structuredClone(stored), fail: () => { failNext = true; } };
}
const configure = (service, mode, intervalMinutes = 30) => service.run({ action: 'settings.update',
  settings: { backgroundRotation: { mode, intervalMinutes } } });

test('disabled rotation never changes state or writes during reads', async () => {
  const f = rotationFixture();
  const before = await f.service.run({ action: 'get' });
  f.advance(50 * 86400_000);
  assert.deepEqual(await f.service.run({ action: 'get' }), before);
  assert.equal(f.writes(), 0);
});

test('rotation settings reset the server clock only for actual configuration or background changes', async () => {
  const f = rotationFixture();
  const enabled = await configure(f.service, 'interval', 15);
  assert.equal(enabled.settings.backgroundRotation.lastChangedAt, f.time());
  f.advance(1000);
  const unchanged = await f.service.run({ action: 'settings.update', settings: {
    name: 'New name', background: enabled.settings.background,
    backgroundRotation: { mode: 'interval', intervalMinutes: 15 },
    backgroundLibrary: ['https://example.com/a.jpg'],
  } });
  assert.equal(unchanged.settings.backgroundRotation.lastChangedAt, enabled.settings.backgroundRotation.lastChangedAt);
  for (const settings of [
    { backgroundRotation: { mode: 'interval', intervalMinutes: 5 } },
    { background: { type: 'forest', url: '', dim: 24 } },
    { background: { type: 'forest', url: '', dim: 35 } },
    { backgroundRotation: { mode: 'off', intervalMinutes: 5 } },
  ]) {
    f.advance(1000);
    const changed = await f.service.run({ action: 'settings.update', settings });
    assert.equal(changed.settings.backgroundRotation.lastChangedAt, f.time());
  }
  const before = f.stored();
  for (const backgroundRotation of [
    { mode: 'interval', intervalMinutes: 0 }, { mode: 'interval', intervalMinutes: 1441 },
    { mode: 'interval', intervalMinutes: 1.5 }, { mode: 'random', intervalMinutes: 30 },
    { mode: 'daily' }, { mode: 'daily', intervalMinutes: 30, lastChangedAt: 0 },
  ]) await assert.rejects(f.service.run({ action: 'settings.update', settings: { backgroundRotation } }), { status: 400 });
  assert.deepEqual(f.stored(), before);
  await configure(f.service, 'interval', 1);
  await configure(f.service, 'interval', 1440);
});

test('daily rotation uses Shanghai midnight, not elapsed 24 hours or UTC midnight', async () => {
  const f = rotationFixture(undefined, Date.parse('2026-11-08T23:59:59+08:00'));
  const enabled = await configure(f.service, 'daily');
  f.advance(999);
  assert.deepEqual(await f.service.run({ action: 'get' }), enabled);
  assert.equal(f.writes(), 1);
  f.advance(1);
  const changed = await f.service.run({ action: 'get' });
  assert.equal(changed.settings.background.type, 'forest');
  assert.equal(changed.settings.backgroundRotation.lastChangedAt, f.time());
  f.setTime(Date.parse('2026-11-09T08:00:00+08:00'));
  assert.deepEqual(await f.service.run({ action: 'get' }), changed);
  f.setTime(Date.parse('2026-11-20T00:00:00+08:00'));
  const later = await f.reload().run({ action: 'get' });
  assert.equal(later.settings.background.type, 'dusk');
  assert.equal(later.revision, changed.revision + 1);
});

test('interval rotation waits until due, advances once after gaps and survives restart and concurrent reads', async () => {
  const f = rotationFixture();
  const enabled = await configure(f.service, 'interval', 5);
  f.advance(5 * 60_000 - 1);
  assert.deepEqual(await f.service.run({ action: 'get' }), enabled);
  assert.equal(f.writes(), 1);
  f.advance(1);
  const states = await Promise.all(Array.from({ length: 16 }, () => f.service.run({ action: 'get' })));
  for (const state of states) assert.deepEqual(state, states[0]);
  assert.equal(states[0].settings.background.type, 'forest');
  assert.equal(f.writes(), 2);
  await f.service.close();
  const restarted = f.reload();
  assert.deepEqual(await restarted.run({ action: 'get' }), states[0]);
  f.advance(20 * 86400_000);
  const later = await restarted.run({ action: 'get' });
  assert.equal(later.settings.background.type, 'dusk');
  assert.equal(later.settings.backgroundRotation.lastChangedAt, f.time());
  assert.equal(f.writes(), 3);
  assert.deepEqual(await restarted.run({ action: 'get' }), later);
  f.advance(-1000);
  assert.deepEqual(await restarted.run({ action: 'get' }), later);
});

test('manual next cycles deterministic photos and custom library without aurora or duplicate current custom', async () => {
  const f = rotationFixture();
  const urls = ['https://example.com/one.jpg', '/api/dsh-home/wallpaper?id=' + 'b'.repeat(64)];
  await f.service.run({ action: 'settings.update', settings: {
    background: { type: 'aurora', url: '', dim: 43 }, backgroundLibrary: urls,
  } });
  const expected = [ ['ocean', ''], ['forest', ''], ['dusk', ''], ['custom', urls[0]], ['custom', urls[1]], ['ocean', ''] ];
  for (const [type, url] of expected) {
    f.advance(1);
    const state = await f.service.run({ action: 'background.next' });
    assert.deepEqual(state.settings.background, { type, url, dim: 43 });
    assert.equal(state.settings.backgroundRotation.lastChangedAt, f.time());
  }
  await f.service.run({ action: 'settings.update', settings: { background: { type: 'custom', url: urls[0], dim: 43 } } });
  assert.equal((await f.service.run({ action: 'background.next' })).settings.background.url, urls[1]);
  assert.equal((await f.service.run({ action: 'background.next' })).settings.background.type, 'ocean');
  await f.service.run({ action: 'settings.update', settings: {
    background: { type: 'custom', url: 'https://legacy.example/photo.jpg', dim: 43 },
  } });
  assert.equal((await f.service.run({ action: 'background.next' })).settings.background.type, 'ocean');
  assert.deepEqual(f.stored().settings.backgroundLibrary, urls);
});

test('manual next at an overdue boundary advances only once, including a queued read', async () => {
  const f = rotationFixture();
  await configure(f.service, 'interval', 5);
  f.advance(10 * 60_000);
  const [manual, read] = await Promise.all([
    f.service.run({ action: 'background.next' }), f.service.run({ action: 'get' }),
  ]);
  assert.equal(manual.settings.background.type, 'forest');
  assert.deepEqual(read, manual);
  assert.equal(f.writes(), 2);
  f.advance(10 * 60_000);
  const chosen = await f.service.run({ action: 'settings.update', settings: { background: { type: 'dusk', url: '', dim: 24 } } });
  assert.deepEqual(await f.service.run({ action: 'get' }), chosen);
});

test('library validates URLs, deduplicates in order, bounds unique entries and removes references only', async () => {
  const f = rotationFixture();
  const upload = '/api/dsh-home/wallpaper?id=' + 'c'.repeat(64);
  const photo = 'https://example.com/photo.jpg';
  const added = await f.service.run({ action: 'settings.update', settings: {
    background: { type: 'custom', url: upload, dim: 20 }, backgroundLibrary: [photo, upload, photo, upload],
  } });
  assert.deepEqual(added.settings.backgroundLibrary, [photo, upload]);
  const invalid = ['', ' ', ' https://example.com/a', 'http://example.com/a', 'javascript:alert(1)',
    'data:image/png;base64,aa', 'file:///tmp/a', '/api/other', '/api/dsh-home/wallpaper?id=xyz',
    'https://user:pass@example.com/a', 'https://example.com/' + 'a'.repeat(2048)];
  for (const url of invalid) await assert.rejects(f.service.run({ action: 'settings.update', settings: {
    backgroundLibrary: [url], name: 'Do not save',
  } }), { status: 400 });
  assert.deepEqual(f.stored(), added);
  const twenty = Array.from({ length: 20 }, (_, i) => `https://example.com/${i}.jpg`);
  await f.service.run({ action: 'settings.update', settings: { backgroundLibrary: twenty } });
  await assert.rejects(f.service.run({ action: 'settings.update', settings: {
    backgroundLibrary: [...twenty, 'https://example.com/extra.jpg'],
  } }), { status: 400 });
  const removed = await f.service.run({ action: 'settings.update', settings: { backgroundLibrary: [] } });
  assert.deepEqual(removed.settings.backgroundLibrary, []);
  assert.deepEqual(removed.settings.background, added.settings.background);
  assert.equal(removed.settings.backgroundRotation.lastChangedAt, added.settings.backgroundRotation.lastChangedAt);
  const corrupt = structuredClone(removed);
  corrupt.settings.backgroundLibrary = [photo, photo];
  assert.equal(HomeStateSchema.safeParse(corrupt).success, false);
});

test('rotation and timer reconciliation persist atomically and failed writes roll back both', async () => {
  const f = rotationFixture();
  await f.service.run({ action: 'task.add', title: 'Keep me' });
  await f.service.run({ action: 'settings.update', settings: { focusMinutes: 1,
    backgroundRotation: { mode: 'interval', intervalMinutes: 1 } } });
  const started = await f.service.run({ action: 'timer.start', taskId: 'rotation-task' });
  f.advance(60_000);
  f.fail();
  await assert.rejects(f.service.run({ action: 'get' }), /disk full/);
  assert.deepEqual(f.stored(), started);
  const settled = await f.service.run({ action: 'get' });
  assert.equal(settled.revision, started.revision + 1);
  assert.equal(settled.settings.background.type, 'forest');
  assert.equal(settled.timer.status, 'completed');
  assert.equal(settled.focusLog.length, 1);
  for (const key of ['tasks', 'bookmarks', 'layout']) assert.deepEqual(settled[key], started[key]);
  assert.deepEqual(await f.service.run({ action: 'get' }), settled);
  f.advance(1);
  f.fail();
  await assert.rejects(f.service.run({ action: 'background.next' }), /disk full/);
  assert.deepEqual(f.stored(), settled);
  assert.deepEqual(await f.service.run({ action: 'get' }), settled);
  f.fail();
  await assert.rejects(f.service.run({ action: 'settings.update', settings: {
    backgroundLibrary: ['https://example.com/fail.jpg'], backgroundRotation: { mode: 'daily', intervalMinutes: 30 },
  } }), /disk full/);
  assert.deepEqual(await f.service.run({ action: 'get' }), settled);
});

test('HTTP and agent tool use the same rotation service contract without writable lastChangedAt', async () => {
  const f = rotationFixture();
  const tool = createHomeTool(f.service);
  const fetch = createHomeFetchHandler(f.service);
  assert.ok(HOME_TOOL_PARAMETERS.properties.action.enum.includes('background.next'));
  const schema = HOME_TOOL_PARAMETERS.properties.settings.properties.backgroundRotation;
  assert.deepEqual(schema.required, ['mode', 'intervalMinutes']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(Object.hasOwn(schema.properties, 'lastChangedAt'), false);
  assert.equal(HOME_TOOL_PARAMETERS.properties.settings.properties.backgroundLibrary.maxItems, 20);
  await tool.execute({ action: 'settings.update', settings: { backgroundRotation: { mode: 'interval', intervalMinutes: 1 } } });
  f.advance(60_000);
  const response = await fetch(new Request('https://test/api/dsh-home'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).settings.background.type, 'forest');
  assert.equal((await tool.execute({ action: 'get' })).settings.background.type, 'forest');
  const invalid = await fetch(new Request('https://test/api/dsh-home', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'settings.update', settings: { backgroundRotation: { mode: 'daily', intervalMinutes: 30, lastChangedAt: 0 } } }) }));
  assert.equal(invalid.status, 400);
});
