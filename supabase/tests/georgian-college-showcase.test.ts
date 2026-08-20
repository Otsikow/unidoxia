import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260820120000_georgian_college_showcase.sql"), "utf8");

describe("Georgian College complimentary showcase migration", () => {
  it("seeds a listed, unverified discussion profile without partner status", () => {
    expect(sql).toContain("true, 'listed', 'unverified', 'discussion'");
    expect(sql).not.toMatch(/'partner'\s*,\s*'official_public_source'/);
  });

  it("keeps catalogue readiness truthful until programmes are materialised", () => {
    expect(sql).toContain("'needs_full_catalogue', 0, 0, 0, 0, 'needs_work'");
    expect(sql).not.toContain("profile_ready");
    expect(sql).not.toContain("ready_for_outreach");
  });

  it("does not overwrite claim, verification, partnership or outreach status on rerun", () => {
    const updateStart = sql.indexOf("ON CONFLICT (slug) DO UPDATE SET");
    const updateEnd = sql.indexOf("-- Do not overwrite claim", updateStart);
    const updateClause = sql.slice(updateStart, updateEnd);
    expect(updateClause).not.toContain("listing_status =");
    expect(updateClause).not.toContain("verification_status =");
    expect(updateClause).not.toContain("partnership_tier =");
    expect(updateClause).not.toContain("outreach_status =");
  });

  it("keeps application routing guidance-only and private provider metadata out", () => {
    expect(sql).toContain("'applicationRouting', 'guidance_only'");
    expect(sql.toLowerCase()).not.toContain("applyboard");
    expect(sql.toLowerCase()).not.toContain("commission");
  });

  it("stores programme-dependent scholarship amounts without a false single value", () => {
    expect(sql).toContain("'CAD 250 to CAD 4,000, depending on the eligible programme'");
    expect(sql).toMatch(/International Entrance Scholarship 2026'[\s\S]*?NULL, 'CAD', 'partial'/);
  });

  it("uses only idempotent inserts and does not weaken row security", () => {
    expect(sql).toContain("ON CONFLICT (slug) DO NOTHING");
    expect(sql).toContain("ON CONFLICT (slug) DO UPDATE SET");
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/DROP POLICY/i);
  });
});
