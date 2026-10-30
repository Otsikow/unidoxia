import { describe, expect, it } from 'vitest';
import { editorialReview } from './editorialReview.mjs';

describe('editorial review safeguards', () => {
  it('flags the identified time-sensitive articles and links to primary sources', () => {
    expect(Object.keys(editorialReview)).toHaveLength(3);
    expect(editorialReview['uk-graduate-visa-2027-timing-what-to-check'].source).toBe('https://www.gov.uk/graduate-visa');
    expect(editorialReview['chevening-scholarships-2027-28-application-checks'].source).toMatch(/^https:\/\/www\.chevening\.org\//);
  });
});
