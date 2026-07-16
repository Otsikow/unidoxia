export interface ScholarshipEligibility {
  nationality?: string[];
  gpa?: string;
  fieldOfStudy?: string[];
  ageLimit?: string;
  languageRequirement?: string;
  experience?: string;
  notes?: string;
}

export type ScholarshipEditorialStatus =
  | "Researching"
  | "Verified"
  | "Drafted"
  | "Approved"
  | "Published"
  | "Upcoming"
  | "Expiring soon"
  | "Closed"
  | "Archived";

export interface Scholarship {
  id: string;
  slug?: string;
  title: string;
  country: string;
  institution: string;
  level: string;
  awardAmount: string;
  fundingType: "Full" | "Partial" | "Mixed" | string;
  eligibility: ScholarshipEligibility;
  eligibilitySummary: string;
  deadline: string;
  description: string;
  overview?: string;
  applicationSteps: string[];
  documentsRequired: string[];
  officialLink: string;
  tags: string[];
  aiScore?: number;
  languageSupport?: string[];
  logoUrl?: string | null;
  currency?: string;
  stipendDetails?: string;
  selectionProcess?: string;
  recommendedFor?: string;
  verified?: boolean;
  // Editorial / weekly-publishing metadata (optional; used by the UniDoxia
  // scholarship publishing workflow — see SCHOLARSHIP_PUBLISHING_SYSTEM.md).
  sponsor?: string;
  applicantsEligible?: string;
  benefitsSummary?: string;
  academicYear?: string;
  separateApplication?: boolean;
  status?: ScholarshipEditorialStatus;
  lastVerified?: string; // ISO date the entry was last verified against source
  applicationOpensAt?: string; // ISO
  disclaimer?: string;
  sourceUrls?: string[];
}

/**
 * Public-facing application statuses that may be surfaced on the
 * scholarship listing filter. Closed/Archived are intentionally
 * excluded because they must never be presented as active.
 */
export type PublicApplicationStatus =
  | "Upcoming"
  | "Verified"
  | "Open"
  | "Expiring soon"
  | "Published";

export const PUBLIC_APPLICATION_STATUSES: PublicApplicationStatus[] = [
  "Upcoming",
  "Verified",
  "Open",
  "Expiring soon",
  "Published",
];

export interface ScholarshipSearchFilters {
  countries: string[];
  levels: string[];
  fundingTypes: string[];
  deadline: "all" | "upcoming" | "flexible" | "closed";
  fieldsOfStudy: string[];
  eligibilityTags: string[];
  applicationStatuses: PublicApplicationStatus[];
}

export interface ScholarshipSearchResult extends Scholarship {
  matchReasons?: string[];
  deadlineDaysRemaining?: number | null;
  deadlineLabel?: string;
  profileMatchScore?: number | null;
  profileMatchReasons?: string[];
  qualifiesBasedOnProfile?: boolean;
}

export interface ScholarshipAIRecommendation extends ScholarshipSearchResult {
  recommendationReason: string;
  recommendationScore: number;
}

export interface ScholarshipMatchProfile {
  gpa?: number;
  country?: string;
  programLevel?: string;
  fieldOfStudy?: string;
  deadlinePreference?: "next30" | "thisYear" | "flexible";
  fundingNeed?: "full" | "partial" | "any";
  workExperience?: "none" | "1-2" | "3+";
  contextNote?: string;
}
