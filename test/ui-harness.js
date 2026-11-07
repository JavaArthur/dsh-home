import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDefaultState, createHomeService } from '../core.js';

export const browserConfigured = Boolean(process.env.CHEN_SCROLL_PLAYWRIGHT && process.env.CHEN_SCROLL_REACT_UMD_DIR);
const root = fileURLToPath(new URL('../', import.meta.url));
export async function launchBrowser() {
  const { chromium } = await import(pathToFileURL(process.env.CHEN_SCROLL_PLAYWRIGHT).href);
  return chromium.launch({ headless: true, ...(process.env.CHEN_SCROLL_BROWSER ? { executablePath: process.env.CHEN_SCROLL_BROWSER } : {}) });
}
const themes = {
  light: ['#f5f6f8', '#ffffff', '#eef0f3', '#242832', '#626976', '#dce0e5', '#4565aa', '#34765c', '#986e27'],
  dark: ['#17191d', '#21242a', '#2d3139', '#f0f1f4', '#a6aeba', '#3b414b', '#a9c1ff', '#80c6a5', '#d9b56d'],
};
export async function mountHome(browser, { width = 1440, height = 1000, theme = 'light', language = 'zh', empty = false, notesFailure = false, homeFailure = false, delayed = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  await page.clock.install({ time: new Date('2026-11-08T09:30:00+08:00') });
  const tokens = ['bg-base', 'bg-layer-1', 'bg-layer-2', 'label-primary', 'label-secondary', 'border-l1', 'brand-primary', 'state-success-primary', 'state-warn-primary'];
  const fixture = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{height:100%;margin:0}body{overflow:hidden;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;${tokens.map((key, i) => `--dsw-alias-${key}:${themes[theme][i]}`).join(';')}}#fixture-label{height:30px;display:flex;align-items:center;padding:0 14px;font-size:11px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}#root{height:calc(100% - 30px);min-height:0}</style></head><body><div id="fixture-label">隔离回归 · 真实 Chen Home 生产组件 · 演示数据 / 非宿主验收</div><div id="root"></div></body></html>`;
  const state = createDefaultState();
  state.settings.name = 'C哥';
  if (!empty) state.tasks = [
    { id: 'fixture-learn', title: '跑通 Agent 记忆小实验，留下复现记录', area: '学习', done: false, createdAt: Date.now() },
    { id: 'fixture-career', title: '把一个项目经历整理成面试案例', area: '求职', done: false, createdAt: Date.now() },
    { id: 'fixture-work', title: '完成作品首页的第一版', area: '创作', done: false, createdAt: Date.now() },
    { id: 'fixture-life', title: '散步 20 分钟', area: '生活', done: true, createdAt: Date.now() },
  ];
  let stored = state;
  let clock = Date.parse('2026-11-08T09:30:00+08:00');
  const service = createHomeService({ get: async () => stored, set: async (value) => { stored = value; }, now: () => clock });
  const notes = empty ? [] : [
    { id: 'fixture-note-1', content: '把学习变成一个能运行的小作品。\n\n今天的实验先回答一个问题：Agent 在什么情况下应该主动回忆？先建立可复现的输入，再看检索结果如何影响下一步。\n\n**一个清晰的问题，比十个模糊的待办更有用。**', tags: ['学习/Agent', '小实验'], createdAt: clock - 600000, files: [] },
    { id: 'fixture-note-2', content: '面试案例要讲清三个节点：\n• 当时的约束是什么\n• 我做了什么选择\n• 结果如何被验证\n\n==用一个具体的变化，让经历有重量。==', tags: ['求职', '复盘'], createdAt: clock - 3600000, files: [] },
    { id: 'fixture-note-3', content: '傍晚散步时想到，好的工作台应该帮我安静地回到手边这件事。\n\n给任务留位置，也给生活留一点空白。', tags: ['日常'], createdAt: clock - 86400000, files: [] },
  ].map((note) => ({ ...note, updatedAt: note.createdAt, contentTruncated: false, url: 'https://flomoapp.com' }));
  const calls = [], errors = [], controls = { notesFailure, homeFailure, delayed };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url()), body = request.postDataJSON();
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: fixture });
    if (url.pathname === '/api/chen-home') {
      calls.push({ endpoint: 'home', ...(body || { action: 'get' }) });
      if (controls.delayed) await new Promise((resolve) => { controls.release = resolve; });
      if (controls.homeFailure) return route.fulfill({ status: 503, json: { error: 'serviceUnavailable' } });
      clock = await page.evaluate(() => Date.now());
      try { return await route.fulfill({ json: await service.run(body || { action: 'get' }) }); }
      catch (error) { return route.fulfill({ status: error.status || 400, json: { error: error.message } }); }
    }
    if (url.pathname === '/api/chen-home/notes') {
      calls.push({ endpoint: 'notes', ...body });
      if (controls.notesFailure) return route.fulfill({ status: 503, json: { error: 'flomoUnavailable' } });
      if (body.action === 'list') return route.fulfill({ json: { configured: true, notes: notes.filter((note) => (!body.keywords || note.content.includes(body.keywords)) && (!body.tag || note.tags.includes(body.tag))), hasMore: false, nextBefore: null, syncedAt: clock } });
      // No create endpoint: UI tests must never submit a note, even to this fixture.
      errors.push(`Unexpected note action: ${body.action}`);
      return route.fulfill({ status: 400, json: { error: 'invalidParameters' } });
    }
    if (url.pathname === '/api/chen-home/assets') {
      const name = url.searchParams.get('name');
      if (name && basename(name) === name) {
        try { return await route.fulfill({ body: await readFile(join(root, 'assets', name)), contentType: name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.png') ? 'image/png' : 'image/jpeg' }); } catch { /* unavailable image exercises the fallback */ }
      }
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('https://chen-home.test/');
  const boot = async () => {
  for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: join(process.env.CHEN_SCROLL_REACT_UMD_DIR, file) });
  await page.evaluate((active) => {
    const dictionaries = {}, snapshot = { active };
    window.__sessionDrafts = [];
    const ctx = {
      effect: (effect) => effect(),
      locale: { register: (namespace, locale, messages) => { dictionaries[locale] = messages; }, subscribe: () => () => {}, getSnapshot: () => snapshot, bind: () => (key) => dictionaries[active]?.[key] || key },
      uiWorkspace: { startSession: (...args) => window.__sessionDrafts.push(args) },
      slots: { inject: (name, register) => register(), register: (options, component) => { if (options.name === 'main') window.__main = component; } },
    };
    window.__ModuleLoader__ = { load: ({ factory }) => factory(() => window.React).apply(ctx) };
  }, language);
  await page.addScriptTag({ path: join(root, 'client.js') });
  await page.evaluate(() => window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(window.__main)));
  };
  await boot();
  if (!homeFailure && !delayed) await page.locator('.ch-topbar').waitFor();
  return { page, context, calls, errors, controls, state: () => stored, reload: async () => { await page.reload(); await boot(); await page.locator('.ch-topbar').waitFor(); }, close: async () => { await context.close(); await service.close(); } };
}
