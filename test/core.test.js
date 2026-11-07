import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, createHomeService, HomeError, HomeStateSchema, LIMITS } from '../core.js';

function fixture(initial = createDefaultState()) {
  let stored = structuredClone(initial);
  let clock = 1_700_000_000_000;
  let sequence = 0;
  let writes = 0;
  let failNext = false;
  const adapter = {
    get: () => structuredClone(stored),
    set: async (value) => {
      if (failNext) { failNext = false; throw new Error('disk full'); }
      await Promise.resolve();
      stored = structuredClone(value);
      writes += 1;
    },
    now: () => clock,
    makeId: () => `id-${++sequence}`,
  };
  return {
    service: createHomeService(adapter),
    reload: () => createHomeService(adapter),
    advance: (ms) => { clock += ms; },
    fail: () => { failNext = true; },
    stored: () => structuredClone(stored),
    writes: () => writes,
  };
}

async function startOneMinute(f) {
  await f.service.run({ action: 'settings.update', settings: { focusMinutes: 1 } });
  return f.service.run({ action: 'timer.start' });
}

test('defaults contain no invented tasks and the eight requested bookmarks', async () => {
  const f = fixture();
  const state = await f.service.run({ action: 'get' });
  assert.deepEqual(state.tasks, []);
  assert.equal(state.bookmarks.length, 8);
  assert.deepEqual(state.bookmarks.map((item) => item.mark), ['GH', 'AI', '研', '复', 'LG', 'DS', '聘', 'YM']);
  assert.equal(state.bookmarks[0].url, 'https://github.com/JavaArthur');
  assert.equal(state.settings.name, 'C哥');
  assert.equal(f.writes(), 0);
  state.settings.name = 'external mutation';
  assert.equal((await f.service.run({ action: 'get' })).settings.name, 'C哥');
});

test('failed persistence rolls back the entire action and the queue remains usable', async () => {
  const f = fixture();
  const before = await f.service.run({ action: 'get' });
  f.fail();
  await assert.rejects(f.service.run({ action: 'task.add', title: 'Not saved' }), /disk full/);
  assert.deepEqual(await f.service.run({ action: 'get' }), before);
  assert.deepEqual(f.stored(), before);
  const after = await f.service.run({ action: 'task.add', title: 'Saved' });
  assert.equal(after.tasks.length, 1);
  assert.equal(after.tasks[0].title, 'Saved');
  assert.equal(after.revision, 1);
});

test('concurrent additions serialize without losing updates', async () => {
  const f = fixture();
  const states = await Promise.all(Array.from({ length: 40 }, (_, i) => f.service.run({ action: 'task.add', title: `Task ${i}` })));
  const state = await f.service.run({ action: 'get' });
  assert.equal(state.tasks.length, 40);
  assert.equal(new Set(state.tasks.map((task) => task.id)).size, 40);
  assert.deepEqual(states.map((item) => item.revision), Array.from({ length: 40 }, (_, i) => i + 1));
  assert.deepEqual(f.stored(), state);
});

test('pending writes are awaited before publishing a result or serving the next call', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let didWrite;
  const writing = new Promise((resolve) => { didWrite = resolve; });
  const service = createHomeService({
    get: createDefaultState,
    set: async () => { didWrite(); await gate; throw new Error('write rejected'); },
  });
  const addition = service.run({ action: 'task.add', title: 'Pending' });
  await writing;
  let readResolved = false;
  const read = service.run({ action: 'get' }).then((value) => { readResolved = true; return value; });
  await Promise.resolve();
  assert.equal(readResolved, false);
  const rejected = assert.rejects(addition, /write rejected/);
  release();
  await rejected;
  assert.equal((await read).tasks.length, 0);
});

test('get reconciles an expired focus exactly once, including reload and concurrent reads', async () => {
  const f = fixture();
  const started = await startOneMinute(f);
  f.advance(60_001);
  const [first, second] = await Promise.all([f.service.run({ action: 'get' }), f.service.run({ action: 'get' })]);
  assert.equal(first.timer.status, 'completed');
  assert.equal(first.timer.remainingMs, 0);
  assert.equal(first.timer.endsAt, null);
  assert.deepEqual(first.focusLog, [{ id: started.timer.id, completedAt: started.timer.endsAt, minutes: 1, taskId: null }]);
  assert.deepEqual(second, first);
  assert.deepEqual(await f.reload().run({ action: 'get' }), first);
  assert.equal(f.writes(), 3);
});

test('a reloaded running timer settles from the persisted deadline', async () => {
  const f = fixture();
  const started = await startOneMinute(f);
  f.advance(80_000);
  const state = await f.reload().run({ action: 'get' });
  assert.equal(state.focusLog.length, 1);
  assert.equal(state.focusLog[0].completedAt, started.timer.endsAt);
  assert.equal(state.timer.status, 'completed');
});

