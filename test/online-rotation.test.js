import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, createHomeService } from '../core.js';
import { createHomeFetchHandler, createHomeTool, HOME_TOOL_PARAMETERS } from '../index.js';

function fixture(initial = createDefaultState()) {
  let stored = structuredClone(initial), time = Date.parse('2026-11-08T23:59:00+08:00'), calls = 0, failFetch = false, failWrite = false;
  const requests = [];
  const adapter = {
    get: () => structuredClone(stored), now: () => time,
    set: async value => { if (failWrite) throw new Error('disk full'); stored = structuredClone(value); },
    resolvePhoto: async ({ source, excludeUrl }) => {
      calls++; requests.push({ source, excludeUrl });
      if (failFetch) throw new Error('network unavailable');
      return { source, id: String(calls), url: `https://picsum.photos/id/${calls}/2560/1440`, author: 'Photographer', page: 'https://unsplash.com/photos/example' };
    },
  };
  return { service: createHomeService(adapter), adapter, requests, calls: () => calls, stored: () => structuredClone(stored), advance: ms => { time += ms; }, fetchFails: value => { failFetch = value; }, writeFails: value => { failWrite = value; } };
}
const enable = { action: 'settings.update', settings: { backgroundSource: 'picsum', backgroundRotation: { mode: 'interval', intervalMinutes: 1 } } };

test('legacy state defaults to local with no online request; attribution cannot be forged', async () => {
  const old = createDefaultState(); delete old.settings.backgroundSource; delete old.settings.backgroundPhoto;
  const f = fixture(old);
  const state = await f.service.run({ action: 'get' });
  assert.equal(state.settings.backgroundSource, 'local'); assert.equal(state.settings.backgroundPhoto, null); assert.equal(f.calls(), 0);
  await assert.rejects(f.service.run({ action: 'settings.update', settings: { backgroundPhoto: null } }), error => error.status === 400);
  await assert.rejects(f.service.run({ action: 'settings.update', settings: { backgroundSource: 'other' } }), error => error.status === 400);
});

test('source selection fetches immediately; next requests a new image without using gallery quota', async () => {
  const f = fixture();
  const first = await f.service.run(enable);
  assert.equal(first.settings.background.type, 'custom'); assert.equal(first.settings.backgroundPhoto.source, 'picsum');
  assert.equal(first.settings.background.dim, 24); assert.deepEqual(first.settings.backgroundLibrary, []);
  const next = await f.service.run({ action: 'background.next' });
  assert.notEqual(next.settings.background.url, first.settings.background.url);
  assert.equal(f.requests[1].excludeUrl, first.settings.background.url);
  await f.service.run({ action: 'settings.update', settings: { dailyGoal: 5 } });
  await f.service.run({ action: 'settings.update', settings: { backgroundSource: 'picsum' } });
  assert.equal(f.calls(), 2);
  const local = await f.service.run({ action: 'settings.update', settings: { backgroundSource: 'local' } });
  assert.equal(local.settings.backgroundPhoto, null);
  const preset = await f.service.run({ action: 'background.next' });
  assert.equal(preset.settings.background.type, 'ocean'); assert.equal(f.calls(), 2);
});

test('due concurrent reads fetch once and source/metadata persist across restart', async () => {
  const f = fixture(); await f.service.run(enable); f.advance(60_000);
  const states = await Promise.all(Array.from({ length: 12 }, () => f.service.run({ action: 'get' })));
  assert.equal(f.calls(), 2); assert.equal(new Set(states.map(s => s.settings.background.url)).size, 1);
  const restart = await createHomeService(f.adapter).run({ action: 'get' });
  assert.equal(restart.settings.backgroundPhoto.url, states[0].settings.background.url); assert.equal(f.calls(), 2);
  f.advance(10 * 60_000); await f.service.run({ action: 'get' }); assert.equal(f.calls(), 3);
});

test('online daily rotation uses Shanghai midnight and off disables automatic fetch', async () => {
  const f = fixture();
  await f.service.run({ action: 'settings.update', settings: { backgroundSource: 'picsum', backgroundRotation: { mode: 'daily', intervalMinutes: 30 } } });
  f.advance(59_999); await f.service.run({ action: 'get' }); assert.equal(f.calls(), 1);
  f.advance(1); await f.service.run({ action: 'get' }); assert.equal(f.calls(), 2);
  await f.service.run({ action: 'settings.update', settings: { backgroundRotation: { mode: 'off', intervalMinutes: 30 } } });
  f.advance(86_400_000); await f.service.run({ action: 'get' }); assert.equal(f.calls(), 2);
});

test('automatic fetch failure retains image, settles focus, and backs off for one minute', async () => {
  const f = fixture(); const first = await f.service.run(enable);
  await f.service.run({ action: 'settings.update', settings: { focusMinutes: 1 } });
  await f.service.run({ action: 'timer.start' }); f.advance(60_000); f.fetchFails(true);
  const failed = await f.service.run({ action: 'get' });
  assert.equal(failed.settings.background.url, first.settings.background.url);
  assert.equal(failed.focusLog.length, 1); assert.match(failed.backgroundError, /保留当前背景/);
  await f.service.run({ action: 'get' }); f.advance(59_999); await f.service.run({ action: 'get' }); assert.equal(f.calls(), 2);
  f.advance(1); f.fetchFails(false);
  const retry = await f.service.run({ action: 'get' });
  assert.equal(f.calls(), 3); assert.equal(retry.backgroundError, undefined); assert.equal(retry.focusLog.length, 1);
});

test('explicit fetch and storage failures are atomic and retryable', async () => {
  const f = fixture(); const before = f.stored(); f.fetchFails(true);
  await assert.rejects(f.service.run(enable), error => error.status === 503); assert.deepEqual(f.stored(), before);
  f.fetchFails(false); await f.service.run(enable); const current = f.stored();
  f.writeFails(true); await assert.rejects(f.service.run({ action: 'background.next' }), /disk full/); assert.deepEqual(f.stored(), current);
  f.writeFails(false); const next = await f.service.run({ action: 'background.next' }); assert.notEqual(next.settings.background.url, current.settings.background.url);
});

test('HTTP and agent tool both use online service settings', async () => {
  const f = fixture(); const handler = createHomeFetchHandler(f.service), tool = createHomeTool(f.service);
  const response = await handler(new Request('http://localhost/api/dsh-home', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enable) }));
  assert.equal(response.status, 200); const first = await response.json();
  const next = await tool.execute({ action: 'background.next' });
  assert.notEqual(next.settings.background.url, first.settings.background.url);
  assert.deepEqual(HOME_TOOL_PARAMETERS.properties.settings.properties.backgroundSource.enum, ['local', 'unsplash', 'picsum']);
});
