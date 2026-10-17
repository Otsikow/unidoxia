export const WHATSAPP_NUMBER = '447360961803';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const whatsappLink = (text: string) => `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
export const WHATSAPP_CONSENT_LABEL = 'Send me updates about my UniDoxia applications on WhatsApp. Reply STOP at any time to stop them.';

export function isUnder18(dateOfBirth?: string | null, now = new Date()): boolean {
  if (!dateOfBirth) return false;
  const birth = new Date(dateOfBirth + 'T00:00:00Z');
  if (!Number.isFinite(birth.getTime())) return false;
  const adult = new Date(birth); adult.setUTCFullYear(adult.getUTCFullYear() + 18);
  return adult > now;
}
