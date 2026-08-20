import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

let dataset;
let migration;
beforeAll(async () => {
  dataset = JSON.parse(await readFile(resolve(process.cwd(), "data/catalogues/georgian-college-coursefinder-65.json"), "utf8"));
  migration = await readFile(resolve(process.cwd(), "supabase/migrations/20260820220000_georgian_college_coursefinder_65.sql"), "utf8");
});

describe("Georgian College 65-record reconciliation", () => {
  it("contains exactly 65 unique, active programme records", () => {
    expect(dataset.programmes).toHaveLength(65);
    expect(new Set(dataset.programmes.map((p) => p.officialUrl)).size).toBe(65);
    expect(dataset.programmes.every((p) => p.catalogueStatus === "active")).toBe(true);
  });

  it("retains sourced tuition values without claiming official verification", () => {
    expect(dataset.programmes.every((p) => p.tuition.amount > 0 && p.tuition.currency === "CAD")).toBe(true);
    expect(dataset.programmes.every((p) => p.tuition.officiallyVerified === false)).toBe(true);
    expect(migration).toContain("international_fee_verified=false");
    expect(migration).toContain("resolution_status='unresolved'");
  });

  it("stores provisional intake months and makes the migration idempotent", () => {
    expect(dataset.programmes.flatMap((p) => p.intakes).every((i) => [1, 5, 9].includes(i.month) && i.status === "provisional")).toBe(true);
    expect(migration.match(/ON CONFLICT \(university_id, official_url\)/g)).toHaveLength(65);
    expect(migration).toContain("catalogue_discovered_count=65");
  });
});
