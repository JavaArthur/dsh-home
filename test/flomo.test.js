import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createFlomoService, createFlomoState, FlomoStateSchema } from '../flomo.js';
import { HomeError } from '../core.js';

const result = (value) => ({ structuredContent: value });
const digest = (value) => createHash('sha256').update(value).digest('hex');
const memo = (id = 'm1', fields = {}) => ({
  id, content: 'A memo', created_at: '2026-11-06T23:49:13+08:00',
  updated_at: '2026-11-06T23:50:00+08:00', tags: null,
  url: `https://v.flomoapp.com/mine/?memo_id=${id}`, files: null,
  content_truncated: false, ...fields,
});
const metadata = (id = 'created') => {
  const value = memo(id);
  delete value.content;
  return value;
};
const isStatus = (status) => (error) => error instanceof HomeError && error.status === status;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function fixture(options = {}) {
  let stored = structuredClone(options.initial ?? createFlomoState());
  let token = Object.hasOwn(options, 'token') ? options.token : 'fake-token';
  let writes = 0;
  let resolves = 0;
  const calls = [];
  const clients = [];
  const adapter = {
    resolveToken: async () => { resolves += 1; return options.resolveToken ? options.resolveToken() : token; },
    setToken: async (value) => {
      if (options.setToken) await options.setToken(value);
      token = value;
    },
    getReceipts: () => structuredClone(stored),
    setReceipts: async (value) => {
      writes += 1;
      if (options.persist) await options.persist(value, writes);
      stored = structuredClone(value);
    },
    makeClient: (context) => {
      const client = {
        context, connects: 0, closes: 0,
        async connect(transport, requestOptions) {
          assert.ok(transport instanceof StreamableHTTPClientTransport);
          assert.equal(requestOptions.signal, context.signal);
          this.connects += 1;
          if (options.connect) await options.connect(context);
        },
        async callTool(request, _schema, requestOptions) {
          assert.equal(requestOptions.signal, context.signal);
          calls.push(request);
          if (options.call) return options.call(request, context, calls);
          if (request.name === 'memo_search') return result({ memos: [] });
          if (request.name === 'memo_batch_get') return result({ memos: [memo(request.arguments.ids[0])], omitted_ids: [], truncated: false });
          if (request.name === 'get_format_guide') return result({ content: 'Use markdown.' });
          if (request.name === 'memo_create') return result(metadata());
          throw new Error('Unexpected MCP method');
        },
        async close() { this.closes += 1; },
      };
      clients.push(client);
      return client;
    },
  };
  return {
    service: createFlomoService(adapter), reload: () => createFlomoService(adapter),
    rotate: (value) => { token = value; }, stored: () => structuredClone(stored),
    calls, clients, writes: () => writes, resolves: () => resolves,
  };
}

function searchable(memos) {
  return async ({ name, arguments: args }) => {
    assert.equal(name, 'memo_search');
    const day = (value) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 10);
    return result({ memos: memos.filter((entry) => !args.end_date || day(entry.created_at) <= args.end_date)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, args.limit) });
  };
}

test('unconfigured list has explicit empty state; get and create require a token', async () => {
  const f = fixture({ token: undefined });
  const listed = await f.service.run();
  assert.deepEqual({ ...listed, syncedAt: 0 }, { configured: false, notes: [], hasMore: false, nextBefore: null, syncedAt: 0 });
  assert.ok(Number.isSafeInteger(listed.syncedAt));
  await assert.rejects(f.service.run({ action: 'get', id: 'm1' }), isStatus(401));
  await assert.rejects(f.service.run({ action: 'create', content: 'hello', requestId: 'r1' }), isStatus(401));
  assert.equal(f.clients.length, 0);
  assert.equal(f.writes(), 0);
});

