import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { planImport, sourceFingerprint } from "./importer-core.mjs";

const dataset = JSON.parse(await readFile(resolve(process.cwd(), "data/catalogues/lambton-college-reviewed.json"), "utf8"));

describe("Lambton official catalogue dataset", () => {
  it("contains the complete current official catalogue without duplicates", () => {
    expect(dataset.university.slug).toBe("lambton-college");
    expect(dataset.programmes).toHaveLength(46);
    expect(new Set(dataset.programmes.map((programme) => programme.courseCode)).size).toBe(46);
    expect(new Set(dataset.programmes.map((programme) => programme.officialUrl)).size).toBe(46);
    expect(dataset.programmes.every((programme) => programme.officialUrl.startsWith("https://www.lambtoncollege.ca/programs/international/"))).toBe(true);
    expect(planImport(dataset, []).summary).toEqual({ create: 46 });
    expect(planImport(dataset, []).duplicates).toHaveLength(0);
  });

  it("is idempotent when the same source fingerprints already exist", () => {
    const existing = dataset.programmes.map((programme, index) => ({
      id: `existing-${index}`,
      official_url: programme.officialUrl,
      catalogue_status: "active",
      source_fingerprint: sourceFingerprint(programme),
    }));
    const plan = planImport(dataset, existing);
    expect(plan.summary).toEqual({ unchanged: 46 });
    expect(plan.items.some((item) => item.action === "archive_candidate")).toBe(false);
  });

  it("preserves current Sarnia and Ottawa public-campus identity", () => {
    expect(dataset.programmes.filter((programme) => programme.campus === "Sarnia")).toHaveLength(38);
    expect(dataset.programmes.filter((programme) => programme.campus === "Ottawa")).toHaveLength(8);
    expect(dataset.programmes.every((programme) => ["Sarnia", "Ottawa"].includes(programme.campus))).toBe(true);
    expect(dataset.programmes.every((programme) => programme.applicationDetails.dli === "O19305293332")).toBe(true);
  });

  it("does not merge private-partnership campuses into the public PGWP context", () => {
    expect(dataset.programmes.some((programme) => /Toronto|Mississauga/i.test(programme.campus))).toBe(false);
    expect(dataset.programmes.every((programme) => ["public_main_campus", "public_saint_paul_university_campus"].includes(programme.applicationDetails.locationType))).toBe(true);
    const serialised = JSON.stringify(dataset).toLowerCase();
    expect(serialised).not.toContain("cestar");
    expect(serialised).not.toContain("private partnership");
  });

  it("preserves open, closed and not-offered intake states", () => {
    const states = new Set(dataset.programmes.flatMap((programme) => programme.intakes.map((intake) => intake.status)));
    expect(states).toEqual(new Set(["available", "closed", "unavailable"]));
    expect(dataset.programmes.flatMap((programme) => programme.intakes).filter((intake) => intake.year === 2026 && intake.month === 9 && intake.status === "available")).toHaveLength(0);
    expect(dataset.programmes.flatMap((programme) => programme.intakes).filter((intake) => intake.year === 2027 && intake.month === 1 && intake.status === "available")).toHaveLength(3);
    expect(dataset.programmes.flatMap((programme) => programme.intakes).filter((intake) => intake.year === 2027 && intake.month === 5 && intake.status === "available")).toHaveLength(4);
  });

  it("never represents unresolved fees as zero or free", () => {
    expect(dataset.programmes.filter((programme) => programme.tuition.amount != null)).toHaveLength(36);
    expect(dataset.programmes.filter((programme) => programme.tuition.amount == null)).toHaveLength(10);
    expect(dataset.programmes.every((programme) => programme.tuition.amount === null || programme.tuition.amount > 0)).toBe(true);
    expect(dataset.programmes.every((programme) => programme.tuition.currency === "CAD")).toBe(true);
  });

  it("uses only published programme-level PGWP and CIP states", () => {
    expect(dataset.programmes.filter((programme) => programme.applicationDetails.pgwp.status === "eligible")).toHaveLength(44);
    expect(dataset.programmes.filter((programme) => programme.applicationDetails.pgwp.status === "ineligible")).toHaveLength(2);
    expect(dataset.programmes.filter((programme) => programme.applicationDetails.pgwp.cipCode != null)).toHaveLength(44);
    expect(dataset.programmes.every((programme) => ["eligible", "ineligible", "unknown"].includes(programme.applicationDetails.pgwp.status))).toBe(true);
  });

  it("keeps all application routes guidance-only and excludes private provider metadata", () => {
    expect(dataset.programmes.every((programme) => programme.applicationDetails.routing === "guidance_only")).toBe(true);
    const serialised = JSON.stringify(dataset).toLowerCase();
    expect(serialised).not.toContain("applyboard");
    expect(serialised).not.toContain("commission");
  });
});
