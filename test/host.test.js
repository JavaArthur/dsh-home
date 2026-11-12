import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, createHomeService } from '../core.js';
import { apply, createHomeFetchHandler, createHomeTool, inject } from '../index.js';

function fixture() {
  let stored = createDefaultState();
  let fail = false;
  const service = createHomeService({
    get: () => stored,
    set: async (value) => {
      if (fail) throw new Error('private backend failure');
      stored = value;
    },
  });
  return { service, fail: () => { fail = true; } };
}

const post = (args) => new Request('http://localhost/api/dsh-home', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args),
});

test('HTTP and agent tool share the same operation state and validation', async () => {
  const { service } = fixture();
  const handler = createHomeFetchHandler(service);
  const tool = createHomeTool(service);
  const response = await handler(post({ action: 'task.add', title: 'From HTTP' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const httpState = await response.json();
  assert.deepEqual(await tool.execute({ action: 'get' }), httpState);
  const toolState = await tool.execute({ action: 'task.update', id: httpState.tasks[0].id, done: true });
  const fetched = await handler(new Request('http://localhost/api/dsh-home'));
  assert.deepEqual(await fetched.json(), toolState);
  assert.equal(toolState.tasks[0].done, true);
  assert.deepEqual(JSON.parse(tool.output.render({}, toolState)[0].text), toolState);
  const badAction = { action: 'bookmark.save', title: 'Unsafe', url: 'javascript:alert(1)' };
  const rejected = await handler(post(badAction));
  let toolError;
  try { await tool.execute(badAction); } catch (error) { toolError = error; }
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).error, toolError.message);
});

test('HTTP translates invalid JSON, stale revisions, and storage errors into error responses', async () => {
  const f = fixture();
  const handler = createHomeFetchHandler(f.service);
  const malformed = await handler(new Request('http://localhost/api/dsh-home', { method: 'POST', body: '{' }));
  assert.equal(malformed.status, 400);
  assert.equal(typeof (await malformed.json()).error, 'string');
  const invalid = await handler(post({ action: 'settings.update', settings: { dailyGoal: 17 } }));
  assert.equal(invalid.status, 400);
  const stale = await handler(post({ action: 'bookmark.move', id: 'github', toIndex: 2, expectedRevision: 9 }));
  assert.equal(stale.status, 409);
  f.fail();
  const failure = await handler(post({ action: 'task.add', title: 'Write failure' }));
  assert.equal(failure.status, 500);
  const body = await failure.json();
  assert.equal(typeof body.error, 'string');
  assert.equal(body.error.includes('private backend failure'), false);
  assert.equal((await f.service.run({ action: 'get' })).tasks.length, 0);
});

test('Host wires dashboard, Flomo credentials and media through owned domains with cleanup', async () => {
  const resources = { domains: new Map(), routes: new Map(), tools: new Map(), credentials: new Map(), closed: [] };
  const disposers = [];
  const ctx = {
    storageDomain: {
      async open(spec) {
        assert.match(spec.name, /^[a-z][a-z0-9_]*$/, 'DSH storage unit naming contract');
        resources.domains.set(spec.name, spec);
        let stored = spec.global?.initial;
        const tables = new Map();
        return {
          global: { get: () => stored, set: async (value) => { stored = value; } },
          table(name) {
            if (!tables.has(name)) tables.set(name, new Map());
            const rows = tables.get(name);
            return { get: key => rows.get(key), put: async (key, value) => { rows.set(key, value); }, get size() { return rows.size; } };
          },
          close: async () => { resources.closed.push(spec.name); },
        };
      },
    },
    credentials: { resolve: async key => resources.credentials.has(key) ? { value: resources.credentials.get(key) } : undefined,
      set: async (key, value) => { resources.credentials.set(key, value); } },
    provide(name, service) { resources[name] = service; },
    effect(setup) { disposers.push(setup()); },
    connection: { fetch: { register(route) { resources.routes.set(route.path, route); return async () => { resources.routes.delete(route.path); }; } } },
    tools: { register(tool) { resources.tools.set(tool.name, tool); return () => { resources.tools.delete(tool.name); }; } },
  };
  await apply(ctx);
  assert.deepEqual(inject, ['connection', 'storageDomain', 'tools', 'credentials']);
  assert.deepEqual([...resources.domains.keys()], ['dsh_home', 'dsh_home_notes', 'dsh_home_media']);
  const domain = resources.domains.get('dsh_home');
  assert.equal(domain.version, 1);
  assert.deepEqual(domain.tables, {});
  const route = resources.routes.get('/api/dsh-home');
  assert.deepEqual(route.methods, ['GET', 'POST']);
  assert.equal(route.requestBody, 'buffered');
  await resources.tools.get('dsh_home').execute({ action: 'task.add', title: 'Shared' });
  const response = await route.fetch(new Request('http://localhost/api/dsh-home'));
  const routeBody = await response.json();
  assert.deepEqual(routeBody.features, { flomo: true });
  const { features: _rf, ...routeCore } = routeBody;
  assert.deepEqual(routeCore, await resources.dshHome.run({ action: 'get' }));
  assert.equal(resources.routes.size, 4);
  const notes = await resources.routes.get('/api/dsh-home/notes').fetch(new Request('http://localhost/api/dsh-home/notes'));
  assert.equal((await notes.json()).configured, false);
  assert.equal(resources.tools.has('dsh_home_notes'), true);
  await assert.rejects(async () => resources.tools.get('dsh_home_notes').execute({ action: 'configure', token: 'not-a-real-token' }));
  for (const dispose of disposers.reverse()) await dispose();
  assert.equal(resources.closed.length, 3);
  assert.equal(resources.routes.size, 0);
  assert.equal(resources.tools.size, 0);
  await assert.rejects(resources.dshHome.run({ action: 'get' }), (error) => error.status === 503);
});
