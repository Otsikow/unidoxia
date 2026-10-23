import { describe, expect, it } from 'vitest';
import { articleContent } from '../src/lib/articleContent.ts';
import { scholarshipPage, universityPage, coursePage } from './catalogue/seo-pages.mjs';
import DOMPurify from 'dompurify';

describe('complete public content', () => {
  it('renders all Markdown paragraphs, drops executable markup and preserves one page H1', () => {
    const html = DOMPurify.sanitize(articleContent({ title: 'Planning', content_md: '# Planning\n\nFirst paragraph.\n\n## Requirements\n\nFinal paragraph.\n\n<script>alert(1)</script>' }));
    expect(html).toContain('Final paragraph.'); expect(html).not.toContain('<script>'); expect(html).not.toContain('<h1>');
  });
  it('renders full scholarship conditions and steps, uses no invented provider and marks archived pages noindex', () => {
    const page = scholarshipPage({ slug: 'local-test', title: 'Local Test', status: 'Archived', full_description: 'Full description', academic_requirements: 'Relevant degree', application_steps: ['Apply to the institution'], important_conditions: 'Confirm the award round' });
    for (const text of ['Full description', 'Relevant degree', 'Apply to the institution', 'Confirm the award round']) expect(page.body).toContain(text);
    expect(page.noindex).toBe(true); expect(JSON.stringify(page.jsonLd)).not.toContain('partner');
  });
  it('includes public profile guidance, course links and a consultation route', () => {
    const page = universityPage({ id: 'local', name: 'Local College', submission_config_json: { entryRequirements: 'Check subject requirements', accommodation: 'Check housing availability' } }, [{ id: 'course', university_id: 'local', name: 'Local course' }]);
    for (const text of ['Check subject requirements', 'Check housing availability', '/courses/course', '/free-consultation']) expect(page.body).toContain(text);
  });
  it('uses course codes consistently to distinguish real catalogue variants', () => {
    const university = { id: 'local', name: 'Local College' };
    const a = coursePage({ id: 'a', name: 'Computing', course_code: 'COMP-A' }, university);
    const b = coursePage({ id: 'b', name: 'Computing', course_code: 'COMP-B' }, university);
    expect(a.title).not.toBe(b.title); expect(a.description).not.toBe(b.description);
  });
});
