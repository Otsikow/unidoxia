import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dist = path.resolve('dist');
const sitemap = new JSDOM(fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8'), { contentType: 'text/xml' }).window.document;
const urls = [...sitemap.querySelectorAll('loc')].map(node => node.textContent);
assert(urls.length > 0, 'Sitemap must not be empty');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
const evidence = [];
const uniqueTitles = new Set();
const uniqueDescriptions = new Set();
const seen = new Set();
const footerText = 'UniDoxia is a trading name of Global Talent Gateway Ltd, registered in England and Wales, company number 16172129. Registered office: Office 10 Seagreen Turner Street, Redcar, England, TS10 1AZ.';
for (const url of urls) {
  const pathname = new URL(url).pathname;
  const file = path.join(dist, pathname, 'index.html');
  assert(fs.existsSync(file), `Missing rendered file: ${pathname}`);
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1, pathname);
  assert.equal(doc.querySelector('link[rel="canonical"]')?.href, url, pathname);
  assert.equal(doc.querySelector('meta[property="og:url"]')?.content, url, pathname);
  assert.equal(doc.querySelectorAll('h1').length, 1, pathname);
  assert.equal(doc.querySelector('footer')?.textContent, footerText, pathname);
  assert(!doc.querySelector('meta[name="robots"]')?.content.includes('noindex'), pathname);
  const title = doc.title;
  const description = doc.querySelector('meta[name="description"]')?.content;
  if (pathname.startsWith('/courses/') || pathname.startsWith('/universities/')) {
    assert(!uniqueTitles.has(title), `Duplicate catalogue title: ${pathname}`);
    assert(!uniqueDescriptions.has(description), `Duplicate catalogue description: ${pathname}`);
    uniqueTitles.add(title); uniqueDescriptions.add(description);
  }
  assert(title && description, `Missing metadata: ${pathname}`);
  assert.equal(doc.querySelector('meta[property="og:title"]')?.content, title, pathname);
  assert.equal(doc.querySelector('meta[property="og:description"]')?.content, description, pathname);
  const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent));
  const type = pathname.startsWith('/courses/') ? 'Course' : pathname.startsWith('/universities/') ? 'CollegeOrUniversity' : pathname.startsWith('/blog/') ? 'BlogPosting' : pathname === '/faq' ? 'FAQPage' : pathname === '/' ? 'Organization' : null;
  if (type) assert(schemas.some(schema => schema['@type'] === type), `Missing ${type}: ${pathname}`);
  if (type === 'FAQPage') {
    const schema = schemas.find(schema => schema['@type'] === type);
    const questions = [...doc.querySelectorAll('main h3')].map(node => node.textContent);
    assert.deepEqual(schema.mainEntity.map(q => q.name), questions);
    assert.deepEqual(schema.mainEntity.map(q => q.acceptedAnswer.text), [...doc.querySelectorAll('main section p')].map(node => node.textContent));
  }
  if (type && !seen.has(type)) {
    seen.add(type);
    evidence.push({ path: pathname, title, canonical: url, description, h1: doc.querySelector('h1').textContent, footer: footerText, jsonLd: schemas });
  }
  dom.window.close();
}
const notFound = new JSDOM(fs.readFileSync(path.join(dist, '404.html'), 'utf8')).window.document;
assert.equal(notFound.querySelector('h1')?.textContent, 'Page not found');
assert.equal(notFound.querySelector('meta[name="robots"]')?.content, 'noindex');
assert.equal(notFound.querySelector('link[rel="canonical"]'), null);
fs.writeFileSync(path.join(dist, 'seo-verification.json'), JSON.stringify({ sitemapUrls: urls.length, notFound: 'Page not found; noindex; no canonical', examples: evidence }, null, 2));
console.log(`SEO verified: ${urls.length} sitemap URLs have HTML, self-canonicals, metadata, one H1 and the registered office footer; 404.html has noindex.`);
