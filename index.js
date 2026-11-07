import { createDefaultState, createHomeService, HomeError, HomeStateSchema, LAYOUT, SEARCH_ENGINES } from './core.js';
import { createFlomoService, createFlomoState, FlomoStateSchema } from './flomo.js';
import { assetFetch, createWallpaperService, WallpaperSchema } from './media.js';

export const inject = ['connection', 'storageDomain', 'tools', 'credentials'];
const FLOMO_CREDENTIAL_REF = 'CHEN_HOME_FLOMO_TOKEN';

export const HOME_TOOL_PARAMETERS = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['get', 'task.add', 'task.update', 'task.delete', 'bookmark.save', 'bookmark.delete',
        'bookmark.move', 'layout.set', 'settings.update', 'timer.start', 'timer.pause', 'timer.reset', 'timer.mode', 'timer.complete'],
    },
    id: { type: 'string', description: 'Required for task.update/delete, bookmark.delete/move and timer.complete; bookmark.save edits this existing ID when supplied.' },
    title: { type: 'string', description: 'Required for task.add and bookmark.save; optional for task.update. 1–160 characters.' },
    area: { type: 'string', description: 'Task area, 1–24 characters. Default 项目; suggested 学习、求职、项目、创作、生活、资讯.' },
    done: { type: 'boolean', description: 'Completion state for task.update.' },
    url: { type: 'string', description: 'Required for bookmark.save: absolute http(s) URL, at most 2048 characters.' },
    category: { type: 'string', description: 'Bookmark category, 1–24 characters; new bookmarks default to 常用, edits retain the current category.' },
    mark: { type: 'string', description: 'Bookmark badge, 1–8 characters; new bookmarks default to the first two title characters.' },
    toIndex: { type: 'integer', description: 'Required for bookmark.move: zero-based destination within the current bookmark list.' },
    order: { type: 'array', items: { type: 'string', enum: [...LAYOUT] }, description: 'Required for layout.set: each of tasks, focus, projects, rhythm exactly once.' },
    expectedRevision: { type: 'integer', description: 'For layout.set/bookmark.move: use the revision from get to reject stale edits.' },
    settings: {
      type: 'object', additionalProperties: false,
      description: 'Required for settings.update; only supplied fields change. Active/paused timers keep their duration.',
      properties: {
        name: { type: 'string', description: 'Display name, 1–32 characters.' },
        focusMinutes: { type: 'integer', description: 'Focus duration, 1–120 minutes.' },
        breakMinutes: { type: 'integer', description: 'Break duration, 1–30 minutes.' },
        dailyGoal: { type: 'integer', description: 'Daily focus target, 1–16 sessions.' },
        searchEngine: { type: 'string', enum: [...SEARCH_ENGINES] },
        background: {
          type: 'object', additionalProperties: false, required: ['type', 'url', 'dim'],
          description: 'Wallpaper selection. Use empty url for presets; custom requires an https image URL or a URL returned by the wallpaper upload route.',
          properties: { type: { type: 'string', enum: ['aurora', 'ocean', 'forest', 'dusk', 'custom'] },
            url: { type: 'string' }, dim: { type: 'integer', minimum: 0, maximum: 80, description: 'Dark overlay percentage.' } },
        },
      },
    },
    taskId: { oneOf: [{ type: 'string' }, { type: 'null' }], description: 'For timer.start: optional existing task ID, or null to clear association. Omit to retain it.' },
    mode: { type: 'string', enum: ['focus', 'break'], description: 'Required for timer.mode; resets to idle without focus credit.' },
  },
  required: ['action'],
  additionalProperties: false,
};

