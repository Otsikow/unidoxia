import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/errorUtils';
import { formatWorkflowDate, isFollowUpOverdue, londonDate, openFollowUps, type ApplicationFollowUp } from '@/lib/applicationWorkflow';
import { createApplicationFollowUp, updateApplicationFollowUp } from '@/lib/applicationFollowUps';

export function ApplicationFollowUps({ applicationId, tenantId, onSaved, onDirtyChange }: {
  applicationId: string; tenantId: string; onSaved: () => void; onDirtyChange?: (dirty: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const writing = useRef(false);
  const pendingId = useRef<string | null>(null);
  useEffect(() => { onDirtyChange?.(Boolean(title || date)); }, [title, date, onDirtyChange]);
  const query = useQuery({
    queryKey: ['application-follow-ups', user?.id, applicationId], enabled: Boolean(user?.id),
    queryFn: async () => {
      const rows: ApplicationFollowUp[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('tasks').select('id,title,status,due_at,assignee_id,updated_at,assignee:profiles!tasks_assignee_id_fkey(full_name)')
          .eq('application_id', applicationId).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
  });
  const refresh = async () => {
    await query.refetch();
    await queryClient.invalidateQueries({ queryKey: ['staff', 'tasks'] });
    onSaved();
  };
  const add = async () => {
    if (!user || writing.current) return;
    writing.current = true; setBusy('new'); setError(null);
    try {
      pendingId.current ??= crypto.randomUUID();
      await createApplicationFollowUp({ id: pendingId.current, applicationId, tenantId, userId: user.id, title, date });
      pendingId.current = null; setTitle(''); setDate(''); await refresh();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { writing.current = false; setBusy(null); }
  };
  const update = async (task: ApplicationFollowUp, claim: boolean) => {
    if (!user || writing.current) return;
    writing.current = true; setBusy(task.id); setError(null);
    try {
      await updateApplicationFollowUp({ id: task.id, applicationId, currentStatus: task.status, updatedAt: task.updated_at,
        ...(claim ? { assigneeId: user.id } : { status: task.status === 'done' ? 'open' : 'done' }),
      });
      await refresh();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { writing.current = false; setBusy(null); }
  };
  const tasks = query.data ?? [];
  const ordered = [...openFollowUps(tasks), ...tasks.filter(task => task.status === 'done')];
  return <section className="space-y-5" aria-label="Application follow-ups">
    <div><h3 className="font-semibold">Follow-ups</h3><p className="text-sm text-muted-foreground">Give the next action an owner and a date. These are internal follow-ups, separate from university deadlines.</p></div>
    <form className="space-y-3 rounded-lg border p-4" onSubmit={e => { e.preventDefault(); void add(); }}>
      <div className="space-y-2"><Label htmlFor="follow-up-title">Next action</Label><Input id="follow-up-title" maxLength={200} value={title} placeholder="e.g. Check the student's revised statement" disabled={Boolean(busy)} onChange={e => { setTitle(e.target.value); pendingId.current = null; }} /></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1 space-y-2"><Label htmlFor="follow-up-date">Follow-up date (optional)</Label><Input id="follow-up-date" type="date" min={londonDate()} value={date} disabled={Boolean(busy)} onChange={e => { setDate(e.target.value); pendingId.current = null; }} /></div><Button type="submit" disabled={Boolean(busy) || !title.trim() || !tenantId}>{busy === 'new' ? 'Adding…' : 'Add follow-up'}</Button></div>
      <p className="text-xs text-muted-foreground">Assigned to you. Choose Monday to Saturday.</p>
    </form>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {query.isPending ? <p role="status">Loading follow-ups…</p> : query.isError ? <Alert variant="destructive"><AlertDescription>Follow-ups could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Try again</Button></AlertDescription></Alert> : ordered.length === 0 ? <p className="text-sm text-muted-foreground">No follow-ups yet. Add the next action above.</p> :
      <ul className="divide-y">{ordered.map(task => <li key={task.id} className="space-y-2 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><p className={task.status === 'done' ? 'text-muted-foreground line-through' : 'font-medium'}>{task.title}</p>{isFollowUpOverdue(task) ? <Badge variant="destructive">Overdue</Badge> : task.status === 'blocked' ? <Badge variant="destructive">Blocked</Badge> : task.status === 'done' ? <Badge variant="secondary">Done</Badge> : null}</div>
        <p className="text-sm text-muted-foreground">{task.assignee_id === user?.id ? 'You' : task.assignee?.full_name || 'Unassigned'} · {formatWorkflowDate(task.due_at)}</p>
        <div className="flex flex-wrap gap-2">{task.status !== 'done' && task.assignee_id !== user?.id && <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void update(task, true)}>Assign to me</Button>}<Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void update(task, false)}>{busy === task.id ? 'Saving…' : task.status === 'done' ? 'Reopen' : 'Mark done'}</Button></div>
      </li>)}</ul>}
  </section>;
}
