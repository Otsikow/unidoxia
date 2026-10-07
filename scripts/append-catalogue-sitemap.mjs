#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { esc } from './catalogue/seo-pages.mjs';
// The manifest comes from the same paginated public catalogue used by the
// prerenderer. Do not re-fetch: records could change between the two steps.
const routes = JSON.parse(await readFile('dist/seo-routes.json', 'utf8'));
const entries = routes.filter(route => route.kind === 'catalogue');
const file = 'dist/sitemap.xml';
const current = await readFile(file, 'utf8');
const existing = new Set([...current.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]));
const dynamic = entries.filter(route => !existing.has(`https://unidoxia.com${esc(route.path)}`)).map(route => `  <url><loc>https://unidoxia.com${esc(route.path)}</loc>${route.lastmod ? `<lastmod>${esc(route.lastmod)}</lastmod>` : ''}</url>`).join('\n');
await writeFile(file, current.replace('</urlset>', `${dynamic}\n</urlset>`));
console.log(`Catalogue sitemap: ${entries.length} rendered detail pages.`);
