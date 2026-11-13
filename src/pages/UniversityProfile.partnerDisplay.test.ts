import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const profileSource = readFileSync(
  resolve(process.cwd(), "src/pages/UniversityProfile.tsx"),
  "utf8",
);

describe("UniversityProfile public partner badge", () => {
  it("uses the hard public-display gate instead of the partnership tier", () => {
    expect(profileSource).toContain("isPublicPartner(university) && <Badge");
    expect(profileSource).not.toContain('university.partnership_tier === "partner"');
  });
});
