import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { planImport } from "./importer-core.mjs";

const dataset = JSON.parse(await readFile(resolve(process.cwd(), "data/catalogues/georgian-college-reviewed.json"), "utf8"));
const migration = await readFile(resolve(process.cwd(), "supabase/migrations/20260820143000_georgian_college_programmes.sql"), "utf8");

describe("Georgian College reviewed catalogue", () => {
  it("contains six unique, production-importable official programmes", () => {
    expect(dataset.university.slug).toBe("georgian-college");
    expect(dataset.programmes).toHaveLength(6);
    expect(new Set(dataset.programmes.map((programme) => programme.officialUrl)).size).toBe(6);
    expect(dataset.programmes.every((programme) => programme.officialUrl.startsWith("https://cat.georgiancollege.ca/programs/"))).toBe(true);
    expect(planImport(dataset, []).summary).toEqual({ create: 6 });
  });

  it("materialises exactly one programme row per reviewed record", () => {
    expect(migration.match(/INSERT INTO public\.programs \(/g)).toHaveLength(dataset.programmes.length);
    expect(migration.match(/INSERT INTO public\.program_fees \(/g)).toHaveLength(dataset.programmes.length);
    expect(migration).toContain("catalogue_processed_count = 6");
    expect(migration).toContain("catalogue_verified_count = 6");
  });

  it("keeps all programme fees unresolved rather than zero or free", () => {
    expect(dataset.programmes.every((programme) => programme.tuition.amount === null)).toBe(true);
    expect(migration).not.toMatch(/tuition_amount[^\n]*,\s*0(?:\.0+)?\b/i);
    expect(migration.match(/'unresolved'/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("does not claim intake availability or a private processing route", () => {
    expect(dataset.programmes.every((programme) => programme.intakes.every((intake) => intake.status === "provisional"))).toBe(true);
    expect(dataset.programmes.every((programme) => programme.applicationDetails.routing === "guidance_only")).toBe(true);
    const serialised = JSON.stringify(dataset).toLowerCase();
    expect(serialised).not.toContain("applyboard");
    expect(serialised).not.toContain("commission");
  });

  it("uses idempotent programme, intake, fee and source writes", () => {
    expect(migration.match(/ON CONFLICT \(university_id, official_url\)/g)).toHaveLength(6);
    expect(migration).toContain("ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE");
  });
});
