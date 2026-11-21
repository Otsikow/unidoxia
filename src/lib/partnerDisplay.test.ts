import { describe, expect, it } from "vitest";
import { isPublicPartner, type PublicPartnerUniversity } from "./partnerDisplay";

describe("isPublicPartner", () => {
  it("does not treat the internal partnership tier as public-display authority", () => {
    const university: PublicPartnerUniversity & { partnership_tier: string } = {
      partnership_tier: "partner",
    };
    expect(isPublicPartner(university)).toBe(false);
  });

  it("requires both the public flag and a signed agreement", () => {
    expect(isPublicPartner({ public_partner_display: true, agreement_signed_at: null })).toBe(false);
    expect(isPublicPartner({ public_partner_display: false, agreement_signed_at: "2026-11-09T12:00:00Z" })).toBe(false);
    expect(isPublicPartner({ public_partner_display: true, agreement_signed_at: "2026-11-09T12:00:00Z" })).toBe(true);
    expect(isPublicPartner({})).toBe(false);
  });
});
