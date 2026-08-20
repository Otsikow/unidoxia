import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dataset = JSON.parse(await readFile(resolve(process.cwd(), "data/catalogues/georgian-college-stem-expansion.json"), "utf8"));
const migration = await readFile(resolve(process.cwd(), "supabase/migrations/20260820190000_georgian_college_stem_expansion.sql"), "utf8");

describe("Georgian College STEM and hands-on expansion", () => {
  it("contains 24 unique current official programme records", () => {
    expect(dataset.academicYear).toBe("2027/28");
    expect(dataset.programmes).toHaveLength(24);
    expect(new Set(dataset.programmes.map((programme) => programme.courseCode)).size).toBe(24);
    expect(new Set(dataset.programmes.map((programme) => programme.officialUrl)).size).toBe(24);
    expect(dataset.programmes.every((programme) => programme.officialUrl.startsWith("https://cat.georgiancollege.ca/programs/"))).toBe(true);
  });

  it("prioritises practical STEM and technology programmes", () => {
    const requiredCodes = ["BTEC", "CMPG", "CYTE", "CVTY", "EETY", "METR", "METY", "HRAC", "MTPT", "MTCY", "PETY", "WETC"];
    expect(requiredCodes.every((code) => dataset.programmes.some((programme) => programme.courseCode === code))).toBe(true);
    expect(dataset.programmes.filter((programme) => programme.placementAvailable).length).toBeGreaterThanOrEqual(18);
  });

  it("materialises exactly one programme, fee and two sources per record", () => {
    expect(migration.match(/INSERT INTO public\.programs \(/g)).toHaveLength(24);
    expect(migration.match(/INSERT INTO public\.program_fees \(/g)).toHaveLength(24);
    expect(migration.match(/INSERT INTO public\.catalogue_sources \(/g)).toHaveLength(48);
    expect(migration).toContain("catalogue_processed_count = 30");
    expect(migration).toContain("catalogue_verified_count = 30");
    expect(migration).toContain("catalogue_intake_verified_count = 0");
  });

  it("keeps fees and recruitment availability unresolved where not confirmed", () => {
    expect(dataset.programmes.every((programme) => programme.tuition.amount === null)).toBe(true);
    expect(dataset.programmes.every((programme) => programme.intakes.every((intake) => intake.status === "provisional"))).toBe(true);
    expect(dataset.programmes.every((programme) => programme.applicationDetails.internationalAvailabilityMustBeConfirmed)).toBe(true);
    expect(dataset.programmes.every((programme) => programme.applicationDetails.routing === "guidance_only")).toBe(true);
    expect(JSON.stringify(dataset).toLowerCase()).not.toContain("applyboard");
  });

  it("uses idempotent programme, intake, fee and source writes", () => {
    expect(migration.match(/ON CONFLICT \(university_id, official_url\)/g)).toHaveLength(24);
    expect(migration).toContain("ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE");
  });
});
