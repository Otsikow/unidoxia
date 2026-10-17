export const WHATSAPP_NUMBER = '447360961803';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const whatsappLink = (text: string) => `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
export const WHATSAPP_CONSENT_LABEL = 'Send me application updates and replies from UniDoxia on WhatsApp. You can reply STOP at any time.';
