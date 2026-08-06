/**
 * Countries UniDoxia currently supports as study destinations.
 * Used by course discovery filters and student study-preference selectors
 * so every surface stays in sync.
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
