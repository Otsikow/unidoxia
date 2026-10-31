import type { Database } from '@/integrations/supabase/types';

export type WorkflowStatus = Database['public']['Enums']['application_status'];
export const WORKFLOW_STATUSES: ReadonlyArray<{ value: WorkflowStatus; label: string }> = [
  { value: 'draft', label: 'Draft — finish application' },
  { value: 'submitted', label: 'Received by UniDoxia' },
  { value: 'screening', label: 'Under review' },
  { value: 'conditional_offer', label: 'Conditional offer' },
  { value: 'unconditional_offer', label: 'Unconditional offer' },
  { value: 'cas_loa', label: 'CAS / LOA issued' },
  { value: 'visa', label: 'Visa stage' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function getNextApplicationAction(status: string): string {
  const actions: Record<string, string> = {
    draft: 'Finish details and documents',
    submitted: 'Check profile, sharing authorisation and documents',
    screening: 'Check university submission and follow up',
    conditional_offer: 'Check offer conditions with the student',
    unconditional_offer: 'Confirm acceptance and institution next steps',
    cas_loa: 'Check CAS / LOA details and visa readiness',
    visa: 'Follow up on the visa outcome',
    enrolled: 'Confirm enrolment record is complete',
    deferred: 'Confirm the revised intake with the institution',
    withdrawn: 'No further action unless the student returns',
    rejected: 'Review the decision with the student',
  };
  return actions[status] ?? 'Review application';
}

export function isActiveApplication(status: string): boolean {
  return !['enrolled', 'withdrawn', 'rejected'].includes(status);
}

export function getApplicationDocumentBucket(source: 'student_documents' | 'application_documents'): string {
  return source === 'application_documents' ? 'application-documents' : 'student-documents';
}

export interface ApplicationFollowUp {
  id: string;
  title: string;
  status: string | null;
  due_at: string | null;
  assignee_id: string | null;
  assignee?: { full_name: string | null } | null;
  updated_at?: string | null;
}

export function londonDate(value: string | Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatWorkflowDate(value: string | null | undefined): string {
  if (!value || !londonDate(value)) return 'No follow-up date';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function isFollowUpOverdue(task: ApplicationFollowUp, today = londonDate()): boolean {
  return task.status !== 'done' && Boolean(task.due_at && londonDate(task.due_at) && londonDate(task.due_at) < today);
}

export function openFollowUps(tasks: ApplicationFollowUp[] = []): ApplicationFollowUp[] {
  return tasks.filter(task => task.status !== 'done').slice().sort((a, b) => {
    const blocked = Number(b.status === 'blocked') - Number(a.status === 'blocked');
    return blocked || (a.due_at || '9999').localeCompare(b.due_at || '9999') || a.title.localeCompare(b.title);
  });
}

export function applicationNeedsAttention(application: {
  status: string;
  documents: { verified: boolean }[];
  tasks?: ApplicationFollowUp[];
}, today = londonDate()): boolean {
  if (!isActiveApplication(application.status)) return false;
  return ['draft', 'submitted'].includes(application.status) || application.documents.length === 0 ||
    application.documents.some(doc => !doc.verified) ||
    (application.tasks ?? []).some(task => task.status === 'blocked' || isFollowUpOverdue(task, today));
}

/** Date-only internal follow-up, due at the end of its UK business day. */
export function followUpDeadline(value: string, today = londonDate()): string | null {
  if (!value) return null;
  const noon = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(noon.getTime()) || noon.toISOString().slice(0, 10) !== value) {
    throw new Error('Choose a valid follow-up date.');
  }
  if (value < today) throw new Error('Choose today or a later follow-up date.');
  if (noon.getUTCDay() === 0) throw new Error('Choose a follow-up date from Monday to Saturday.');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(noon));
  return new Date(Date.parse(`${value}T23:59:59.999Z`) - (hour - 12) * 3600000).toISOString();
}

export function applicationQueueFilter(value: string | null): string {
  return value && (['attention', 'active', 'all'].includes(value) || WORKFLOW_STATUSES.some(status => status.value === value)) ? value : 'attention';
}
