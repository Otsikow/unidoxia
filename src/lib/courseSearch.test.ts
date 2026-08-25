import { describe, expect, it } from "vitest";
import { courseSearchParams, normalizeCourseSearch, parseIntake, validateCourseSearchState } from "./courseSearch";

describe("course search normalisation", () => {
  it.each([
    ["Teesside", "teesside"], ["t-side", "teesside"], ["T side", "teesside"], ["Tees", "teesside"],
    ["Teeside", "teesside"], ["Sunderland University", "sunderland"], ["Northumbria Uni", "northumbria"],
    ["Northumbia", "northumbria"], ["UK", "united kingdom"], ["U.K.", "united kingdom"],
    ["USA", "united states"], ["U.S.", "united states"], ["economcis", "economics"],
    ["computr science", "computer science"], ["UK economics", "united kingdom economics"],
    ["Sunderland MBA", "sunderland mba"],
  ])("normalises %s", (input, expected) => expect(normalizeCourseSearch(input)).toBe(expected));

  it("stores all public filters and pagination in a shareable URL", () => {
    expect(courseSearchParams({ q: "UK economics", university: "9c32c04e-8e8f-47af-a3bb-dde7a334bc80", country: "United Kingdom", level: "Postgraduate", intake: "2027-09", discipline: "Economics", tuitionMax: "15000", depositMax: "5000", englishAlternative: true, scholarshipOnly: true, sort: "tuition", page: 3 }).toString())
      .toBe("q=UK+economics&university=9c32c04e-8e8f-47af-a3bb-dde7a334bc80&country=United+Kingdom&level=Postgraduate&intake=2027-09&discipline=Economics&tuitionMax=15000&depositMax=5000&englishAlternative=true&scholarshipOnly=true&sort=tuition&page=3");
  });

  it("rejects malformed, negative and unsupported filters", () => {
    const result = validateCourseSearchState({ tuitionMax: "-1", depositMax: "abc", intake: "September", sort: "secret" });
    expect(result.success).toBe(false);
    expect(result.fields).toEqual({
      tuitionMax: "Maximum tuition cannot be negative.",
      depositMax: "Maximum deposit must be a valid number.",
      intake: "Intake must use a valid year and month.",
      sort: "The selected sorting option is not supported.",
    });
  });

  it("accepts only structured year-month intake values", () => {
    expect(parseIntake("2027-05")).toEqual({ year: 2027, month: 5 });
    expect(parseIntake("September 2026")).toEqual({ year: null, month: null });
  });
});
