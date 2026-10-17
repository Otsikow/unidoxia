import { isOptCommand, parseOpeningHours, runWhatsAppFlow, zoeReference, type FlowInput } from './whatsappFlow.ts';
import { checked, deliverWhatsAppReply, notifyHandover, requireData, type WhatsAppDatabase } from './whatsappStore.ts';
import type { WhatsAppConfig } from './whatsappSend.ts';
interface MetaMessage { id: string; from: string; timestamp: string; type: string; text?: { body?: string } }
interface MetaValue {
  metadata?: { phone_number_id?: string }; contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: MetaMessage[]; statuses?: { id: string; status: string; errors?: { code?: number }[] }[];
}
interface MetaPayload { object?: string; entry?: { changes?: { field?: string; value?: MetaValue }[] }[] }
const filterText = (s: string) => s.replace(/[^\p{L}\p{N} -]/gu, '').trim().slice(0, 100);

async function consumeZoeContext(db: WhatsAppDatabase, ref: string) {
  const handoff = checked(await db.from('zoe_handoffs').update({ used_at: new Date().toISOString() }).eq('id', ref)
    .is('used_at', null).gte('created_at', new Date(Date.now() - 86400000).toISOString()).select('summary').maybeSingle());
  return { summary: handoff?.summary ?? 'Zoe context unavailable. Please ask the student for their enquiry.' };
}

