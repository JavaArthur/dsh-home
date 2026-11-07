import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assetFetch, createWallpaperService, decodeWallpaper } from '../media.js';
const request = (dataUrl) => new Request('http://localhost/api/chen-home/wallpaper', { method: 'POST', body: JSON.stringify({ dataUrl }) });
function storage() {
  const rows = new Map();
  return { rows, get: key => rows.get(key), get size() { return rows.size; }, put: async (key, value) => { rows.set(key, value); } };
}

test('static media exposes only bundled names, not arbitrary files', async () => {
  const response = await assetFetch(new Request('http://localhost/api/chen-home/assets?name=github.png'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.ok((await response.arrayBuffer()).byteLength > 0);
  for (const name of ['../index.js', 'index.js', '/etc/passwd', 'missing.png']) {
    assert.equal((await assetFetch(new Request('http://localhost/api/chen-home/assets?name=' + encodeURIComponent(name)))).status, 404);
  }
});

test('upload stores real image bytes once and returns a small durable reference', async () => {
  const bytes = await readFile(new URL('../assets/github.png', import.meta.url));
  const dataUrl = 'data:image/png;base64,' + bytes.toString('base64');
  const table = storage();
  const service = createWallpaperService(table);
  const [first, second] = await Promise.all([service.fetch(request(dataUrl)), service.fetch(request(dataUrl))]);
  const a = await first.json(); const b = await second.json();
  assert.deepEqual(a, b);
  assert.equal(table.size, 1);
  assert.match(a.url, /^\/api\/chen-home\/wallpaper\?id=[a-f0-9]{64}$/);
  const loaded = await service.fetch(new Request('http://localhost' + a.url));
  assert.deepEqual(Buffer.from(await loaded.arrayBuffer()), bytes);
  assert.equal(loaded.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await service.fetch(new Request('http://localhost/api/chen-home/wallpaper?id=../index.js'))).status, 404);
  await service.close();
  assert.equal((await service.fetch(request(dataUrl))).status, 503);
});

test('rejects scripts, forged image types and excessive input before persistence', async () => {
  assert.throws(() => decodeWallpaper('data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64')));
  assert.throws(() => decodeWallpaper('data:image/png;base64,' + Buffer.from('<script/>').toString('base64')));
  assert.throws(() => decodeWallpaper('data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024 + 100)));
  const table = storage();
  table.put = async () => { throw new Error('private disk error'); };
  const service = createWallpaperService(table);
  const bytes = await readFile(new URL('../assets/github.png', import.meta.url));
  const result = await service.fetch(request('data:image/png;base64,' + bytes.toString('base64')));
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(await result.json()).includes('private disk error'), false);
  assert.equal(table.size, 0);
});
