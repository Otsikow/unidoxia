export const WHATSAPP_NUMBER = '447360961803';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const whatsappLink = (text: string) => `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
export const WHATSAPP_CONSENT_LABEL = 'Send me updates about my UniDoxia applications on WhatsApp. Reply STOP at any time to stop them.';

export { isAdultForWhatsApp } from '../../supabase/functions/_shared/whatsappAge.ts';
