export type PerformanceTier = "all" | "high" | "medium" | "low" | "at_risk";

export interface AgentAudienceRow {
  profile_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  active: boolean;
  verification_status: string | null;
  performance_tier: Exclude<PerformanceTier, "all">;
  whatsapp_consent: boolean;
}

export interface StudentAudienceRow {
  profile_id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  active: boolean;
  subscription_type: string | null;
  has_offer: boolean;
  awaiting_documents: boolean;
  whatsapp_consent: boolean;
}

type ProfileRecord = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  active?: boolean | null;
};

const relatedRecord = <T>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value ?? undefined;

export const parseWhatsAppConsent = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.whatsapp === true || record.consent_whatsapp === true || record.marketing_whatsapp === true;
};

export const normaliseAgentAudience = (rows: unknown[]): AgentAudienceRow[] =>
  rows.flatMap((raw) => {
    const row = raw as {
      profile_id?: string | null;
      active?: boolean | null;
      verification_status?: string | null;
      profile?: ProfileRecord | ProfileRecord[] | null;
    };
    const profile = relatedRecord(row.profile);
    const profileId = row.profile_id ?? profile?.id;
    const email = profile?.email?.trim();
    if (!profileId || !email) return [];

    const verificationStatus = row.verification_status ?? null;
    const performanceTier: Exclude<PerformanceTier, "all"> =
      verificationStatus === "verified" ? "high" : verificationStatus === "pending" ? "medium" : "at_risk";

    return [{
      profile_id: profileId,
      full_name: profile?.full_name?.trim() || email,
      email,
      phone: profile?.phone?.trim() || null,
      country: profile?.country?.trim() || null,
      active: row.active !== false && profile?.active !== false,
      verification_status: verificationStatus,
      performance_tier: performanceTier,
      whatsapp_consent: false,
    }];
  });

export const normaliseStudentAudience = (
  rows: unknown[],
  studentIdsWithOffers: ReadonlySet<string>,
  studentIdsAwaitingDocs: ReadonlySet<string>,
): StudentAudienceRow[] =>
  rows.flatMap((raw) => {
    const row = raw as {
      id?: string | null;
      profile_id?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      current_country?: string | null;
      legal_name?: string | null;
      plan_type?: string | null;
      consent_flags_json?: unknown;
      profile?: ProfileRecord | ProfileRecord[] | null;
    };
    const profile = relatedRecord(row.profile);
    const profileId = row.profile_id ?? profile?.id;
    const studentId = row.id;
    const email = (row.contact_email || profile?.email)?.trim();
    if (!profileId || !studentId || !email) return [];

    return [{
      profile_id: profileId,
      student_id: studentId,
      full_name: row.legal_name?.trim() || profile?.full_name?.trim() || email,
      email,
      phone: (row.contact_phone || profile?.phone)?.trim() || null,
      country: (row.current_country || profile?.country)?.trim() || null,
      active: profile?.active !== false,
      subscription_type: row.plan_type ?? null,
      has_offer: studentIdsWithOffers.has(studentId),
      awaiting_documents: studentIdsAwaitingDocs.has(studentId),
      whatsapp_consent: parseWhatsAppConsent(row.consent_flags_json),
    }];
  });
