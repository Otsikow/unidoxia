import { describe, expect, it } from "vitest";
import { completeVerifiedSummary, formatCourseDuration, formatCourseFee, navigationStateFromCurrentPage, validateSearchCounts } from "./marketplacePresentation";

describe("marketplace presentation", () => {
  it("never prefixes an unresolved fee with a currency symbol", () => expect(formatCourseFee()).toBe("Check official tuition fee"));
  it("treats null and zero tuition as unresolved", () => {
    expect(formatCourseFee({ amount: null, currency: "AUD" })).toBe("Check official tuition fee");
    expect(formatCourseFee({ amount: 0, currency: "AUD" })).toBe("Check official tuition fee");
  });
  it("formats a verified fee", () => expect(formatCourseFee({ amount: 16900, currency: "GBP" })).toBe("GBP 16,900 per year"));
  it("uses a truthful fallback when course duration is missing", () => {
    expect(formatCourseDuration(null)).toBe("Check course duration");
    expect(formatCourseDuration(24)).toBe("24 months");
  });
  it("removes an incomplete imported sentence without inventing copy", () => expect(completeVerifiedSummary("A complete verified course fact. An unfinished claim and")).toBe("A complete verified course fact."));
  it("rejects a fragment that has no complete verified sentence", () => expect(completeVerifiedSummary("An unfinished claim and")).toBeNull());
  it("preserves the exact search URL and scroll position", () => expect(navigationStateFromCurrentPage("/courses?q=economics&page=2", "Back to search results", null, 480).marketplaceBack).toMatchObject({ href: "/courses?q=economics&page=2", scrollY: 480 }));
});

describe("search count invariant", () => {
  it("uses server totals when the preview is shorter than the matches", () => {
    const result = validateSearchCounts([
      { university_id: "a", university_match_count: 3, total_count: 4, university_count: 2 },
      { university_id: "b", university_match_count: 1, total_count: 4, university_count: 2 },
    ]);
    expect(result.globalCount).toBe(4);
    expect(result.universityCount).toBe(2);
    expect(result.perUniversity.get("a")).toBe(3);
    expect(result.invariantHolds).toBe(true);
  });
});
