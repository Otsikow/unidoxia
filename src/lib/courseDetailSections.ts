import { completeVerifiedSummary, formatCourseFee } from "@/lib/marketplacePresentation";

export interface CourseFeeLike {
  amount?: number | null;
  currency?: string | null;
  fee_basis?: string | null;
  applicant_type?: string | null;
  resolution_status?: string | null;
}

export interface CourseIntakeLike {
  intake_month?: number | string | null;
  status?: string | null;
}

export interface CourseRecordLike {
  overview?: string | null;
  description?: string | null;
  entry_requirements?: string | { summary?: string | null } | null;
  english_requirements?: string | { summary?: string | null } | null;
  modules?: unknown;
  scholarships?: unknown;
  placement?: unknown;
  placement_details?: unknown;
  official_url?: string | null;
  source_last_checked_at?: string | null;
  duration_months?: number | null;
  study_mode?: string | null;
  campus?: string | null;
  intake_months?: unknown;
  program_intakes?: CourseIntakeLike[] | null;
  program_fees?: CourseFeeLike[] | null;
}

const cleanText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
};

const summaryOf = (value: CourseRecordLike["entry_requirements"]): string | null => {
  if (typeof value === "string") return cleanText(value);
  if (value && typeof value === "object") return cleanText((value as { summary?: string | null }).summary);
  return null;
};

const listOfStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return cleanText(item);
      if (item && typeof item === "object") {
        const record = item as { name?: unknown; title?: unknown };
        return cleanText(record.name) ?? cleanText(record.title);
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
};

export const INTAKE_FALLBACK = "Future intake to be confirmed";
export const REQUIREMENTS_FALLBACK =
  "Entry requirements are confirmed by the university. Check the official course page for current criteria.";
export const OVERVIEW_FALLBACK =
  "A verified course summary is being prepared. Use the official course page for the latest description.";

/**
 * Derives the exact set of sections a course detail page should render.
 * Sections without meaningful data are reported as absent so the page never
 * reserves vertical space for an empty card.
 */
export const buildCourseSections = (course: CourseRecordLike | null | undefined) => {
  const record = course ?? {};

  const summary = completeVerifiedSummary(record.overview || record.description);
  const requirements = summaryOf(record.entry_requirements);
  const english = summaryOf(record.english_requirements);
  const modules = listOfStrings(record.modules);
  const scholarships = listOfStrings(record.scholarships);
  const placement = cleanText(record.placement) ?? cleanText(record.placement_details);
  const officialUrl = cleanText(record.official_url);

  const intakeMonths = [
    ...new Set([
      ...(Array.isArray(record.program_intakes) ? record.program_intakes : [])
        .filter((intake) => ["available", "recruitable", "provisional"].includes(String(intake?.status ?? "")))
        .map((intake) => Number(intake?.intake_month)),
      ...(Array.isArray(record.intake_months) ? record.intake_months : []).map((month) => Number(month)),
    ]),
  ]
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
    .sort((a, b) => a - b);

  const internationalFee = (Array.isArray(record.program_fees) ? record.program_fees : []).find(
    (fee) => fee?.applicant_type === "international" && fee?.resolution_status === "verified",
  );

  const tuition = formatCourseFee(internationalFee ?? undefined);

  return {
    summary,
    requirements,
    english,
    modules,
    scholarships,
    placement,
    officialUrl,
    intakeMonths,
    tuition,
    /** Overview only renders when there is a verified summary to show. */
    hasOverview: Boolean(summary),
    /** Requirements render when there is real text or an official link to offer. */
    hasRequirements: Boolean(requirements || english || officialUrl),
    hasModules: modules.length > 0,
    hasScholarships: scholarships.length > 0,
    hasPlacement: Boolean(placement),
    /** True when the main column would otherwise be empty; the page then uses a single column. */
    isSparse: !summary && !requirements && !english && modules.length === 0 && scholarships.length === 0 && !placement,
  };
};

export type CourseSections = ReturnType<typeof buildCourseSections>;
