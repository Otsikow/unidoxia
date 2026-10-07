import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import worker from '../hosting/seo-worker.mjs';

const dist = path.resolve('dist');
// Filesystem stand-in for ASSETS with the configured html_handling:none and
// not_found_handling:none. This tests adapter routing, not Cloudflare deployment.
const env = { ASSETS: { async fetch(request) {
  const file = path.resolve(dist, `.${new URL(request.url).pathname}`);
  if (!file.startsWith(`${dist}/`)) return new Response('', { status: 404 });
  try { return new Response(await fs.readFile(file), { headers: { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' } }); }
  catch { return new Response('', { status: 404 }); }
} } };
const request = pathname => worker.fetch(new Request(`https://unidoxia.com${pathname}`), env);
const routes = JSON.parse(await fs.readFile('dist/seo-routes.json', 'utf8'));
for (const prefix of ['/courses/', '/universities/', '/blog/']) {
  const route = routes.find(route => route.path.startsWith(prefix));
  assert(route, `Missing ${prefix} sample`);
  const response = await request(route.path);
  assert.equal(response.status, 200);
  assert((await response.text()).includes(`href="https://unidoxia.com${route.path}"`));
}
for (const route of ['/this-page-does-not-exist', '/courses/00000000-0000-0000-0000-000000000000', '/universities/deleted-university', '/blog/deleted-post', '/dashboard/does-not-exist']) {
  const response = await request(route);
  assert.equal(response.status, 404, route);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
  const body = await response.text();
  assert(body.includes('<h1>Page not found</h1>'));
  assert(body.includes('<meta name="robots" content="noindex">'));
}
for (const route of ['/auth/login', '/auth/callback?code=test', '/student/applications/track/test', '/dashboard/settings/profile', '/admin/users']) {
  assert.equal((await request(route)).status, 200, route);
}
const redirect = await worker.fetch(new Request('https://www.unidoxia.com/courses?seo-check=1'), env);
assert.equal(redirect.status, 301);
assert.equal(redirect.headers.get('Location'), 'https://unidoxia.com/courses?seo-check=1');
console.log('Optional host adapter verified locally: public HTML, unknown/deleted-route 404 + noindex, auth/dashboard SPA entries, www 301 preserving path/query. Not deployed.');
