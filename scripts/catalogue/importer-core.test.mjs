import { describe, expect, it } from "vitest";
import { deduplicateProgrammes, mergeRespectingUniversityFields, planImport, validateProgramme } from "./importer-core.mjs";

const programme = {
  name: "MSc Data Science with Advanced Practice", level: "Postgraduate", discipline: "Computing",
  qualification: "MSc", durationMonths: 24,
  officialUrl: "https://example.ac.uk/courses/data-science-advanced/",
  tuition: null,
};

describe("catalogue importer", () => {
  it("allows unresolved international tuition without inventing a zero fee", () => {
    const result = validateProgramme(programme);
    expect(result.errors).toEqual([]);
    expect(result.programme.tuition).toBeNull();
    expect(result.warnings).toContain("international tuition unresolved");
  });

  it("keeps genuine variants and removes duplicate search-view records", () => {
    const result = deduplicateProgrammes([
      programme,
      { ...programme, officialUrl: `${programme.officialUrl}?utm_source=catalogue` },
      { ...programme, name: "MSc Data Science", officialUrl: "https://example.ac.uk/courses/data-science" },
    ]);
    expect(result.programmes).toHaveLength(2);
    expect(result.duplicates).toHaveLength(1);
  });

  it("never overwrites university-locked fields", () => {
    const merged = mergeRespectingUniversityFields(
      { name: "University approved title", overview: "Old", university_locked_fields: ["name"] },
      { name: "Imported title", overview: "Current official summary" },
    );
    expect(merged.name).toBe("University approved title");
    expect(merged.overview).toBe("Current official summary");
  });

  it("reports removals as archive candidates instead of deleting them", () => {
    const plan = planImport({ university: { slug: "example" }, source: { url: "https://example.ac.uk/courses" }, programmes: [] }, [
      { id: "1", official_url: programme.officialUrl, catalogue_status: "active" },
    ]);
    expect(plan.summary.archive_candidate).toBe(1);
  });

  it("preserves seeded production IDs by mapping them to explicit official variants", () => {
    const official = { ...programme, name: "Computer Science MSc", officialUrl: "https://www.tees.ac.uk/computer-science-msc" };
    const plan = planImport({
      university: { slug: "teesside-university" }, source: { url: "https://www.tees.ac.uk/courses" }, programmes: [official],
    }, [{ id: "seed-id", name: "MSc Computer Science", official_url: null, catalogue_status: "active", university_locked_fields: [] }]);
    expect(plan.summary.update).toBe(1);
    expect(plan.summary.archive_candidate).toBeUndefined();
    expect(plan.items[0].existing.id).toBe("seed-id");
  });
});
