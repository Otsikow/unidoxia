import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260824180000_validate_course_search_filters.sql"), "utf8");

describe("server-side course search validation migration", () => {
  it("validates all advanced filters before search", () => {
    for (const field of ["tuitionMax", "depositMax", "noApplicationFee", "englishAlternative", "scholarshipOnly", "country", "level", "university", "intake", "sort"]) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("INVALID_FILTERS");
    expect(sql).toContain("Value cannot be negative.");
    expect(sql).toContain("This filter is not supported.");
  });

  it("is exposed only as a read-only validation RPC", () => {
    expect(sql).toContain("STABLE");
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.validate_course_search_filters(JSONB) TO anon, authenticated");
  });
});
