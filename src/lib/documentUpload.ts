import { supabase } from '@/integrations/supabase/client';
import { verifyUploadedFileSize } from '@/lib/fileUpload';
import type { Database } from '@/integrations/supabase/types';

type ApplicationDocumentType = Database['public']['Enums']['document_type'];
/** Photo is a distinct UI type; the existing application enum stores it as other. */
export type ApplicationUploadType = ApplicationDocumentType | 'passport_photo';
export function applicationDocumentType(type: string): ApplicationDocumentType {
  const key = type.toLowerCase().replace(/[\s_-]+/g, '');
  const aliases: Record<string, ApplicationDocumentType> = {
    passport: 'passport', passportphotopage: 'passport', passportphoto: 'other',
    transcript: 'transcript', academictranscript: 'transcript',
    ielts: 'ielts', ieltsscore: 'ielts', toefl: 'toefl', toeflscore: 'toefl',
    sop: 'sop', personalstatement: 'sop', statementofpurpose: 'sop',
    cv: 'cv', resume: 'cv', cvresume: 'cv', lor: 'lor', referenceletter: 'lor',
    recommendation: 'lor', letterofrecommendation: 'lor', portfolio: 'portfolio', other: 'other',
  };
  return aliases[key] ?? 'other';
}

export const DOCUMENT_UPLOAD_VALIDATION = {
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
  maxSizeBytes: 10 * 1024 * 1024,
};

export async function uploadVerifiedDocument(bucket: string, path: string, file: File, contentType: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType,
  });
  // A network error may mean the response was lost after a successful upload.
  // Check this attempt's unique path before making the student start again.
  if (error && !isAmbiguousWriteError(error)) throw error;
  const verification = await verifyUploadedFileSize(supabase, bucket, path, file.size);
  if (!verification.valid) {
    // A visibility/network failure does not prove truncation. Preserve the file
    // unless an actual, different size was observed before any record was linked.
    if (verification.actualSize !== undefined && verification.actualSize !== file.size) {
      await supabase.storage.from(bucket).remove([path]);
    }
    throw new Error(verification.error || 'We could not confirm the upload. Please check your connection and try again.');
  }
}

export function isAmbiguousWriteError(error: unknown): boolean {
  const e = error as { code?: string; status?: number; statusCode?: string | number; message?: string };
  const status = Number(e?.status ?? e?.statusCode);
  if (status >= 500 || status === 0 || status === 408) return true;
  if (e?.code && /^[0-9A-Z]{5}$/.test(e.code)) return false;
  if (status >= 400 && status < 500) return false;
  return !e?.code || /fetch|network|timeout|connection/i.test(e?.message ?? '');
}

type StudentDocumentPayload = {
  student_id: string; document_type: string; file_name: string;
  file_size: number; mime_type: string; storage_path: string;
};
export async function saveStudentDocument(payload: StudentDocumentPayload, previous?: { id: string; storage_path: string }): Promise<void> {
  const id = previous?.id ?? crypto.randomUUID();
  const table = supabase.from('student_documents');
  const result = previous
    ? await table.update({ ...payload,
        verified_status: 'pending', verified_at: null, verified_by: null, verification_notes: null,
        admin_review_status: 'awaiting_admin_review', admin_review_notes: null,
        admin_reviewed_at: null, admin_reviewed_by: null, checksum: null,
      }).eq('id', id).eq('student_id', payload.student_id).eq('storage_path', previous.storage_path)
        .select('id,storage_path').maybeSingle()
    : await table.insert({ ...payload, id, verified_status: 'pending', admin_review_status: 'awaiting_admin_review' })
        .select('id,storage_path').single();
  if (result.error || !result.data) {
    if (result.error && isAmbiguousWriteError(result.error)) {
      const recovery = await supabase.from('student_documents').select('id,storage_path').eq('id', id).maybeSingle();
      if (!recovery.error && recovery.data?.storage_path === payload.storage_path) {
        // Persisted despite response loss. Safe to finish this same operation.
      } else {
        throw new Error('We could not confirm the document save. Refresh My Documents before trying again; your existing document has been kept.');
      }
    } else {
      // Definitive rejection: only this attempt's new, unlinked file is removed.
      await supabase.storage.from('student-documents').remove([payload.storage_path]);
      if (result.error) throw result.error;
      throw new Error('This document changed or could not be updated. Refresh My Documents and try again.');
    }
  }
  // Delete an old object only after its replacement record is confirmed saved.
  if (previous?.storage_path && previous.storage_path !== payload.storage_path) {
    const { error } = await supabase.storage.from('student-documents').remove([previous.storage_path]);
    if (error) console.warn('Old document cleanup deferred; the replacement is saved.');
  }
}

export async function saveApplicationDocument(payload: {
  application_id: string; document_type: ApplicationDocumentType;
  storage_path: string; mime_type: string; file_size: number;
}): Promise<void> {
  const id = crypto.randomUUID();
  const result = await supabase.from('application_documents').insert({ ...payload, id, verified: false })
    .select('id,storage_path').single();
  if (!result.error && result.data) return;
  if (result.error && isAmbiguousWriteError(result.error)) {
    const recovery = await supabase.from('application_documents').select('id,storage_path').eq('id', id).maybeSingle();
    if (!recovery.error && recovery.data?.storage_path === payload.storage_path) return;
    throw new Error('We could not confirm the document save. Refresh the application before trying again.');
  }
  await supabase.storage.from('application-documents').remove([payload.storage_path]);
  throw result.error ?? new Error('The document record could not be saved. Please try again.');
}

/** Do not report completion until each supplied file has a durable record. */
export async function persistApplicationDocuments<T>(options: {
  documents: ReadonlyArray<T>; persist: (document: T) => Promise<void>; finalise: () => Promise<void>;
}): Promise<void> {
  for (const document of options.documents) await options.persist(document);
  await options.finalise();
}

/** Resolve stored request files through caller-scoped private Storage access. */
export async function getDocumentRequestUrl(path: string | null, studentId: string | null, externalUrl: string | null): Promise<string | null> {
  if (!path) return externalUrl;
  const prefix = /^(student-documents|application-documents)\//.exec(path);
  const bucket = prefix?.[1] ?? (path.startsWith('document-requests/') || (studentId && path.split('/')[0] === studentId) ? 'student-documents' : 'application-documents');
  const objectPath = prefix ? path.slice(prefix[0].length) : path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 1800);
  return error ? null : data?.signedUrl ?? null;
}