test('list sorts recent notes and preserves truncation, exact content, tags and files', async () => {
  const f = fixture({ call: async () => result({ memos: [
    memo('old', { created_at: '2026-11-05T00:00:00+08:00' }),
    memo('new', { content: '<p>exact partial…</p>', content_truncated: true, tags: ['one'], files: [{ type: 'image', url: 'https://example.com/img.jpg' }] }),
  ] }) });
  const response = await f.service.run({ action: 'list', keywords: 'topic', tag: 'one' });
  assert.deepEqual(f.calls[0], { name: 'memo_search', arguments: { limit: 50, keywords: 'topic', tag: 'one' } });
  assert.deepEqual(response.notes.map(({ id }) => id), ['new', 'old']);
  assert.deepEqual(response.notes[0], {
    id: 'new', content: '<p>exact partial…</p>', createdAt: '2026-11-06T15:49:13.000Z',
    updatedAt: '2026-11-06T15:50:00.000Z', tags: ['one'],
    url: 'https://v.flomoapp.com/mine/?memo_id=new', contentTruncated: true,
    files: [{ type: 'image', url: 'https://example.com/img.jpg' }],
  });
  assert.deepEqual(response.notes[1].tags, []);
  assert.deepEqual(response.notes[1].files, []);
  assert.equal(response.hasMore, false);
  assert.equal(response.nextBefore, null);
  assert.equal(f.clients[0].closes, 1);
});

test('list traverses sparse history across day-only server windows without duplicates', async () => {
  const history = Array.from({ length: 334 }, (_, i) => memo(`m${i}`, { created_at: new Date(Date.UTC(2026, 0, 1) + i * 6 * 3_600_000).toISOString() }));
  const f = fixture({ call: searchable(history) });
  const seen = [];
  let before;
  do {
    const page = await f.service.run({ action: 'list', ...(before ? { before } : {}) });
    seen.push(...page.notes.map(({ id }) => id));
    assert.ok(page.notes.length <= 30);
    assert.equal(page.paginationLimited, undefined);
    assert.equal(page.hasMore, page.nextBefore !== null);
    before = page.nextBefore;
  } while (before);
  assert.equal(seen.length, 334);
  assert.equal(new Set(seen).size, 334);
  assert.ok(f.calls.slice(1).every(({ arguments: args }) => /^\d{4}-\d{2}-\d{2}$/.test(args.end_date)));
});

test('pagination can refill after fewer than 30 locally eligible results across days', async () => {
  const history = [
    ...Array.from({ length: 35 }, (_, i) => memo(`today-${i}`, { created_at: new Date(Date.UTC(2026, 10, 6, 8, i)).toISOString() })),
    ...Array.from({ length: 40 }, (_, i) => memo(`older-${i}`, { created_at: new Date(Date.UTC(2026, 10, 5, 8, i)).toISOString() })),
  ];
  const f = fixture({ call: searchable(history) });
  const first = await f.service.run();
  const second = await f.service.run({ action: 'list', before: first.nextBefore });
  assert.equal(second.notes.length, 30);
  assert.equal(second.hasMore, true);
  assert.equal(second.paginationLimited, undefined);
  assert.equal(f.calls.length, 3);
});

test('same-timestamp cursors include unseen IDs and are bound to the search', async () => {
  const f = fixture({ call: searchable(Array.from({ length: 44 }, (_, i) => memo(`tie-${String(i).padStart(2, '0')}`))) });
  const first = await f.service.run({ action: 'list', keywords: 'word' });
  const second = await f.service.run({ action: 'list', keywords: 'word', before: first.nextBefore });
  assert.equal(first.notes.length, 30);
  assert.equal(second.notes.length, 14);
  assert.equal(new Set([...first.notes, ...second.notes].map(({ id }) => id)).size, 44);
  assert.equal(second.hasMore, false);
  await assert.rejects(f.service.run({ action: 'list', keywords: 'different', before: first.nextBefore }), isStatus(400));
  await assert.rejects(f.service.run({ action: 'list', before: 'flomo:invalid' }), isStatus(400));
  await assert.rejects(f.service.run({ action: 'list', before: 'not a date' }), isStatus(400));
});

test('dense single-day history exposes the server limit instead of looping or claiming completeness', async () => {
  const history = Array.from({ length: 80 }, (_, i) => memo(`dense-${i}`, { created_at: new Date(Date.UTC(2026, 10, 6, 8) + i * 60_000).toISOString() }));
  const f = fixture({ call: searchable(history) });
  const first = await f.service.run();
  const second = await f.service.run({ action: 'list', before: first.nextBefore });
  assert.equal(first.notes.length, 30);
  assert.equal(second.notes.length, 20);
  assert.equal(second.paginationLimited, true);
  assert.match(second.message, /50/);
  assert.equal(second.hasMore, false);
  assert.equal(second.nextBefore, null);
  assert.equal(f.calls.length, 2);
});

