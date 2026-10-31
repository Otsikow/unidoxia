import { describe, expect, it } from 'vitest';
import { getStudentNextAction, studentMatchesView, studentNeedsAttention, studentProfileTab, type StudentWorkspaceSummary } from './studentWorkspace';
const student = (values: Partial<StudentWorkspaceSummary> = {}): StudentWorkspaceSummary => ({ archived_at: null, legal_name: 'Test student', contact_email: 'student@example.test', operationalStatus: 'application_submitted', documents: [], applications: [{status:'submitted'}], ...values });
describe('student workspace guidance', () => {
  it('prioritises pending review, rejected files and incomplete profiles', () => {
    expect(getStudentNextAction(student({ documents: [{admin_review_status:'awaiting_admin_review'}] })).tab).toBe('documents');
    expect(getStudentNextAction(student({ documents: [{admin_review_status:'admin_rejected'}] })).label).toBe('Check replacement documents');
    expect(getStudentNextAction(student({ legal_name:null })).tab).toBe('overview');
    expect(getStudentNextAction(student({ applications:[{status:'draft'}] })).label).toBe('Review draft application');
  });
  it('keeps archived records out of operational queues even with outstanding documents', () => {
    const archived=student({archived_at:'2026-10-31',documents:[{admin_review_status:'awaiting_admin_review'}]});
    expect(studentNeedsAttention(archived)).toBe(false);
    expect(studentMatchesView(archived,'review')).toBe(false);
    expect(studentMatchesView(archived,'applications')).toBe(false);
    expect(studentMatchesView(archived,'archived')).toBe(true);
    expect(studentMatchesView(archived,'all')).toBe(true);
  });
  it('does not confuse profile preparation with a guarantee of application readiness', () => {
    expect(getStudentNextAction(student({ applications:[],operationalStatus:'new_student' })).label).toBe('Review study plans and start an application');
    expect(studentNeedsAttention(student({ operationalStatus:'new_student' }))).toBe(true);
    expect(studentNeedsAttention(student())).toBe(false);
  });
  it('accepts only existing profile tabs in deep links', () => {
    expect(studentProfileTab('documents')).toBe('documents');
    expect(studentProfileTab('applications')).toBe('applications');
    expect(studentProfileTab('unknown')).toBe('overview');
    expect(studentProfileTab(null)).toBe('overview');
  });
});
