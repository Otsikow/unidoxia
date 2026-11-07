/**
 * Named course-discovery choices. A choice does not guarantee live listings;
 * the catalogue validates current availability separately.
 */
export const STUDY_DESTINATIONS = [
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Ireland',
  'Germany',
  'Spain',
  'Malta',
  'United Arab Emirates',
] as const;

export type StudyDestination = (typeof STUDY_DESTINATIONS)[number];

// Preserve the existing New Zealand enquiry choice without implying a live catalogue.
export const STUDY_ENQUIRY_DESTINATIONS = [...STUDY_DESTINATIONS, 'New Zealand'] as const;
export const STUDY_ENQUIRY_CHOICES = [...STUDY_ENQUIRY_DESTINATIONS, 'Other', 'Not sure yet'] as const;