export async function processWhatsAppPayload(db: WhatsAppDatabase, config: WhatsAppConfig, rawPayload: unknown, openingHours?: string) {
  const payload = rawPayload as MetaPayload;
  if (!payload || payload.object !== 'whatsapp_business_account') return;
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    const v = change.value;
    if (change.field !== 'messages' || !v || !config.phoneNumberId || v.metadata?.phone_number_id !== config.phoneNumberId) continue;
    for (const receipt of v.statuses ?? []) {
      const previous: Record<string,string[]> = { sent: ['queued','sent'], delivered: ['queued','sent','delivered'], read: ['queued','sent','delivered','read'], failed: ['queued','sent','failed'] };
      if (!previous[receipt.status]) continue;
      checked(await db.from('whatsapp_messages').update({ status: receipt.status, error: receipt.status === 'failed' ? 'Meta reported a delivery failure.' : null }).eq('meta_message_id', receipt.id).in('status', previous[receipt.status]));
    }
    for (const message of v.messages ?? []) {
      if (!message.id || !/^[1-9]\d{6,14}$/.test(message.from)) continue;
      const time = Number(message.timestamp) * 1000;
      if (!Number.isFinite(time) || time <= 0 || time > Date.now() + 60000) continue;
      const text = message.type === 'text' && typeof message.text?.body === 'string' ? message.text.body.slice(0, 4096) : null;
      const { duplicate, contact, conversation } = requireData(await db.rpc('whatsapp_ingest', {
        p_wa_id: message.from, p_name: v.contacts?.find(c => c.wa_id === message.from)?.profile?.name?.slice(0, 200) ?? null,
        p_meta_id: message.id, p_body: text ?? `[${message.type} message, media not downloaded]`, p_received_at: new Date(time).toISOString(),
      }));
      if (duplicate) continue;
      try {
        const control = text !== null && isOptCommand(text);
        // A Zoe reference can attach to a conversation already with the team without running the assistant.
        const ref = text ? zoeReference(text) : undefined;
        if (!contact.opted_out_at && conversation.mode === 'human' && ref) {
          const context = await consumeZoeContext(db, ref);
          checked(await db.from('whatsapp_conversations').update({ source: 'zoe', zoe_context: context, handover_reason: 'Zoe handover' }).eq('id', conversation.id));
          continue;
        }
        // Consent commands work during human handover, including a repeated STOP.
        if (!control && (contact.opted_out_at || conversation.mode !== 'assistant')) continue;
        if (!control && !checked(await db.rpc('whatsapp_reserve_auto_reply', { p_contact: contact.id }))) {
          const transitioned = await notifyHandover(db, conversation.id, 'Automatic reply limit reached');
          if (transitioned) await deliverWhatsAppReply(db, config, conversation.id, contact.wa_id,
            runWhatsAppFlow({ text: '4', state: conversation.flow_state, hours: parseOpeningHours(openingHours) }).replies[0], 'assistant', undefined, { allowHuman: true });
          continue;
        }
        const input: FlowInput = { text, state: conversation.flow_state, mode: conversation.mode, optedOut: Boolean(contact.opted_out_at), linked: Boolean(contact.linked_user_id), hours: parseOpeningHours(openingHours) };
        let result = runWhatsAppFlow(input);
        if (result.linkCode) {
          try { input.linkResult = checked(await db.rpc('whatsapp_consume_link', { p_contact: contact.id, p_code: result.linkCode })) === true; }
          catch { input.linkResult = false; }
          result = runWhatsAppFlow(input);
        }
        if (result.lookup?.type === 'courses') {
          const { subject, level, country } = result.lookup;
          const search = filterText(subject);
          let query = db.from('programs').select('id,name,level,universities!inner(name,country,active,listing_status)')
            .eq('active', true).eq('catalogue_status', 'active').eq('universities.active', true).neq('universities.listing_status', 'archived')
            .or(`name.ilike.%${search}%,discipline.ilike.%${search}%`).ilike('level', `%${filterText(level)}%`).order('name').limit(5);
          if (country) query = query.ilike('universities.country', `%${filterText(country)}%`);
          input.courses = search ? (checked(await query) ?? []).map(c => ({ id: c.id, name: c.name, level: c.level, university: c.universities.name, country: c.universities.country })) : [];
          result = runWhatsAppFlow(input);
        } else if (result.lookup?.type === 'countries') {
          // Match the site's published-university visibility rules.
          const rows = checked(await db.from('universities').select('country').eq('active', true).neq('listing_status', 'archived')) ?? [];
          input.countries = rows.map(c => c.country).filter(Boolean);
          result = runWhatsAppFlow(input);
        } else if (result.lookup?.type === 'status' && contact.linked_user_id) {
          // Recheck the saved number, so changing a profile number cannot leave status access behind.
          const student = checked(await db.from('students').select('id, whatsapp_number').eq('profile_id', contact.linked_user_id).maybeSingle());
          if (!student || student.whatsapp_number?.replace(/\D/g, '') !== contact.wa_id) {
            checked(await db.from('whatsapp_contacts').update({ linked_user_id: null, linked_at: null }).eq('id', contact.id));
            input.linked = false;
          } else {
            const rows = checked(await db.from('applications').select('status,updated_at,programs!inner(name,universities!inner(name))').eq('student_id', student.id).order('created_at', { ascending: false }).limit(10)) ?? [];
            input.applications = rows.map(a => ({ university: a.programs.universities.name, programme: a.programs.name, status: a.status, changedAt: a.updated_at }));
          }
          result = runWhatsAppFlow(input);
        }
        if (result.consent) {
          const applied = checked(await db.rpc('whatsapp_apply_consent', { p_contact: contact.id, p_opt_in: result.consent === 'in' }));
          if (!applied) continue;
        }
        let zoeContext: unknown;
        if (result.zoeRef) {
          // References are high-entropy, single use, and expire after 24 hours. They never authorise status access.
          zoeContext = await consumeZoeContext(db, result.zoeRef);
        }
        // Only provider-acknowledged sends consume the first-message disclosure.
        result.state.introduced = Boolean(input.state?.introduced);
        const changed = checked(await db.from('whatsapp_conversations').update({ flow_state: result.state,
          ...(result.handover ? { handover_reason: result.handover } : {}),
          ...(zoeContext ? { source: 'zoe', zoe_context: zoeContext } : {}), updated_at: new Date().toISOString(),
        }).eq('id', conversation.id).eq('mode', conversation.mode).eq('flow_state', JSON.stringify(conversation.flow_state))
          .eq('last_inbound_at', conversation.last_inbound_at).select('id'));
        if (!changed?.length && !control) {
          await notifyHandover(db, conversation.id, 'Concurrent activity'); continue;
        }
        if (result.handover) await notifyHandover(db, conversation.id, result.handover);
        for (const reply of result.replies) await deliverWhatsAppReply(db, config, conversation.id, contact.wa_id, reply, 'assistant', undefined,
          { optOutConfirmation: result.consent === 'out', allowHuman: control || Boolean(result.handover) });
      } catch (error) {
        // A claimed inbound ID is never replayed. Route interrupted work to people instead of leaving it silent.
        try {
          await notifyHandover(db, conversation.id, 'Assistant processing interrupted');
        } catch { /* The signed request returns 500; do not log message contents or secrets. */ }
        throw error;
      }
    }
  }
}
