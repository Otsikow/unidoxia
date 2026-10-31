import { supabase } from '@/integrations/supabase/client';
import { persistApplicationDocuments } from '@/lib/applicationWorkflow';

type DocumentType = 'passport_photo' | 'passport' | 'transcript' | 'ielts' | 'sop';
export interface SubmissionDocument {
  type: DocumentType;
  file: File | null;
  existing?: { storage_path: string; mime_type: string };
}
const matchesDocument = (row: { document_type: string; storage_path: string }, type: DocumentType) =>
  row.document_type === (type === 'passport_photo' ? 'other' : type) &&
  (type !== 'passport_photo' || /\/passport_photo_/.test(row.storage_path));

/** This is a recoverable multi-step upload, not an atomic database transaction.
 * The application already exists; every failure is returned to the caller. */
export async function saveApplicationDocuments(applicationId: string, documents: SubmissionDocument[]): Promise<void> {
  const { data: saved, error } = await supabase.from('application_documents')
    .select('document_type, storage_path').eq('application_id', applicationId);
  if (error) throw error;
  await persistApplicationDocuments({
    documents,
    persist: async ({ type, file: suppliedFile, existing }) => {
      if (saved?.some(row => matchesDocument(row, type))) return;
      let file: Blob | File | null = suppliedFile;
      if (!file && existing) {
        const { data, error } = await supabase.storage.from('student-documents').download(existing.storage_path);
        if (error || !data) throw new Error(`Could not reuse ${type.replace(/_/g, ' ')}. Please upload it again.`);
        file = data;
      }
      if (!file) throw new Error(`Missing ${type.replace(/_/g, ' ')}.`);
      const path = `${applicationId}/${type}_${crypto.randomUUID()}`;
      const mime = file.type || existing?.mime_type || 'application/octet-stream';
      const { error: uploadError } = await supabase.storage.from('application-documents')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: mime });
      if (uploadError) throw new Error(`Could not upload ${type.replace(/_/g, ' ')}. Please try again.`);
      const { error: recordError } = await supabase.from('application_documents').insert({
        application_id: applicationId, document_type: type === 'passport_photo' ? 'other' : type,
        storage_path: path, file_size: file.size, mime_type: mime, verified: false,
      });
      if (recordError) {
        // Remove only this attempt's unlinked object, never a saved document.
        if (/^[0-9A-Z]{5}$/.test(recordError.code ?? '')) {
          await supabase.storage.from('application-documents').remove([path]);
        }
        throw new Error(`Could not save ${type.replace(/_/g, ' ')}. Please try again.`);
      }
    },
    finalise: async () => {
      const { data, error } = await supabase.from('application_documents')
        .select('document_type, storage_path').eq('application_id', applicationId);
      if (error) throw error;
      if (documents.some(doc => !data?.some(row => matchesDocument(row, doc.type)))) {
        throw new Error('Some documents have not been saved yet. Please try again.');
      }
    },
  });
}
