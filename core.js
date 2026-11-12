import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createOnlinePhotoProvider } from './online.js';

export const LIMITS = Object.freeze({ tasks: 200, bookmarks: 60, focusLog: 1000 });
export const LAYOUT = Object.freeze(['tasks', 'focus', 'projects', 'rhythm']);
export const SEARCH_ENGINES = Object.freeze(['google', 'bing', 'baidu']);

const text = (max) => z.string().trim().min(1).max(max);
const idSchema = text(100);
const titleSchema = text(160);
const categorySchema = text(24);
const timestampSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const modeSchema = z.enum(['focus', 'break']);
export const DEFAULT_BACKGROUND = Object.freeze({ type: 'ocean', url: '', dim: 24 });
export const DEFAULT_BACKGROUND_ROTATION = Object.freeze({ mode: 'off', intervalMinutes: 30, lastChangedAt: 0 });
const backgroundUrlSchema = z.string().max(2048).refine((value) => {
  if (/^\/api\/dsh-home\/wallpaper\?id=[a-f0-9]{64}$/.test(value)) return true;
  if (!value || value.trim() !== value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
}, '背景图片请使用 https 链接或本地上传的图片。');
export const BackgroundSchema = z.object({
  type: z.enum(['aurora', 'ocean', 'forest', 'dusk', 'custom']),
  url: z.union([z.literal(''), backgroundUrlSchema]),
  dim: z.number().int().min(0).max(80),
}).strict().refine((value) => value.type !== 'custom' || value.url.length > 0, '请先选择一张背景图片。');
const backgroundRotationInputSchema = z.object({
  mode: z.enum(['off', 'daily', 'interval']),
  intervalMinutes: z.number().int().min(1).max(1440),
}).strict();
const backgroundRotationSchema = backgroundRotationInputSchema.extend({ lastChangedAt: timestampSchema });
const backgroundLibrarySchema = z.array(backgroundUrlSchema).max(20)
  .refine((urls) => new Set(urls).size === urls.length, '背景图片库不能有重复链接。');
const backgroundLibraryInputSchema = z.array(backgroundUrlSchema).max(20)
  .transform((urls) => [...new Set(urls)]).pipe(backgroundLibrarySchema);
const backgroundSourceSchema = z.enum(['local', 'unsplash', 'picsum']);
const onlinePhotoSchema = z.object({
  source: z.enum(['unsplash', 'picsum']), id: text(100), url: backgroundUrlSchema,
  author: text(160), page: z.string().max(2048).refine((value) => {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'unsplash.com' && !url.username && !url.password; }
    catch { return false; }
  }),
}).strict();
const settingsSchema = z.object({
  name: text(32),
  focusMinutes: z.number().int().min(1).max(120),
  breakMinutes: z.number().int().min(1).max(30),
  dailyGoal: z.number().int().min(1).max(16),
  searchEngine: z.enum(SEARCH_ENGINES),
  background: BackgroundSchema.default(() => ({ ...DEFAULT_BACKGROUND })),
  backgroundRotation: backgroundRotationSchema.default(() => ({ ...DEFAULT_BACKGROUND_ROTATION })),
  backgroundLibrary: backgroundLibrarySchema.default(() => []),
  backgroundSource: backgroundSourceSchema.default('local'),
  backgroundPhoto: onlinePhotoSchema.nullable().default(null),
}).strict();

export class HomeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'HomeError';
    this.status = status;
  }
}

export function normalizeUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HomeError('请输入完整的 http 或 https 网址。');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HomeError('网址仅支持 http 和 https。');
  }
  if (url.href.length > 2048) throw new HomeError('网址不能超过 2048 个字符。');
  return url.href;
}

const urlSchema = text(2048).refine((value) => {
  try { normalizeUrl(value); return true; } catch { return false; }
}, '网址必须是完整的 http 或 https 地址。');
const layoutSchema = z.array(z.enum(LAYOUT)).length(LAYOUT.length)
  .refine((order) => new Set(order).size === LAYOUT.length, '布局必须包含四个不同的模块。');

