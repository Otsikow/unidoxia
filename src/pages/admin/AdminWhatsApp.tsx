import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { customerWindowOpen } from '../../../supabase/functions/_shared/whatsappSend';
type Conversation = Tables<'whatsapp_conversations'> & { contact?: Tables<'whatsapp_contacts'>; studentName?: string };
export default function AdminWhatsApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState<Tables<'whatsapp_messages'>[]>([]);
  const [retainReason, setRetainReason] = useState('active_application');
  const [retainDate, setRetainDate] = useState('');
  const [reply, setReply] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(100);
  const [threadLimit, setThreadLimit] = useState(100);
  const [clock, setClock] = useState(Date.now());
  const active = useRef(selected); active.current = selected;
  const conversation = conversations.find(c => c.id === selected);
  const windowOpen = customerWindowOpen(conversation?.last_inbound_at ?? null, new Date(clock));
  const load = useCallback(async () => {
    try {
      const result = await supabase.from('whatsapp_conversations').select('*').order('last_inbound_at', { ascending: false }).limit(limit);
      if (result.error) throw result.error;
      const rows = result.data ?? [];
      const contacts = rows.length ? await supabase.from('whatsapp_contacts').select('*').in('id', rows.map(c => c.contact_id)) : { data: [], error: null };
      if (contacts.error) throw contacts.error;
      const userIds = (contacts.data ?? []).map(c => c.linked_user_id).filter((id): id is string => Boolean(id));
      const students = userIds.length ? await supabase.from('students').select('profile_id,legal_name').in('profile_id', userIds) : { data: [], error: null };
      if (students.error) throw students.error;
      setConversations(rows.map(row => {
        const contact = contacts.data?.find(c => c.id === row.contact_id);
        return { ...row, contact, studentName: students.data?.find(s => s.profile_id === contact?.linked_user_id)?.legal_name ?? undefined };
      }));
      if (selected) {
        const thread = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', selected).order('created_at', { ascending: false }).limit(threadLimit);
        if (thread.error) throw thread.error;
        if (active.current === selected) setMessages((thread.data ?? []).reverse());
      }
    } catch { setError('Unable to load the WhatsApp inbox. Check your staff access and that the migration has been applied.'); }
  }, [selected, limit, threadLimit]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => { setClock(Date.now()); void load(); }, 10000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    void supabase.functions.invoke('whatsapp-reply', { body: { action: 'config' } }).then(({ data, error }) => { setEnabled(!error && data?.enabled === true); });
  }, []);
  const act = async (action: string) => {
    if (!selected || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-reply', { body: { action, conversationId: selected, ...(action === 'reply' ? { body: reply } : action === 'retain' ? { reason: retainReason, retainUntil: retainDate ? new Date(retainDate + 'T00:00:00Z').toISOString() : '' } : {}) } });
      if (error) {
        const response = error.context;
        const detail = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(detail?.error ?? 'Action failed. Refresh and check the sending window and contact consent.');
      }
      if (data?.error) throw new Error(data.error);
      if (action === 'reply') { setReply(''); setNotice(data.status === 'sent' ? 'Accepted by Meta. Delivery is shown in the thread.' : data.status === 'skipped' ? 'Reply saved as skipped. No message was sent.' : 'Sending failed or is uncertain. Check Meta before retrying.'); }
      if (action === 'retain') setNotice('Retention extension saved. Review it when the application or complaint closes.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete the action.'); }
    finally { setBusy(false); }
  };
  const choose = (id: string) => {
    setSelected(id); active.current = id; setMessages([]); setReply(''); setNotice(''); setError(''); setThreadLimit(100);
    void supabase.functions.invoke('whatsapp-reply', { body: { action: 'read', conversationId: id } });
  };
  const context = conversation?.zoe_context;
  const summary = context && typeof context === 'object' && !Array.isArray(context) && typeof context.summary === 'string' ? context.summary : '';
  return <div className="space-y-4 p-3 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-semibold">WhatsApp admissions inbox</h1><Button variant="outline" onClick={() => void load()}>Refresh</Button></div>
    {!enabled && <div role="status" className="rounded-lg border bg-muted p-3 text-sm">Sending not switched on. Messages are saved as skipped until the owner configures and enables WhatsApp.</div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card><CardHeader><CardTitle>Conversations</CardTitle></CardHeader><CardContent className="space-y-2 max-h-[65vh] overflow-y-auto">
        {!conversations.length && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
        {conversations.map(c => <button key={c.id} onClick={() => choose(c.id)} aria-pressed={selected === c.id} className={`w-full rounded-lg border p-3 text-left space-y-2 ${selected === c.id ? 'bg-muted border-primary' : ''}`}>
          <p className="break-words font-medium">{c.studentName || c.contact?.profile_name || c.contact?.wa_id || 'Student'}</p><p className="text-xs text-muted-foreground">{c.contact?.wa_id}{c.contact?.linked_user_id ? ' · Linked' : ''}</p>
          <div className="flex flex-wrap gap-1"><Badge variant="outline">{c.source === 'zoe' ? 'Zoe' : 'Direct'}</Badge><Badge variant="secondary">{c.mode}</Badge>{c.unread_count > 0 && <Badge>{c.unread_count} unread</Badge>}</div>
        </button>)}
        {conversations.length >= limit && <Button variant="outline" onClick={() => setLimit(v => v + 100)}>Load more conversations</Button>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{conversation ? 'Student conversation' : 'Select a conversation'}</CardTitle></CardHeader><CardContent className="space-y-4 min-w-0">
        {conversation && <>
          {conversation.handover_reason && <p className="text-sm">Handover: {conversation.handover_reason}</p>}
          {summary && <div className="rounded-lg bg-muted p-3"><h2 className="font-medium">Zoe context (written by the website chat, not checked)</h2><p className="whitespace-pre-wrap break-words text-sm">{summary}</p></div>}
          <div className="flex flex-wrap gap-2">{[['take_over','Take over'],['hand_back','Hand back'],['assign','Assign to me'],['close','Close']].map(([action,label]) => <Button key={action} variant="outline" size="sm" disabled={busy} onClick={() => void act(action)}>{label}</Button>)}</div>
          <details className="rounded-lg border p-3 space-y-2"><summary className="cursor-pointer text-sm">Extend retention for an active application or complaint</summary>
            <p className="text-sm">Confirm the case is still active. Choose an end date within 24 months of the last message.</p>
            <Label htmlFor="whatsapp-retain-reason">Reason</Label><select id="whatsapp-retain-reason" className="block border rounded p-2 bg-background" value={retainReason} onChange={e => setRetainReason(e.target.value)}><option value="active_application">Active application</option><option value="complaint">Complaint</option></select>
            <Label htmlFor="whatsapp-retain-date">Retain until</Label><input id="whatsapp-retain-date" type="date" className="block border rounded p-2 bg-background" value={retainDate} onChange={e => setRetainDate(e.target.value)} />
            {conversation.retain_until && <p className="text-sm">Current extension: {new Date(conversation.retain_until).toLocaleDateString('en-GB')}</p>}
            <Button variant="outline" size="sm" disabled={busy || !retainDate} onClick={() => void act('retain')}>Save retention extension</Button>
          </details>
          <p className="text-xs text-muted-foreground">Assigned: {conversation.assigned_to ? 'Team member assigned' : 'Unassigned'}. Times below use your browser time zone.</p>
          {!windowOpen && <div role="status" className="rounded-lg border p-3 text-sm">24-hour window closed. A Meta-approved template is needed to contact this student. Template sending is not available in this inbox.</div>}
          {conversation.contact?.opted_out_at && <p role="status" className="text-sm text-destructive">Contact opted out. They must send START before receiving replies.</p>}
          <div className="max-h-[50vh] overflow-y-auto space-y-3" aria-label="WhatsApp message thread">
            {messages.length >= threadLimit && <Button variant="outline" onClick={() => setThreadLimit(v => v + 100)}>Load earlier messages</Button>}
            {messages.map(m => <div key={m.id} className={`rounded-lg border p-3 ${m.direction === 'outbound' ? 'bg-muted ml-3 sm:ml-10' : 'mr-3 sm:mr-10'}`}>
              <p className="text-xs text-muted-foreground">{m.sender} · {new Date(m.created_at).toLocaleString('en-GB')} · {m.status}</p><p className="whitespace-pre-wrap break-words text-sm mt-1">{m.body}</p>{m.error && <p className="text-xs text-destructive">{m.error}</p>}
            </div>)}
          </div>
          <Label htmlFor="whatsapp-reply">Reply as the UniDoxia admissions team</Label><Textarea id="whatsapp-reply" value={reply} onChange={e => setReply(e.target.value)} maxLength={4096} placeholder="Do not request documents or sensitive information on WhatsApp." /><p className="text-sm text-muted-foreground">Don't give visa or immigration advice, and don't promise an offer, visa or scholarship. Point visa questions to gov.uk.</p>
          <Button disabled={busy || !reply.trim() || !windowOpen || Boolean(conversation.contact?.opted_out_at)} onClick={() => void act('reply')}>{enabled ? 'Send reply' : 'Save skipped reply'}</Button>
        </>}
      </CardContent></Card>
    </div>
  </div>;
}
