import { describe, it, expect } from "vitest";
import {
  initialReviewReadiness,
  recommendationFee,
  placementError,
  placementCaseSchema,
} from "./placement";
const student = {
  legal_name: "Fixture Student",
  contact_email: "fixture@example.invalid",
  nationality: "Ghana",
  secondary_qualification: "WASSCE",
  secondary_school_name: "Fixture School",
};
describe("adviser placement guidance", () => {
  it("separates an initial academic review from a complete university application", () => {
    const ready = initialReviewReadiness(student, 0, [
      {
        document_type: "transcript",
        storage_path: "private/fixture.pdf",
        admin_review_status: "awaiting_admin_review",
      },
    ]);
    expect(ready).toEqual({ personal: true, education: true, documents: true });
  });
  it("does not count rejected, missing-path or unrelated documents as initial academic evidence", () => {
    expect(
      initialReviewReadiness(student, 0, [
        {
          document_type: "transcript",
          storage_path: "private/file",
          admin_review_status: "admin_rejected",
        },
        { document_type: "passport", storage_path: "private/passport" },
        { document_type: "degree_certificate", storage_path: "" },
      ]).documents,
    ).toBe(false);
  });
  it("does not infer education or nationality from registration alone", () => {
    expect(
      initialReviewReadiness(
        {
          ...student,
          nationality: null,
          secondary_qualification: null,
          secondary_school_name: null,
        },
        0,
        [],
      ),
    ).toEqual({ personal: false, education: false, documents: false });
  });
  it("never presents an unknown tuition fee as free", () => {
    expect(
      recommendationFee({
        tuition_amount: null,
        tuition_currency: "CAD",
        tuition_period: "per_year",
      }),
    ).toBe("Tuition not yet verified");
    expect(
      recommendationFee({
        tuition_amount: 11000,
        tuition_currency: "CAD",
        tuition_period: "per_year",
      }),
    ).toContain("CAD");
    expect(
      recommendationFee({
        tuition_amount: 11000,
        tuition_currency: "CAD",
        tuition_period: "per_year",
      }),
    ).toContain("per year");
  });
  it("explains an unavailable backend instead of inventing a successful review", () => {
    expect(placementError({ code: "PGRST205" })).toContain("not available yet");
    expect(placementError({ message: "Your plan changed. Reload." })).toBe(
      "Your plan changed. Reload.",
    );
    expect(
      placementCaseSchema.safeParse({ status: "recommendations_ready" })
        .success,
    ).toBe(false);
  });
});
