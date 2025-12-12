import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseEdgeFunctions";
import { FALLBACK_SCHOLARSHIPS } from "@/data/scholarships";
import type {
  Scholarship,
  ScholarshipSearchFilters,
  ScholarshipSearchResult,
  ScholarshipAIRecommendation,
  ScholarshipMatchProfile,
} from "@/types/scholarship";
import type { Database } from "@/integrations/supabase/types";

interface ScholarshipSearchOptions {
  query: string;
  filters: ScholarshipSearchFilters;
  profileTags?: string[];
  matchProfile?: ScholarshipMatchProfile | null;
  limit?: number;
}

interface ScholarshipSearchHookResult {
  results: ScholarshipSearchResult[];
  recommendations: ScholarshipAIRecommendation[];
  stats: {
    total: number;
    closingSoon: number;
    fullyFunded: number;
  };
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

type SupabaseScholarshipRow = Database["public"]["Tables"]["scholarships"]["Row"];

const DEFAULT_LIMIT = 60;

const formatAmountFromCents = (amount?: number | null, currency?: string | null) => {
  if (!amount) return null;
  const formatted = (amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return currency ? `${currency} ${formatted}` : formatted;
};

const mapScholarshipRow = (row: SupabaseScholarshipRow): Scholarship => {
  const fallbackAward = formatAmountFromCents(row.amount_cents, row.currency);
  const fallbackTitle = (row as any).title ?? (row as any).name ?? "Scholarship opportunity";
  const fallbackLevel = (row as any).level ?? row.coverage_type ?? "Masters";
  const fallbackInstitution = (row as any).institution ?? row.university_id ?? (row as any).name ?? "Host institution";
  const fallbackCountry = (row as any).country ?? "Global";

  const eligibility = (row.eligibility_criteria as any) ?? {};

  const steps = (row as any).application_steps ?? [];
  const documents = (row as any).documents_required ?? [];

  return {
    id: row.id,
    title: fallbackTitle,
    country: fallbackCountry,
    institution: fallbackInstitution,
    level: fallbackLevel,
    awardAmount: (row as any).award_amount ?? fallbackAward ?? "See official details",
    fundingType: ((row as any).funding_type ?? row.coverage_type ?? "Partial") as Scholarship["fundingType"],
    eligibility,
    eligibilitySummary: (row as any).eligibility_summary ?? (typeof row.eligibility_criteria === "string" ? row.eligibility_criteria : "Review official eligibility details."),
    deadline: (row as any).deadline ?? row.application_deadline ?? undefined,
    description: row.description ?? "",
    overview: (row as any).overview ?? undefined,
    applicationSteps: steps,
    documentsRequired: documents,
    officialLink: (row as any).official_link ?? "#",
    tags: (row as any).tags ?? [],
    aiScore: (row as any).ai_score ?? undefined,
    languageSupport: (row as any).language_support ?? undefined,
    logoUrl: (row as any).logo_url ?? null,
    currency: row.currency ?? undefined,
    stipendDetails: (row as any).stipend_details ?? undefined,
    selectionProcess: (row as any).selection_process ?? undefined,
    recommendedFor: (row as any).recommended_for ?? undefined,
    verified: (row as any).verified ?? row.active ?? true,
  };
};

const fetchScholarships = async (
  query: string,
  filters: ScholarshipSearchFilters,
  limit: number,
): Promise<Scholarship[]> => {
  try {
    const { data, error } = await invokeEdgeFunction<{
      results: Scholarship[];
    }>("scholarship-search", {
      method: "POST",
      includeAnonKey: true,
      body: JSON.stringify({ query, filters, limit }),
      headers: { "Content-Type": "application/json" },
    });

    if (!error && data?.results?.length) {
      return data.results;
    }
  } catch (edgeError) {
    console.warn("Scholarship edge search failed, falling back to Supabase query", edgeError);
  }

  try {
    const { data, error } = await supabase
      .from("scholarships")
      .select("*")
      .order("deadline", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Supabase scholarship fetch error", error);
    }

    if (data?.length) {
      return data.map(mapScholarshipRow);
    }
  } catch (clientError) {
    console.error("Supabase scholarship fetch failed", clientError);
  }

  return FALLBACK_SCHOLARSHIPS;
};

const normalise = (value: string) => value.toLowerCase();

const computeDeadlineMeta = (deadline: string | null | undefined) => {
  if (!deadline) {
    return { daysRemaining: null, label: "Flexible deadline" } as const;
  }

  const parsed = parseISO(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return { daysRemaining: null, label: "Flexible deadline" } as const;
  }

  const today = new Date();
  const daysRemaining = differenceInCalendarDays(parsed, today);
  if (daysRemaining < 0) {
    return { daysRemaining, label: "Deadline passed" } as const;
  }

  if (daysRemaining === 0) {
    return { daysRemaining, label: "Closes today" } as const;
  }

  if (daysRemaining <= 14) {
    return { daysRemaining, label: `${daysRemaining} days left` } as const;
  }

  return { daysRemaining, label: `Closes in ${daysRemaining} days` } as const;
};

const matchesFilter = (scholarship: Scholarship, filters: ScholarshipSearchFilters) => {
  if (filters.countries.length && !filters.countries.includes(scholarship.country)) {
    return false;
  }

  if (filters.levels.length && !filters.levels.includes(scholarship.level)) {
    return false;
  }

  if (filters.fundingTypes.length && !filters.fundingTypes.includes(scholarship.fundingType)) {
    return false;
  }

  if (filters.fieldsOfStudy.length) {
    const fieldMatches = (scholarship.eligibility.fieldOfStudy ?? []).some((field) =>
      filters.fieldsOfStudy.some((filterField) => normalise(field).includes(normalise(filterField))),
    );
    if (!fieldMatches) return false;
  }

  if (filters.eligibilityTags.length) {
    const eligibilityBuckets: string[] = [];
    if (scholarship.eligibility.nationality?.includes("International")) eligibilityBuckets.push("International");
    if (scholarship.eligibility.nationality && scholarship.eligibility.nationality.some((tag) => tag.includes("Women"))) {
      eligibilityBuckets.push("Women-only");
    }
    if (scholarship.tags.some((tag) => normalise(tag).includes("women"))) {
      eligibilityBuckets.push("Women-only");
    }
    if (scholarship.tags.some((tag) => normalise(tag).includes("no-ielts"))) {
      eligibilityBuckets.push("No IELTS");
    }
    if (scholarship.tags.some((tag) => normalise(tag).includes("research"))) {
      eligibilityBuckets.push("Research");
    }
    if (scholarship.tags.some((tag) => normalise(tag).includes("stem"))) {
      eligibilityBuckets.push("STEM");
    }
    if (scholarship.tags.some((tag) => normalise(tag).includes("business"))) {
      eligibilityBuckets.push("Business");
    }
    if (scholarship.tags.some((tag) => normalise(tag).includes("africa") || normalise(tag).includes("regional"))) {
      eligibilityBuckets.push("Region-specific");
    }

    const hasTag = filters.eligibilityTags.some((tag) => eligibilityBuckets.includes(tag));
    if (!hasTag) return false;
  }

  if (filters.deadline !== "all") {
    const { daysRemaining } = computeDeadlineMeta(scholarship.deadline);
    if (filters.deadline === "upcoming" && (daysRemaining === null || daysRemaining < 0)) {
      return false;
    }
    if (filters.deadline === "flexible" && daysRemaining !== null) {
      return false;
    }
    if (filters.deadline === "closed" && (daysRemaining === null || daysRemaining >= 0)) {
      return false;
    }
  }

  return true;
};

const scoreScholarship = (
  scholarship: Scholarship,
  query: string,
  profileTags: string[] | undefined,
): { score: number; reasons: string[] } => {
  let score = scholarship.aiScore ?? 70;
  const reasons: string[] = [];

  if (profileTags?.length) {
    const overlapping = scholarship.tags.filter((tag) =>
      profileTags.some((profileTag) => normalise(profileTag) === normalise(tag)),
    );
    if (overlapping.length) {
      score += overlapping.length * 4;
      reasons.push(`Matches your profile interests: ${overlapping.join(", ")}`);
    }
  }

  const { daysRemaining } = computeDeadlineMeta(scholarship.deadline);
  if (typeof daysRemaining === "number" && daysRemaining >= 0) {
    const urgencyBoost = Math.max(0, 20 - Math.min(daysRemaining, 20));
    if (urgencyBoost > 0) {
      score += urgencyBoost / 2;
      reasons.push("Deadline approaching soon");
    }
  }

  if (query.trim()) {
    const q = normalise(query.trim());
    const searchable = [
      scholarship.title,
      scholarship.country,
      scholarship.institution,
      scholarship.level,
      scholarship.awardAmount,
      scholarship.eligibilitySummary,
      ...(scholarship.tags ?? []),
      ...(scholarship.eligibility.fieldOfStudy ?? []),
    ]
      .filter(Boolean)
      .map(normalise);

    const matches = searchable.filter((field) => field.includes(q));
    if (matches.length) {
      score += 15 + matches.length * 2;
      reasons.push(`Matches your search: ${query}`);
    }
  }

  if (scholarship.fundingType.toLowerCase() === "full") {
    score += 5;
    reasons.push("Full funding available");
  }

  return { score, reasons };
};

const parseGpaRequirement = (value?: string | null) => {
  if (!value) return null;
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const evaluateProfileMatch = (
  scholarship: Scholarship,
  profile?: ScholarshipMatchProfile | null,
): { score: number | null; reasons: string[]; qualifies: boolean } => {
  if (!profile) {
    return { score: null, reasons: [], qualifies: false };
  }

  let score = 45;
  const reasons: string[] = [];

  if (typeof profile.gpa === "number") {
    const requirement = parseGpaRequirement(scholarship.eligibility.gpa);
    if (!requirement || profile.gpa >= requirement) {
      score += 15;
      reasons.push(
        requirement
          ? `Your GPA ${profile.gpa.toFixed(2)} meets the ${requirement.toFixed(2)} requirement`
          : `Strong GPA (${profile.gpa.toFixed(2)}) for competitive awards`,
      );
    } else {
      score -= 8;
      reasons.push(`Requires GPA ${requirement.toFixed(2)}+`);
    }
  }

  if (profile.country) {
    if (normalise(scholarship.country) === normalise(profile.country)) {
      score += 15;
      reasons.push(`Available in ${profile.country}`);
    } else if (normalise(scholarship.country) === "global") {
      score += 8;
      reasons.push("Global eligibility fits your location");
    } else {
      score -= 6;
    }
  }

  if (profile.programLevel) {
    if (normalise(scholarship.level).includes(normalise(profile.programLevel))) {
      score += 12;
      reasons.push(`${scholarship.level} course matches your goal`);
    } else {
      score -= 4;
    }
  }

  if (profile.fieldOfStudy && scholarship.eligibility.fieldOfStudy?.length) {
    const matchesField = scholarship.eligibility.fieldOfStudy.some((field) =>
      normalise(field).includes(normalise(profile.fieldOfStudy!)),
    );
    if (matchesField) {
      score += 10;
      reasons.push(`${profile.fieldOfStudy} is prioritised`);
    }
  }

  if (profile.deadlinePreference) {
    const { daysRemaining } = computeDeadlineMeta(scholarship.deadline);
    if (
      profile.deadlinePreference === "next30" &&
      typeof daysRemaining === "number" &&
      daysRemaining >= 0 &&
      daysRemaining <= 30
    ) {
      score += 8;
      reasons.push("Deadline within the next 30 days");
    } else if (
      profile.deadlinePreference === "thisYear" &&
      scholarship.deadline &&
      new Date(scholarship.deadline).getFullYear() === new Date().getFullYear()
    ) {
      score += 6;
      reasons.push("Applications open this year");
    } else if (profile.deadlinePreference === "flexible" && !scholarship.deadline) {
      score += 6;
      reasons.push("Flexible/rolling deadline");
    }
  }

  if (profile.fundingNeed && profile.fundingNeed !== "any") {
    if (normalise(scholarship.fundingType) === normalise(profile.fundingNeed === "full" ? "Full" : "Partial")) {
      score += 12;
      reasons.push(`${scholarship.fundingType} funding covers your need`);
    } else {
      score -= 8;
    }
  }

  if (profile.workExperience && scholarship.eligibility.experience) {
    const experienceRequirement = normalise(scholarship.eligibility.experience);
    if (
      profile.workExperience === "3+" &&
      (experienceRequirement.includes("3") || experienceRequirement.includes("professional"))
    ) {
      score += 5;
      reasons.push("Relevant work experience noted");
    } else if (profile.workExperience === "none" && experienceRequirement.includes("none")) {
      score += 5;
      reasons.push("Open to applicants without experience");
    }
  }

  if (profile.contextNote) {
    const snippet = profile.contextNote.length > 80 ? `${profile.contextNote.slice(0, 77)}...` : profile.contextNote;
    reasons.push(`Considers your goal: ${snippet}`);
  }

  const boundedScore = Math.max(10, Math.min(100, Math.round(score)));
  return { score: boundedScore, reasons, qualifies: boundedScore >= 60 };
};

const enhanceScholarships = (
  scholarships: Scholarship[],
  query: string,
  filters: ScholarshipSearchFilters,
  profileTags: string[] | undefined,
  matchProfile?: ScholarshipMatchProfile | null,
): ScholarshipSearchResult[] => {
  return scholarships
    .filter((scholarship) => matchesFilter(scholarship, filters))
    .map((scholarship) => {
      const meta = computeDeadlineMeta(scholarship.deadline);
      const { score, reasons } = scoreScholarship(scholarship, query, profileTags);
      const profileMatch = evaluateProfileMatch(scholarship, matchProfile);
      return {
        ...scholarship,
        deadlineDaysRemaining: meta.daysRemaining,
        deadlineLabel: meta.label,
        matchReasons: Array.from(new Set([...(reasons ?? []), ...(profileMatch.reasons ?? [])])),
        aiScore: Math.round(score),
        profileMatchScore: profileMatch.score,
        profileMatchReasons: profileMatch.reasons,
        qualifiesBasedOnProfile: profileMatch.qualifies,
      };
    })
    .sort((a, b) => {
      if (typeof a.deadlineDaysRemaining === "number" && typeof b.deadlineDaysRemaining === "number") {
        if (a.deadlineDaysRemaining >= 0 && b.deadlineDaysRemaining >= 0) {
          if (a.deadlineDaysRemaining !== b.deadlineDaysRemaining) {
            return a.deadlineDaysRemaining - b.deadlineDaysRemaining;
          }
        } else if (a.deadlineDaysRemaining >= 0) {
          return -1;
        } else if (b.deadlineDaysRemaining >= 0) {
          return 1;
        }
      }
      const profileScoreDiff = (b.profileMatchScore ?? 0) - (a.profileMatchScore ?? 0);
      if (profileScoreDiff !== 0) return profileScoreDiff;
      return (b.aiScore ?? 0) - (a.aiScore ?? 0);
    });
};

const deriveRecommendations = (
  results: ScholarshipSearchResult[],
): ScholarshipAIRecommendation[] => {
  return results
    .slice(0, 6)
    .map((result) => ({
      ...result,
      recommendationReason:
        result.profileMatchReasons?.[0] ??
        result.matchReasons?.[0] ??
        "Strong alignment with your profile",
      recommendationScore: result.profileMatchScore ?? result.aiScore ?? 75,
    }))
    .slice(0, 3);
};

export const useScholarshipSearch = ({
  query,
  filters,
  profileTags,
  matchProfile,
  limit = DEFAULT_LIMIT,
}: ScholarshipSearchOptions): ScholarshipSearchHookResult => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["scholarship-search", query, filters, profileTags, matchProfile, limit],
    queryFn: () => fetchScholarships(query, filters, limit),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const enhancedResults = useMemo(
    () => enhanceScholarships(data ?? FALLBACK_SCHOLARSHIPS, query, filters, profileTags, matchProfile),
    [data, query, filters, profileTags, matchProfile],
  );

  const stats = useMemo(() => {
    const closingSoon = enhancedResults.filter((scholarship) =>
      typeof scholarship.deadlineDaysRemaining === "number" && scholarship.deadlineDaysRemaining >= 0 && scholarship.deadlineDaysRemaining <= 30,
    ).length;
    const fullyFunded = enhancedResults.filter((scholarship) => scholarship.fundingType.toLowerCase() === "full").length;
    return {
      total: enhancedResults.length,
      closingSoon,
      fullyFunded,
    };
  }, [enhancedResults]);

  const recommendations = useMemo(() => deriveRecommendations(enhancedResults), [enhancedResults]);

  return {
    results: enhancedResults,
    recommendations,
    stats,
    loading: isLoading || isFetching,
    error: error ? "Unable to load scholarships at the moment." : null,
    refetch,
  };
};
