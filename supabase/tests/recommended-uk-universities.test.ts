import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dataset = JSON.parse(readFileSync(resolve(process.cwd(), "data/catalogues/recommended-uk-universities-reviewed.json"), "utf8"));
const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260824170000_recommended_uk_universities.sql"), "utf8");

describe("recommended UK university catalogue", () => {
  it("contains exactly the three requested institutions and no existing institutions", () => {
    expect(dataset.universities.map((u: { name: string }) => u.name)).toEqual([
      "University of Chester", "Wrexham University", "York St John University",
    ]);
    expect(sql).not.toContain("University of Sunderland");
    expect(sql).not.toContain("Teesside University");
  });

  it("guards known name variants before creating records", () => {
    expect(sql.match(/Potential duplicate institution found before inserting/g)).toHaveLength(3);
    expect(sql).toContain("wrexhamglyndwruniversity");
    expect(sql).toContain("yorkstjohnuniversity");
  });

  it("materialises every reviewed programme, fee row and source", () => {
    const programmeCount = dataset.universities.reduce((sum: number, u: { programmes: unknown[] }) => sum + u.programmes.length, 0);
    expect(programmeCount).toBe(12);
    expect(sql.match(/INSERT INTO public\.programs /g)).toHaveLength(programmeCount);
    expect(sql.match(/INSERT INTO public\.program_fees /g)).toHaveLength(programmeCount);
    expect(sql.match(/INSERT INTO public\.catalogue_sources /g)?.length).toBeGreaterThanOrEqual(programmeCount * 2);
  });

  it("stores unknown values as null and verified programme fees as structured amounts", () => {
    expect(sql).toContain("'foundation-year','Foundation'");
    expect(sql).toMatch(/foundation-year[\s\S]*?'GBP',NULL/);
    expect(sql).toContain("'verified_fee_pending'");
    expect(sql).toContain("'verified'");
    expect(sql).not.toMatch(/'GBP',0,/);
  });

  it("adds filterable application fee and deposit fields with verification dates", () => {
    expect(sql).toContain("application_fee_amount NUMERIC");
    expect(sql).toContain("application_fee_waived BOOLEAN");
    expect(sql).toContain("initial_tuition_deposit_percentage NUMERIC");
    expect(sql).toContain("financial_terms_last_verified_at TIMESTAMPTZ");
  });

  it("keeps listings independent, unverified and guidance-only", () => {
    expect(sql.match(/'listed', 'unverified', 'none'/g)).toHaveLength(3);
    expect(sql.match(/applicationRouting/g)).toHaveLength(3);
    expect(sql.toLowerCase()).not.toContain("applyboard");
    expect(sql.toLowerCase()).not.toContain("commission");
    expect(sql).not.toContain("ready_for_outreach");
  });

  it("stores official-source dates and programme-specific English requirements", () => {
    expect(dataset.checkedAt).toBe("2026-08-24T00:00:00Z");
    expect(sql).toContain("WAEC");
    expect(sql).toContain("NECO");
    expect(sql.match(/programmeExceptionsApply/g)).toHaveLength(12);
  });

  it("does not include unlicensed logo or campus-image URLs", () => {
    expect(sql.match(/'media':/g)).toBeNull();
    expect(sql).toContain('"media":{}');
  });
});
