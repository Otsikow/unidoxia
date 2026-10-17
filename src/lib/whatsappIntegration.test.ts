import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processWhatsAppPayload } from '../../supabase/functions/_shared/whatsappProcess';
import { createWhatsAppReplyHandler } from '../../supabase/functions/_shared/whatsappReplyHandler';
import type { WhatsAppDatabase } from '../../supabase/functions/_shared/whatsappStore';
import { LINK_FAILURE } from '../../supabase/functions/_shared/whatsappFlow';

// An in-memory Supabase adapter tests orchestration. PostgreSQL locking/RLS still need a real test project.
function fixture(options: { mode?: string; optedOut?: boolean; linked?: boolean; role?: boolean; lastInbound?: string; link?: { code: string; used?: boolean; expired?: boolean; number?: string; user?: string; attempts?: number }; savedNumber?: string } = {}) {
  const now = new Date().toISOString();
  const contact = { id: 'contact', wa_id: '447700900123', profile_name: 'Student', opted_out_at: options.optedOut ? now : null, linked_user_id: options.linked ? 'student-user' : null };
  const conversation = { id: 'conversation', contact_id: 'contact', mode: options.mode ?? 'assistant', flow_state: { introduced: true }, last_inbound_at: options.lastInbound ?? now, unread_count: 0 };
  const tables: Record<string, any[]> = { whatsapp_contacts: [contact], whatsapp_conversations: [conversation], whatsapp_messages: [],
    students: [{ id: 'student', profile_id: 'student-user', whatsapp_number: options.savedNumber ?? '+44 7700 900123' }],
    applications: [{ student_id: 'student', status: 'submitted', updated_at: now, created_at: now, programs: { name: 'Computing', universities: { name: 'Example University' } }, notes: 'PRIVATE', fees_json: 'PRIVATE' }],
    programs: [{ id: 'course', name: 'Computing', discipline: 'Computing', level: 'postgraduate', active: true, catalogue_status: 'active', universities: { name: 'Example University', country: 'Canada', active: true, listing_status: 'active' } }],
    universities: [{ country: 'Canada', active: true, listing_status: 'active' }, { country: 'Hidden', active: false, listing_status: 'archived' }],
    zoe_handoffs: [{ id: '0123456789abcdef0123', summary: 'Visible summary', created_at: now, used_at: null }],
  };
  const seen = new Set<string>(); const notifications: unknown[] = []; const calls: { name: string; args: any }[] = [];
  const db: WhatsAppDatabase = {
    auth: { getUser: async token => ({ data: { user: token === 'valid' ? { id: 'staff-user' } : null }, error: null }) },
    rpc: async (name, args: any = {}) => {
      calls.push({ name, args });
      if (name === 'is_admin_or_staff') return { data: options.role !== false, error: null };
      if (name === 'whatsapp_notify_handover') {
        if (conversation.mode !== 'assistant') return { data: false, error: null };
        conversation.mode = 'human'; notifications.push(args); return { data: true, error: null };
      }
      if (name === 'whatsapp_reserve_auto_reply') {
        const times: number[] = (contact as any).auto_reply_times ?? [];
        const recent = times.filter(t => t > Date.now() - 3600000);
        if (recent.length >= 10) return { data: false, error: null };
        (contact as any).auto_reply_times = [...recent, Date.now()]; return { data: true, error: null };
      }
      if (name === 'whatsapp_apply_consent') {
        if (!args.p_opt_in && contact.opted_out_at) return { data: false, error: null };
        contact.opted_out_at = args.p_opt_in ? null : new Date().toISOString();
        return { data: true, error: null };
      }
      if (name === 'whatsapp_consume_link') {
        const code = options.link;
        const success = Boolean(code && args.p_code === code.code && !code.used && !code.expired && (code.number ?? contact.wa_id) === contact.wa_id && code.user !== 'missing' && (code.attempts ?? 0) < 5);
        if (success && code) { code.used = true; contact.linked_user_id = 'student-user'; }
        return { data: success, error: null };
      }
      if (name === 'whatsapp_ingest') {
        if (seen.has(args.p_meta_id)) return { data: { duplicate: true }, error: null };
        seen.add(args.p_meta_id); conversation.last_inbound_at = args.p_received_at; conversation.unread_count++;
        if (conversation.mode === 'closed') conversation.mode = 'assistant';
        tables.whatsapp_messages.push({ id: args.p_meta_id, conversation_id: 'conversation', body: args.p_body, direction: 'inbound', sender: 'student', status: 'received', meta_message_id: args.p_meta_id });
        return { data: structuredClone({ duplicate: false, contact, conversation }), error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
    from: (table: string) => {
      const filters: ((row: any) => boolean)[] = []; let patch: any; let insert: any; let single = false; let count = Infinity;
      const value = (row: any, path: string) => path.split('.').reduce((v, key) => v?.[key], row);
      const chain: any = {
        select: () => chain, order: () => chain, limit: (v: number) => { count = v; return chain; },
        eq: (key: string, val: any) => { filters.push(row => { const actual = value(row, key); return typeof actual === 'object' && actual !== null ? JSON.stringify(actual) === (typeof val === 'string' ? val : JSON.stringify(val)) : actual === val; }); return chain; },
        neq: (key: string, val: any) => { filters.push(row => value(row,key) !== val); return chain; },
        is: (key: string, val: any) => { filters.push(row => value(row,key) === val); return chain; },
        gte: (key: string, val: any) => { filters.push(row => value(row,key) >= val); return chain; },
        in: (key: string, vals: any[]) => { filters.push(row => vals.includes(value(row,key))); return chain; },
        ilike: (key: string, val: string) => { filters.push(row => String(value(row,key)).toLowerCase().includes(val.replace(/%/g,'').toLowerCase())); return chain; },
        or: () => chain,
        update: (v: any) => { patch = v; return chain; }, insert: (v: any) => { insert = v; return chain; },
        single: () => { single = true; return chain; }, maybeSingle: () => { single = true; return chain; },
        then: (resolve: (v: any) => void) => {
          if (insert) { const row = { id: `out-${tables[table].length}`, ...insert }; tables[table].push(row); return Promise.resolve(resolve({ data: single ? structuredClone(row) : [structuredClone(row)], error: null })); }
          const rows = (tables[table] ?? []).filter(row => filters.every(f => f(row))).slice(0, count);
          if (patch) for (const row of rows) Object.assign(row, structuredClone(patch));
          return Promise.resolve(resolve({ data: structuredClone(single ? rows[0] ?? null : rows), error: null }));
        },
      }; return chain;
    },
  };
  return { db, tables, contact, conversation, notifications, calls };
}
const config = { phoneNumberId: 'test-phone', enabled: 'false', provider: 'meta' };
const activeConfig = { ...config, enabled: 'true', accessToken: 'mock-token' };
const payload = (text: string | null, id = 'incoming-1', phone = 'test-phone') => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: phone }, messages: [{ id, from: '447700900123', timestamp: String(Math.floor(Date.now()/1000)), type: text === null ? 'image' : 'text', text: text === null ? undefined : { body: text } }] } }] }] });
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden'); })); });
afterEach(() => { vi.unstubAllGlobals(); });
describe('WhatsApp webhook orchestration', () => {
  it('deduplicates inbound messages, saves disabled replies as skipped and never fetches', async () => {
    const f = fixture(); await processWhatsAppPayload(f.db, config, payload('Hi')); await processWhatsAppPayload(f.db, config, payload('Hi'));
    expect(f.tables.whatsapp_messages).toHaveLength(2); expect(f.tables.whatsapp_messages[1].status).toBe('skipped'); expect(f.conversation.unread_count).toBe(1); expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores another phone-number ID', async () => { const f = fixture(); await processWhatsAppPayload(f.db, config, payload('Hi','one','wrong')); expect(f.tables.whatsapp_messages).toEqual([]); });
  it('keeps human conversations silent, but honours STOP once and START', async () => {
    const f = fixture({ mode: 'human' }); await processWhatsAppPayload(f.db, config, payload('Hi'));
    expect(f.tables.whatsapp_messages).toHaveLength(1);
    await processWhatsAppPayload(f.db, config, payload('STOP', 'two')); expect(f.contact.opted_out_at).toBeTruthy();
    await processWhatsAppPayload(f.db, config, payload('STOP', 'three')); expect(f.tables.whatsapp_messages.filter(m => m.direction === 'outbound')).toHaveLength(1);
    await processWhatsAppPayload(f.db, config, payload('START', 'four')); expect(f.contact.opted_out_at).toBeNull(); expect(f.conversation.mode).toBe('human');
  });
  it('does not process any enquiry from an opted-out contact', async () => {
    const f = fixture({ optedOut: true }); await processWhatsAppPayload(f.db, config, payload('3')); expect(f.tables.whatsapp_messages).toHaveLength(1);
  });
  it.each([
    undefined, { code: '654321' }, { code: '123456', used: true }, { code: '123456', expired: true },
    { code: '123456', number: '233000000000' }, { code: '123456', user: 'missing' }, { code: '123456', attempts: 5 },
  ])('gives one generic reply for all code failures %j', async link => {
    const f = fixture({ link }); await processWhatsAppPayload(f.db, config, payload('LINK 123456'));
    expect(f.tables.whatsapp_messages.at(-1).body).toBe(LINK_FAILURE); expect(f.contact.linked_user_id).toBeNull();
  });
  it('links a valid code once and does not consent', async () => {
    const f = fixture({ link: { code: '123456' } }); await processWhatsAppPayload(f.db, config, payload('LINK 123456'));
    expect(f.contact.linked_user_id).toBe('student-user'); expect(f.calls.some(c => c.name === 'whatsapp_apply_consent')).toBe(false);
    await processWhatsAppPayload(f.db, config, payload('LINK 123456','second')); expect(f.tables.whatsapp_messages.at(-1).body).toBe(LINK_FAILURE);
  });
  it('queries status only for the linked student and never includes private fields', async () => {
    const f = fixture({ linked: true }); await processWhatsAppPayload(f.db, config, payload('3'));
    const body = f.tables.whatsapp_messages.at(-1).body; expect(body).toContain('Example University'); expect(body).not.toContain('PRIVATE');
    const invalid = fixture({ linked: true, savedNumber: '+233 555555555' }); await processWhatsAppPayload(invalid.db, config, payload('3')); expect(invalid.contact.linked_user_id).toBeNull(); expect(invalid.tables.whatsapp_messages.at(-1).body).toContain('link your account first');
  });
  it('only lists active destinations and matches courses against active catalogue filters', async () => {
    const f = fixture(); await processWhatsAppPayload(f.db, config, payload('2'));
    expect(f.tables.whatsapp_messages.at(-1).body).toContain('Canada'); expect(f.tables.whatsapp_messages.at(-1).body).not.toContain('Hidden');
    Object.assign(f.conversation.flow_state, { step: 'country', subject: 'Computing', level: 'postgraduate' });
    await processWhatsAppPayload(f.db, config, payload('Canada','two')); expect(f.tables.whatsapp_messages.at(-1).body).toContain('/courses/course');
  });
  it('caps replies at ten per rolling hour, hands over once and stays silent', async () => {
    const f = fixture();
    (f.contact as any).auto_reply_times = [Date.now() - 3600001];
    for (let i = 0; i < 15; i++) await processWhatsAppPayload(f.db, config, payload('menu', `rate-${i}`));
    expect(f.tables.whatsapp_messages.filter(m => m.direction === 'outbound')).toHaveLength(11);
    expect(f.notifications).toHaveLength(1); expect(f.conversation.mode).toBe('human');
    expect(f.tables.whatsapp_messages.filter(m => m.direction === 'outbound').at(-1).body).toContain('admissions team');
  });
  it('never downgrades delivery receipts', async () => {
    const f = fixture();
    f.tables.whatsapp_messages.push({ meta_message_id: 'outbound', status: 'queued' });
    for (const status of ['delivered','read','sent','delivered','failed']) {
      await processWhatsAppPayload(f.db, config, { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'test-phone' }, statuses: [{ id: 'outbound', status }] } }] }] });
    }
    expect(f.tables.whatsapp_messages[0].status).toBe('read');
  });
  it('deduplicates before any flow, link or rate reservation', async () => {
    const f = fixture(); await processWhatsAppPayload(f.db, config, payload('LINK 123456'));
    const before = f.calls.length;
    await processWhatsAppPayload(f.db, config, payload('LINK 123456'));
    expect(f.calls.slice(before).map(c => c.name)).toEqual(['whatsapp_ingest']);
  });
  it('returns the same generic LINK failure on database failure', async () => {
    const f = fixture(); const rpc = f.db.rpc;
    f.db.rpc = (name, args) => name === 'whatsapp_consume_link' ? Promise.resolve({ data: null, error: new Error('unavailable') }) : rpc(name,args);
    await processWhatsAppPayload(f.db, config, payload('LINK 123456'));
    expect(f.tables.whatsapp_messages.at(-1).body).toBe(LINK_FAILURE);
  });
  it('attaches Zoe context once, switches to human mode and creates a staff notification', async () => {
    const f = fixture(); await processWhatsAppPayload(f.db, config, payload('Ref ZOE-0123456789abcdef0123'));
    expect(f.conversation).toMatchObject({ mode: 'human', source: 'zoe', zoe_context: { summary: 'Visible summary' } }); expect(f.notifications).toHaveLength(1); expect(f.tables.zoe_handoffs[0].used_at).toBeTruthy();
  });
  it('attaches Zoe context in human mode without running or sending assistant replies', async () => {
    const f = fixture({ mode: 'human' });
    await processWhatsAppPayload(f.db, config, payload('Ref ZOE-0123456789abcdef0123'));
    expect(f.conversation).toMatchObject({ mode: 'human', source: 'zoe', zoe_context: { summary: 'Visible summary' } });
    expect(f.tables.whatsapp_messages.filter(m => m.direction === 'outbound')).toHaveLength(0);
    expect(f.notifications).toHaveLength(0);
  });
  it('routes a claimed message to people if a database lookup fails, without replaying a send', async () => {
    const f = fixture(); const from = f.db.from;
    f.db.from = table => { if (table === 'universities') throw new Error('Lookup unavailable'); return from(table); };
    await expect(processWhatsAppPayload(f.db, config, payload('2'))).rejects.toThrow('Lookup unavailable');
    expect(f.conversation.mode).toBe('human'); expect(f.notifications).toHaveLength(1);
    await processWhatsAppPayload(f.db, config, payload('2'));
    expect(f.tables.whatsapp_messages).toHaveLength(1); expect(fetch).not.toHaveBeenCalled();
  });
  it('does not downgrade a read delivery receipt', async () => {
    const f = fixture(); f.tables.whatsapp_messages.push({ meta_message_id: 'out', status: 'read' });
    const receipt = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'test-phone' }, statuses: [{ id: 'out', status: 'delivered' }] } }] }] };
    await processWhatsAppPayload(f.db, config, receipt); expect(f.tables.whatsapp_messages[0].status).toBe('read');
  });
});
describe('WhatsApp staff actions', () => {
  const request = (action: string, body = 'Staff reply', token: string | null = 'valid') => new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action, conversationId: 'conversation', body }) });
  it('rejects missing/invalid JWTs and non-staff users server-side', async () => {
    const f = fixture(); const handler = createWhatsAppReplyHandler(f.db, config);
    expect((await handler(request('reply','Test',null))).status).toBe(401); expect((await handler(request('reply','Test','invalid'))).status).toBe(401);
    expect((await createWhatsAppReplyHandler(fixture({ role: false }).db, config)(request('reply'))).status).toBe(403); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ optedOut: true }, { lastInbound: new Date(Date.now()-86400001).toISOString() }])('refuses opted-out or expired-window replies %j', async options => {
    const f = fixture(options); const response = await createWhatsAppReplyHandler(f.db, activeConfig)(request('reply'));
    expect(response.status).toBe(409); expect(f.tables.whatsapp_messages).toHaveLength(0); expect(fetch).not.toHaveBeenCalled();
  });
  it('saves a disabled reply as skipped and takes over', async () => {
    const f = fixture(); const response = await createWhatsAppReplyHandler(f.db, config)(request('reply'));
    expect(await response.json()).toMatchObject({ status: 'skipped' }); expect(f.conversation.mode).toBe('human'); expect(f.tables.whatsapp_messages[0].sent_by).toBe('staff-user'); expect(fetch).not.toHaveBeenCalled();
  });
  it('sends only through a mocked fetch and records provider acceptance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'out-meta' }] }))));
    const f = fixture(); const response = await createWhatsAppReplyHandler(f.db, activeConfig)(request('reply'));
    expect(await response.json()).toMatchObject({ status: 'sent' }); expect(f.tables.whatsapp_messages[0]).toMatchObject({ status: 'sent', meta_message_id: 'out-meta' }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('retains only for active applications or complaints, for at most another 12 months', async () => {
    const f = fixture(); const handler = createWhatsAppReplyHandler(f.db, config);
    const retain = (reason: string, retainUntil: string) => new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retain', conversationId: 'conversation', reason, retainUntil }) });
    const valid = new Date(Date.now() + 30 * 86400000).toISOString();
    expect((await handler(retain('active_application', valid))).status).toBe(200);
    expect(f.conversation).toMatchObject({ retain_until: valid, retain_reason: 'active_application' });
    expect((await handler(retain('complaint', valid))).status).toBe(200);
    for (const [reason, until] of [['marketing',valid], ['complaint','invalid'], ['complaint', new Date(Date.now()-86400000).toISOString()], ['active_application',new Date(Date.now()+400*86400000).toISOString()]]) {
      expect((await handler(retain(reason,until))).status).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('supports take over, assign to self, hand back and close', async () => {
    const f = fixture(); const handler = createWhatsAppReplyHandler(f.db, config);
    for (const action of ['take_over','assign','hand_back','close']) expect((await handler(request(action))).status).toBe(200);
    expect(f.conversation.mode).toBe('closed'); expect(f.conversation).toMatchObject({ assigned_to: 'staff-user', flow_state: {} });
  });
});
