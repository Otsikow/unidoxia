import { describe, expect, it } from "vitest";
import { favourableFinancialFields, isPubliclyCurrent, sortComparisonOptions, type ComparisonOption } from "./universityComparison";

const options: ComparisonOption[] = [
  { programId: "a", universityName: "A", programName: "Course A", country: "United Kingdom", level: "Postgraduate", tuitionAmount: 16000, initialDeposit: 4000, scholarshipMaximum: 2000, nextIntake: "2027-09", verificationStatus: "verified", sourceUrl: "https://example.edu/a", lastVerifiedAt: "2026-08-20" },
  { programId: "b", universityName: "B", programName: "Course B", country: "United Kingdom", level: "Postgraduate", tuitionAmount: 14000, initialDeposit: 6000, scholarshipMaximum: 4000, nextIntake: "2027-01", verificationStatus: "needs_review" },
];

describe("university comparison", () => {
  it("sorts by financial and intake criteria without treating missing values as zero", () => {
    expect(sortComparisonOptions(options, "tuition")[0].programId).toBe("b");
    expect(sortComparisonOptions(options, "deposit")[0].programId).toBe("a");
    expect(sortComparisonOptions(options, "scholarship")[0].programId).toBe("b");
    expect(sortComparisonOptions(options, "intake")[0].programId).toBe("b");
  });

  it("identifies favourable financial fields", () => {
    expect(favourableFinancialFields(options)).toMatchObject({ tuitionAmount: 14000, initialDeposit: 4000 });
  });

  it("only treats sourced verified records as current", () => {
    expect(isPubliclyCurrent(options[0])).toBe(true);
    expect(isPubliclyCurrent(options[1])).toBe(false);
  });
});
