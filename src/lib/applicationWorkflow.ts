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

/** Finalise only after every supplied document has a durable record. On failure,
 * keep the recovery reference; retry skips documents already recorded. */
export async function persistApplicationDocuments<T>(options: {
  documents: ReadonlyArray<T>;
  persist: (document: T) => Promise<void>;
  finalise: () => Promise<void>;
}): Promise<void> {
  for (const document of options.documents) await options.persist(document);
  await options.finalise();
}
