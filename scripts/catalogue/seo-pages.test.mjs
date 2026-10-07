import { describe, it, expect } from 'vitest';
import { coursePage, universityPage, blogSchema } from './seo-pages.mjs';
import { fetchPublicRows } from './public-catalogue.mjs';

const university = { id: 'u1', name: 'Example & College', slug: 'example-college', city: 'York', country: 'United Kingdom' };
const course = { id: 'p1', university_id: 'u1', name: 'Computing <Science>', level: 'Masters', duration_months: 12, entry_requirements: { summary: 'A relevant degree' }, intake_months: [9], program_fees: [{ amount: 18000, currency: 'GBP', applicant_type: 'international', resolution_status: 'verified', fee_basis: 'annual', fee_year: '2026/27' }] };
describe('catalogue SEO', () => {
  it('renders record facts safely and links the actual provider', () => {
    const page = coursePage(course, university);
    expect(page.path).toBe('/courses/p1');
    expect(page.body).toContain('Computing &lt;Science&gt;');
    for (const fact of ['12 months', 'A relevant degree', 'September', 'GBP 18,000', '2026/27']) expect(page.body).toContain(fact);
    expect(page.jsonLd.provider.url).toBe('https://unidoxia.com/universities/example-college');
    expect(page.title).toContain(university.name);
  });
  it('omits missing and unverified fees rather than inventing a price', () => {
    const page = coursePage({ ...course, program_fees: [{ amount: 0, resolution_status: 'unresolved' }], intake_months: [] }, university);
    expect(page.body).not.toContain('International tuition');
    expect(page.body).not.toContain('Intake months');
    expect(page.jsonLd).not.toHaveProperty('offers');
  });
  it('only links courses belonging to this university', () => {
    const page = universityPage(university, [course, { ...course, id: 'other', university_id: 'u2' }]);
    expect(page.body).toContain('/courses/p1');
    expect(page.body).not.toContain('/courses/other');
    expect(page.jsonLd.location.name).toBe('York, United Kingdom');
  });
  it('uses real article dates/images and omits absent optional data', () => {
    const post = { title: 'Article', slug: 'article', published_at: '2026-01-01', updated_at: '2026-02-01', cover_image_url: '/cover.png' };
    expect(blogSchema(post)).toMatchObject({ datePublished: post.published_at, dateModified: post.updated_at, image: 'https://unidoxia.com/cover.png' });
    expect(blogSchema({ title: 'Article', slug: 'article' })).not.toHaveProperty('datePublished');
  });
  it('paginates beyond the server cap and fails closed on query failures', async () => {
    const calls = [];
    const rows = await fetchPublicRows('programs?select=id', { endpoint: 'https://example.com', key: 'public-test-key' }, async url => {
      calls.push(url);
      return { ok: true, json: async () => calls.length === 1 ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }] };
    });
    expect(rows).toHaveLength(501);
    expect(calls[1]).toContain('offset=500');
    await expect(fetchPublicRows('programs?select=id', { endpoint: 'https://example.com', key: 'public-test-key' }, async () => ({ ok: false, status: 503 }))).rejects.toThrow('HTTP 503');
  });
});

describe('metadata collisions', () => {
  it('distinguishes genuine variants and falls back to stable record IDs', async () => {
    const { disambiguateMetadata } = await import('./seo-pages.mjs');
    const pages = disambiguateMetadata([coursePage(course, university), coursePage({ ...course, id: 'p2' }, university)]);
    expect(new Set(pages.map(p => p.title)).size).toBe(2);
    expect(new Set(pages.map(p => p.description)).size).toBe(2);
    expect(pages[0].title).toContain('Course reference p1');
    expect(pages[1].title).toContain('Course reference p2');
  });
});
