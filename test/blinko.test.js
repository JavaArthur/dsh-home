import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createBlinkoService, createBlinkoState, BlinkoStateSchema } from '../blinko.js';
import { HomeError } from '../core.js';

const ENDPOINT = 'http://127.0.0.1:1111';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const isStatus = (status) => (error) => error instanceof HomeError && error.status === status;

const rawNote = (id = 1, fields = {}) => ({
  id, type: 0, content: `note ${id}`,
  isArchived: false, isRecycle: false,
  createdAt: '2026-11-19T04:42:55.867Z', updatedAt: '2026-11-19T04:43:00.000Z',
  tags: [{ tag: { id: 1, name: 'Welcome', parent: 0 } }],
  attachments: [{ path: '/api/file/pic01.png', name: 'pic01.png' }],
  ...fields,
});

function fixture(options = {}) {
  let stored = structuredClone(options.initial ?? createBlinkoState());
  let token = Object.hasOwn(options, 'token') ? options.token : 'fake-key';
  const requests = [];
  const fetchImpl = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : null;
    requests.push({ url, body, headers: init?.headers ?? {} });
    const handler = options.fetch;
    if (handler) return handler(url, body, requests);
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const service = createBlinkoService({
    endpoint: ENDPOINT,
    resolveToken: async () => (options.resolveToken ? options.resolveToken() : token),
    setToken: async (value) => { token = value; },
    getReceipts: () => structuredClone(stored),
    setReceipts: async (value) => { stored = structuredClone(value); },
    fetchImpl,
  });
  return { service, requests, getToken: () => token, getStored: () => stored };
}

test('list normalizes Blinko notes, tags and attachment URLs', async () => {
  const { service, requests } = fixture({
    fetch: () => new Response(JSON.stringify([rawNote(7), rawNote(9, { tags: null, attachments: null })]), { status: 200 }),
  });
  const page = await service.run({ action: 'list' });
  assert.equal(page.configured, true);
  assert.equal(page.notes.length, 2);
  assert.equal(page.notes[0].id, '9');
  const note = page.notes.find((entry) => entry.id === '7');
  assert.deepEqual(note.tags, ['Welcome']);
  assert.deepEqual(note.files, [{ type: 'image', url: `${ENDPOINT}/api/file/pic01.png` }]);
  assert.equal(note.url, `${ENDPOINT}/`);
  assert.equal(requests[0].url, `${ENDPOINT}/api/v1/note/list`);
  assert.equal(requests[0].headers.Authorization, 'Bearer fake-key');
  assert.equal(requests[0].body.isUseAiQuery, false);
  await service.close();
});

test('list filters by tag locally', async () => {
  const notes = [
    rawNote(1, { tags: [{ tag: { name: 'idea' } }] }),
    rawNote(2, { tags: [{ tag: { name: 'other' } }] }),
    rawNote(3, { tags: null }),
  ];
  const { service } = fixture({ fetch: () => new Response(JSON.stringify(notes), { status: 200 }) });
  const page = await service.run({ action: 'list', tag: 'IDEA' });
  assert.deepEqual(page.notes.map((note) => note.id), ['1']);
  assert.equal(page.hasMore, false);
  await service.close();
});

test('list keeps a resumable cursor across backend pages', async () => {
  let served = 0;
  const { service } = fixture({
    fetch: () => {
      served += 1;
      const notes = served === 1
        ? Array.from({ length: 50 }, (_, index) => rawNote(index + 1, { tags: [{ tag: { name: 'idea' } }] }))
        : [];
      return new Response(JSON.stringify(notes), { status: 200 });
    },
  });
  const page = await service.run({ action: 'list', tag: 'idea' });
  assert.equal(page.notes.length, 30);
  assert.equal(page.hasMore, true);
  assert.match(page.nextBefore, /^blinko:/);

  const next = await service.run({ action: 'list', tag: 'idea', before: page.nextBefore });
  assert.equal(next.notes.length, 0);
  assert.equal(next.hasMore, false);
  assert.equal(next.nextBefore, null);

  // A cursor is bound to its filters: reusing it after changing the query fails closed.
  await assert.rejects(service.run({ action: 'list', tag: 'other', before: page.nextBefore }),
    (error) => error instanceof HomeError && /分页位置无效/.test(error.message));
  await service.close();
});

test('get reads a single note through /note/detail', async () => {
  const { service, requests } = fixture({ fetch: () => new Response(JSON.stringify(rawNote(12)), { status: 200 }) });
  const { note } = await service.run({ action: 'get', id: '12' });
  assert.equal(note.id, '12');
  assert.equal(requests[0].url, `${ENDPOINT}/api/v1/note/detail`);
  assert.deepEqual(requests[0].body, { id: 12 });
  await service.close();
});

test('create writes once and replays the receipt for a repeated requestId', async () => {
  let created = 0;
  const { service, getStored } = fixture({
    fetch: (url, body) => {
      if (url.endsWith('/note/upsert')) {
        created += 1;
        return new Response(JSON.stringify(rawNote(42, { content: body.content })), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    },
  });
  const first = await service.run({ action: 'create', content: 'hello blinko', requestId: 'req-1' });
  assert.equal(first.note.content, 'hello blinko');
  const second = await service.run({ action: 'create', content: 'hello blinko', requestId: 'req-1' });
  assert.equal(second.note.id, '42');
  assert.equal(created, 1);
  assert.equal(getStored().receipts[0].status, 'success');
  assert.equal(getStored().receipts[0].hash, digest('hello blinko'));
  await assert.rejects(service.run({ action: 'create', content: 'different', requestId: 'req-1' }), isStatus(409));
  await service.close();
});

test('failed create leaves an unknown receipt that blocks a silent resend', async () => {
  const { service, getStored } = fixture({
    fetch: () => new Response('boom', { status: 500 }),
  });
  await assert.rejects(service.run({ action: 'create', content: 'x', requestId: 'req-2' }), isStatus(409));
  assert.equal(getStored().receipts[0].status, 'unknown');
  await assert.rejects(service.run({ action: 'create', content: 'x', requestId: 'req-2' }), isStatus(409));
  await service.close();
});

test('401 maps to an actionable credential error', async () => {
  const { service } = fixture({ fetch: () => new Response('{}', { status: 401 }) });
  await assert.rejects(service.run({ action: 'list' }), isStatus(401));
  await service.close();
});

test('missing credential reports configured=false for list and 401 for get', async () => {
  const { service } = fixture({ token: '', resolveToken: () => '' });
  const page = await service.run({ action: 'list' });
  assert.deepEqual({ configured: page.configured, notes: page.notes }, { configured: false, notes: [] });
  await assert.rejects(service.run({ action: 'get', id: '1' }), isStatus(401));
  assert.equal(await service.run({ action: 'status' }).then((value) => value.configured), false);
  await service.close();
});

test('configure stores the API key and status then reports configured', async () => {
  const { service, getToken } = fixture({ token: '' , resolveToken: undefined });
  await service.run({ action: 'configure', token: 'blinko-key' });
  assert.equal(getToken(), 'blinko-key');
  assert.equal((await service.run({ action: 'status' })).configured, true);
  await service.close();
});

test('receipt schema rejects duplicate ids', () => {
  const receipt = { id: 'a', hash: digest('x'), status: 'unknown' };
  assert.equal(BlinkoStateSchema.safeParse({ receipts: [receipt, receipt] }).success, false);
});
