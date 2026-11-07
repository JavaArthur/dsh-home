import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, createHomeService } from '../core.js';

function setup(state) {
  let stored = structuredClone(state);
  return { get: () => stored, set: async (value) => { stored = value; } };
}

test('legacy v0.1 data gains wallpaper defaults without losing tasks, sort or timer', async () => {
  const old = createDefaultState();
  delete old.settings.background;
  old.revision = 36;
  old.tasks.push({ id: 'user-task', title: 'Personal task', area: '生活', done: true, createdAt: 1234 });
  old.layout = ['focus', 'tasks', 'rhythm', 'projects'];
  old.timer.status = 'paused'; old.timer.remainingMs = 10000;
  const storage = setup(old);
  const service = createHomeService(storage);
  const current = await service.run({ action: 'get' });
  assert.deepEqual(current.settings.background, { type: 'ocean', url: '', dim: 24 });
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
  for (const url of ['https://example.com/photo.jpg', '/api/chen-home/wallpaper?id=' + 'a'.repeat(64)]) {
    await service.run({ action: 'settings.update', settings: { background: { type: 'custom', url, dim: 20 } } });
  }
  for (const url of ['', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'file:///etc/passwd', 'http://example.com/a', 'https://name:secret@example.com/a', '/api/other']) {
    await assert.rejects(service.run({ action: 'settings.update', settings: { background: { type: 'custom', url, dim: 20 } } }), error => error.status === 400);
  }
  for (const dim of [-1, 81, 0.5]) await assert.rejects(service.run({ action: 'settings.update', settings: { background: { type: 'ocean', url: '', dim } } }));
});
