import { describe, expect, it } from "vitest";
import { buildCourseSections, INTAKE_FALLBACK } from "./courseDetailSections";

describe("buildCourseSections", () => {
  it("marks a completely sparse course so no empty cards are rendered", () => {
    const sections = buildCourseSections({});
    expect(sections.hasOverview).toBe(false);
    expect(sections.hasRequirements).toBe(false);
    expect(sections.hasModules).toBe(false);
    expect(sections.hasScholarships).toBe(false);
    expect(sections.hasPlacement).toBe(false);
    expect(sections.isSparse).toBe(true);
  });

  it("treats whitespace-only optional content as absent", () => {
    const sections = buildCourseSections({
      overview: "   ",
      entry_requirements: { summary: "  " },
      english_requirements: { summary: "" },
      modules: [],
      scholarships: [{ name: "  " }],
    });
    expect(sections.isSparse).toBe(true);
    expect(sections.scholarships).toEqual([]);
  });

  it("renders the requirements section when only an official link exists", () => {
    const sections = buildCourseSections({ official_url: "https://example.ac.uk/course" });
    expect(sections.hasRequirements).toBe(true);
    expect(sections.isSparse).toBe(true);
    expect(sections.officialUrl).toBe("https://example.ac.uk/course");
  });

  it("never exposes a zero tuition placeholder", () => {
    const zero = buildCourseSections({
      program_fees: [{ amount: 0, currency: "GBP", applicant_type: "international", resolution_status: "verified" }],
    });
    expect(zero.tuition).toBe("Check official tuition fee");
    expect(zero.tuition).not.toContain("0");

    const missing = buildCourseSections({ program_fees: [] });
    expect(missing.tuition).toBe("Check official tuition fee");
  });

  it("uses only verified international fees", () => {
    const sections = buildCourseSections({
      program_fees: [
        { amount: 9250, currency: "GBP", applicant_type: "home", resolution_status: "verified" },
        { amount: 21500, currency: "GBP", applicant_type: "international", resolution_status: "verified" },
      ],
    });
    expect(sections.tuition).toBe("GBP 21,500 per year");
  });

  it("returns neutral intake wording without inventing dates", () => {
    const sections = buildCourseSections({ intake_months: [] });
    expect(sections.intakeMonths).toEqual([]);
    expect(INTAKE_FALLBACK).toBe("Future intake to be confirmed");
    expect(INTAKE_FALLBACK).not.toMatch(/2026|September/);
  });

  it("merges, dedupes and sorts intake months from both sources", () => {
    const sections = buildCourseSections({
      intake_months: [9, 1, 99],
      program_intakes: [
        { intake_month: 9, status: "available" },
        { intake_month: 5, status: "recruitable" },
        { intake_month: 7, status: "closed" },
      ],
    });
    expect(sections.intakeMonths).toEqual([1, 5, 9]);
  });

  it("keeps a rich course fully expanded", () => {
    const sections = buildCourseSections({
      overview: "A complete verified summary of the programme.",
      entry_requirements: "112 UCAS tariff points.",
      english_requirements: { summary: "IELTS 6.0 overall." },
      modules: ["Microeconomics", { name: "Econometrics" }],
      scholarships: ["International merit award"],
      placement: "Optional year in industry.",
    });
    expect(sections.isSparse).toBe(false);
    expect(sections.hasOverview).toBe(true);
    expect(sections.modules).toEqual(["Microeconomics", "Econometrics"]);
    expect(sections.hasPlacement).toBe(true);
  });
});
