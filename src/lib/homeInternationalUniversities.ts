export const internationalUniversityCandidates = [
  { country: 'Canada', slug: 'lakehead-university' },
  { country: 'United States', slug: 'university-of-central-missouri' },
  { country: 'Germany', slug: 'hochschule-fresenius' },
  { country: 'Ireland', slug: 'university-of-limerick' },
  { country: 'Australia', slug: 'griffith-university' },
] as const;

export const internationalDirectoryIntro = 'Explore public directory listings in other study destinations. Check current course details with the university. A listing does not imply a recruitment partnership.';

export interface InternationalUniversityListing {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string | null;
  active: boolean;
  listing_status: string;
  verification_status: string;
  website: string | null;
  source_url: string | null;
  last_source_checked_at: string | null;
}

function hasCheckedOfficialSource(university: InternationalUniversityListing) {
  if (!university.website || !university.source_url || !Number.isFinite(Date.parse(university.last_source_checked_at || ''))) return false;
  try {
    const website = new URL(university.website);
    const source = new URL(university.source_url);
    return website.protocol === 'https:' && source.protocol === 'https:' &&
      source.hostname.replace(/^www\./, '') === website.hostname.replace(/^www\./, '');
  } catch { return false; }
}

export function selectInternationalUniversityListings(universities: InternationalUniversityListing[]) {
  return internationalUniversityCandidates.flatMap(({ country, slug }) => {
    const university = universities.find(item => item.slug === slug && item.country === country && item.active &&
      item.listing_status !== 'archived' && ['admin_verified', 'verified'].includes(item.verification_status) && hasCheckedOfficialSource(item));
    return university ? [university] : [];
  });
}