test('expiry persistence failure leaves the timer and log retryable without duplicate credit', async () => {
  const f = fixture();
  await startOneMinute(f);
  f.advance(60_000);
  f.fail();
  await assert.rejects(f.service.run({ action: 'get' }), /disk full/);
  assert.equal(f.stored().timer.status, 'running');
  assert.equal(f.stored().focusLog.length, 0);
  const result = await f.service.run({ action: 'get' });
  assert.equal(result.focusLog.length, 1);
  assert.equal((await f.service.run({ action: 'get' })).focusLog.length, 1);
});

test('pause and resume preserve remaining time and timer identity', async () => {
  const f = fixture();
  const started = await startOneMinute(f);
  f.advance(12_345);
  const read = await f.service.run({ action: 'get' });
  assert.equal(read.timer.remainingMs, 47_655);
  assert.equal(read.revision, started.revision);
  assert.equal(f.writes(), 2);
  const paused = await f.service.run({ action: 'timer.pause' });
  assert.equal(paused.timer.remainingMs, 47_655);
  assert.equal(paused.timer.endsAt, null);
  f.advance(500_000);
  assert.equal((await f.service.run({ action: 'get' })).timer.remainingMs, 47_655);
  const resumed = await f.service.run({ action: 'timer.start' });
  assert.equal(resumed.timer.id, started.timer.id);
  f.advance(47_655);
  assert.equal((await f.service.run({ action: 'get' })).focusLog.length, 1);
});

test('explicit completion rejects early, stale and repeated calls', async () => {
  const f = fixture();
  const started = await startOneMinute(f);
  await assert.rejects(f.service.run({ action: 'timer.complete', id: started.timer.id }), (error) => error.status === 409);
  f.advance(60_000);
  await assert.rejects(f.service.run({ action: 'timer.complete', id: 'stale' }), (error) => error.status === 409);
  assert.equal(f.stored().focusLog.length, 0);
  const completed = await f.service.run({ action: 'timer.complete', id: started.timer.id });
  assert.equal(completed.focusLog.length, 1);
  await assert.rejects(f.service.run({ action: 'timer.complete', id: started.timer.id }), (error) => error.status === 409);
  const next = await f.service.run({ action: 'timer.start' });
  assert.notEqual(next.timer.id, started.timer.id);
  assert.equal(next.timer.mode, 'focus');
});

test('reset discards even expired progress, and breaks do not earn focus credit', async () => {
  const f = fixture();
  await startOneMinute(f);
  f.advance(60_001);
  const reset = await f.service.run({ action: 'timer.reset' });
  assert.equal(reset.timer.status, 'idle');
  assert.equal(reset.timer.remainingMs, 60_000);
  assert.equal(reset.focusLog.length, 0);
  const mode = await f.service.run({ action: 'timer.mode', mode: 'break' });
  assert.equal(mode.timer.status, 'idle');
  assert.equal(mode.timer.durationMs, 300_000);
  await f.service.run({ action: 'timer.start' });
  f.advance(300_000);
  const done = await f.service.run({ action: 'get' });
  assert.equal(done.timer.status, 'completed');
  assert.equal(done.timer.mode, 'break');
  assert.equal(done.focusLog.length, 0);
});

test('task updates validate fields and deleting an associated task clears its live association', async () => {
  const f = fixture();
  const added = await f.service.run({ action: 'task.add', title: '  Learn  ', area: '学习' });
  const id = added.tasks[0].id;
  assert.equal(added.tasks[0].title, 'Learn');
  await f.service.run({ action: 'timer.start', taskId: id });
  const updated = await f.service.run({ action: 'task.update', id, done: true, area: '项目' });
  assert.equal(updated.tasks[0].done, true);
  await assert.rejects(f.service.run({ action: 'task.update', id, done: 'true' }), HomeError);
  const deleted = await f.service.run({ action: 'task.delete', id });
  assert.equal(deleted.tasks.length, 0);
  assert.equal(deleted.timer.taskId, null);
  await assert.rejects(f.service.run({ action: 'timer.start', taskId: id }), (error) => error.status === 404);
});

test('unsafe bookmark URLs and unknown edits fail without mutating state', async () => {
  const f = fixture();
  const before = await f.service.run({ action: 'get' });
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/secret', '/relative', 'not a url']) {
    await assert.rejects(f.service.run({ action: 'bookmark.save', title: 'Unsafe', url }), HomeError);
  }
  await assert.rejects(f.service.run({ action: 'bookmark.save', id: 'missing', title: 'Missing', url: 'https://example.com' }), (error) => error.status === 404);
  assert.deepEqual(await f.service.run({ action: 'get' }), before);
  const saved = await f.service.run({ action: 'bookmark.save', title: 'Example', url: '  HTTPS://EXAMPLE.COM:443/a  ' });
  assert.equal(saved.bookmarks.at(-1).url, 'https://example.com/a');
  assert.equal(saved.bookmarks.at(-1).category, '常用');
  assert.equal(saved.bookmarks.at(-1).mark, 'Ex');
});

