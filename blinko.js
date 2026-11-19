import { createHash } from 'node:crypto';
import { z } from 'zod';
import { HomeError } from './core.js';

// Blinko is a self-hosted note service. The public REST API under /api/v1 is
// authenticated with a per-account API key (Bearer). Unlike the Flomo path this
// adapter talks plain HTTP instead of MCP, because Blinko exposes a documented
// REST surface and the MCP bridge would only add a hop.

const DEFAULT_ENDPOINT = 'http://127.0.0.1:1111';
const TIMEOUT_MS = 20_000;
const RECEIPT_LIMIT = 100;
const PAGE_SIZE = 30;
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 4;
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

// Receipts keep their Flomo-era shape so both backends can share the storage
// domain without a migration: only the id/hash/status/note envelope is used.
export const BlinkoStateSchema = z.object({
  receipts: z.array(receiptSchema).max(RECEIPT_LIMIT),
}).strict().refine((state) => new Set(state.receipts.map(({ id }) => id)).size === state.receipts.length);

export function createBlinkoState() { return { receipts: [] }; }

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
  action('status'),
]);

const rawTagSchema = z.object({
  tag: z.object({ name: z.string().max(1000).nullish(), parent: z.union([z.number().int(), z.null()]).optional() }).nullish(),
}).nullish();
const rawAttachmentSchema = z.object({
  path: z.string().max(4096).nullish(), name: z.string().max(1000).nullish(), type: z.string().max(100).nullish(),
}).nullish();
const rawNoteSchema = z.object({
  id: z.union([idSchema, z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)]),
  type: z.number().int().optional(),
  content: z.string().max(1_000_000).nullish(),
  createdAt: dateSchema.optional(), updatedAt: dateSchema.nullish(),
  tags: z.array(rawTagSchema).max(1000).nullish(),
  attachments: z.array(rawAttachmentSchema).max(1000).nullish(),
});
const listSchema = z.array(rawNoteSchema).max(500);
const cursorSchema = z.object({ v: z.literal(1), p: z.number().int().min(1).max(10_000), q: z.string().length(64), t: z.string().max(200) }).strict();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const queryHash = (args) => hash(JSON.stringify([args.keywords || '', args.tag || '']));
const malformed = () => new HomeError('Blinko 返回了无法读取的数据，请稍后刷新。', 502);
const unknownOutcome = () => new HomeError('这次创建的结果未知，已停止自动重发。请先刷新笔记确认是否已保存，再决定是否手动重新创建。', 409);
const disposedError = () => new HomeError('笔记服务已关闭，请刷新页面后重试。', 503);

function safeError(error) {
  if (error instanceof HomeError) return error;
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return new HomeError('Blinko 请求超时，请稍后重试。', 504);
  return new HomeError('暂时无法连接 Blinko，请确认服务在运行且地址正确。', 502);
}

function tagNames(rawTags) {
  const names = [];
  for (const entry of rawTags ?? []) {
    const name = entry?.tag?.name;
    if (typeof name === 'string' && name && !names.includes(name)) names.push(name);
  }
  return names;
}

function normalizeFiles(attachments, endpoint) {
  const files = [];
  for (const attachment of attachments ?? []) {
    const path = attachment?.path;
    if (typeof path !== 'string' || !path) continue;
    let url;
    try { url = new URL(path, `${endpoint.replace(/\/+$/, '')}/`).toString(); } catch { continue; }
    const name = typeof attachment?.name === 'string' ? attachment.name : '';
    const type = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(name || path) ? 'image' : 'file';
    files.push({ type, url });
  }
  return files.slice(0, 100);
}

function normalizeNote(raw, endpoint, content) {
  const created = raw.createdAt ?? new Date().toISOString();
  return {
    id: String(raw.id),
    content: content ?? raw.content ?? '',
    createdAt: new Date(created).toISOString(),
    updatedAt: new Date(raw.updatedAt ?? created).toISOString(),
    tags: tagNames(raw.tags),
    url: `${endpoint.replace(/\/+$/, '')}/`,
    contentTruncated: content === undefined ? false : false,
    files: normalizeFiles(raw.attachments, endpoint),
  };
}

function compareNotes(a, b) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id === b.id ? 0 : Number(b.id) - Number(a.id) || (a.id < b.id ? 1 : -1));
}

function parseCursor(before, args) {
  if (!before) return null;
  if (!before.startsWith('blinko:')) throw new HomeError('笔记分页位置无效，请刷新列表。');
  try {
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(before.slice(7), 'base64url').toString('utf8')));
    if (cursor.q !== queryHash(args) || cursor.t !== (args.tag || '')) throw new Error('query changed');
    return cursor;
  } catch { throw new HomeError('笔记分页位置无效，请刷新列表。'); }
}

function encodeCursor(page, args) {
  return `blinko:${Buffer.from(JSON.stringify({ v: 1, p: page, q: queryHash(args), t: args.tag || '' })).toString('base64url')}`;
}

