import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { HomeError } from './core.js';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MIME = { jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
const ASSETS = new Set(['ocean.jpg', 'forest.jpg', 'dusk.jpg', 'github.png', 'ai-radar.svg',
  'ai-reports.svg', 'trading-review.svg', 'langgraph.png', 'deepseek.png', 'boss.png', 'youmind.png']);
export const WallpaperSchema = z.object({
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string().max(4 * MAX_IMAGE_BYTES / 3 + 4),
}).strict();
const imageHeaders = (mime) => ({ 'Content-Type': mime, 'Cache-Control': 'private, max-age=86400',
  'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
const errorResponse = (error) => Response.json({ error: error instanceof HomeError ? error.message : '图片读取或保存失败，请稍后重试。' },
  { status: error instanceof HomeError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });

export async function assetFetch(request) {
  const name = new URL(request.url).searchParams.get('name');
  if (!ASSETS.has(name)) return new Response('Not found', { status: 404 });
  try {
    const bytes = await readFile(new URL(`./assets/${name}`, import.meta.url));
    return new Response(bytes, { headers: imageHeaders(MIME[name.split('.').at(-1)]) });
  } catch { return new Response('Not found', { status: 404 }); }
}

export function decodeWallpaper(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 4 * MAX_IMAGE_BYTES / 3 + 64) throw new HomeError('背景图片请控制在 3 MB 以内。');
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new HomeError('背景图片仅支持 JPG、PNG 或 WebP。');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new HomeError('背景图片请控制在 3 MB 以内。');
  const mime = match[1];
  const valid = mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new HomeError('图片格式与文件内容不一致，请重新选择。');
  return { id: createHash('sha256').update(bytes).digest('hex'), mime, base64: bytes.toString('base64') };
}

export function createWallpaperService(table) {
  let queue = Promise.resolve();
  let closed = false;
  async function upload(request) {
    if (closed) throw new HomeError('图片服务已关闭。', 503);
    let input;
    try { input = await request.json(); } catch { throw new HomeError('图片请求必须是有效 JSON。'); }
    const { id, ...value } = decodeWallpaper(input?.dataUrl);
    if (!table.get(id)) {
      if (table.size >= 20) throw new HomeError('已保存 20 张本地背景，可继续选择已有图片链接或预设背景。', 409);
      await table.put(id, value);
    }
    return Response.json({ url: `/api/chen-home/wallpaper?id=${id}` }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return {
    async fetch(request) {
      try {
        if (closed) throw new HomeError('图片服务已关闭。', 503);
        if (request.method === 'GET') {
          const id = new URL(request.url).searchParams.get('id');
          const value = /^[a-f0-9]{64}$/.test(id ?? '') ? table.get(id) : undefined;
          if (!value) throw new HomeError('背景图片不存在。', 404);
          return new Response(Buffer.from(value.base64, 'base64'), { headers: imageHeaders(value.mime) });
        }
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
        const result = queue.then(() => upload(request));
        queue = result.then(() => undefined, () => undefined);
        return await result;
      } catch (error) { return errorResponse(error); }
    },
    async close() { closed = true; await queue; },
  };
}
