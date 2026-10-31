import { supabase } from '@/integrations/supabase/client';
import { followUpDeadline } from '@/lib/applicationWorkflow';

export interface NewApplicationFollowUp {
  id: string;
  applicationId: string;
  tenantId: string;
  userId: string;
  title: string;
  date: string;
}

export async function createApplicationFollowUp(input: NewApplicationFollowUp): Promise<void> {
  const title = input.title.trim();
  if (!title || title.length > 200) throw new Error('Enter a next action of up to 200 characters.');
  const due = followUpDeadline(input.date);
  const { data, error } = await supabase.from('tasks').insert({
    id: input.id, application_id: input.applicationId, tenant_id: input.tenantId,
    title, assignee_id: input.userId, created_by: input.userId, due_at: due,
    status: 'open', priority: 'medium', description: 'Internal follow-up created in the application workspace.',
  }).select('id').single();
  if (!error && data) return;
  // Same ID across retries: recover response loss without creating another task.
  const recovery = await supabase.from('tasks').select('id,application_id,created_by,title,due_at')
    .eq('id', input.id).maybeSingle();
  if (!recovery.error && recovery.data?.application_id === input.applicationId &&
      recovery.data.created_by === input.userId && recovery.data.title === title && ((!recovery.data.due_at && !due) || (Boolean(recovery.data.due_at && due) && Date.parse(recovery.data.due_at!) === Date.parse(due!)))) return;
  throw error ?? new Error('The follow-up could not be saved. Please refresh before trying again.');
}

export async function updateApplicationFollowUp(input: {
  id: string; applicationId: string; currentStatus: string | null; updatedAt?: string | null;
  status?: 'open' | 'in_progress' | 'done' | 'blocked'; assigneeId?: string;
}): Promise<void> {
  let update = supabase.from('tasks').update({
    ...(input.status ? { status: input.status } : {}),
    ...(input.assigneeId ? { assignee_id: input.assigneeId } : {}), updated_at: new Date().toISOString(),
  }).eq('id', input.id).eq('application_id', input.applicationId);
  update = input.currentStatus ? update.eq('status', input.currentStatus as 'open' | 'in_progress' | 'done' | 'blocked') : update.is('status', null);
  if (input.updatedAt) update = update.eq('updated_at', input.updatedAt);
  const { data, error } = await update.select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This follow-up changed or your access changed. Refresh and try again.');
}
