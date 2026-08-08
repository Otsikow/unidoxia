import { describe, expect, it } from "vitest";
import { buildStudentSignupPath, getSafeAuthRedirect } from "./authRedirect";

describe("auth redirect helpers", () => {
  it("preserves safe internal destinations, including queries and hashes", () => {
    expect(getSafeAuthRedirect("/student/applications/new?program=123#documents")).toBe(
      "/student/applications/new?program=123#documents",
    );
  });

  it("rejects external and protocol-relative redirect destinations", () => {
    expect(getSafeAuthRedirect("https://example.com/phishing")).toBe("/dashboard");
    expect(getSafeAuthRedirect("//example.com/phishing")).toBe("/dashboard");
    expect(getSafeAuthRedirect("/\\example.com/phishing")).toBe("/dashboard");
  });

  it("builds a student signup route that carries the intended destination", () => {
    expect(buildStudentSignupPath("/student/profile")).toBe(
      "/auth/signup?role=student&next=%2Fstudent%2Fprofile",
    );
  });
});