export const HomeStateSchema = z.object({
  version: z.literal(1),
  revision: revisionSchema,
  settings: settingsSchema,
  tasks: z.array(z.object({
    id: idSchema, title: titleSchema, area: categorySchema,
    done: z.boolean(), createdAt: timestampSchema,
  }).strict()).max(LIMITS.tasks),
  bookmarks: z.array(z.object({
    id: idSchema, title: titleSchema, url: urlSchema,
    category: categorySchema, mark: text(8),
  }).strict()).max(LIMITS.bookmarks),
  layout: layoutSchema,
  timer: z.object({
    id: idSchema, mode: modeSchema,
    status: z.enum(['idle', 'running', 'paused', 'completed']),
    durationMs: z.number().int().min(1).max(120 * 60_000),
    remainingMs: z.number().int().nonnegative().max(120 * 60_000),
    endsAt: timestampSchema.nullable(), taskId: idSchema.nullable(),
  }).strict(),
  focusLog: z.array(z.object({
    id: idSchema, completedAt: timestampSchema,
    minutes: z.number().int().min(1).max(120), taskId: idSchema.nullable(),
  }).strict()).max(LIMITS.focusLog),
}).strict().superRefine((state, ctx) => {
  for (const key of ['tasks', 'bookmarks', 'focusLog']) {
    if (new Set(state[key].map((item) => item.id)).size !== state[key].length) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'ID 不能重复。' });
    }
  }
  const timer = state.timer;
  if ((timer.status === 'running') !== (timer.endsAt !== null)
    || timer.remainingMs > timer.durationMs
    || (timer.status === 'completed' && timer.remainingMs !== 0)) {
    ctx.addIssue({ code: 'custom', path: ['timer'], message: '计时器状态不一致。' });
  }
});

const action = (name, shape = {}) => z.object({ action: z.literal(name), ...shape }).strict();
export const HomeActionSchema = z.discriminatedUnion('action', [
  action('get'),
  action('task.add', { title: titleSchema, area: categorySchema.optional() }),
  action('task.update', {
    id: idSchema, title: titleSchema.optional(), area: categorySchema.optional(), done: z.boolean().optional(),
  }),
  action('task.delete', { id: idSchema }),
  action('bookmark.save', {
    id: idSchema.optional(), title: titleSchema, url: urlSchema,
    category: categorySchema.optional(), mark: text(8).optional(),
  }),
  action('bookmark.delete', { id: idSchema }),
  action('bookmark.move', {
    id: idSchema, toIndex: z.number().int().nonnegative().max(LIMITS.bookmarks - 1),
    expectedRevision: revisionSchema.optional(),
  }),
  action('layout.set', { order: layoutSchema, expectedRevision: revisionSchema.optional() }),
  action('settings.update', { settings: settingsSchema.omit({ backgroundPhoto: true }).partial().extend({
    backgroundSource: backgroundSourceSchema.optional(),
    background: BackgroundSchema.optional(),
    backgroundRotation: backgroundRotationInputSchema.optional(),
    backgroundLibrary: backgroundLibraryInputSchema.optional(),
  }).strict() }),
  action('background.next'),
  action('timer.start', { taskId: idSchema.nullable().optional() }),
  action('timer.pause'),
  action('timer.reset'),
  action('timer.mode', { mode: modeSchema }),
  action('timer.complete', { id: idSchema }),
]);

