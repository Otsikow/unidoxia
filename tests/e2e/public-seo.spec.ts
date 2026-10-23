import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test.skip(!process.env.SEO_PREVIEW, 'Requires a production build and the local routing adapter');
const routes = fs.existsSync('dist/seo-routes.json') ? JSON.parse(fs.readFileSync('dist/seo-routes.json', 'utf8')) : [];
const paths = ['/free-consultation', '/destinations/united-kingdom', ...['/blog/', '/universities/', '/courses/', '/scholarships/'].map(prefix => routes.find(r => r.path.startsWith(prefix) && r.path !== '/scholarships/archive' && !r.noindex)?.path).filter(Boolean)];
for (const path of paths) {
  test(`initial HTML and browser agree: ${path}`, async ({ page, request }) => {
    // No tracking or mutation requests reach production during verification.
    await page.route('**/*.supabase.co/**', route => route.request().method() === 'GET' || route.request().url().includes('/rpc/get_public_') ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const dom = new JSDOM(await response.text());
    const doc = dom.window.document;
    const title = doc.title;
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const heading = doc.querySelector('h1')?.textContent;
    const footer = doc.querySelector('footer')?.textContent;
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading!, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical!);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description!);
    await expect(page.locator('footer')).toContainText(footer!);
    if (path.startsWith('/blog/')) {
      // All substantive article paragraphs survive the JS transition, not only
      // the excerpt. The first paragraph is the separately displayed excerpt.
      const paragraphs = [...doc.querySelectorAll('article > p, article > ul > li, article > ol > li')].map(p => p.textContent?.replace(/\s+/g, ' ').trim()).filter(text => text && text.length > 40);
      expect(paragraphs.length).toBeGreaterThan(1);
      for (const paragraph of paragraphs) await expect(page.locator('article').first()).toContainText(paragraph!);
    }
    if (path.startsWith('/scholarships/')) {
      for (const text of [...doc.querySelectorAll('dd')].map(n => n.textContent).filter(Boolean).slice(0, 4)) await expect(page.locator('#root')).toContainText(text!);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (path === "/free-consultation") await page.screenshot({ path: `test-results/consultation-${test.info().project.name}.png`, fullPage: true });
    dom.window.close();
  });
}
test('featured university links resolve to profiles and offer an enquiry route', async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.request().method() === 'GET' || route.request().url().includes('/rpc/get_public_') ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/');
  if (test.info().project.name === 'mobile') expect(await page.locator('video').count()).toBe(0);
  await page.screenshot({ path: `test-results/home-${test.info().project.name}.png`, fullPage: false });
  const links = page.getByRole('link', { name: /View university profile/ });
  await expect(links).toHaveCount(3);
  for (const href of await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) {
    await page.goto(href!);
    await expect(page.getByRole('link', { name: 'Ask UniDoxia about studying here' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Browse courses at/ })).toBeVisible();
  }
});
test('real missing pages and private routes have correct status and indexing', async ({ request }) => {
  for (const path of ['/missing-test-page', '/courses/00000000-0000-0000-0000-000000000000', '/blog/deleted-test', '/scholarships/deleted-test']) {
    const response = await request.get(path); expect(response.status()).toBe(404); expect(response.headers()['x-robots-tag']).toBe('noindex');
  }
  const response = await request.get('/student/applications');
  expect(response.headers()['x-robots-tag']).toBe('noindex');
});
