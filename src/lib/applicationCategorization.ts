import { differenceInCalendarDays, isValid, parseISO } from "date-fns";

export type ApplicationLevelTag = "UG" | "PG" | "PhD";
export type ApplicationRouteTag = "Direct" | "Foundation" | "Top-up";
export type ApplicationGeographyTag = "UK" | "EU" | "Canada" | "US" | "Australia";
export type ApplicationRiskBand = "Low" | "Medium" | "High";

export interface ApplicationCategorization {
  level: ApplicationLevelTag;
  route: ApplicationRouteTag;
  geography: ApplicationGeographyTag;
  riskBand: ApplicationRiskBand;
  tags: [ApplicationLevelTag, ApplicationRouteTag, ApplicationGeographyTag, ApplicationRiskBand];
}

interface CategorizationInput {
  programLevel?: string | null;
  programName?: string | null;
  universityCountry?: string | null;
  studentNationality?: string | null;
  studentCurrentCountry?: string | null;
  status?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  lastDocumentAt?: string | null;
  documentsCount?: number | null;
  agentId?: string | null;
}

const EU_COUNTRIES = new Set([
  "austria",
  "belgium",
  "bulgaria",
  "croatia",
  "cyprus",
  "czech republic",
  "czechia",
  "denmark",
  "estonia",
  "finland",
  "france",
  "germany",
  "greece",
  "hungary",
  "ireland",
  "italy",
  "latvia",
  "lithuania",
  "luxembourg",
  "malta",
  "netherlands",
  "poland",
  "portugal",
  "romania",
  "slovakia",
  "slovenia",
  "spain",
  "sweden",
]);

const normalize = (value?: string | null): string => value?.trim().toLowerCase() ?? "";

const inferLevel = (programLevel?: string | null): ApplicationLevelTag => {
  const level = normalize(programLevel);

  if (level.includes("phd") || level.includes("doctor")) return "PhD";
  if (level.includes("master") || level.includes("post") || level.includes("graduate")) return "PG";

  return "UG";
};

const inferRoute = (
  programLevel?: string | null,
  programName?: string | null,
): ApplicationRouteTag => {
  const source = `${normalize(programLevel)} ${normalize(programName)}`;

  if (source.includes("foundation") || source.includes("pathway") || source.includes("preparatory")) {
    return "Foundation";
  }

  if (source.includes("top-up") || source.includes("top up") || source.includes("topup")) {
    return "Top-up";
  }

  return "Direct";
};

const geographyFromCountry = (
  country?: string | null,
): ApplicationGeographyTag | null => {
  const value = normalize(country);
  if (!value) return null;

  if (
    value.includes("united kingdom") ||
    value === "uk" ||
    value === "england" ||
    value === "scotland" ||
    value === "wales" ||
    value === "northern ireland"
  ) {
    return "UK";
  }

  if (value.includes("united states") || value === "usa" || value === "us") {
    return "US";
  }

  if (value.includes("canada")) return "Canada";
  if (value.includes("australia")) return "Australia";

  if (EU_COUNTRIES.has(value)) return "EU";

  return null;
};

const inferGeography = (
  universityCountry?: string | null,
  studentNationality?: string | null,
  studentCurrentCountry?: string | null,
): ApplicationGeographyTag => {
  return (
    geographyFromCountry(universityCountry) ||
    geographyFromCountry(studentNationality) ||
    geographyFromCountry(studentCurrentCountry) ||
    "EU"
  );
};

const safestDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const inferRiskBand = (input: CategorizationInput): ApplicationRiskBand => {
  const status = normalize(input.status);
  let riskScore = 30;

  if (["withdrawn", "rejected"].includes(status)) riskScore += 40;
  if (["draft", "submitted", "screening"].includes(status)) riskScore += 15;
  if (["conditional_offer", "unconditional_offer"].includes(status)) riskScore -= 10;
  if (["cas_loa", "visa", "enrolled"].includes(status)) riskScore -= 20;

  if (!input.agentId) riskScore += 5;
  if (!input.documentsCount || input.documentsCount === 0) riskScore += 10;

  const activityDate =
    safestDate(input.lastDocumentAt) ||
    safestDate(input.lastUpdatedAt) ||
    safestDate(input.createdAt);

  if (activityDate) {
    const daysSinceActivity = differenceInCalendarDays(new Date(), activityDate);
    if (daysSinceActivity > 90) riskScore += 30;
    else if (daysSinceActivity > 60) riskScore += 20;
    else if (daysSinceActivity > 30) riskScore += 10;
  }

  const clamped = Math.max(0, Math.min(100, riskScore));

  if (clamped >= 70) return "High";
  if (clamped >= 40) return "Medium";
  return "Low";
};

export const categorizeApplication = (
  input: CategorizationInput,
): ApplicationCategorization => {
  const level = inferLevel(input.programLevel);
  const route = inferRoute(input.programLevel, input.programName);
  const geography = inferGeography(
    input.universityCountry,
    input.studentNationality,
    input.studentCurrentCountry,
  );
  const riskBand = inferRiskBand(input);

  return {
    level,
    route,
    geography,
    riskBand,
    tags: [level, route, geography, riskBand],
  };
};
