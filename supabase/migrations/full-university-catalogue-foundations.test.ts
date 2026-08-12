import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(path.join(process.cwd(), "supabase", "migrations", "20260812130000_full_university_catalogue_foundations.sql"), "utf8");

describe("catalogue migration safety contract", () => {
  it("is additive and contains no reset or destructive table operation", () => {
    expect(migration).not.toMatch(/\b(?:DROP\s+TABLE|TRUNCATE|DELETE\s+FROM\s+public\.(?:programs|universities)|reset\s+database)\b/i);
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS");
  });

  it("keeps public catalogue access read-only and active-only", () => {
    expect(migration).toContain("GRANT SELECT ON public.program_intakes, public.program_fees, public.catalogue_sources TO anon, authenticated");
    expect(migration).not.toMatch(/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+anon\b/i);
    expect(migration).toContain("p.active AND p.catalogue_status = 'active' AND u.active");
    expect(migration).toContain('DROP POLICY IF EXISTS "Partners can delete programs"');
    expect(migration).toContain("active = true AND catalogue_status = 'active'");
  });

  it("implements indexed paginated search and preserves historical intake states", () => {
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    expect(migration).toContain("gin_trgm_ops");
    expect(migration).toContain("LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)");
    expect(migration).toContain("'historical'");
  });
});
