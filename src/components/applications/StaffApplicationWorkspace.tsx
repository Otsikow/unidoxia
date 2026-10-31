import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ApplicationFollowUps } from '@/components/applications/ApplicationFollowUps';
import { StudentDocumentRequests } from '@/components/applications/StudentDocumentRequests';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getNextApplicationAction, openFollowUps, formatWorkflowDate, WORKFLOW_STATUSES, type WorkflowStatus } from '@/lib/applicationWorkflow';
import type { Json } from '@/integrations/supabase/types';

type TimelineEvent = { action: string; timestamp: string; actor?: string; details?: string };
function eventsFromJson(value: unknown): TimelineEvent[] {
  return Array.isArray(value) ? value.filter((v): v is TimelineEvent => Boolean(v && typeof v === 'object' && typeof v.action === 'string' && typeof v.timestamp === 'string')) : [];
}

export function StaffApplicationWorkspace({ applicationId, onClose, onSaved }: {
  applicationId: string | null; onClose: () => void; onSaved: () => void;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [taskDirty, setTaskDirty] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showSubmission, setShowSubmission] = useState(false);
  const [leaving, setLeaving] = useState<'close' | 'profile' | 'reload' | null>(null);
  const baseline = useRef<{ id: string; updatedAt: string | null; status: string; notes: string } | null>(null);
  const mutationInFlight = useRef(false);
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
        id, tenant_id, student_id, program_id, app_number, status, intake_month, intake_year,
        notes, internal_notes, timeline_json, updated_at,
        student:students(legal_name, contact_email),
        program:programs(name, university:universities(name, country)),
        documents:application_documents(id, document_type, storage_path, verified, verification_notes),
        tasks(id,title,status,due_at,assignee_id,updated_at,assignee:profiles!tasks_assignee_id_fkey(full_name))
      `).eq('id', applicationId!).single();
      if (error) throw error;
      return data;
    },
  });
  const app = query.data;
  const dirty = Boolean(app && baseline.current?.id === app.id && (
    status !== baseline.current.status || notes !== baseline.current.notes || channel.trim() || reference.trim()
  ));
  useEffect(() => {
    setTab('overview'); setShowSubmission(false); setLeaving(null); setTaskDirty(false);
    baseline.current = null;
  }, [applicationId]);
  useEffect(() => {
    if (!app || dirty || (baseline.current?.id === app.id && baseline.current.updatedAt === app.updated_at)) return;
    baseline.current = { id: app.id, updatedAt: app.updated_at, status: app.status, notes: app.internal_notes ?? '' };
    setStatus(app.status); setNotes(app.internal_notes ?? ''); setChannel(''); setReference(''); setError(null);
  }, [app, dirty]);

  const leave = (action: 'close' | 'profile' | 'reload') => {
    if (saving || reviewingDocument) return;
    if (dirty || (taskDirty && action !== 'reload')) { setLeaving(action); return; }
    void finishLeave(action);
  };
  const finishLeave = async (action: 'close' | 'profile' | 'reload') => {
    setLeaving(null);
    if (action === 'close') onClose();
    else if (action === 'profile' && app) navigate(`/agent/students/${app.student_id}`);
    else if (action === 'reload') {
      const fresh = await query.refetch();
      if (fresh.data) {
        baseline.current = { id: fresh.data.id, updatedAt: fresh.data.updated_at, status: fresh.data.status, notes: fresh.data.internal_notes ?? '' };
        setStatus(fresh.data.status); setNotes(fresh.data.internal_notes ?? ''); setChannel(''); setReference(''); setError(null);
      }
    }
  };

  const save = async () => {
    if (!app || !user || mutationInFlight.current) return;
    if (Boolean(channel.trim()) !== Boolean(reference.trim())) {
      setError('Enter both the university submission route and its reference, or leave both empty.'); return;
    }
    if (app.status === 'draft' && status !== 'draft') {
      setError('Finish and submit the draft from the student’s application form so its documents are checked first.'); return;
    }
    mutationInFlight.current = true;
    setSaving(true); setError(null);
    try {
      const time = new Date().toISOString();
      const events: Json[] = Array.isArray(app.timeline_json) ? [...app.timeline_json] : [];
      if (status !== app.status) events.push({ action: `Status changed to ${WORKFLOW_STATUSES.find(s => s.value === status)?.label ?? status}`, timestamp: time, actor: user.id });
      if (channel.trim()) events.push({ action: 'University submission recorded', timestamp: time, actor: user.id, details: `Route: ${channel.trim()}. Reference: ${reference.trim()}. Recorded manually after external submission.` });
      let update = supabase.from('applications').update({ status, internal_notes: notes.trim() || null, timeline_json: events, updated_at: time }).eq('id', app.id);
      // Fail visibly if another colleague edited this record after we opened it.
      update = baseline.current?.updatedAt ? update.eq('updated_at', baseline.current.updatedAt) : update.is('updated_at', null);
      const { data, error: saveError } = await update.select('id').maybeSingle();
      if (saveError) throw saveError;
      if (!data) throw new Error('The application changed or your access changed. Refresh the application before saving again.');
      baseline.current = null;
      const fresh = await query.refetch();
      if (fresh.data) {
        baseline.current = { id: fresh.data.id, updatedAt: fresh.data.updated_at, status: fresh.data.status, notes: fresh.data.internal_notes ?? '' };
        setStatus(fresh.data.status); setNotes(fresh.data.internal_notes ?? ''); setChannel(''); setReference('');
      }
      onSaved();
      toast({ title: 'Application saved' });
    } catch (e) { setError(getErrorMessage(e)); }
    finally { mutationInFlight.current = false; setSaving(false); }
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

  const nextTask = openFollowUps(app?.tasks ?? [])[0];
  const events = eventsFromJson(app?.timeline_json);
  const handoff = events.slice().reverse().find(event => event.action === 'University submission recorded');
  const conflict = dirty && app?.updated_at !== baseline.current?.updatedAt;

  return <>
    <Dialog open={Boolean(applicationId)} onOpenChange={open => { if (!open) leave('close'); }}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>{app?.student?.legal_name || 'Application workspace'}</DialogTitle>
          <DialogDescription>{app ? `${app.program?.name || 'Course unavailable'} · ${app.program?.university?.name || 'University unavailable'}` : 'Check details and complete the next step.'}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-5 py-4">
          {query.isPending ? <LoadingState message="Loading application…" /> : query.isError ?
            <Alert variant="destructive"><AlertDescription>This application could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Try again</Button></AlertDescription></Alert> : app ? <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Reference: {app.app_number || app.id} · Intake: {app.intake_month}/{app.intake_year}</p>
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">Next action</p>
                <p className="mt-1 text-sm">{nextTask?.title || getNextApplicationAction(app.status)}</p>
                {nextTask && <p className="mt-1 text-xs text-muted-foreground">{nextTask.assignee_id === user?.id ? 'You' : nextTask.assignee?.full_name || 'Unassigned'} · {formatWorkflowDate(nextTask.due_at)}</p>}
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setTab(nextTask ? 'followups' : 'documents')}>{nextTask ? 'Open follow-ups' : 'Check documents'}</Button>
              </div>
              {conflict && <Alert><AlertDescription>This application was updated while you were editing. Your edits have been kept; reload the saved version before trying to save again.</AlertDescription></Alert>}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-4" aria-label="Application workspace sections">
                  <TabsTrigger className="px-1 text-xs sm:text-sm" value="overview">Overview</TabsTrigger>
                  <TabsTrigger className="px-1 text-xs sm:text-sm" value="documents">Documents</TabsTrigger>
                  <TabsTrigger className="px-1 text-xs sm:text-sm" value="followups">Follow-ups</TabsTrigger>
                  <TabsTrigger className="px-1 text-xs sm:text-sm" value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-5">
                  <Button variant="outline" onClick={() => leave('profile')}>Open student profile</Button>
                  {app.notes && <section><h3 className="font-medium">Student notes</h3><p className="whitespace-pre-wrap text-sm">{app.notes}</p></section>}
                  <div className="space-y-2"><Label htmlFor="application-stage">Application stage</Label><Select value={status} disabled={saving || app.status === 'draft'} onValueChange={v => setStatus(v as WorkflowStatus)}><SelectTrigger id="application-stage"><SelectValue /></SelectTrigger><SelectContent>{WORKFLOW_STATUSES.filter(s => s.value !== 'draft' || app.status === 'draft').map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="application-notes">Staff notes</Label><Textarea id="application-notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={saving} placeholder="What is needed next and any useful context" /></div>
                  <section className="space-y-3 rounded-lg border p-4">
                    <h3 className="font-semibold">University submission</h3>
                    <p className="text-sm text-muted-foreground">{handoff ? 'A staff member recorded this external handoff:' : 'University submission has not been recorded here. Received by UniDoxia means it is in our system.'}</p>
                    {handoff?.details && <p className="break-words text-sm">{handoff.details}</p>}
                    <Button variant="outline" size="sm" disabled={saving || app.status === 'draft'} aria-expanded={showSubmission} onClick={() => setShowSubmission(!showSubmission)}>Record university submission</Button>
                    {showSubmission && <div className="space-y-3"><p className="text-sm text-muted-foreground">Submit through the institution's approved route first, then enter its reference. Saving here records the handoff.</p>
                      <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="submission-route">Submission route</Label><Input id="submission-route" maxLength={200} placeholder="e.g. University partner portal" value={channel} onChange={e => setChannel(e.target.value)} disabled={saving} /></div><div className="space-y-2"><Label htmlFor="submission-reference">University reference</Label><Input id="submission-reference" maxLength={200} placeholder="Reference from the receiving portal" value={reference} onChange={e => setReference(e.target.value)} disabled={saving} /></div></div>
                    </div>}
                  </section>
                </TabsContent>
                <TabsContent value="documents" className="space-y-5">
                  <section aria-label="Application documents"><h3 className="mb-2 font-semibold">Application documents</h3><p className="mb-3 text-sm text-muted-foreground">Open each file and check it before marking it verified. Check institution requirements in addition to these files.</p>
                    {app.documents.length === 0 ? <p className="text-sm">No application documents uploaded. Open the student profile to review their saved files.</p> : <ul className="divide-y">{app.documents.map(doc => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="capitalize">{doc.document_type === 'other' && /\/passport_photo_/.test(doc.storage_path) ? 'Passport photo' : doc.document_type.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{doc.verified ? 'Verified' : 'Needs review'}{doc.verification_notes ? ` · ${doc.verification_notes}` : ''}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={openingDocument === doc.id} onClick={() => void viewDocument(doc.id, doc.storage_path)}>View</Button><Button size="sm" variant="outline" disabled={Boolean(reviewingDocument) || saving} onClick={() => void reviewDocument(doc.id, !doc.verified)}>{doc.verified ? 'Return for review' : 'Mark verified'}</Button></div></li>)}</ul>}
                  </section>
                  <StudentDocumentRequests studentId={app.student_id} />
                </TabsContent>
                <TabsContent value="followups" forceMount className="data-[state=inactive]:hidden"><ApplicationFollowUps key={app.id} onDirtyChange={setTaskDirty} applicationId={app.id} tenantId={profile?.tenant_id ?? ''} onSaved={() => { void query.refetch(); onSaved(); }} /></TabsContent>
                <TabsContent value="history"><h3 className="font-semibold">Progress history</h3>{events.length === 0 ? <p className="text-sm text-muted-foreground">No recorded updates yet.</p> : <ol className="mt-3 space-y-3">{events.slice().reverse().map((event, i) => <li key={`${event.timestamp}-${i}`} className="border-l-2 pl-3 text-sm"><p className="font-medium">{event.action}</p>{event.details && <p className="whitespace-pre-wrap break-words">{event.details}</p>}<p className="text-xs text-muted-foreground">{Number.isNaN(Date.parse(event.timestamp)) ? 'Date unavailable' : new Date(event.timestamp).toLocaleString('en-GB')}</p></li>)}</ol>}</TabsContent>
              </Tabs>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            </div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background px-5 py-3">
          {dirty && <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>}
          {dirty && <Button variant="ghost" disabled={saving || Boolean(reviewingDocument)} onClick={() => leave('reload')}>Reload saved version</Button>}
          <Button variant="outline" disabled={saving || Boolean(reviewingDocument)} onClick={() => leave('close')}>Back to list</Button>
          <Button onClick={() => void save()} disabled={!dirty || saving || Boolean(reviewingDocument)}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(leaving)} onOpenChange={open => { if (!open) setLeaving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave without saving?</AlertDialogTitle><AlertDialogDescription>Your unsaved application notes, stage changes or new follow-up will be discarded. Follow-ups already saved are kept.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { if (leaving) void finishLeave(leaving); }}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