export function createDefaultState() {
  const bookmarks = [
    ['github', 'GitHub', 'https://github.com/JavaArthur', '项目', 'GH'],
    ['ai-radar', 'AI 趋势雷达', 'https://javaarthur.github.io/ai-trend-radar/', '资讯', 'AI'],
    ['ai-reports', 'AI 研报', 'https://chat.aichanning.cn', '资讯', '研'],
    ['trading-review', '交易复盘', 'https://zz.aichanning.cn', '生活', '复'],
    ['langgraph', 'LangGraph', 'https://docs.langchain.com/oss/python/langgraph/overview', '学习', 'LG'],
    ['deepseek', 'DeepSeek', 'https://chat.deepseek.com', '常用', 'DS'],
    ['boss', 'BOSS直聘', 'https://www.zhipin.com', '求职', '聘'],
    ['youmind', 'YouMind', 'https://youmind.com', '创作', 'YM'],
  ].map(([id, title, url, category, mark]) => ({ id, title, url: normalizeUrl(url), category, mark }));
  return {
    version: 1, revision: 0,
    settings: { name: '朋友', focusMinutes: 25, breakMinutes: 5, dailyGoal: 4, searchEngine: 'google',
      background: { ...DEFAULT_BACKGROUND }, backgroundRotation: { ...DEFAULT_BACKGROUND_ROTATION }, backgroundLibrary: [],
      backgroundSource: 'local', backgroundPhoto: null },
    tasks: [], bookmarks, layout: [...LAYOUT],
    timer: { id: 'initial', mode: 'focus', status: 'idle', durationMs: 25 * 60_000,
      remainingMs: 25 * 60_000, endsAt: null, taskId: null },
    focusLog: [],
  };
}

function parseAction(input) {
  const result = HomeActionSchema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  throw new HomeError(`参数无效${issue.path.length ? `（${issue.path.join('.')}）` : ''}：${issue.message}`);
}

function findIndex(items, id, label) {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new HomeError(`${label}不存在，请刷新后重试。`, 404);
  return index;
}

function duration(state, mode) {
  return state.settings[mode === 'focus' ? 'focusMinutes' : 'breakMinutes'] * 60_000;
}

function resetTimer(state, mode, makeId) {
  const durationMs = duration(state, mode);
  state.timer = { id: makeId(), mode, status: 'idle', durationMs,
    remainingMs: durationMs, endsAt: null, taskId: state.timer.taskId };
}

function settleExpired(state, now) {
  const timer = state.timer;
  if (timer.status !== 'running' || now < timer.endsAt) return;
  if (timer.mode === 'focus' && !state.focusLog.some((entry) => entry.id === timer.id)) {
    state.focusLog.push({ id: timer.id, completedAt: timer.endsAt,
      minutes: timer.durationMs / 60_000, taskId: timer.taskId });
    state.focusLog = state.focusLog.slice(-LIMITS.focusLog);
  }
  timer.status = 'completed';
  timer.remainingMs = 0;
  timer.endsAt = null;
}

function nextBackground(state, now) {
  const { background, backgroundLibrary, backgroundRotation } = state.settings;
  const urls = [...backgroundLibrary];
  if (background.type === 'custom' && !urls.includes(background.url)) urls.push(background.url);
  const pool = ['ocean', 'forest', 'dusk'].map((type) => ({ type, url: '' }));
  pool.push(...urls.map((url) => ({ type: 'custom', url })));
  const index = pool.findIndex((item) => item.type === background.type
    && (item.type !== 'custom' || item.url === background.url));
  state.settings.background = { ...pool[(index + 1) % pool.length], dim: background.dim };
  backgroundRotation.lastChangedAt = now;
}

const shanghaiDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit' });
function backgroundDue(state, now) {
  const { mode, intervalMinutes, lastChangedAt } = state.settings.backgroundRotation;
  if (mode === 'off' || now <= lastChangedAt) return false;
  return mode === 'interval' ? now - lastChangedAt >= intervalMinutes * 60_000
    : shanghaiDay.format(now) !== shanghaiDay.format(lastChangedAt);
}
function settleBackground(state, now) {
  // Online selection is asynchronous and reconciled by the same serialized service below.
  if (state.settings.backgroundSource === 'local' && backgroundDue(state, now)) nextBackground(state, now);
}

