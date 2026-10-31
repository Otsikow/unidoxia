import type { StudentOperationalStatus } from './studentStatus';

export interface StudentWorkspaceSummary {
  archived_at: string | null;
  legal_name: string | null;
  contact_email: string | null;
  operationalStatus: StudentOperationalStatus;
  documents: { admin_review_status: string | null }[];
  applications: { status: string | null }[];
}
export type StudentWorkspaceView = 'active' | 'attention' | 'review' | 'applications' | 'archived' | 'all';
export function studentDocumentsToReview(student: StudentWorkspaceSummary): number {
  return student.documents.filter(doc => doc.admin_review_status === 'awaiting_admin_review').length;
}
export function studentNeedsAttention(student: StudentWorkspaceSummary): boolean {
  if (student.archived_at) return false;
  return studentDocumentsToReview(student) > 0 || student.documents.some(doc => doc.admin_review_status === 'admin_rejected') ||
    ['profile_incomplete', 'outstanding_documents', 'new_student', 'application_drafted'].includes(student.operationalStatus);
}
export function studentMatchesView(student: StudentWorkspaceSummary, view: StudentWorkspaceView): boolean {
  if (view === 'all') return true;
  if (view === 'archived') return Boolean(student.archived_at);
  if (student.archived_at) return false;
  if (view === 'attention') return studentNeedsAttention(student);
  if (view === 'review') return studentDocumentsToReview(student) > 0;
  if (view === 'applications') return student.applications.length > 0;
  return true;
}
export function getStudentNextAction(student: StudentWorkspaceSummary): { label: string; tab: 'overview' | 'documents' | 'applications' } {
  if (student.archived_at) return { label: 'Review archived record', tab: 'overview' };
  if (studentDocumentsToReview(student)) return { label: 'Review uploaded documents', tab: 'documents' };
  if (student.documents.some(doc => doc.admin_review_status === 'admin_rejected')) return { label: 'Check replacement documents', tab: 'documents' };
  if (!student.legal_name || !student.contact_email) return { label: 'Complete profile details', tab: 'overview' };
  if (student.operationalStatus === 'outstanding_documents') return { label: 'Check missing documents', tab: 'documents' };
  if (student.applications.some(app => app.status === 'draft')) return { label: 'Review draft application', tab: 'applications' };
  if (!student.applications.length) return { label: 'Review study plans and start an application', tab: 'applications' };
  return { label: 'Review application progress', tab: 'applications' };
}
export const STUDENT_PROFILE_TABS = ['overview', 'documents', 'education', 'applications'] as const;
export function studentProfileTab(value: string | null): typeof STUDENT_PROFILE_TABS[number] {
  return STUDENT_PROFILE_TABS.find(tab => tab === value) ?? 'overview';
}

export function studentQueueView(value: string | null): StudentWorkspaceView {
  return ['active', 'attention', 'review', 'applications', 'archived', 'all'].includes(value ?? '') ? value as StudentWorkspaceView : 'active';
}
