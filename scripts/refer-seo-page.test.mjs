import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { referSeoPage } from './refer-seo-page.mjs';
import {
  REFERRAL_LIVE_READY,
  REFERRAL_PAGE_PUBLIC,
  REFERRAL_SEO_DESCRIPTION,
  REFERRAL_SEO_TITLE,
  REFERRAL_HEADLINE,
} from '../src/config/referral.ts';

const sitemapScript = path.resolve('scripts/generate-sitemap.cjs');
// Runs the real generate-sitemap.cjs on a temporary dist/seo-routes.json and returns its <loc> paths.
const sitemapPaths = routes => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refer-sitemap-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  fs.writeFileSync(path.join(dir, 'dist', 'seo-routes.json'), JSON.stringify(routes));
  execFileSync(process.execPath, [sitemapScript], { cwd: dir, stdio: 'ignore' });
  const xml = fs.readFileSync(path.join(dir, 'dist', 'sitemap.xml'), 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return [...xml.matchAll(/<loc>https:\/\/unidoxia\.com([^<]*)<\/loc>/g)].map(match => match[1]);
};
const route = page => ({ path: page.path, lastmod: page.lastmod, kind: page.kind, noindex: page.noindex });

describe('/refer prerender, sitemap and noindex (D6)', () => {
  it('prerenders /refer with the page title, description and one h1, and no £ amounts', () => {
    const page = referSeoPage();
    expect(page.path).toBe('/refer');
    expect(page.title).toBe(REFERRAL_SEO_TITLE);
    expect(page.description).toBe(REFERRAL_SEO_DESCRIPTION);
    expect(page.body.match(/<h1>/g)).toHaveLength(1);
    expect(page.body).toContain(`<h1>${REFERRAL_HEADLINE.title}</h1>`);
    expect(`${page.title} ${page.description} ${page.body}`).not.toMatch(/£|\b500\b/);
  });

  it('is noindex, so it gets the static robots meta and stays out of the sitemap, until REFERRAL_PAGE_PUBLIC', () => {
    expect(referSeoPage().noindex).toBe(!REFERRAL_PAGE_PUBLIC);
    expect(referSeoPage({ isPublic: false }).noindex).toBe(true);
    expect(sitemapPaths([{ path: '/about' }, route(referSeoPage({ isPublic: false }))])).toEqual(['/about']);
    expect(sitemapPaths([{ path: '/about' }, route(referSeoPage({ isPublic: true }))])).toEqual(['/about', '/refer']);
  });

  it('puts /refer in the sitemap once REFERRAL_LIVE_READY is true (go-live guard)', () => {
    const inSitemap = sitemapPaths([route(referSeoPage())]).includes('/refer');
    if (REFERRAL_LIVE_READY) expect(inSitemap).toBe(true);
    else expect(inSitemap).toBe(false);
  });

  it('is listed in the prerender pages and the worker adds X-Robots-Tag for noindex routes', () => {
    const prerender = fs.readFileSync(path.resolve('scripts/prerender-static-pages.mjs'), 'utf8');
    expect(prerender).toContain("import { referSeoPage } from './refer-seo-page.mjs';");
    expect(prerender).toMatch(/^\s*referSeoPage\(\),$/m);
    const worker = fs.readFileSync(path.resolve('hosting/seo-worker.mjs'), 'utf8');
    expect(worker).toContain('const noindexPages = new Set(routes.filter(route => route.noindex).map(route => route.path));');
    expect(worker).toMatch(/if \(!noindexPages\.has\(pathname\)\) return page;[\s\S]*headers\.set\('X-Robots-Tag', 'noindex'\);/);
  });
});
