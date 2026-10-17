import { checked, deliverWhatsAppReply, requireData, type WhatsAppDatabase } from './whatsappStore.ts';
import { customerWindowOpen, isWhatsAppEnabled, type WhatsAppConfig } from './whatsappSend.ts';
export const whatsappCors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export function createWhatsAppReplyHandler(db: WhatsAppDatabase, config: WhatsAppConfig) {
  return async (req: Request): Promise<Response> => {
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...whatsappCors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: whatsappCors });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return json({ error: 'Sign in required' }, 401);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Invalid session' }, 401);
    try {
      if (!checked(await db.rpc('is_admin_or_staff', { user_id: data.user.id }))) return json({ error: 'Admissions team access required' }, 403);
      const input = await req.json();
      if (input.action === 'config') return json({ enabled: isWhatsAppEnabled(config) });
      const { action, conversationId, body } = input;
      if (!['reply','take_over','hand_back','close','assign','read','retain'].includes(action) || typeof conversationId !== 'string') return json({ error: 'Invalid action' }, 400);
      const conversation = requireData(await db.from('whatsapp_conversations').select('id,contact_id,last_inbound_at,mode').eq('id', conversationId).single());
      const contact = requireData(await db.from('whatsapp_contacts').select('wa_id,opted_out_at').eq('id', conversation.contact_id).single());
      if (action === 'retain') {
        if (!['active_application', 'complaint'].includes(input.reason)) return json({ error: 'Choose active application or complaint.' }, 400);
        const until = Date.parse(input.retainUntil);
        const maximum = new Date(); maximum.setUTCMonth(maximum.getUTCMonth() + 12);
        if (!Number.isFinite(until) || until <= Date.now() || until > maximum.getTime()) return json({ error: 'Retention must be within the next 12 months.' }, 400);
        checked(await db.from('whatsapp_conversations').update({ retain_until: new Date(until).toISOString(), retain_reason: input.reason }).eq('id', conversationId));
        return json({ ok: true });
      }
      if (action === 'reply') {
        if (typeof body !== 'string' || !body.trim() || body.length > 4096) return json({ error: 'Enter a reply of 1 to 4096 characters.' }, 400);
        if (contact.opted_out_at) return json({ error: 'This contact has opted out. They must send START before receiving replies.' }, 409);
        if (!customerWindowOpen(conversation.last_inbound_at)) return json({ error: 'The 24-hour window is closed. A Meta-approved template is needed.' }, 409);
        checked(await db.from('whatsapp_conversations').update({ mode: 'human', assigned_to: data.user.id, updated_at: new Date().toISOString() }).eq('id', conversationId));
        return json(await deliverWhatsAppReply(db, config, conversationId, contact.wa_id, body.trim(), 'staff', data.user.id));
      }
      const patch = action === 'assign' ? { assigned_to: data.user.id }
        : action === 'read' ? { unread_count: 0 }
        : { mode: action === 'take_over' ? 'human' : action === 'hand_back' ? 'assistant' : 'closed',
          ...(action === 'hand_back' ? { flow_state: {}, handover_reason: null } : {}) };
      checked(await db.from('whatsapp_conversations').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', conversationId));
      return json({ ok: true });
    } catch { return json({ error: 'Unable to complete this action. Refresh the inbox before trying again.' }, 400); }
  };
}
