import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/LoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { getNextApplicationAction, WORKFLOW_STATUSES, type WorkflowStatus } from '@/lib/applicationWorkflow';
import type { Json } from '@/integrations/supabase/types';

type TimelineEvent = { action: string; timestamp: string; actor?: string; details?: string };
function eventsFromJson(value: unknown): TimelineEvent[] {
  return Array.isArray(value) ? value.filter((v): v is TimelineEvent => Boolean(v && typeof v === 'object' && typeof v.action === 'string' && typeof v.timestamp === 'string')) : [];
}

export function StaffApplicationWorkspace({ applicationId, onClose, onSaved }: {
  applicationId: string | null; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<WorkflowStatus>('submitted');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewingDocument, setReviewingDocument] = useState<string | null>(null);
  const [openingDocument, setOpeningDocument] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['staff-application', user?.id, applicationId],
    enabled: Boolean(applicationId && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('applications').select(`
        id, student_id, program_id, app_number, status, intake_month, intake_year,
        notes, internal_notes, timeline_json, updated_at,
        student:students(legal_name, contact_email),
        program:programs(name, university:universities(name, country)),
        documents:application_documents(id, document_type, storage_path, verified, verification_notes)
      `).eq('id', applicationId!).single();
      if (error) throw error;
      return data;
    },
  });
  const app = query.data;
  useEffect(() => {
    setStatus(app?.status ?? 'submitted');
    setNotes(app?.internal_notes ?? '');
    setChannel(''); setReference(''); setError(null);
  }, [app?.id, app?.updated_at, app?.internal_notes, app?.status]);

  const save = async () => {
    if (!app || !user || saving) return;
    if (Boolean(channel.trim()) !== Boolean(reference.trim())) {
      setError('Enter both the university submission route and its reference, or leave both empty.'); return;
    }
    if (app.status === 'draft' && status !== 'draft') {
      setError('Finish and submit the draft from the student’s application form so its documents are checked first.'); return;
    }
    setSaving(true); setError(null);
    try {
      const time = new Date().toISOString();
      const events: Json[] = Array.isArray(app.timeline_json) ? [...app.timeline_json] : [];
      if (status !== app.status) events.push({ action: `Status changed to ${WORKFLOW_STATUSES.find(s => s.value === status)?.label ?? status}`, timestamp: time, actor: user.id });
      if (channel.trim()) events.push({ action: 'University submission recorded', timestamp: time, actor: user.id, details: `Route: ${channel.trim()}. Reference: ${reference.trim()}. Recorded manually after external submission.` });
      let update = supabase.from('applications').update({ status, internal_notes: notes.trim() || null, timeline_json: events, updated_at: time }).eq('id', app.id);
      // Fail visibly if another colleague edited this record after we opened it.
      update = app.updated_at ? update.eq('updated_at', app.updated_at) : update.is('updated_at', null);
      const { data, error: saveError } = await update.select('id').maybeSingle();
      if (saveError) throw saveError;
      if (!data) throw new Error('The application changed or your access changed. Refresh the application before saving again.');
      await query.refetch(); onSaved();
      toast({ title: 'Application saved' });
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const reviewDocument = async (id: string, verified: boolean) => {
    if (!app || !user || reviewingDocument) return;
    setReviewingDocument(id); setError(null);
    try {
      const { data, error } = await supabase.from('application_documents')
        .update({ verified, verifier_id: verified ? user.id : null })
        .eq('id', id).eq('application_id', app.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Document could not be updated. Refresh and check your access.');
      await query.refetch(); onSaved();
      toast({ title: verified ? 'Document marked verified' : 'Document returned for review' });
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setReviewingDocument(null); }
  };

  const viewDocument = async (id: string, path: string) => {
    setOpeningDocument(id); setError(null);
    try {
      const { data, error } = await supabase.storage.from('application-documents').createSignedUrl(path.replace(/^application-documents\//, ''), 300);
      if (error || !data?.signedUrl) throw error ?? new Error('Document is unavailable.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch { setError('The document could not be opened. Check your access or ask the student to upload it again.'); }
    finally { setOpeningDocument(null); }
  };

  return <Dialog open={Boolean(applicationId)} onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Application workspace</DialogTitle><DialogDescription>Check the details, review documents and record the next step.</DialogDescription></DialogHeader>
      {query.isPending ? <LoadingState message="Loading application…" /> : query.isError ? <Alert variant="destructive"><AlertDescription>This application could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Try again</Button></AlertDescription></Alert> : app ? <div className="space-y-6">
        <div><h2 className="text-xl font-semibold">{app.student?.legal_name || 'Student'}</h2><p>{app.program?.name} · {app.program?.university?.name}</p><p className="text-sm text-muted-foreground">Reference: {app.app_number || app.id} · Intake: {app.intake_month}/{app.intake_year}</p></div>
        <div className="rounded-lg bg-muted p-4"><p className="font-medium">Next step</p><p className="text-sm">{getNextApplicationAction(app.status)}</p></div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to={`/agent/students/${app.student_id}`}>Open student profile</Link></Button>
</div>
        {app.notes && <div><h3 className="font-medium">Student notes</h3><p className="whitespace-pre-wrap text-sm">{app.notes}</p></div>}
        <section aria-label="Application documents"><h3 className="mb-2 font-semibold">Documents</h3><p className="mb-3 text-sm text-muted-foreground">Uploaded files are not automatically verified. Check institution requirements in addition to these files.</p>
          {app.documents.length === 0 ? <p className="text-sm">No application documents uploaded.</p> : <ul className="divide-y">{app.documents.map(doc => <li key={doc.id} className="flex items-center justify-between gap-3 py-2"><div><p className="capitalize">{doc.document_type === 'other' && /\/passport_photo_/.test(doc.storage_path) ? 'Passport photo' : doc.document_type.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{doc.verified ? 'Verified' : 'Needs review'}{doc.verification_notes ? ` · ${doc.verification_notes}` : ''}</p></div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={Boolean(reviewingDocument) || saving} onClick={() => void reviewDocument(doc.id, !doc.verified)}>{doc.verified ? 'Return for review' : 'Mark verified'}</Button><Button variant="outline" disabled={openingDocument === doc.id} onClick={() => void viewDocument(doc.id, doc.storage_path)}>View</Button></div></li>)}</ul>}
        </section>
        <div className="space-y-2"><Label htmlFor="application-stage">Application stage</Label><Select value={status} disabled={saving || app.status === 'draft'} onValueChange={v => setStatus(v as WorkflowStatus)}><SelectTrigger id="application-stage"><SelectValue /></SelectTrigger><SelectContent>{WORKFLOW_STATUSES.filter(s => s.value !== 'draft' || app.status === 'draft').map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
        <section className="space-y-3"><h3 className="font-semibold">University submission</h3><p className="text-sm text-muted-foreground">“Received by UniDoxia” means it is in our system. Submit through the institution’s approved route, then record its reference here.</p>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="submission-route">Submission route</Label><Input id="submission-route" maxLength={200} placeholder="e.g. University partner portal" value={channel} onChange={e => setChannel(e.target.value)} disabled={saving || app.status === 'draft'} /></div><div className="space-y-2"><Label htmlFor="submission-reference">University reference</Label><Input id="submission-reference" maxLength={200} placeholder="Reference from the receiving portal" value={reference} onChange={e => setReference(e.target.value)} disabled={saving || app.status === 'draft'} /></div></div>
        </section>
        <div className="space-y-2"><Label htmlFor="application-notes">Staff notes</Label><Textarea id="application-notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={saving} placeholder="What is needed next, who is responsible, and any agreed deadline" /></div>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => void query.refetch()}>Refresh</Button><Button onClick={() => void save()} disabled={saving || Boolean(reviewingDocument)}>{saving ? 'Saving…' : 'Save changes'}</Button></div>
        <section><h3 className="font-semibold">Progress history</h3>{eventsFromJson(app.timeline_json).length === 0 ? <p className="text-sm text-muted-foreground">No recorded updates yet.</p> : <ol className="mt-3 space-y-3">{eventsFromJson(app.timeline_json).slice().reverse().map((event, i) => <li key={`${event.timestamp}-${i}`} className="border-l-2 pl-3 text-sm"><p className="font-medium">{event.action}</p>{event.details && <p className="whitespace-pre-wrap">{event.details}</p>}<p className="text-xs text-muted-foreground">{Number.isNaN(Date.parse(event.timestamp)) ? 'Date unavailable' : new Date(event.timestamp).toLocaleString('en-GB')}</p></li>)}</ol>}</section>
      </div> : null}
    </DialogContent>
  </Dialog>;
}
