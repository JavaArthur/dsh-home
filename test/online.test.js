import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnlinePhotoProvider } from '../online.js';

const SAFE_MESSAGE = '暂时无法获取在线壁纸，请稍后重试。';
const entry = (fields = {}) => ({
  id: '10', author: 'Paul Jarvis', width: 2500, height: 1667,
  url: 'https://unsplash.com/photos/6J--NXulQCs',
  download_url: 'https://untrusted.example/image.jpg', ...fields,
});
const response = (data) => ({ ok: true, json: async () => data });
const providerFor = (data, random = () => 0) => createOnlinePhotoProvider({
  fetchImpl: async () => response(data), random,
});
const safeError = (error) => {
  assert.equal(error.constructor, Error);
  assert.equal(error.message, SAFE_MESSAGE);
  assert.equal(error.cause, undefined);
  return true;
};

function assertPhoto(photo, source) {
  assert.deepEqual(Object.keys(photo).sort(), ['author', 'id', 'page', 'source', 'url']);
  assert.equal(photo.source, source);
  assert.equal(typeof photo.id, 'string');
  assert.ok(photo.author.trim().length > 0 && photo.author.length <= 160);
  const image = new URL(photo.url);
  const page = new URL(photo.page);
  assert.equal(image.origin, source === 'unsplash' ? 'https://images.unsplash.com' : 'https://picsum.photos');
  assert.equal(page.origin, 'https://unsplash.com');
  for (const url of [image, page]) {
    assert.equal(url.username, '');
    assert.equal(url.password, '');
  }
}

test('Unsplash exposes exactly 20 distinct online photos with factual attribution and sizing', async () => {
  const expectedCredits = new Map([
    ['Q1p7bh3SHj8', 'NASA'], ['phIFdC6lA4E', 'Benjamin Voros'],
    ['sO-JmQj95ec', 'Kevin Lanceplaine'], ['c9MFM8rSMsQ', 'Michelle Spollen'],
    ['oUTmhg97gzY', 'Ása Steinarsdóttir'], ['NRQV-hBF10M', 'Bailey Zindel'],
    ['1Z2niiBPg5A', 'v2osk'], ['JgOeRuGD_Y4', 'JOHN TOWNER'],
    ['DlkF4-dbCOU', 'garrett parker'], ['6KQETG8J-zI', 'Daniel Olah'],
    ['hvrpOmuMrAI', 'Johannes Plenio'], ['RwHv7LgeC7s', 'Johannes Plenio'],
    ['_RBcxo9AU-U', 'Robert Lukeman'], ['17_tB-oI0ao', 'Alessio Soggetti'],
    ['2Hzmz15wGik', 'pine watt'], ['7BjhtdogU3A', 'Karsten Würth'],
    ['GA09PKfRIQY', 'Adam Vradenburg'], ['z_f2JrBRbOg', 'Ansgar Scheffold'],
    ['sGptUDSrMVU', 'Annegret Kammer'], ['KMn4VEeEPR8', 'Sean Oulashin'],
  ]);
  let sample = 0;
  let fetchCalls = 0;
  const provider = createOnlinePhotoProvider({
    random: () => sample,
    fetchImpl: async () => { fetchCalls += 1; throw new Error('Unexpected network'); },
  });
  const found = new Map();
  const urls = new Set();
  for (let index = 0; index < 20; index += 1) {
    sample = (index + 0.5) / 20;
    const photo = await provider({ source: 'unsplash' });
    assertPhoto(photo, 'unsplash');
    const image = new URL(photo.url);
    assert.match(image.pathname, /^\/photo-\d+-[a-f0-9]+$/);
    assert.equal(image.search, '?auto=format&fit=crop&w=2560&q=80');
    assert.equal(photo.page, `https://unsplash.com/photos/${photo.id}`);
    found.set(photo.id, photo.author);
    urls.add(photo.url);
  }
  assert.deepEqual(found, expectedCredits);
  assert.equal(urls.size, 20);
  assert.equal(fetchCalls, 0);
});

test('both providers exclude the current URL before selecting another photo', async () => {
  for (const source of ['unsplash', 'picsum']) {
    const provider = providerFor([entry(), entry({ id: '11' })]);
    const first = await provider({ source });
    const next = await provider({ source, excludeUrl: first.url });
    assert.notEqual(first.url, next.url);
    assertPhoto(next, source);
  }
  await assert.rejects(providerFor([entry()])({
    source: 'picsum', excludeUrl: 'https://picsum.photos/id/10/2560/1440',
  }), safeError);
});

