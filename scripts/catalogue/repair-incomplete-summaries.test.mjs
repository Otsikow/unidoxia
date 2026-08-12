import { describe, expect, it } from "vitest";
import { repairIncompleteSummary } from "./repair-incomplete-summaries.mjs";

describe("catalogue summary quality", () => {
  it("keeps complete verified prose", () => expect(repairIncompleteSummary("A complete verified course summary.")).toBe("A complete verified course summary."));
  it("drops only the incomplete tail", () => expect(repairIncompleteSummary("A complete verified sentence. An unfinished sentence and")).toBe("A complete verified sentence."));
  it("does not invent replacement facts", () => expect(repairIncompleteSummary("An unfinished fragment and")).toBeNull());
});
