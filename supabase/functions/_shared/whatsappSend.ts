import { isAdultForWhatsApp } from './whatsappAge.ts';

export interface WhatsAppConfig {
  enabled?: string;
  provider?: string;
  accessToken?: string;
  phoneNumberId?: string;
}
export function isWhatsAppEnabled(config: WhatsAppConfig): boolean {
  return config.enabled === 'true' && config.provider === 'meta' && Boolean(config.accessToken && config.phoneNumberId);
}
export function customerWindowOpen(lastInbound: string | null, now = new Date()): boolean {
  const age = now.getTime() - (lastInbound ? Date.parse(lastInbound) : NaN);
  return Number.isFinite(age) && age >= 0 && age < 86400000;
}
export async function sendWhatsAppText(config: WhatsAppConfig, recipient: string, body: string, fetcher: typeof fetch = fetch): Promise<{ status: 'sent' | 'skipped'; metaMessageId?: string }> {
  if (!isWhatsAppEnabled(config)) return { status: 'skipped' };
  const to = recipient.replace(/^\+/, '');
  if (!/^[1-9]\d{6,14}$/.test(to)) throw new Error('A digits-only recipient number with country code is required.');
  if (!body.trim() || body.length > 4096) throw new Error('Message must contain 1 to 4096 characters.');
  const response = await fetcher(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }), signal: AbortSignal.timeout(10000),
  });
  // Avoid persisting provider response bodies, which may contain sensitive diagnostics.
  if (!response.ok) throw new Error(`WhatsApp send failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (!result.messages?.[0]?.id) throw new Error('WhatsApp did not return a message identifier. Check the provider before retrying.');
  return { status: 'sent', metaMessageId: result.messages[0].id };
}

// Mandatory gate for every future template sender. No template transport exists yet.
// START only resumes service replies; it never creates update or marketing consent.
export function canSendWhatsAppTemplate(input: {
  dateOfBirth: string | null | undefined;
  studentOptInAt: string | null | undefined;
  contactOptedOutAt: string | null | undefined;
  studentOptedOutAt: string | null | undefined;
  enabled: boolean;
}): boolean {
  const at = input.studentOptInAt ? Date.parse(input.studentOptInAt) : NaN;
  return input.enabled === true && isAdultForWhatsApp(input.dateOfBirth) && Number.isFinite(at) && at <= Date.now() &&
    !input.contactOptedOutAt && !input.studentOptedOutAt;
}
