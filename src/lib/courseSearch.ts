export const UNIVERSITY_ALIASES: Record<string, string> = {
  teesside: "teesside", "t-side": "teesside", "t side": "teesside", tees: "teesside", teeside: "teesside",
  sunderland: "sunderland", "sunderland university": "sunderland", "uni of sunderland": "sunderland",
  northumbria: "northumbria", "northumbria uni": "northumbria", northumbia: "northumbria",
};

export const COUNTRY_ALIASES: Record<string, string> = {
  uk: "united kingdom", "u.k.": "united kingdom", "u k": "united kingdom",
  usa: "united states", us: "united states", "u.s.": "united states", "u s": "united states",
};

const TYPO_ALIASES: Record<string, string> = { economcis: "economics", computr: "computer" };

export function normalizeCourseSearch(value: string): string {
  const compact = value.toLowerCase().trim().replace(/[^a-z0-9.\s-]+/g, " ").replace(/\s+/g, " ");
  const direct = UNIVERSITY_ALIASES[compact] || COUNTRY_ALIASES[compact];
  if (direct) return direct;
  return compact.split(" ").map((token) => TYPO_ALIASES[token] || COUNTRY_ALIASES[token] || token).join(" ")
    .replace(/\bt[- ]side\b/g, "teesside").replace(/\bteeside\b/g, "teesside").replace(/\bnorthumbia\b/g, "northumbria")
    .replace(/\bu\.?k\.?\b/g, "united kingdom").replace(/\bu\.?s\.?(?:a\.?)?\b/g, "united states").replace(/\s+/g, " ").trim();
}

export interface CourseSearchState {
  q?: string;
  university?: string;
  country?: string;
  level?: string;
  intake?: string;
  discipline?: string;
  tuitionMax?: string;
  depositMax?: string;
  noApplicationFee?: boolean;
  englishAlternative?: boolean;
  scholarshipOnly?: boolean;
  sort?: string;
  page?: number;
}

export const COURSE_SORT_OPTIONS = ["recommended", "tuition", "deposit", "scholarship", "intake"] as const;
export type CourseSortOption = typeof COURSE_SORT_OPTIONS[number];

export interface CourseFilterValidationResult {
  success: boolean;
  fields: Record<string, string>;
}

export function validateCourseSearchState(state: CourseSearchState): CourseFilterValidationResult {
  const fields: Record<string, string> = {};
  const validateMoney = (key: "tuitionMax" | "depositMax", label: string) => {
    const value = state[key];
    if (!value) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) fields[key] = `${label} must be a valid number.`;
    else if (parsed < 0) fields[key] = `${label} cannot be negative.`;
  };
  validateMoney("tuitionMax", "Maximum tuition");
  validateMoney("depositMax", "Maximum deposit");
  if (state.intake && state.intake !== "all" && parseIntake(state.intake).year === null) {
    fields.intake = "Intake must use a valid year and month.";
  }
  if (state.sort && !COURSE_SORT_OPTIONS.includes(state.sort as CourseSortOption)) {
    fields.sort = "The selected sorting option is not supported.";
  }
  return { success: Object.keys(fields).length === 0, fields };
}

export function courseSearchParams(state: CourseSearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q?.trim()) params.set("q", state.q.trim());
  if (state.university && state.university !== "all") params.set("university", state.university);
  if (state.country && state.country !== "all") params.set("country", state.country);
  if (state.level && state.level !== "all") params.set("level", state.level);
  if (state.intake && state.intake !== "all") params.set("intake", state.intake);
  if (state.discipline && state.discipline !== "all") params.set("discipline", state.discipline);
  if (state.tuitionMax) params.set("tuitionMax", state.tuitionMax);
  if (state.depositMax) params.set("depositMax", state.depositMax);
  if (state.noApplicationFee) params.set("noApplicationFee", "true");
  if (state.englishAlternative) params.set("englishAlternative", "true");
  if (state.scholarshipOnly) params.set("scholarshipOnly", "true");
  if (state.sort && state.sort !== "recommended") params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  return params;
}

export function parseIntake(value?: string | null): { year: number | null; month: number | null } {
  if (!value || value === "all") return { year: null, month: null };
  const match = /^(20\d{2})-(0?[1-9]|1[0-2])$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : { year: null, month: null };
}