function snapshot(state, now) {
  const result = structuredClone(state);
  if (result.timer.status === 'running') {
    result.timer.remainingMs = Math.max(0, Math.min(result.timer.durationMs, result.timer.endsAt - now));
  }
  return result;
}

function applyAction(state, args, now, makeId) {
  // A reset or mode switch discards the current interval without awarding focus credit.
  // Explicit completion validates its ID before reconciliation so a stale tab cannot complete a new timer.
  if (!['timer.reset', 'timer.mode', 'timer.complete'].includes(args.action)) settleExpired(state, now);
  switch (args.action) {
    case 'get': settleBackground(state, now); return;
    case 'background.next': if (state.settings.backgroundSource === 'local') nextBackground(state, now); return;
    case 'task.add':
      if (state.tasks.length >= LIMITS.tasks) throw new HomeError('最多保存 200 个任务。');
      state.tasks.push({ id: makeId(), title: args.title, area: args.area ?? '项目', done: false, createdAt: now });
      return;
    case 'task.update': {
      const task = state.tasks[findIndex(state.tasks, args.id, '任务')];
      for (const key of ['title', 'area', 'done']) if (args[key] !== undefined) task[key] = args[key];
      return;
    }
    case 'task.delete':
      state.tasks.splice(findIndex(state.tasks, args.id, '任务'), 1);
      if (state.timer.taskId === args.id) state.timer.taskId = null;
      return;
    case 'bookmark.save': {
      const index = args.id === undefined ? -1 : findIndex(state.bookmarks, args.id, '书签');
      if (index === -1 && state.bookmarks.length >= LIMITS.bookmarks) throw new HomeError('最多保存 60 个书签。');
      const previous = state.bookmarks[index];
      const bookmark = {
        id: previous?.id ?? makeId(), title: args.title, url: normalizeUrl(args.url),
        category: args.category ?? previous?.category ?? '常用',
        mark: args.mark ?? previous?.mark ?? Array.from(args.title).slice(0, 2).join(''),
      };
      if (index === -1) state.bookmarks.push(bookmark);
      else state.bookmarks[index] = bookmark;
      return;
    }
    case 'bookmark.delete':
      state.bookmarks.splice(findIndex(state.bookmarks, args.id, '书签'), 1);
      return;
    case 'bookmark.move': {
      const index = findIndex(state.bookmarks, args.id, '书签');
      if (args.toIndex >= state.bookmarks.length) throw new HomeError('书签目标位置超出范围。');
      const [bookmark] = state.bookmarks.splice(index, 1);
      state.bookmarks.splice(args.toIndex, 0, bookmark);
      return;
    }
    case 'layout.set': state.layout = [...args.order]; return;
    case 'settings.update': {
      const previous = state.settings;
      const rotation = args.settings.backgroundRotation;
      const background = args.settings.background;
      const sourceChanged = args.settings.backgroundSource !== undefined && args.settings.backgroundSource !== previous.backgroundSource;
      const resetRotation = sourceChanged || (rotation && (rotation.mode !== previous.backgroundRotation.mode
        || rotation.intervalMinutes !== previous.backgroundRotation.intervalMinutes))
        || (background && (background.type !== previous.background.type || background.url !== previous.background.url
          || background.dim !== previous.background.dim));
      state.settings = { ...previous, ...args.settings,
        backgroundRotation: { ...previous.backgroundRotation, ...rotation,
          lastChangedAt: resetRotation ? now : previous.backgroundRotation.lastChangedAt } };
      if (sourceChanged || (background && background.url !== previous.background.url)) state.settings.backgroundPhoto = null;
      // An untouched timer follows preferences; an active/paused interval keeps its original duration.
      if (state.timer.status === 'idle') {
        state.timer.durationMs = duration(state, state.timer.mode);
        state.timer.remainingMs = state.timer.durationMs;
      }
      return;
    }
    case 'timer.start': {
      if (args.taskId != null) findIndex(state.tasks, args.taskId, '任务');
      if (state.timer.status === 'running') {
        if (args.taskId !== undefined && args.taskId !== state.timer.taskId) {
          throw new HomeError('专注进行中，请先暂停再更换关联任务。', 409);
        }
        return;
      }
      if (state.timer.status === 'completed') resetTimer(state, state.timer.mode, makeId);
      if (args.taskId !== undefined) state.timer.taskId = args.taskId;
      state.timer.status = 'running';
      state.timer.endsAt = now + state.timer.remainingMs;
      return;
    }
    case 'timer.pause':
      if (state.timer.status !== 'running') return;
      state.timer.remainingMs = Math.max(0, Math.min(state.timer.durationMs, state.timer.endsAt - now));
      state.timer.status = 'paused';
      state.timer.endsAt = null;
      return;
    case 'timer.reset': resetTimer(state, state.timer.mode, makeId); return;
    case 'timer.mode': resetTimer(state, args.mode, makeId); return;
    case 'timer.complete':
      if (state.timer.id !== args.id || state.timer.status !== 'running' || now < state.timer.endsAt) {
        throw new HomeError('只有当前已到时的运行中计时器可以完成，请刷新状态。', 409);
      }
      settleExpired(state, now);
      return;
  }
}

