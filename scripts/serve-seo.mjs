// Local verification server for the opt-in hosting adapter, never a deployment.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import worker from '../hosting/seo-worker.mjs';
const dist = path.resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const env = { ASSETS: { async fetch(request) {
  const file = path.resolve(dist, `.${decodeURIComponent(new URL(request.url).pathname)}`);
  if (!file.startsWith(`${dist}/`)) return new Response('', { status: 404 });
  try { return new Response(await readFile(file), { headers: { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' } }); }
  catch { return new Response('', { status: 404 }); }
} } };
createServer(async (request, response) => {
  try {
    const result = await worker.fetch(new Request(`http://127.0.0.1:4173${request.url}`, { method: request.method }), env);
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch { response.writeHead(500); response.end('Local verification server error'); }
}).listen(4173, '127.0.0.1', () => console.log('Local SEO adapter preview: http://127.0.0.1:4173'));
