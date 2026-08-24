export type VerificationStatus = "verified" | "needs_review" | "outdated" | "unverified";

export interface ComparisonOption {
  programId: string;
  universityName: string;
  programName: string;
  country: string;
  city?: string | null;
  level: string;
  tuitionAmount?: number | null;
  currency?: string | null;
  initialDeposit?: number | null;
  applicationFee?: number | null;
  applicationFeeWaived?: boolean;
  estimatedFirstYearCost?: number | null;
  scholarshipMaximum?: number | null;
  scholarshipAvailable?: boolean;
  englishSummary?: string | null;
  ieltsAlternativesAccepted?: boolean;
  noIeltsPathway?: boolean;
  academicSummary?: string | null;
  nextIntake?: string | null;
  applicationDeadline?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | null;
  academicYear?: string | null;
  verificationStatus?: VerificationStatus;
}

export type ComparisonSort = "recommended" | "tuition" | "deposit" | "scholarship" | "intake";

const finite = (value?: number | null) => typeof value === "number" && Number.isFinite(value);
const lowest = (values: Array<number | null | undefined>) => {
  const available = values.filter(finite) as number[];
  return available.length ? Math.min(...available) : null;
};

export function comparisonScore(option: ComparisonOption): number {
  let score = 0;
  if (option.verificationStatus === "verified") score += 30;
  if (option.applicationFeeWaived) score += 12;
  if (option.scholarshipAvailable) score += 10;
  if (option.noIeltsPathway) score += 8;
  else if (option.ieltsAlternativesAccepted) score += 5;
  if (finite(option.tuitionAmount)) score += Math.max(0, 25 - (option.tuitionAmount as number) / 2_000);
  if (finite(option.initialDeposit)) score += Math.max(0, 15 - (option.initialDeposit as number) / 1_000);
  return score;
}

export function sortComparisonOptions(options: ComparisonOption[], sort: ComparisonSort): ComparisonOption[] {
  const copy = [...options];
  if (sort === "recommended") return copy.sort((a, b) => comparisonScore(b) - comparisonScore(a));
  if (sort === "scholarship") return copy.sort((a, b) => (b.scholarshipMaximum ?? -1) - (a.scholarshipMaximum ?? -1));
  if (sort === "intake") return copy.sort((a, b) => (a.nextIntake ?? "9999-99").localeCompare(b.nextIntake ?? "9999-99"));
  const key = sort === "tuition" ? "tuitionAmount" : "initialDeposit";
  return copy.sort((a, b) => (a[key] ?? Number.POSITIVE_INFINITY) - (b[key] ?? Number.POSITIVE_INFINITY));
}

export function favourableFinancialFields(options: ComparisonOption[]) {
  return {
    tuitionAmount: lowest(options.map((option) => option.tuitionAmount)),
    initialDeposit: lowest(options.map((option) => option.initialDeposit)),
    applicationFee: lowest(options.map((option) => option.applicationFee)),
    estimatedFirstYearCost: lowest(options.map((option) => option.estimatedFirstYearCost)),
  };
}

export function isPubliclyCurrent(option: ComparisonOption): boolean {
  return option.verificationStatus === "verified" && Boolean(option.lastVerifiedAt && option.sourceUrl);
}
