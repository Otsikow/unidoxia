// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationDocumentType, getDocumentRequestUrl, saveStudentDocument, saveApplicationDocument, uploadVerifiedDocument } from './documentUpload';
const api = vi.hoisted(() => ({ upload: vi.fn(), list: vi.fn(), download: vi.fn(), remove: vi.fn(), insert: vi.fn(), update: vi.fn(), write: vi.fn(), read: vi.fn(), signed: vi.fn(), bucket: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => ({
    insert: (payload: unknown) => { api.insert(table, payload); return { select: () => ({ single: api.write }) }; },
    update: (payload: unknown) => { api.update(table, payload); const chain = { eq: () => chain, select: () => ({ maybeSingle: api.write }) }; return chain; },
    select: () => ({ eq: () => ({ maybeSingle: api.read }) }),
  }),
  storage: { from: (bucket: string) => { api.bucket(bucket); return { upload: api.upload, list: api.list, download: api.download, remove: api.remove, createSignedUrl: api.signed }; } },
} }));
const payload = { student_id: 'student', document_type: 'passport', file_name: 'passport.pdf', file_size: 4, mime_type: 'application/pdf', storage_path: 'student/new.pdf' };
const previous = { id: 'existing', storage_path: 'student/old.pdf' };
beforeEach(() => {
  vi.resetAllMocks();
  api.upload.mockResolvedValue({ error: null });
  api.list.mockResolvedValue({ data: [{ name: 'new.pdf', metadata: { size: 4 } }], error: null });
  api.remove.mockResolvedValue({ error: null });
  api.write.mockResolvedValue({ data: { id: 'saved', storage_path: payload.storage_path }, error: null });
  api.read.mockResolvedValue({ data: null, error: null });
  api.download.mockResolvedValue({ data: null, error: { message: 'offline' } });
  api.signed.mockResolvedValue({ data: { signedUrl: 'https://example.test/signed' }, error: null });
});
describe('student document persistence', () => {
  it('uses only current review fields and removes the old file after confirmed replacement', async () => {
    await saveStudentDocument(payload, previous);
    const update = api.update.mock.calls[0][1];
    expect(update).toMatchObject({ verified_status: 'pending', admin_review_status: 'awaiting_admin_review', admin_reviewed_by: null, checksum: null });
    expect(update).not.toHaveProperty('university_access_approved');
    expect(update).not.toHaveProperty('university_access_approved_at');
    expect(update).not.toHaveProperty('university_access_approved_by');
    expect(api.remove).toHaveBeenCalledWith(['student/old.pdf']);
    expect(api.write.mock.invocationCallOrder[0]).toBeLessThan(api.remove.mock.invocationCallOrder[0]);
  });
  it('keeps the old file when the database definitely rejects a replacement', async () => {
    api.write.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } });
    await expect(saveStudentDocument(payload, previous)).rejects.toMatchObject({ code: '42501' });
    expect(api.remove).toHaveBeenCalledWith(['student/new.pdf']);
  });
  it('detects an RLS no-op or concurrent replacement instead of reporting success', async () => {
    api.write.mockResolvedValue({ data: null, error: null });
    await expect(saveStudentDocument(payload, previous)).rejects.toThrow('changed or could not be updated');
    expect(api.remove).not.toHaveBeenCalledWith(['student/old.pdf']);
  });
  it('recovers a replacement whose save response was lost', async () => {
    api.write.mockResolvedValue({ data: null, error: { code: '', message: 'Failed to fetch' } });
    api.read.mockResolvedValue({ data: { id: 'existing', storage_path: payload.storage_path }, error: null });
    await saveStudentDocument(payload, previous);
    expect(api.remove).toHaveBeenCalledWith(['student/old.pdf']);
  });
  it('keeps both files when a network failure makes the save outcome unknown', async () => {
    api.write.mockResolvedValue({ data: null, error: { code: '', message: 'Failed to fetch' } });
    api.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
    await expect(saveStudentDocument(payload, previous)).rejects.toThrow('could not confirm');
    expect(api.remove).not.toHaveBeenCalled();
  });
  it('creates new uploads pending staff review with a stable record ID', async () => {
    await saveStudentDocument(payload);
    expect(api.insert).toHaveBeenCalledWith('student_documents', expect.objectContaining({ id: expect.any(String), verified_status: 'pending', admin_review_status: 'awaiting_admin_review' }));
  });
});
describe('verified storage uploads', () => {
  it('recovers when the upload succeeded but its response was lost', async () => {
    api.upload.mockResolvedValue({ error: { status: 0, message: 'network error' } });
    await expect(uploadVerifiedDocument('student-documents', payload.storage_path, new File(['test'], 'new.pdf'), 'application/pdf')).resolves.toBeUndefined();
    expect(api.remove).not.toHaveBeenCalled();
  });
  it('removes a new upload only when a size mismatch was actually observed', async () => {
    api.list.mockResolvedValue({ data: [{ name: 'new.pdf', metadata: { size: 2 } }], error: null });
    await expect(uploadVerifiedDocument('student-documents', payload.storage_path, new File(['test'], 'new.pdf'), 'application/pdf')).rejects.toThrow('does not match');
    expect(api.remove).toHaveBeenCalledWith(['student/new.pdf']);
  });
  it('does not delete an upload just because it cannot be confirmed during a network error', async () => {
    api.list.mockResolvedValue({ data: null, error: { message: 'offline' } });
    await expect(uploadVerifiedDocument('student-documents', payload.storage_path, new File(['test'], 'new.pdf'), 'application/pdf')).rejects.toThrow('could not confirm');
    expect(api.remove).not.toHaveBeenCalled();
  });
});
describe('application document types and records', () => {
  it('keeps passport photos distinct from passport pages using the supported enum', () => {
    expect(applicationDocumentType('passport_photo')).toBe('other');
    expect(applicationDocumentType('passport_photo_page')).toBe('passport');
    expect(applicationDocumentType('transcript')).toBe('transcript');
  });
  it('never marks a newly uploaded application file verified', async () => {
    await saveApplicationDocument({ application_id: 'app', document_type: 'other', storage_path: 'app/passport_photo_file', mime_type: 'image/jpeg', file_size: 4 });
    expect(api.insert).toHaveBeenCalledWith('application_documents', expect.objectContaining({ document_type: 'other', verified: false }));
  });
});
describe('private request file links', () => {
  it('signs a student-owned request file in its actual private bucket', async () => {
    await getDocumentRequestUrl('student/new.pdf', 'student', null);
    expect(api.bucket).toHaveBeenCalledWith('student-documents');
    expect(api.signed).toHaveBeenCalledWith('student/new.pdf', 1800);
  });
  it('uses the application bucket for an application-owned request upload', async () => {
    await getDocumentRequestUrl('app/passport_photo_file', 'student', null);
    expect(api.bucket).toHaveBeenCalledWith('application-documents');
  });
  it('keeps legacy staff request uploads in their existing student-documents bucket', async () => {
    await getDocumentRequestUrl('document-requests/request/file.pdf', 'student', null);
    expect(api.bucket).toHaveBeenCalledWith('student-documents');
    expect(api.signed).toHaveBeenCalledWith('document-requests/request/file.pdf', 1800);
  });
  it('preserves explicit bucket prefixes and normalises the object path', async () => {
    await getDocumentRequestUrl('student-documents/student/new.pdf', null, null);
    expect(api.bucket).toHaveBeenCalledWith('student-documents');
    expect(api.signed).toHaveBeenCalledWith('student/new.pdf', 1800);
  });
  it('does not substitute a broken public URL when private access is denied', async () => {
    api.signed.mockResolvedValue({ data: null, error: { message: 'denied' } });
    expect(await getDocumentRequestUrl('student/new.pdf', 'student', 'https://example.test/storage/v1/object/public/file')).toBeNull();
  });
});
