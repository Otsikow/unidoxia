import { describe, expect, it } from 'vitest';
import { internationalUniversityCandidates, selectInternationalUniversityListings, type InternationalUniversityListing } from './homeInternationalUniversities';

const listing = (index = 0): InternationalUniversityListing => ({
  ...internationalUniversityCandidates[index], id: String(index), name: `University ${index}`, city: null,
  active: true, listing_status: 'listed', verification_status: 'admin_verified',
  website: 'https://www.example.edu/', source_url: 'https://example.edu/international', last_source_checked_at: '2026-08-12',
});

describe('international homepage directory eligibility', () => {
  it('keeps one checked public record per selected country in a stable order', () => {
    const rows = internationalUniversityCandidates.map((_, index) => listing(index)).reverse();
    expect(selectInternationalUniversityListings(rows).map(row => row.country)).toEqual(internationalUniversityCandidates.map(item => item.country));
    expect(rows[0].id).toBe('4');
  });

  it('excludes inactive, archived, unverified and geographically mismatched records', () => {
    for (const override of [{active: false}, {listing_status: 'archived'}, {verification_status: 'unverified'}, {country: 'United Kingdom'}]) {
      expect(selectInternationalUniversityListings([{...listing(), ...override}])).toEqual([]);
    }
  });

  it('requires a dated HTTPS source on the official website domain', () => {
    for (const override of [{source_url: null}, {source_url: 'https://unrelated.example/'}, {source_url: 'javascript:alert(1)'}, {website: 'http://example.edu'}, {last_source_checked_at: 'unknown'}]) {
      expect(selectInternationalUniversityListings([{...listing(), ...override}])).toEqual([]);
    }
  });
});