test('explicit timestamp before is strict and uses the Shanghai day', async () => {
  const f = fixture({ call: searchable([memo('same'), memo('older', { created_at: '2026-11-06T23:49:12+08:00' })]) });
  const page = await f.service.run({ action: 'list', before: '2026-11-06T15:49:13Z' });
  assert.deepEqual(page.notes.map(({ id }) => id), ['older']);
  assert.equal(f.calls[0].arguments.end_date, '2026-11-06');
});

test('get calls batch_get, supports text JSON fallback and preserves actual truncation', async () => {
  const f = fixture({ call: async () => ({ content: [{ type: 'text', text: JSON.stringify({ memos: [memo('full', { content: 'full exact content' })], omitted_ids: [], truncated: false }) }] }) });
  assert.equal((await f.service.run({ action: 'get', id: 'full' })).note.content, 'full exact content');
  assert.deepEqual(f.calls[0], { name: 'memo_batch_get', arguments: { ids: ['full'] } });
  const truncated = fixture({ call: async () => result({ memos: [memo()], truncated: true }) });
  assert.equal((await truncated.service.run({ action: 'get', id: 'm1' })).note.contentTruncated, true);
  const absent = fixture({ call: async () => result({ memos: [], omitted_ids: ['missing'], truncated: false }) });
  await assert.rejects(absent.service.run({ action: 'get', id: 'missing' }), isStatus(404));
});

test('Flomo null result collections normalize to empty arrays and absent notes return 404', async () => {
  const empty = fixture({ call: async () => result({ memos: null }) });
  const page = await empty.service.run();
  assert.deepEqual(page.notes, []);
  assert.equal(page.configured, true);
  assert.equal(page.hasMore, false);
  assert.equal(page.nextBefore, null);
  for (const memos of [null, []]) {
    const absent = fixture({ call: async () => result({ memos, omitted_ids: null, truncated: false }) });
    await assert.rejects(absent.service.run({ action: 'get', id: 'missing' }), isStatus(404));
  }
  const present = fixture({ call: async () => result({ memos: [memo()], omitted_ids: null, truncated: false }) });
  assert.equal((await present.service.run({ action: 'get', id: 'm1' })).note.id, 'm1');
});

test('image-only Flomo memos without a content field remain readable in list and get', async () => {
  const imageOnly = memo('image-only', { content: undefined, files: [{ type: 'image', url: 'https://example.com/photo.jpg' }] });
  const f = fixture({ call: async () => result({ memos: [imageOnly], omitted_ids: null, truncated: false }) });
  const page = await f.service.run({ action: 'list' });
  assert.equal(page.notes[0].content, '');
  assert.equal(page.notes[0].files.length, 1);
  assert.equal((await f.service.run({ action: 'get', id: 'image-only' })).note.content, '');
});

test('malformed and MCP error responses fail without exposing external error data', async () => {
  for (const value of [
    null, { isError: true, content: [{ type: 'text', text: 'secret-credential' }] },
    result({}), result({ memos: [memo('m', { content: undefined })] }),
    result({ memos: [memo('m', { created_at: 'invalid' })] }),
    result({ memos: [memo('m', { url: 'javascript:alert(1)' })] }),
    result({ memos: [memo('m', { files: [{ type: 'image', url: 'data:text/html,test' }] })] }),
    result({ memos: [memo(), memo()] }),
    { content: [{ type: 'text', text: '{broken json secret-credential' }] },
  ]) {
    const f = fixture({ call: async () => value });
    await assert.rejects(f.service.run(), (error) => isStatus(502)(error) && !error.message.includes('secret-credential'));
    assert.equal(f.clients[0].closes, 1);
  }
  const mismatch = fixture({ call: async () => result({ memos: [memo('other')] }) });
  await assert.rejects(mismatch.service.run({ action: 'get', id: 'expected' }), isStatus(502));
});

test('tokens are resolved on each operation and configure only persists the credential', async () => {
  const f = fixture();
  await f.service.run();
  f.rotate('rotated-token');
  await f.service.run();
  assert.deepEqual(f.clients.map(({ context }) => context.token), ['fake-token', 'rotated-token']);
  const configured = await f.service.run({ action: 'configure', token: '  configured-token  ' });
  assert.deepEqual(configured, { configured: true });
  await f.service.run();
  assert.equal(f.clients[2].context.token, 'configured-token');
  assert.equal(f.resolves(), 3);
  assert.equal(JSON.stringify(f.stored()).includes('token'), false);
  for (const token of ['', 'x'.repeat(2049), 'unsafe\nheader']) {
    await assert.rejects(f.service.run({ action: 'configure', token }), isStatus(400));
  }
});

