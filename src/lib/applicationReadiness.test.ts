import { describe, expect, it } from "vitest";
import {
  applicationReadiness,
  type ReadinessInput,
} from "./applicationReadiness";
const base: ReadinessInput = {
  status: "submitted",
  student: { legal_name: "Sample", contact_email: "student@example.test" },
  program: { name: "Course", university: { name: "University" } },
  intake_month: 9,
  intake_year: 2027,
  documents: [{ verified: true, storage_path: "app/passport" }],
  tasks: [],
};
describe("application readiness evidence", () => {
  it("never counts an empty document set as reviewed", () => {
    expect(
      applicationReadiness({ ...base, documents: [] }).find(
        (c) => c.section === "documents",
      )?.complete,
    ).toBe(false);
  });
  it("requires every recorded file to be verified and have a path", () => {
    for (const documents of [
      [{ verified: false, storage_path: "file" }],
      [{ verified: true, storage_path: "" }],
    ])
      expect(
        applicationReadiness({ ...base, documents }).find(
          (c) => c.section === "documents",
        )?.complete,
      ).toBe(false);
  });
  it("flags drafts, absent identity/course/intake and blocked follow-ups", () => {
    const checks = applicationReadiness({
      ...base,
      status: "draft",
      student: null,
      program: null,
      intake_month: null,
      tasks: [{ status: "blocked" }],
    });
    expect(checks.filter((c) => !c.complete)).toHaveLength(5);
  });
  it("reports saved checks only; does not invent institution-specific document requirements", () => {
    expect(applicationReadiness(base).every((c) => c.complete)).toBe(true);
    expect(applicationReadiness(base)).toHaveLength(6);
  });
});
