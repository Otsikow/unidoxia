import { describe, expect, it } from "vitest";
import { courseSearchParams, normalizeCourseSearch, parseIntake } from "./courseSearch";

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
    expect(courseSearchParams({ q: "UK economics", country: "United Kingdom", level: "Postgraduate", intake: "2027-09", page: 3 }).toString())
      .toBe("q=UK+economics&country=United+Kingdom&level=Postgraduate&intake=2027-09&page=3");
  });

  it("accepts only structured year-month intake values", () => {
    expect(parseIntake("2027-05")).toEqual({ year: 2027, month: 5 });
    expect(parseIntake("September 2026")).toEqual({ year: null, month: null });
  });
});
