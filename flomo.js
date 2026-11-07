import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import { HomeError } from './core.js';

const ENDPOINT = 'https://flomoapp.com/mcp';
const TIMEOUT_MS = 20_000;
const RECEIPT_LIMIT = 100;
const PAGE_SIZE = 30;
const SEARCH_LIMIT = 50;
const idSchema = z.string().min(1).max(100);
const dateSchema = z.iso.datetime({ offset: true });
const httpUrlSchema = z.string().max(4096).refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
});
const filesSchema = z.array(z.object({ type: z.string().max(100), url: httpUrlSchema })).max(100);
const noteSchema = z.object({
  id: idSchema, content: z.string().max(1_000_000),
  createdAt: dateSchema, updatedAt: dateSchema,
  tags: z.array(z.string().max(1000)).max(1000), url: httpUrlSchema,
  contentTruncated: z.boolean(), files: filesSchema,
}).strict();
const receiptSchema = z.object({
  id: idSchema, hash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(['pending', 'success', 'unknown']), note: noteSchema.optional(),
}).strict().refine((receipt) => (receipt.status === 'success') === (receipt.note !== undefined));

export const FlomoStateSchema = z.object({
  receipts: z.array(receiptSchema).max(RECEIPT_LIMIT),
}).strict().refine((state) => new Set(state.receipts.map(({ id }) => id)).size === state.receipts.length);

export function createFlomoState() { return { receipts: [] }; }

const action = (name, shape = {}) => z.object({ action: z.literal(name), ...shape }).strict();
const tokenSchema = z.string().trim().min(1).max(2048).refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const actionsSchema = z.discriminatedUnion('action', [
  action('list', {
    keywords: z.string().trim().max(1000).optional(), tag: z.string().trim().max(200).optional(),
    before: z.string().min(1).max(2048).optional(),
  }),
  action('get', { id: idSchema }),
  action('create', {
    content: z.string().min(1).max(30_000).refine((value) => value.trim().length > 0), requestId: idSchema,
  }),
  action('configure', { token: tokenSchema }),
]);
const rawNoteSchema = z.object({
  id: z.union([idSchema, z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)]),
  content: z.string().max(1_000_000).optional(),
  created_at: dateSchema, updated_at: dateSchema.nullish(),
  tags: z.array(z.string().max(1000)).max(1000).nullish(), url: httpUrlSchema,
  content_truncated: z.boolean().optional(), files: filesSchema.nullish(),
});
const searchSchema = z.object({ memos: z.array(rawNoteSchema).max(SEARCH_LIMIT).nullable().transform((value) => value ?? []) });
const batchSchema = z.object({
  memos: z.array(rawNoteSchema).max(1).nullable().transform((value) => value ?? []),
  omitted_ids: z.array(z.union([idSchema, z.number().int().nonnegative()])).nullish().transform((value) => value ?? []),
  truncated: z.boolean().optional(),
});
const cursorSchema = z.object({ v: z.literal(1), at: dateSchema, id: idSchema, query: z.string().length(64) }).strict();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const queryHash = (args) => hash(JSON.stringify([args.keywords || '', args.tag || '']));
const malformed = () => new HomeError('Flomo 返回了无法读取的数据，请稍后刷新。', 502);
const unknownOutcome = () => new HomeError('这次创建的结果未知，已停止自动重发。请先刷新 Flomo 确认是否已保存，再决定是否手动重新创建。', 409);
const disposedError = () => new HomeError('Flomo 服务已关闭，请刷新页面后重试。', 503);

function parseResponse(result, schema) {
  if (!result || typeof result !== 'object' || result.isError) {
    throw new HomeError('Flomo 未能完成请求，请检查连接或凭据后重试。', 502);
  }
  let value = result.structuredContent;
  if (value === undefined) {
    const text = Array.isArray(result.content)
      ? result.content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n') : '';
    try { value = JSON.parse(text); } catch { throw malformed(); }
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw malformed();
  return parsed.data;
}

function normalizeNote(raw, content) {
  // Flomo omits content for image-only memos; attachments are their body.
  if (content === undefined && raw.content === undefined && !raw.files?.length) throw malformed();
  return {
    id: String(raw.id), content: content ?? raw.content ?? '',
    createdAt: new Date(raw.created_at).toISOString(),
    updatedAt: new Date(raw.updated_at ?? raw.created_at).toISOString(),
    tags: raw.tags ?? [], url: raw.url,
    contentTruncated: content === undefined ? (raw.content_truncated ?? false) : false,
    files: raw.files ?? [],
  };
}

function compareNotes(a, b) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id === b.id ? 0 : a.id < b.id ? 1 : -1);
}

function parseCursor(before, args) {
  if (!before) return null;
  if (!before.startsWith('flomo:')) {
    if (!dateSchema.safeParse(before).success) throw new HomeError('笔记分页位置无效，请刷新列表。');
    return { at: new Date(before).toISOString() };
  }
  try {
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(before.slice(6), 'base64url').toString('utf8')));
    if (cursor.query !== queryHash(args)) throw new Error('query changed');
    return cursor;
  } catch { throw new HomeError('笔记分页位置无效，请刷新列表。'); }
}

