export interface MarketplaceNavigationState {
  marketplaceBack?: {
    href: string;
    label: string;
    scrollY?: number;
    previousState?: MarketplaceNavigationState | null;
  };
  restoreScrollY?: number;
}

export const navigationStateFromCurrentPage = (
  href: string,
  label: string,
  previousState?: MarketplaceNavigationState | null,
  scrollY = 0,
): MarketplaceNavigationState => ({
  marketplaceBack: { href, label, scrollY, previousState: previousState ?? null },
});

export const formatCourseFee = (fee?: {
  amount?: number | null;
  currency?: string | null;
  fee_basis?: string | null;
}) => fee?.amount != null
  ? `${fee.currency || "GBP"} ${Number(fee.amount).toLocaleString("en-GB")} ${fee.fee_basis === "total" ? "total" : "per year"}`
  : "Check official tuition fee";

export const completeVerifiedSummary = (value?: string | null): string | null => {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (!/(?:,|\b(?:and|or|the|a|an|to|of|for|with|in|on|at|from))$/i.test(text) && /[.!?)]$/.test(text)) return text;
  const completeSentences = text.match(/.*[.!?](?=\s|$)/s)?.[0]?.trim();
  return completeSentences && completeSentences.length >= 20 ? completeSentences : null;
};

export interface SearchProgrammeRow {
  university_id: string;
  university_match_count?: number | string | null;
  total_count?: number | string | null;
  university_count?: number | string | null;
}

export const validateSearchCounts = (rows: SearchProgrammeRow[]) => {
  const globalCount = Number(rows[0]?.total_count || 0);
  const universityCount = Number(rows[0]?.university_count || 0);
  const perUniversity = new Map<string, number>();
  for (const row of rows) perUniversity.set(row.university_id, Number(row.university_match_count || 0));
  const sum = [...perUniversity.values()].reduce((total, count) => total + count, 0);
  return { globalCount, universityCount, perUniversity, invariantHolds: rows.length === 0 || sum === globalCount };
};
