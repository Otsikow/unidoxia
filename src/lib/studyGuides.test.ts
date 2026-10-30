import { describe, expect, it } from 'vitest';
import { publishedStudyGuides, studyGuideBreadcrumb } from './studyGuides.mjs';

const reviewed = {
  status: 'published', slug: 'example-to-uk', title: 'Example to UK', description: 'A reviewed guide',
  origin: 'Example', destination: 'United Kingdom', reviewer: 'Editor', checkedAt: '2026-01-01', reviewBy: '2026-12-31',
  sections: [{ heading: 'Qualifications', body: 'a'.repeat(300) }, { heading: 'Applications', body: 'b'.repeat(300) }, { heading: 'Planning', body: 'c'.repeat(300) }],
  sources: [{ label: 'First', url: 'https://example.org/1' }, { label: 'Second', url: 'https://example.org/2' }, { label: 'Third', url: 'https://example.org/3' }],
};
describe('origin guide publication gate', () => {
  it('only returns reviewed records within their review period', () => {
    expect(publishedStudyGuides([{ ...reviewed, status: 'draft' }, reviewed], '2026-10-30')).toEqual([reviewed]);
    expect(publishedStudyGuides([reviewed], '2027-01-01')).toEqual([]);
  });
  it('fails the build for incomplete or duplicate published guides', () => {
    expect(() => publishedStudyGuides([{ ...reviewed, sections: [] }], '2026-10-30')).toThrow();
    expect(() => publishedStudyGuides([{ ...reviewed, sources: [{ label: 'bad', url: 'javascript:alert(1)' }] }], '2026-10-30')).toThrow();
    expect(() => publishedStudyGuides([{ ...reviewed, sources: [reviewed.sources[0], reviewed.sources[0], reviewed.sources[0]] }], '2026-10-30')).toThrow();
    expect(() => publishedStudyGuides([reviewed, reviewed], '2026-10-30')).toThrow();
  });
  it('constructs canonical breadcrumbs from the reviewed record', () => {
    expect(studyGuideBreadcrumb(reviewed).itemListElement[2].item).toBe('https://unidoxia.com/study-guides/example-to-uk');
  });
});