/** The persistence adapter owns durable storage; failed writes never publish a draft. */
export function createHomeService({ get, set, now = Date.now, makeId = randomUUID, resolvePhoto = createOnlinePhotoProvider() }) {
  if (typeof get !== 'function' || typeof set !== 'function') throw new TypeError('Home storage requires get and set.');
  let state;
  let closed = false;
  let queue = Promise.resolve();
  let backgroundError = '', retryAfter = 0;

  async function execute(input) {
    const args = parseAction(input);
    if (state === undefined) state = HomeStateSchema.parse((await get()) ?? createDefaultState());
    if (args.expectedRevision !== undefined && args.expectedRevision !== state.revision) {
      throw new HomeError('页面数据已更新，请刷新后重试。', 409);
    }
    const time = now();
    const draft = structuredClone(state);
    applyAction(draft, args, time, makeId);
    const source = draft.settings.backgroundSource;
    const sourceChanged = source !== state.settings.backgroundSource;
    const onlineDue = source !== 'local' && (args.action === 'background.next' || sourceChanged
      || (args.action === 'get' && time >= retryAfter && backgroundDue(draft, time)));
    if (onlineDue) {
      try {
        const photo = onlinePhotoSchema.parse(await resolvePhoto({ source, excludeUrl: state.settings.background.url }));
        if (photo.source !== source || photo.url === state.settings.background.url) throw new Error('No new photo');
        draft.settings.background = { type: 'custom', url: photo.url, dim: draft.settings.background.dim };
        draft.settings.backgroundPhoto = photo;
        draft.settings.backgroundRotation.lastChangedAt = now();
        backgroundError = ''; retryAfter = 0;
      } catch {
        backgroundError = '在线图片暂时获取失败，已保留当前背景；稍后可点“换一张”重试。';
        retryAfter = now() + 60_000;
        if (args.action !== 'get') throw new HomeError(backgroundError, 503);
      }
    } else if (source === 'local') { backgroundError = ''; retryAfter = 0; }
    if (JSON.stringify(draft) !== JSON.stringify(state)) {
      draft.revision = state.revision + 1;
      const validated = HomeStateSchema.parse(draft);
      await set(structuredClone(validated));
      state = validated;
    }
    return { ...snapshot(state, now()), ...(backgroundError ? { backgroundError } : {}) };
  }

  return {
    run(args) {
      if (closed) return Promise.reject(new HomeError('主页服务已关闭。', 503));
      const result = queue.then(() => execute(args));
      // Preserve each caller's rejection while allowing the next queued action to run.
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
    async close() {
      closed = true;
      await queue;
    },
  };
}
