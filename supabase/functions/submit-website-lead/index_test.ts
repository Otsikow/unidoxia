import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { scoreLead, computeNextFollowUp } from "./index.ts";

Deno.test("scoreLead: cold when minimal info", () => {
  const { score, temperature } = scoreLead({});
  assertEquals(temperature, "cold");
  assert(score < 30);
});

Deno.test("scoreLead: warm mid-range", () => {
  const { score, temperature } = scoreLead({
    budgetRange: "15-25k",
    englishProficiency: "intermediate",
    intakeYear: String(new Date().getFullYear() + 1),
    preferredDestinations: ["UK"],
    programLevel: "Undergraduate",
  });
  assert(score >= 30 && score < 60, `expected warm range, got ${score}`);
  assertEquals(temperature, "warm");
});

Deno.test("scoreLead: hot when strong signals", () => {
  const { score, temperature } = scoreLead({
    budgetRange: "Above 35k",
    englishProficiency: "official",
    intakeYear: String(new Date().getFullYear() + 1),
    passportReady: true,
    proofOfFundsReady: true,
    preferredDestinations: ["UK", "Ireland"],
    programLevel: "Postgraduate",
  });
  assert(score >= 60, `expected hot >=60, got ${score}`);
  assertEquals(temperature, "hot");
});

Deno.test("computeNextFollowUp: weekend rolls to next business day 09:30 London", () => {
  // Saturday 2026-07-11 10:00 UTC
  const sat = new Date("2026-07-11T10:00:00Z");
  const next = computeNextFollowUp(sat);
  // Should be Monday 2026-07-13 09:30 London == 08:30 UTC (BST)
  assertEquals(next.toISOString(), "2026-07-13T08:30:00.000Z");
});

Deno.test("computeNextFollowUp: mid-day weekday adds 2h within hours", () => {
  // Wednesday 2026-07-15 10:00 UTC == 11:00 London BST
  const wed = new Date("2026-07-15T10:00:00Z");
  const next = computeNextFollowUp(wed);
  // 13:00 London == 12:00 UTC
  assertEquals(next.toISOString(), "2026-07-15T12:00:00.000Z");
});

Deno.test("computeNextFollowUp: after hours rolls to next 09:30 London", () => {
  // Wednesday 2026-07-15 20:00 UTC == 21:00 London BST
  const wed = new Date("2026-07-15T20:00:00Z");
  const next = computeNextFollowUp(wed);
  // Thursday 09:30 London == 08:30 UTC
  assertEquals(next.toISOString(), "2026-07-16T08:30:00.000Z");
});
