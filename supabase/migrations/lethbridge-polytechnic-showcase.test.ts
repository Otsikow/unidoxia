import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260814090000_lethbridge_polytechnic_showcase.sql"), "utf8");

describe("Lethbridge complimentary showcase migration", () => {
  it("seeds a listed, unverified discussion profile without partner status", () => {
    expect(sql).toContain("true, 'listed', 'unverified', 'discussion'");
    expect(sql).not.toMatch(/'partner'\s*,\s*'official_public_source'/);
  });

  it("does not overwrite claim or partnership status on rerun", () => {
    const updateClause = sql.slice(sql.indexOf("ON CONFLICT (slug) DO UPDATE SET"));
    expect(updateClause).not.toContain("listing_status =");
    expect(updateClause).not.toContain("verification_status =");
    expect(updateClause).not.toContain("partnership_tier =");
  });

  it("extends the existing intake architecture without weakening RLS", () => {
    expect(sql).toContain("'waitlisting'");
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it("keeps private processing-provider metadata out of public configuration", () => {
    expect(sql.toLowerCase()).not.toContain("applyboard");
    expect(sql.toLowerCase()).not.toContain("commission");
    expect(sql).toContain("'applicationRouting', 'guidance_only'");
  });
});
