import { customerWindowOpen, isWhatsAppEnabled, sendWhatsAppText, type WhatsAppConfig } from './whatsappSend.ts';

// Structural adapter keeps the flow/storage tests independent of Deno and remote imports.
export interface WhatsAppDatabase {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }>;
  auth: { getUser: (token: string) => PromiseLike<{ data: { user: { id: string } | null }; error: unknown }> };
}
export function checked<T = any>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
export function requireData<T = any>(result: { data: T; error: unknown }): NonNullable<T> {
  const data = checked(result);
  if (data === null || data === undefined) throw new Error('Required WhatsApp record is missing.');
  return data;
}
export async function notifyHandover(db: WhatsAppDatabase, conversationId: string, reason: string) {
  return checked(await db.rpc('whatsapp_notify_handover', { p_conversation: conversationId, p_reason: reason })) === true;
}
export async function deliverWhatsAppReply(db: WhatsAppDatabase, config: WhatsAppConfig, conversationId: string, recipient: string, body: string, sender: 'assistant' | 'staff', sentBy?: string, options: { optOutConfirmation?: boolean; allowHuman?: boolean } = {}) {
  const row = requireData(await db.from('whatsapp_messages').insert({
    conversation_id: conversationId, direction: 'outbound', sender, body,
    status: isWhatsAppEnabled(config) ? 'queued' : 'skipped', sent_by: sentBy ?? null,
  }).select('id').single());
  if (!isWhatsAppEnabled(config)) return { status: 'skipped' };
  // Recheck immediately before sending, so a concurrent STOP or staff takeover wins.
  const conversation = requireData(await db.from('whatsapp_conversations').select('mode, contact_id, last_inbound_at, flow_state').eq('id', conversationId).single());
  const contact = requireData(await db.from('whatsapp_contacts').select('opted_out_at').eq('id', conversation.contact_id).single());
  if ((!options.optOutConfirmation && contact.opted_out_at) || !customerWindowOpen(conversation.last_inbound_at) ||
    conversation.mode === 'closed' || sender === 'assistant' && conversation.mode === 'human' && !options.allowHuman) {
    checked(await db.from('whatsapp_messages').update({ status: 'skipped', error: 'Sending conditions changed before delivery.' }).eq('id', row.id));
    return { status: 'skipped' };
  }
  let result: Awaited<ReturnType<typeof sendWhatsAppText>>;
  try {
    result = await sendWhatsAppText(config, recipient, body);
  } catch {
    checked(await db.from('whatsapp_messages').update({ status: 'failed', error: 'Sending failed or delivery is uncertain. Check Meta before retrying.' }).eq('id', row.id));
    return { status: 'failed' };
  }
  // Do not turn a provider-acknowledged send into a failure if a later DB write fails.
  checked(await db.from('whatsapp_messages').update({ status: result.status, meta_message_id: result.metaMessageId ?? null }).eq('id', row.id));
  checked(await db.from('whatsapp_conversations').update({ last_outbound_at: new Date().toISOString() }).eq('id', conversationId));
  if (sender === 'assistant' && !conversation.flow_state?.introduced) {
    checked(await db.from('whatsapp_conversations').update({ flow_state: { ...conversation.flow_state, introduced: true } }).eq('id', conversationId).eq('flow_state', JSON.stringify(conversation.flow_state)));
  }
  return result;
}
