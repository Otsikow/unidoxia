import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260814120000_lambton_college_showcase.sql"), "utf8");

describe("Lambton complimentary showcase migration", () => {
  it("seeds a listed, unverified discussion profile without partner status", () => {
    expect(sql).toContain("true, 'listed', 'unverified', 'discussion'");
    expect(sql).not.toMatch(/'partner'\s*,\s*'official_public_source'/);
  });

  it("does not overwrite claim, verification or partnership status on rerun", () => {
    const universityUpdate = sql.slice(sql.indexOf("ON CONFLICT (slug) DO UPDATE SET"), sql.indexOf("INSERT INTO public.scholarships"));
    expect(universityUpdate).not.toContain("listing_status =");
    expect(universityUpdate).not.toContain("verification_status =");
    expect(universityUpdate).not.toContain("partnership_tier =");
    expect(universityUpdate).not.toContain("outreach_status =");
  });

  it("extends the existing intake architecture without weakening RLS", () => {
    expect(sql).toContain("'unavailable'");
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it("keeps public and private campus contexts separate", () => {
    expect(sql).toContain("Ottawa Saint Paul University Campus");
    expect(sql).toContain("Sarnia Main Campus");
    expect(sql).not.toContain("Cestar");
    expect(sql).not.toContain("O297974377861");
  });

  it("keeps application routing guidance-only and private providers absent", () => {
    expect(sql).toContain("'applicationRouting', 'guidance_only'");
    expect(sql.toLowerCase()).not.toContain("applyboard");
    expect(sql.toLowerCase()).not.toContain("commission");
  });

  it("imports the twelve currently published 2026/27 awards idempotently", () => {
    expect((sql.match(/'lambton-[a-z0-9-]+-2026-27'/g) || [])).toHaveLength(12);
    expect(sql).toContain("ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET");
  });
});