test('transport and credential failures are sanitized HomeErrors', async () => {
  const transport = fixture({ connect: async () => { throw Object.assign(new Error('secret-credential'), { code: 401 }); } });
  await assert.rejects(transport.service.run(), (error) => isStatus(401)(error) && !error.message.includes('secret-credential'));
  assert.equal(transport.clients[0].closes, 1);
  const resolver = fixture({ resolveToken: async () => { throw new Error('secret-credential'); } });
  await assert.rejects(resolver.service.run(), (error) => isStatus(502)(error) && !error.message.includes('secret-credential'));
  const setter = fixture({ setToken: async () => { throw new Error('secret-credential'); } });
  await assert.rejects(setter.service.run({ action: 'configure', token: 'fake' }), (error) => isStatus(503)(error) && !error.message.includes('secret-credential'));
});

test('create consults guide, persists pending, sends exact content once and stores success', async () => {
  let f;
  const content = '  **Exact**\n\n#tag  \n';
  f = fixture({ call: async ({ name, arguments: args }) => {
    if (name === 'get_format_guide') return result({ content: 'Supported markdown guide' });
    assert.equal(name, 'memo_create');
    assert.deepEqual(args, { content, format: 'markdown' });
    assert.equal(f.stored().receipts[0].status, 'pending');
    return result(metadata('created'));
  } });
  const response = await f.service.run({ action: 'create', requestId: 'r1', content });
  assert.equal(response.note.content, content);
  assert.equal(response.note.contentTruncated, false);
  assert.deepEqual(f.calls.map(({ name }) => name), ['get_format_guide', 'memo_create']);
  assert.equal(f.writes(), 2);
  assert.deepEqual(f.stored().receipts[0], { id: 'r1', hash: digest(content), status: 'success', note: response.note });
  response.note.content = 'caller mutation';
  assert.equal((await f.service.run({ action: 'create', requestId: 'r1', content })).note.content, content);
  assert.equal((await f.reload().run({ action: 'create', requestId: 'r1', content })).note.content, content);
  assert.equal(f.calls.length, 2);
  await assert.rejects(f.service.run({ action: 'create', requestId: 'r1', content: `${content}different` }), isStatus(409));
});

test('concurrent duplicate creates submit once and different creates serialize', async () => {
  const entered = deferred();
  const release = deferred();
  let mutations = 0;
  const f = fixture({ call: async ({ name }) => {
    if (name === 'get_format_guide') return result({ content: 'guide' });
    mutations += 1;
    if (mutations === 1) { entered.resolve(); await release.promise; }
    return result(metadata(`created-${mutations}`));
  } });
  const first = f.service.run({ action: 'create', requestId: 'r1', content: 'one' });
  await entered.promise;
  const duplicate = f.service.run({ action: 'create', requestId: 'r1', content: 'one' });
  const second = f.service.run({ action: 'create', requestId: 'r2', content: 'two' });
  await Promise.resolve();
  assert.equal(mutations, 1);
  release.resolve();
  const values = await Promise.all([first, duplicate, second]);
  assert.deepEqual(values[0], values[1]);
  assert.equal(mutations, 2);
  assert.equal(f.stored().receipts.length, 2);
  assert.equal(values[2].note.content, 'two');
});

test('validation failures, unsupported actions and guide errors never create notes', async () => {
  const f = fixture({ call: async () => result({ wrong: 'guide' }) });
  for (const input of [
    { action: 'create', requestId: 'r', content: '' }, { action: 'create', requestId: 'r', content: '   ' },
    { action: 'create', requestId: '', content: 'valid' }, { action: 'create', requestId: 'r'.repeat(101), content: 'valid' },
    { action: 'create', requestId: 'r', content: 'x'.repeat(30_001) },
    { action: 'memo_delete', id: 'm' }, { action: 'update', id: 'm', content: 'no' },
    { action: 'list', endpoint: 'https://example.com' },
  ]) await assert.rejects(f.service.run(input), isStatus(400));
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.service.run({ action: 'create', requestId: 'r', content: 'valid' }), isStatus(502));
  assert.deepEqual(f.calls.map(({ name }) => name), ['get_format_guide']);
  assert.equal(f.writes(), 0);
});