test('layout rejects malformed permutations and reorder actions detect stale revisions', async () => {
  const f = fixture();
  for (const order of [['tasks', 'focus'], ['tasks', 'focus', 'projects', 'projects'], ['tasks', 'focus', 'projects', 'unknown']]) {
    await assert.rejects(f.service.run({ action: 'layout.set', order }), HomeError);
  }
  const order = ['rhythm', 'projects', 'focus', 'tasks'];
  const changed = await f.service.run({ action: 'layout.set', order, expectedRevision: 0 });
  assert.deepEqual(changed.layout, order);
  await assert.rejects(f.service.run({ action: 'layout.set', order, expectedRevision: 0 }), (error) => error.status === 409);
  await assert.rejects(f.service.run({ action: 'bookmark.move', id: 'github', toIndex: 2, expectedRevision: 0 }), (error) => error.status === 409);
  const moved = await f.service.run({ action: 'bookmark.move', id: 'github', toIndex: 2, expectedRevision: changed.revision });
  assert.equal(moved.bookmarks[2].id, 'github');
  await assert.rejects(f.service.run({ action: 'bookmark.move', id: 'github', toIndex: 59 }), HomeError);
});

test('settings bounds reject invalid values atomically and active timers retain their duration', async () => {
  const f = fixture();
  for (const settings of [
    { focusMinutes: 0 }, { focusMinutes: 121 }, { focusMinutes: 1.5 },
    { breakMinutes: 0 }, { breakMinutes: 31 }, { dailyGoal: 0 }, { dailyGoal: 17 },
    { name: '' }, { searchEngine: 'unknown' }, { name: 'Valid', dailyGoal: 0 }, { extra: true },
  ]) await assert.rejects(f.service.run({ action: 'settings.update', settings }), HomeError);
  assert.equal(f.writes(), 0);
  await startOneMinute(f);
  const updated = await f.service.run({ action: 'settings.update', settings: { focusMinutes: 120, breakMinutes: 30, dailyGoal: 16 } });
  assert.equal(updated.timer.durationMs, 60_000);
  const reset = await f.service.run({ action: 'timer.reset' });
  assert.equal(reset.timer.durationMs, 7_200_000);
});

test('task and bookmark limits bound stored data and there is no raw-state import action', async () => {
  const initial = createDefaultState();
  initial.tasks = Array.from({ length: LIMITS.tasks }, (_, i) => ({ id: `task-${i}`, title: `Task ${i}`, area: '项目', done: false, createdAt: 1 }));
  initial.bookmarks = Array.from({ length: LIMITS.bookmarks }, (_, i) => ({ id: `bookmark-${i}`, title: `Link ${i}`, url: 'https://example.com/', category: '常用', mark: 'L' }));
  const f = fixture(initial);
  await assert.rejects(f.service.run({ action: 'task.add', title: 'Overflow' }), HomeError);
  await assert.rejects(f.service.run({ action: 'bookmark.save', title: 'Overflow', url: 'https://example.com/' }), HomeError);
  await assert.rejects(f.service.run({ action: 'import', state: createDefaultState() }), HomeError);
  await assert.rejects(f.service.run({ action: 'get', state: createDefaultState() }), HomeError);
  assert.deepEqual(f.stored(), initial);
});

test('focus history retains only the latest 1000 records', async () => {
  const initial = createDefaultState();
  initial.focusLog = Array.from({ length: LIMITS.focusLog }, (_, i) => ({ id: `past-${i}`, completedAt: i, minutes: 25, taskId: null }));
  const f = fixture(initial);
  const started = await startOneMinute(f);
  f.advance(60_000);
  const done = await f.service.run({ action: 'get' });
  assert.equal(done.focusLog.length, LIMITS.focusLog);
  assert.equal(done.focusLog[0].id, 'past-1');
  assert.equal(done.focusLog.at(-1).id, started.timer.id);
  assert.ok(HomeStateSchema.safeParse(done).success);
});

test('closing waits for accepted operations and rejects new actions', async () => {
  const f = fixture();
  const addition = f.service.run({ action: 'task.add', title: 'Accepted' });
  const closing = f.service.close();
  await assert.rejects(f.service.run({ action: 'get' }), (error) => error.status === 503);
  await closing;
  assert.equal((await addition).tasks.length, 1);
  assert.equal(f.stored().tasks.length, 1);
});