test('Picsum requests a fresh documented list at pages 1 through 10 and constructs image URLs', async () => {
  for (let page = 1; page <= 10; page += 1) {
    let calls = 0;
    const provider = createOnlinePhotoProvider({
      random: () => (page - 0.5) / 10,
      fetchImpl: async (url, options) => {
        calls += 1;
        assert.equal(url, `https://picsum.photos/v2/list?page=${page}&limit=100`);
        assert.ok(options.signal instanceof AbortSignal);
        assert.equal(options.signal.aborted, false);
        return response([entry()]);
      },
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const photo = await provider({ source: 'picsum' });
      assertPhoto(photo, 'picsum');
      assert.deepEqual(photo, {
        source: 'picsum', id: '10', author: 'Paul Jarvis',
        page: 'https://unsplash.com/photos/6J--NXulQCs', url: 'https://picsum.photos/id/10/2560/1440',
      });
    }
    assert.equal(calls, 2);
  }
});

test('Picsum filters portraits, small images and malformed dimensions but accepts 1200px squares', async () => {
  const invalid = [
    entry({ width: 1200, height: 1201 }), entry({ width: 1199, height: 800 }),
    entry({ width: '2500' }), entry({ height: '1667' }), entry({ width: Infinity }),
    entry({ width: NaN }), entry({ height: 0 }), entry({ height: -1 }),
    entry({ height: 100.5 }), entry({ width: Number.MAX_SAFE_INTEGER + 1 }), null, [], 'image',
  ];
  const photo = await providerFor([...invalid, entry({ id: '12', width: 1200, height: 1200 })])({ source: 'picsum' });
  assert.equal(photo.id, '12');
  await assert.rejects(providerFor(invalid)({ source: 'picsum' }), safeError);
});

test('Picsum validates numeric ID and bounded nonempty author metadata', async () => {
  const invalid = [
    ...['', '12345678901', '-1', '1.2', '1/2', '../10', '1?x=2', 10, null].map((id) => entry({ id })),
    ...['', '   ', 'a'.repeat(161), 'Author\nInjected', 1, null, {}].map((author) => entry({ author })),
  ];
  assert.equal((await providerFor([...invalid, entry({ id: '1234567890', author: 'a'.repeat(160) })])({ source: 'picsum' })).id, '1234567890');
  assert.equal((await providerFor([entry({ id: '0', author: ' Paul Jarvis ' })])({ source: 'picsum' })).author, 'Paul Jarvis');
  await assert.rejects(providerFor(invalid)({ source: 'picsum' }), safeError);
});

test('Picsum only accepts HTTPS Unsplash attribution URLs without credentials', async () => {
  const invalidPages = [
    'http://unsplash.com/photos/photo', 'https://unsplash.com.evil.example/photos/photo',
    'https://evil.example/unsplash.com', 'https://www.unsplash.com/photos/photo',
    'https://unsplash.com@evil.example/photo', 'https://user@unsplash.com/photos/photo',
    'https://user:password@unsplash.com/photos/photo', 'https://unsplash.com:444/photos/photo',
    'https://unsplash.com./photos/photo', 'javascript:alert(1)', '//unsplash.com/photos/photo',
    'https://unsplash.com\\@evil.example', 'https://unsplash.com/\nphotos/photo',
    `https://unsplash.com/${'a'.repeat(2048)}`, '', null, 123,
  ];
  const invalid = invalidPages.map((url) => entry({ url }));
  const photo = await providerFor([...invalid, entry({ id: '20' })])({ source: 'picsum' });
  assert.equal(photo.id, '20');
  await assert.rejects(providerFor(invalid)({ source: 'picsum' }), safeError);
});

test('empty, oversized and non-array list payloads fail safely without a fallback', async () => {
  for (const data of [[], null, {}, { images: [entry()] }, '[]', Array.from({ length: 101 }, () => entry())]) {
    await assert.rejects(providerFor(data)({ source: 'picsum' }), safeError);
  }
  assert.equal((await providerFor(Array.from({ length: 100 }, () => entry()))({ source: 'picsum' })).id, '10');
});

test('network, HTTP and JSON failures expose only a generic Chinese message', async () => {
  for (const fetchImpl of [
    async () => { throw new Error('secret upstream URL https://internal.example/token'); },
    async () => ({ ok: false, status: 503, json: () => { throw new Error('Must not parse HTTP error'); } }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('private response body'); } }),
    async () => null,
  ]) {
    const provider = createOnlinePhotoProvider({ fetchImpl, random: () => 0 });
    await assert.rejects(provider({ source: 'picsum' }), safeError);
  }
});

test('unknown sources and invalid random values fail safely', async () => {
  const provider = providerFor([entry()]);
  for (const options of [undefined, {}, { source: 'custom' }, { source: 'UNSPLASH' }, null]) {
    await assert.rejects(provider(options), safeError);
  }
  for (const value of [NaN, Infinity, -0.1, 1, '0']) {
    await assert.rejects(providerFor([entry()], () => value)({ source: 'picsum' }), safeError);
  }
});

test('the real timeout signal aborts a stalled fetch after eight seconds with a safe error', { timeout: 20000 }, async () => {
  let receivedSignal;
  const started = performance.now();
  const provider = createOnlinePhotoProvider({
    random: () => 0,
    fetchImpl: async (_url, { signal }) => {
      receivedSignal = signal;
      return new Promise((resolve, reject) => {
        // Keep the test alive: native AbortSignal.timeout timers are unref'ed in Node.
        const keepAlive = setTimeout(() => resolve(response([entry()])), 16000);
        signal.addEventListener('abort', () => {
          clearTimeout(keepAlive);
          reject(signal.reason);
        }, { once: true });
      });
    },
  });
  await assert.rejects(provider({ source: 'picsum' }), safeError);
  assert.ok(receivedSignal.aborted);
  assert.equal(receivedSignal.reason.name, 'TimeoutError');
  assert.ok(performance.now() - started >= 7900);
});
