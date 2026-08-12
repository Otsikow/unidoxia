import { describe, expect, it } from "vitest";
import { parseUniversityProfileDetails } from "./universityProfile";

describe("university profile source data", () => {
  it("keeps concise structured showcase fields and valid sources", () => {
    const result = parseUniversityProfileDetails({
      internationalStudents: "Use the official country guidance.",
      tuition: "Fees vary by course.",
      studyLevels: ["Undergraduate", "Postgraduate", ""],
      sources: [
        { url: "https://example.edu/international", label: "Official guidance", checkedAt: "2026-08-12" },
        { label: "Missing URL" },
      ],
    });
    expect(result.internationalStudents).toBe("Use the official country guidance.");
    expect(result.tuition).toBe("Fees vary by course.");
    expect(result.studyLevels).toEqual(["Undergraduate", "Postgraduate"]);
    expect(result.sources).toEqual([{ url: "https://example.edu/international", label: "Official guidance", checkedAt: "2026-08-12" }]);
  });

  it("does not surface malformed source data", () => {
    const result = parseUniversityProfileDetails({ sources: [null, "not a source", {}] });
    expect(result.sources).toEqual([]);
  });
});