export function createHomeTool(service) {
  return {
    name: 'chen_home',
    description: 'Read or update C哥’s home dashboard: tasks, bookmarks, card order, preferences and focus timer. Returns the current state (at most 200 tasks, 60 bookmarks and 1000 focus records). get settles elapsed timers once. timer.start starts/resumes; timer.reset discards progress; timer.complete requires the expired running timer’s ID. Breaks never start automatically.',
    parameters: HOME_TOOL_PARAMETERS,
    isConcurrencySafe: () => true,
    output: {
      schema: { type: 'object', description: 'Home state: version, revision, settings, tasks, bookmarks, layout, timer and focusLog.' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: (args) => service.run(args),
  };
}

export function createNotesTool(service) {
  return {
    name: 'chen_home_notes',
    description: 'Read C哥’s Flomo note timeline, search by words or tag, fetch a full note, or save explicitly requested note content. list returns up to 30 notes with an opaque nextBefore cursor; get retrieves a known ID. create requires a unique requestId: reuse the same ID and content after an uncertain result, never silently retry with a new ID. No update or delete operation. Credentials are configured only in Chen Home settings and never returned.',
    parameters: { type: 'object', additionalProperties: false, required: ['action'], properties: {
      action: { type: 'string', enum: ['list', 'get', 'create'] },
      keywords: { type: 'string', description: 'Optional search words for list; space-separated words are AND.' },
      tag: { type: 'string', description: 'Optional exact Flomo tag for list.' },
      before: { type: 'string', description: 'For older notes, pass nextBefore from the previous list with the same filters.' },
      id: { type: 'string', description: 'Required for get: note ID returned by list.' },
      content: { type: 'string', description: 'Required for create: the user-requested note, 1–30000 characters. Inline #tags are supported.' },
      requestId: { type: 'string', description: 'Required for create: unique stable ID (1–100 characters), retained for that exact note submission.' },
    } },
    isConcurrencySafe: () => true,
    output: { schema: { type: 'object' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    execute: (args) => {
      if (!['list', 'get', 'create'].includes(args?.action)) throw new HomeError('不支持此笔记操作。');
      return service.run(args);
    },
  };
}

export function createHomeFetchHandler(service, defaultAction = 'get') {
  return async (request) => {
    try {
      let args;
      if (request.method === 'GET') args = { action: defaultAction };
      else if (request.method === 'POST') {
        try { args = await request.json(); }
        catch { throw new HomeError('请求必须是有效的 JSON 对象。'); }
      } else {
        return Response.json({ error: '仅支持 GET 和 POST。' }, { status: 405, headers: { Allow: 'GET, POST' } });
      }
      const state = await service.run(args);
      return Response.json(state, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      const status = error instanceof HomeError ? error.status : 500;
      const message = error instanceof HomeError ? error.message : '主页数据读取或保存失败，请稍后重试。';
      return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}

export async function apply(ctx) {
  const domain = await ctx.storageDomain.open({
    // Storage unit names must match /^[a-z][a-z0-9_]*$/ (DSH storage contract).
    name: 'chen_home', version: 1,
    global: { schema: HomeStateSchema, initial: createDefaultState() },
    tables: {},
  });
  const service = createHomeService({ get: () => domain.global.get(), set: (state) => domain.global.set(state) });
  ctx.effect(() => async () => {
    await service.close();
    await domain.close();
  });
  ctx.provide('chenHome', service);
  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/chen-home', methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: createHomeFetchHandler(service),
  }));
  ctx.effect(() => ctx.tools.register(createHomeTool(service)));

  const notesDomain = await ctx.storageDomain.open({ name: 'chen_home_notes', version: 1,
    global: { schema: FlomoStateSchema, initial: createFlomoState() }, tables: {} });
  const notes = createFlomoService({
    resolveToken: async () => (await ctx.credentials.resolve(FLOMO_CREDENTIAL_REF))?.value,
    setToken: (token) => ctx.credentials.set(FLOMO_CREDENTIAL_REF, token),
    getReceipts: () => notesDomain.global.get(), setReceipts: (value) => notesDomain.global.set(value),
  });
  ctx.effect(() => async () => { await notes.close(); await notesDomain.close(); });
  ctx.provide('chenHomeNotes', notes);
  ctx.effect(() => ctx.connection.fetch.register({ path: '/api/chen-home/notes', methods: ['GET', 'POST'],
    requestBody: 'buffered', fetch: createHomeFetchHandler(notes, 'list') }));
  ctx.effect(() => ctx.tools.register(createNotesTool(notes)));

  const mediaDomain = await ctx.storageDomain.open({ name: 'chen_home_media', version: 1,
    layout: 'per-record', tables: { wallpapers: { valueSchema: WallpaperSchema } } });
  const wallpapers = createWallpaperService(mediaDomain.table('wallpapers'));
  ctx.effect(() => async () => { await wallpapers.close(); await mediaDomain.close(); });
  ctx.effect(() => ctx.connection.fetch.register({ path: '/api/chen-home/assets', methods: ['GET'],
    requestBody: 'buffered', fetch: assetFetch }));
  ctx.effect(() => ctx.connection.fetch.register({ path: '/api/chen-home/wallpaper', methods: ['GET', 'POST'],
    requestBody: 'buffered', fetch: (request) => wallpapers.fetch(request) }));
}