/** Shared Host operations. fetchImpl substitutes the transport in offline tests. */
export function createBlinkoService({
  endpoint = DEFAULT_ENDPOINT, resolveToken, setToken, getReceipts, setReceipts,
  fetchImpl = (...args) => globalThis.fetch(...args),
}) {
  let disposed = false;
  let closePromise;
  let createQueue = Promise.resolve();
  let state;
  const operations = new Set();
  const base = () => endpoint.replace(/\/+$/, '');

  async function persist(next) {
    try { await setReceipts(structuredClone(next)); } catch {
      throw new HomeError('无法保存笔记创建回执，请检查本地存储后重试。', 503);
    }
    state = next;
  }

  async function loadReceipts() {
    if (state) return;
    let parsed;
    try { parsed = BlinkoStateSchema.safeParse(getReceipts()); } catch {
      throw new HomeError('无法读取笔记创建回执，暂不能创建笔记。', 503);
    }
    if (!parsed.success) throw new HomeError('笔记创建回执损坏，暂不能创建笔记。', 503);
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
    aborted.catch(() => {});
    const onAbort = () => rejectAbort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new HomeError('Blinko 请求超时，请稍后重试。', 504)), TIMEOUT_MS);
    const operation = {
      controller,
      check: () => signal.throwIfAborted(),
      wait: (fn) => Promise.race([Promise.resolve().then(() => { signal.throwIfAborted(); return fn(); }), aborted]),
    };
    operations.add(operation);
    operation.done = (async () => {
      try { return await work(operation); } catch (error) { throw safeError(error); } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        operations.delete(operation);
      }
    })();
    return operation.done;
  }

  async function request(operation, token, path, body) {
    operation.check();
    let response;
    try {
      response = await fetchImpl(`${base()}/api/v1${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body ?? {}),
        redirect: 'error',
        signal: operation.controller.signal,
      });
    } catch (error) { throw safeError(error); }
    if (response.status === 401 || response.status === 403) {
      throw new HomeError('Blinko API Key 无效或已过期，请重新配置。', 401);
    }
    if (!response.ok) {
      if (response.status === 429) throw new HomeError('Blinko 请求过于频繁，请稍后重试。', 503);
      throw new HomeError('Blinko 未能完成请求，请检查服务状态后重试。', 502);
    }
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { throw malformed(); }
  }

  async function list(operation, token, args) {
    const cursor = parseCursor(args.before, args);
    let page = cursor ? cursor.p : 1;
    const found = new Map();
    let hasMore = false;
    for (let attempt = 0; attempt < MAX_PAGES; attempt += 1) {
      const payload = await request(operation, token, '/note/list', {
        searchText: args.keywords || '', size: FETCH_PAGE_SIZE, page, isUseAiQuery: false,
      });
      const parsed = listSchema.safeParse(payload);
      if (!parsed.success) throw malformed();
      const notes = parsed.data.map((raw) => normalizeNote(raw, base()));
      const wanted = args.tag ? notes.filter((note) => note.tags.some((tag) => tag.toLowerCase() === args.tag.toLowerCase())) : notes;
      for (const note of wanted) if (!found.has(note.id)) found.set(note.id, note);
      hasMore = parsed.data.length >= FETCH_PAGE_SIZE;
      if (found.size > PAGE_SIZE || !hasMore) break;
      page += 1;
    }
    const notes = [...found.values()].sort(compareNotes).slice(0, PAGE_SIZE);
    const nextBefore = hasMore || found.size > PAGE_SIZE ? encodeCursor(page + 1, args) : null;
    return { configured: true, notes, hasMore: nextBefore !== null, nextBefore, syncedAt: Date.now() };
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
      if (oldestSuccess === -1) throw new HomeError('待确认的笔记创建回执已达上限，请先核对已有记录。', 409);
      receipts.splice(oldestSuccess, 1);
    }
    const pending = { id: args.requestId, hash: contentHash, status: 'pending' };
    await persist({ receipts: [...receipts, pending] });
    operation.check();
    try {
      const raw = await request(operation, token, '/note/upsert', { content: args.content, type: 0 });
      const parsed = rawNoteSchema.safeParse(raw);
      if (!parsed.success) throw malformed();
      const note = normalizeNote(parsed.data, base(), args.content);
      await persist({ receipts: state.receipts.map((receipt) => receipt.id === args.requestId ? { ...pending, status: 'success', note } : receipt) });
      return { note: structuredClone(note) };
    } catch (error) {
      state = { receipts: state.receipts.map((receipt) => receipt.id === args.requestId ? { ...pending, status: 'unknown' } : receipt) };
      try { await persist(state); } catch { /* The pending receipt already blocks retries. */ }
      if (error instanceof HomeError && error.status === 401) throw error;
      throw unknownOutcome();
    }
  }

  async function execute(args) {
    return withOperation(async (operation) => {
      if (args.action === 'configure') {
        try { await setToken(args.token); } catch { throw new HomeError('无法保存 Blinko API Key，请检查本地存储后重试。', 503); }
        operation.check();
        return { configured: true };
      }
      const resolved = await operation.wait(() => resolveToken());
      if (args.action === 'status') return { configured: !(resolved === undefined || resolved === null || resolved === '') };
      if (resolved === undefined || resolved === null || resolved === '') {
        if (args.action === 'list') return { configured: false, notes: [], hasMore: false, nextBefore: null, syncedAt: Date.now() };
        throw new HomeError('请先配置 Blinko API Key。', 401);
      }
      const parsedToken = tokenSchema.safeParse(resolved);
      if (!parsedToken.success) throw new HomeError('Blinko API Key 无效，请重新配置。', 401);
      if (args.action === 'create') return create(operation, args, parsedToken.data);
      if (args.action === 'list') return list(operation, parsedToken.data, args);
      const raw = await request(operation, parsedToken.data, '/note/detail', { id: Number(args.id) || args.id });
      const parsed = rawNoteSchema.safeParse(raw);
      if (!parsed.success) throw new HomeError('这条笔记不存在或暂时无法读取。', 404);
      return { note: normalizeNote(parsed.data, base()) };
    });
  }

  return {
    run(input = { action: 'list' }) {
      if (disposed) return Promise.reject(disposedError());
      const parsed = actionsSchema.safeParse(input);
      if (!parsed.success) return Promise.reject(new HomeError('笔记参数无效，请检查操作、内容长度或分页位置。'));
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