function olderThan(note, cursor) {
  if (!cursor) return true;
  const difference = Date.parse(note.createdAt) - Date.parse(cursor.at);
  return difference < 0 || (difference === 0 && cursor.id !== undefined && note.id < cursor.id);
}

// Flomo interprets end_date as an inclusive calendar day in Asia/Shanghai.
function shanghaiDay(iso) { return new Date(Date.parse(iso) + 8 * 3_600_000).toISOString().slice(0, 10); }

function safeError(error) {
  if (error instanceof HomeError) return error;
  if (error?.code === 401 || error?.code === 403 || error?.name === 'UnauthorizedError') {
    return new HomeError('Flomo 凭据无效或已过期，请重新配置。', 401);
  }
  if (error?.code === 429) return new HomeError('Flomo 请求过于频繁，请稍后重试。', 503);
  return new HomeError('暂时无法连接 Flomo，请稍后重试。', 502);
}

/** Shared Host operations. makeClient substitutes only the SDK client in offline tests. */
export function createFlomoService({ resolveToken, setToken, getReceipts, setReceipts, makeClient = () => new Client({ name: 'chen-home', version: '0.2.0' }) }) {
  let disposed = false;
  let closePromise;
  let createQueue = Promise.resolve();
  let state;
  const operations = new Set();

  async function persist(next) {
    try { await setReceipts(structuredClone(next)); } catch {
      throw new HomeError('无法保存 Flomo 创建回执，请检查本地存储后重试。', 503);
    }
    state = next;
  }

  async function loadReceipts() {
    if (state) return;
    let parsed;
    try { parsed = FlomoStateSchema.safeParse(getReceipts()); } catch {
      throw new HomeError('无法读取 Flomo 创建回执，暂不能创建笔记。', 503);
    }
    if (!parsed.success) throw new HomeError('Flomo 创建回执损坏，暂不能创建笔记。', 503);
    state = parsed.data;
    if (state.receipts.some(({ status }) => status === 'pending')) {
      await persist({ receipts: state.receipts.map((receipt) => receipt.status === 'pending' ? { ...receipt, status: 'unknown' } : receipt) });
    }
  }

  function withOperation(work) {
    if (disposed) return Promise.reject(disposedError());
    const controller = new AbortController();
    const { signal } = controller;
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    // The abort may occur while awaiting local persistence, outside a race.
    aborted.catch(() => {});
    const onAbort = () => rejectAbort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new HomeError('Flomo 请求超时，请稍后重试。', 504)), TIMEOUT_MS);
    const operation = {
      controller, client: null, transport: null,
      check: () => signal.throwIfAborted(),
      wait: (fn) => Promise.race([Promise.resolve().then(() => { signal.throwIfAborted(); return fn(); }), aborted]),
    };
    operations.add(operation);
    operation.done = (async () => {
      try { return await work(operation); } catch (error) { throw safeError(error); } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        // close() aborts transport I/O; it does not DELETE a remote memo or session.
        const closing = [operation.client, operation.transport].filter(Boolean)
          .map((resource) => Promise.resolve().then(() => resource.close()));
        let cleanupTimer;
        await Promise.race([
          Promise.allSettled(closing),
          new Promise((resolve) => { cleanupTimer = setTimeout(resolve, 1000); }),
        ]);
        clearTimeout(cleanupTimer);
        operations.delete(operation);
      }
    })();
    return operation.done;
  }

  async function connect(operation, token) {
    operation.check();
    operation.client = makeClient({ token, signal: operation.controller.signal });
    operation.transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
      requestInit: { headers: { Authorization: `Bearer ${token}` }, redirect: 'error' },
      reconnectionOptions: { maxReconnectionDelay: 1000, initialReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1, maxRetries: 0 },
    });
    await operation.wait(() => operation.client.connect(operation.transport, { signal: operation.controller.signal, timeout: TIMEOUT_MS }));
  }

  function call(operation, name, args, schema) {
    return operation.wait(() => operation.client.callTool({ name, arguments: args }, undefined, {
      signal: operation.controller.signal, timeout: TIMEOUT_MS,
    })).then((result) => parseResponse(result, schema));
  }

  async function list(operation, args) {
    const cursor = parseCursor(args.before, args);
    let boundary = cursor;
    let limited = false;
    const found = new Map();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const day = boundary ? shanghaiDay(boundary.at) : undefined;
      const data = await call(operation, 'memo_search', {
        limit: SEARCH_LIMIT, ...(args.keywords ? { keywords: args.keywords } : {}),
        ...(args.tag ? { tag: args.tag } : {}), ...(day ? { end_date: day } : {}),
      }, searchSchema);
      const notes = data.memos.map((raw) => normalizeNote(raw)).sort(compareNotes);
      if (new Set(notes.map(({ id }) => id)).size !== notes.length) throw malformed();
      const eligible = notes.filter((note) => olderThan(note, boundary));
      for (const note of eligible) found.set(note.id, note);
      if (found.size > PAGE_SIZE || notes.length < SEARCH_LIMIT) break;
      const oldest = eligible.at(-1);
      if (!oldest || shanghaiDay(oldest.createdAt) === day || attempt === 2) {
        limited = true;
        break;
      }
      boundary = { at: oldest.createdAt, id: oldest.id };
    }
    const notes = [...found.values()].sort(compareNotes).slice(0, PAGE_SIZE);
    const hasMore = found.size > PAGE_SIZE;
    const last = notes.at(-1);
    return {
      configured: true, notes, hasMore,
      nextBefore: hasMore ? `flomo:${Buffer.from(JSON.stringify({ v: 1, at: last.createdAt, id: last.id, query: queryHash(args) })).toString('base64url')}` : null,
      syncedAt: Date.now(),
      ...(limited ? { paginationLimited: true, message: 'Flomo 每次最多返回 50 条，且只能按天筛选；当前日期窗口无法继续完整翻页，请用关键词或标签缩小范围。' } : {}),
    };
  }

  async function create(operation, args, token) {
    await loadReceipts();
    operation.check();
    const contentHash = hash(args.content);
    const existing = state.receipts.find(({ id }) => id === args.requestId);
    if (existing) {
      if (existing.hash !== contentHash) throw new HomeError('这个 requestId 已用于其他内容，请为新内容使用新的 requestId。', 409);
      if (existing.status !== 'success') throw unknownOutcome();
      return { note: structuredClone(existing.note) };
    }
    const receipts = [...state.receipts];
    if (receipts.length >= RECEIPT_LIMIT) {
      const oldestSuccess = receipts.findIndex(({ status }) => status === 'success');
      if (oldestSuccess === -1) throw new HomeError('待确认的 Flomo 创建回执已达上限，请先核对已有记录。', 409);
      receipts.splice(oldestSuccess, 1);
    }
    await connect(operation, token);
    await call(operation, 'get_format_guide', {}, z.object({ content: z.string() }));
    const pending = { id: args.requestId, hash: contentHash, status: 'pending' };
    await persist({ receipts: [...receipts, pending] });
    operation.check();
    try {
      const raw = await call(operation, 'memo_create', { content: args.content, format: 'markdown' }, rawNoteSchema);
      const note = normalizeNote(raw, args.content);
      await persist({ receipts: state.receipts.map((receipt) => receipt.id === args.requestId ? { ...pending, status: 'success', note } : receipt) });
      return { note: structuredClone(note) };
    } catch {
      // Retain the durable pending receipt if the follow-up write fails. A restart
      // treats it as unknown, and this instance also refuses to submit it again.
      state = { receipts: state.receipts.map((receipt) => receipt.id === args.requestId ? { ...pending, status: 'unknown' } : receipt) };
      try { await persist(state); } catch { /* The pending receipt already blocks retries. */ }
      throw unknownOutcome();
    }
  }

  async function execute(args) {
    return withOperation(async (operation) => {
      if (args.action === 'configure') {
        try { await setToken(args.token); } catch { throw new HomeError('无法保存 Flomo 凭据，请检查本地存储后重试。', 503); }
        operation.check();
        return { configured: true };
      }
      const resolved = await operation.wait(() => resolveToken());
      if (resolved === undefined || resolved === null || resolved === '') {
        if (args.action === 'list') return { configured: false, notes: [], hasMore: false, nextBefore: null, syncedAt: Date.now() };
        throw new HomeError('请先配置 Flomo 凭据。', 401);
      }
      const parsedToken = tokenSchema.safeParse(resolved);
      if (!parsedToken.success) throw new HomeError('Flomo 凭据无效，请重新配置。', 401);
      if (args.action === 'create') return create(operation, args, parsedToken.data);
      // Validate cursors before opening a connection.
      if (args.action === 'list') parseCursor(args.before, args);
      await connect(operation, parsedToken.data);
      if (args.action === 'list') return list(operation, args);
      const data = await call(operation, 'memo_batch_get', { ids: [args.id] }, batchSchema);
      const raw = data.memos.find((memo) => String(memo.id) === args.id);
      if (!raw) {
        if (data.memos.length) throw malformed();
        throw new HomeError('这条 Flomo 笔记不存在或暂时无法读取。', 404);
      }
      const note = normalizeNote(raw);
      note.contentTruncated ||= data.truncated === true;
      return { note };
    });
  }

  return {
    run(input = { action: 'list' }) {
      if (disposed) return Promise.reject(disposedError());
      const parsed = actionsSchema.safeParse(input);
      if (!parsed.success) return Promise.reject(new HomeError('Flomo 参数无效，请检查操作、内容长度或分页位置。'));
      if (parsed.data.action !== 'create') return execute(parsed.data);
      const result = createQueue.then(() => execute(parsed.data));
      createQueue = result.catch(() => {});
      return result;
    },
    close() {
      if (!closePromise) {
        disposed = true;
        for (const operation of operations) operation.controller.abort(disposedError());
        closePromise = Promise.allSettled([...operations].map((operation) => operation.done).concat(createQueue)).then(() => {});
      }
      return closePromise;
    },
  };
}
