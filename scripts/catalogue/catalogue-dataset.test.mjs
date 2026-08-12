import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const expected = { teesside: 513, sunderland: 166, northumbria: 543 };
const load = async (key) => JSON.parse(await readFile(path.join(process.cwd(), "data", "catalogues", `${key}-reviewed.json`), "utf8"));

describe("reviewed catalogue datasets", () => {
  for (const [key, count] of Object.entries(expected)) {
    it(`${key} classifies every unique candidate without invented values`, async () => {
      const dataset = await load(key);
      expect(dataset.discovered).toBe(count);
      expect(dataset.classified).toBe(count);
      expect(dataset.programmes).toHaveLength(count);
      expect(dataset.programmes.every((item) => item.officialUrl?.startsWith("https://"))).toBe(true);
      expect(dataset.programmes.every((item) => item.classification)).toBe(true);
      expect(dataset.programmes.every((item) => !item.tuition || item.tuition.amount > 0)).toBe(true);
      expect(dataset.programmes.flatMap((item) => item.intakes || []).every((intake) => intake.year >= 2027)).toBe(true);
    });
  }

  it("does not interpret Animation as an MA qualification", async () => {
    const datasets = await Promise.all(Object.keys(expected).map(load));
    const falseAwards = datasets.flatMap((dataset) => dataset.programmes)
      .filter((item) => /animation/i.test(item.title) && !/(^|\W)MA(\W|$)/i.test(item.title) && item.qualification === "MA");
    expect(falseAwards).toEqual([]);
  });
});
