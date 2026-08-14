import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { planImport } from "./importer-core.mjs";

const dataset = JSON.parse(await readFile(resolve(process.cwd(), "data/catalogues/lethbridge-polytechnic-reviewed.json"), "utf8"));

describe("Lethbridge official catalogue dataset", () => {
  it("contains 43 unique official international programmes", () => {
  expect(dataset.university.slug).toBe("lethbridge-polytechnic");
  expect(dataset.programmes).toHaveLength(43);
  expect(new Set(dataset.programmes.map((programme) => programme.officialUrl)).size).toBe(43);
  expect(dataset.programmes.every((programme) => programme.officialUrl.startsWith("https://lethpolytech.ca/"))).toBe(true);
  const plan = planImport(dataset, []);
  expect(plan.summary).toEqual({ create: 43 });
  expect(plan.duplicates).toHaveLength(0);
  });

  it("never represents unknown fees as zero or free", () => {
  expect(dataset.programmes.every((programme) => programme.tuition.amount === null)).toBe(true);
  expect(dataset.programmes.every((programme) => programme.tuition.currency === "CAD")).toBe(true);
  });

  it("preserves intake and PGWP states", () => {
  const intakeStates = new Set(dataset.programmes.flatMap((programme) => programme.intakes.map((intake) => intake.status)));
  expect(intakeStates.has("closed")).toBe(true);
  expect(intakeStates.has("waitlisting")).toBe(true);
  const pgwpStates = new Set(dataset.programmes.map((programme) => programme.applicationDetails.pgwp.status));
  expect(pgwpStates).toEqual(new Set(["eligible", "ineligible", "unknown"]));
  });

  it("keeps all application routes guidance-only and nursing indirect", () => {
  expect(dataset.programmes.every((programme) => programme.applicationDetails.routing === "guidance_only")).toBe(true);
  const nursing = dataset.programmes.filter((programme) => programme.title.startsWith("Nursing"));
  expect(nursing).toHaveLength(2);
  expect(nursing.every((programme) => programme.applicationDetails.nursingCollaboration?.includes("University of Lethbridge"))).toBe(true);
  });

  it("contains no private processing-provider metadata", () => {
  const serialised = JSON.stringify(dataset).toLowerCase();
  expect(serialised.includes("applyboard")).toBe(false);
  expect(serialised.includes("commission")).toBe(false);
  });
});