test('failed pending persistence prevents mutation and allows a safe later retry', async () => {
  const f = fixture({ persist: async (_value, count) => { if (count === 1) throw new Error('disk failure secret-credential'); } });
  const args = { action: 'create', requestId: 'r1', content: 'content' };
  await assert.rejects(f.service.run(args), (error) => isStatus(503)(error) && !error.message.includes('secret-credential'));
  assert.deepEqual(f.calls.map(({ name }) => name), ['get_format_guide']);
  assert.deepEqual(f.stored(), createFlomoState());
  await f.service.run(args);
  assert.equal(f.calls.filter(({ name }) => name === 'memo_create').length, 1);
});

test('ambiguous mutation error is persisted unknown and never repeated, including after reload', async () => {
  const f = fixture({ call: async ({ name }) => {
    if (name === 'get_format_guide') return result({ content: 'guide' });
    throw new Error('connection reset secret-credential');
  } });
  const args = { action: 'create', requestId: 'r1', content: 'content' };
  await assert.rejects(f.service.run(args), (error) => isStatus(409)(error) && /刷新 Flomo/.test(error.message) && !error.message.includes('secret-credential'));
  assert.equal(f.stored().receipts[0].status, 'unknown');
  await assert.rejects(f.service.run(args), isStatus(409));
  await assert.rejects(f.reload().run(args), isStatus(409));
  assert.equal(f.calls.filter(({ name }) => name === 'memo_create').length, 1);
});

test('restart converts incomplete pending to unknown before any external mutation', async () => {
  const f = fixture({ initial: { receipts: [{ id: 'r1', hash: digest('content'), status: 'pending' }] } });
  await assert.rejects(f.service.run({ action: 'create', requestId: 'r1', content: 'content' }), isStatus(409));
  assert.equal(f.stored().receipts[0].status, 'unknown');
  assert.equal(f.clients.length, 0);
  assert.equal(f.calls.length, 0);
});

test('post-mutation persistence failure keeps unknown locally and durable pending after reload', async () => {
  const f = fixture({ persist: async (_value, count) => { if (count > 1) throw new Error('disk full'); } });
  const args = { action: 'create', requestId: 'r1', content: 'content' };
  await assert.rejects(f.service.run(args), isStatus(409));
  assert.equal(f.stored().receipts[0].status, 'pending');
  await assert.rejects(f.service.run(args), isStatus(409));
  await assert.rejects(f.reload().run(args), isStatus(503));
  assert.equal(f.calls.filter(({ name }) => name === 'memo_create').length, 1);
});

test('malformed create success becomes unknown because the mutation may have happened', async () => {
  const f = fixture({ call: async ({ name }) => result(name === 'get_format_guide' ? { content: 'guide' } : { id: 'missing-metadata' }) });
  await assert.rejects(f.service.run({ action: 'create', requestId: 'r1', content: 'content' }), isStatus(409));
  assert.equal(f.stored().receipts[0].status, 'unknown');
});

test('receipt bounds preserve unresolved entries and reject a fully unresolved ledger', async () => {
  const entries = Array.from({ length: 100 }, (_, i) => ({ id: `r${i}`, hash: digest(`content${i}`), status: 'unknown' }));
  assert.equal(FlomoStateSchema.safeParse({ receipts: entries }).success, true);
  assert.equal(FlomoStateSchema.safeParse({ receipts: [...entries, { ...entries[0], id: 'overflow' }] }).success, false);
  const f = fixture({ initial: { receipts: entries } });
  await assert.rejects(f.service.run({ action: 'create', requestId: 'new', content: 'new' }), isStatus(409));
  assert.equal(f.calls.length, 0);
  const successful = fixture();
  await successful.service.run({ action: 'create', requestId: 'success', content: 'success' });
  const mixed = fixture({ initial: { receipts: [successful.stored().receipts[0], ...entries.slice(0, 99)] } });
  await mixed.service.run({ action: 'create', requestId: 'new', content: 'new' });
  assert.equal(mixed.stored().receipts.length, 100);
  assert.equal(mixed.stored().receipts.some(({ id }) => id === 'success'), false);
  assert.equal(mixed.stored().receipts.filter(({ status }) => status === 'unknown').length, 99);
});

