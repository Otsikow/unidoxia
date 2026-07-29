import { describe, expect, it } from "vitest";
import {
  normaliseAgentAudience,
  normaliseStudentAudience,
  parseWhatsAppConsent,
} from "./broadcastAudience";

describe("broadcast audience normalisation", () => {
  it("accepts Supabase one-to-one agent relationships returned as an object", () => {
    const rows = normaliseAgentAudience([{
      profile_id: "profile-1",
      active: true,
      verification_status: "verified",
      profile: {
        id: "profile-1",
        full_name: "Amina Agent",
        email: "amina@example.com",
        phone: "+447700900001",
        country: "United Kingdom",
        active: true,
      },
    }]);

    expect(rows).toEqual([expect.objectContaining({
      profile_id: "profile-1",
      full_name: "Amina Agent",
      performance_tier: "high",
      active: true,
    })]);
  });

  it("uses the student contact record and preserves consent and targeting data", () => {
    const rows = normaliseStudentAudience([{
      id: "student-1",
      profile_id: "profile-2",
      contact_email: "student-contact@example.com",
      contact_phone: "+233200000000",
      current_country: "Ghana",
      legal_name: "Kojo Student",
      plan_type: "agent_supported",
      consent_flags_json: { whatsapp: true },
      profile: {
        id: "profile-2",
        full_name: "Old Name",
        email: "profile@example.com",
        active: true,
      },
    }], new Set(["student-1"]), new Set(["student-1"]));

    expect(rows).toEqual([expect.objectContaining({
      email: "student-contact@example.com",
      phone: "+233200000000",
      has_offer: true,
      awaiting_documents: true,
      whatsapp_consent: true,
    })]);
  });

  it("does not invent WhatsApp consent", () => {
    expect(parseWhatsAppConsent(undefined)).toBe(false);
    expect(parseWhatsAppConsent({ whatsapp: false })).toBe(false);
    expect(parseWhatsAppConsent({ marketing_whatsapp: true })).toBe(true);
  });

  it("drops incomplete records that cannot be dispatched safely", () => {
    expect(normaliseAgentAudience([{ profile_id: "profile-1", profile: { full_name: "No Email" } }])).toEqual([]);
    expect(normaliseStudentAudience([], new Set(), new Set())).toEqual([]);
  });
});
