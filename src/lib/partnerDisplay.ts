export type PublicPartnerUniversity = {
  public_partner_display?: boolean | null;
  agreement_signed_at?: string | null;
};

/**
 * Public partner presentation requires both an explicit publishing decision and
 * a recorded signed agreement. Internal partnership workflow fields are not a
 * public-display authority.
 */
export const isPublicPartner = (university: PublicPartnerUniversity): boolean =>
  university.public_partner_display === true && university.agreement_signed_at != null;