test('invalid persisted receipts fail closed rather than resetting deduplication', async () => {
  const f = fixture({ initial: { receipts: [{ id: 'r', hash: 'invalid', status: 'pending' }] } });
  await assert.rejects(f.service.run({ action: 'create', requestId: 'r', content: 'content' }), isStatus(503));
  assert.equal(f.calls.length, 0);
});

test('deadline aborts a hung create and keeps an unknown receipt without resubmitting', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const entered = deferred();
  const f = fixture({ call: async ({ name }) => {
    if (name === 'get_format_guide') return result({ content: 'guide' });
    entered.resolve();
    return new Promise(() => {});
  } });
  const args = { action: 'create', requestId: 'r1', content: 'content' };
  const pending = f.service.run(args);
  const rejected = assert.rejects(pending, isStatus(409));
  await entered.promise;
  t.mock.timers.tick(20_000);
  await rejected;
  assert.equal(f.clients[0].context.signal.aborted, true);
  assert.equal(f.clients[0].closes, 1);
  assert.equal(f.stored().receipts[0].status, 'unknown');
  await assert.rejects(f.service.run(args), isStatus(409));
  assert.equal(f.calls.length, 2);
});

test('deadline also bounds token resolution and a hung initialization', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const stage of ['token', 'connect']) {
    const entered = deferred();
    const hang = async () => { entered.resolve(); return new Promise(() => {}); };
    const f = fixture(stage === 'token' ? { resolveToken: hang } : { connect: hang });
    const rejection = assert.rejects(f.service.run(), isStatus(504));
    await entered.promise;
    t.mock.timers.tick(20_000);
    await rejection;
    assert.equal(f.calls.length, 0);
    if (stage === 'connect') assert.equal(f.clients[0].closes, 1);
  }
});

test('close aborts outstanding reads, rejects queued creates and is idempotent', async () => {
  const entered = deferred();
  const f = fixture({ call: async () => { entered.resolve(); return new Promise(() => {}); } });
  const read = assert.rejects(f.service.run(), isStatus(503));
  await entered.promise;
  const queued = assert.rejects(f.service.run({ action: 'create', requestId: 'r', content: 'content' }), isStatus(503));
  const firstClose = f.service.close();
  assert.equal(f.service.close(), firstClose);
  await Promise.all([read, queued, firstClose]);
  assert.equal(f.clients[0].context.signal.aborted, true);
  assert.equal(f.clients[0].closes, 1);
  await assert.rejects(f.service.run(), isStatus(503));
  assert.equal(f.calls.length, 1);
});

test('close during pending persistence waits for storage and prevents a late mutation', async () => {
  const writing = deferred();
  const release = deferred();
  const f = fixture({ persist: async (_value, count) => {
    if (count === 1) { writing.resolve(); await release.promise; }
  } });
  const pending = assert.rejects(f.service.run({ action: 'create', requestId: 'r1', content: 'one' }), isStatus(503));
  await writing.promise;
  let closed = false;
  const closing = f.service.close().then(() => { closed = true; });
  await Promise.resolve();
  assert.equal(closed, false);
  release.resolve();
  await Promise.all([pending, closing]);
  assert.deepEqual(f.calls.map(({ name }) => name), ['get_format_guide']);
  assert.equal(f.stored().receipts[0].status, 'pending');
  await assert.rejects(f.reload().run({ action: 'create', requestId: 'r1', content: 'one' }), isStatus(409));
  assert.equal(f.stored().receipts[0].status, 'unknown');
});

test('close during a create saves unknown and prevents a queued second mutation', async () => {
  const entered = deferred();
  const f = fixture({ call: async ({ name }) => {
    if (name === 'get_format_guide') return result({ content: 'guide' });
    entered.resolve();
    return new Promise(() => {});
  } });
  const first = assert.rejects(f.service.run({ action: 'create', requestId: 'r1', content: 'one' }), isStatus(409));
  await entered.promise;
  const second = assert.rejects(f.service.run({ action: 'create', requestId: 'r2', content: 'two' }), isStatus(503));
  await f.service.close();
  await Promise.all([first, second]);
  assert.equal(f.stored().receipts[0].status, 'unknown');
  assert.equal(f.calls.filter(({ name }) => name === 'memo_create').length, 1);
});
