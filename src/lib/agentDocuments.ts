import { supabase } from '@/integrations/supabase/client';
import { validateFileUpload } from '@/lib/fileUpload';
import { isAmbiguousWriteError, uploadVerifiedDocument } from '@/lib/documentUpload';

export const AGENT_DOCUMENT_BUCKET = 'agent-documents';
type Owner = { id: string; tenant_id: string };
type Details = { company_name?: string | null; verification_document_url?: string | null };

export function validateAgentDocumentReference(value: string | null | undefined, ownerId?: string) {
  if (!value) return;
  if (value.startsWith(`${AGENT_DOCUMENT_BUCKET}/`)) {
    const parts = value.split('/');
    if (parts.length === 3 && (!ownerId || parts[1] === ownerId) &&
        /^[\w.-]+$/.test(parts[2]) && !['.', '..'].includes(parts[2])) return;
  } else {
    try { if (new URL(value).protocol === 'https:') return; } catch { /* invalid URL */ }
  }
  throw new Error('Use a secure HTTPS link or upload your certificate in Documents.');
}

export async function saveAgentDetails(owner: Owner, details: Details) {
  validateAgentDocumentReference(details.verification_document_url, owner.id);
  const existing = await supabase.from('agents').select('id').eq('profile_id', owner.id)
    .eq('tenant_id', owner.tenant_id).maybeSingle();
  if (existing.error) throw existing.error;
  // UPDATE does not require INSERT permission. Never upsert an existing agent.
  const query = existing.data
    ? supabase.from('agents').update(details).eq('id', existing.data.id)
        .eq('profile_id', owner.id).eq('tenant_id', owner.tenant_id)
    : supabase.from('agents').insert({ ...details, profile_id: owner.id, tenant_id: owner.tenant_id });
  const result = await query.select('id,verification_document_url').single();
  if (result.error || !result.data) throw result.error ?? new Error('Your agency details could not be saved. Please retry.');
  return result.data;
}

export async function uploadAgentCertificate(owner: Owner, file: File) {
  const prepared = await validateFileUpload(file, {
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeBytes: 10 * 1024 * 1024,
  });
  const path = `${owner.id}/${crypto.randomUUID()}.${prepared.sanitizedFileName.split('.').pop()}`;
  const reference = `${AGENT_DOCUMENT_BUCKET}/${path}`;
  await uploadVerifiedDocument(AGENT_DOCUMENT_BUCKET, path, prepared.preparedFile, prepared.detectedMimeType);
  try {
    await saveAgentDetails(owner, { verification_document_url: reference });
  } catch (error) {
    // Read back after response loss before deleting a potentially linked file.
    if (isAmbiguousWriteError(error)) {
      const saved = await supabase.from('agents').select('verification_document_url')
        .eq('profile_id', owner.id).eq('tenant_id', owner.tenant_id).maybeSingle();
      if (!saved.error && saved.data?.verification_document_url === reference) return reference;
      throw new Error('We could not confirm the certificate save. Refresh Documents before retrying. Your previous certificate has been kept.');
    }
    await supabase.storage.from(AGENT_DOCUMENT_BUCKET).remove([path]);
    throw error;
  }
  // Preserve the old certificate for review/audit; never delete it before a replacement is saved.
  return reference;
}

export async function getAgentCertificateUrl(reference: string) {
  validateAgentDocumentReference(reference);
  if (!reference.startsWith(`${AGENT_DOCUMENT_BUCKET}/`)) return reference;
  const { data, error } = await supabase.storage.from(AGENT_DOCUMENT_BUCKET)
    .createSignedUrl(reference.slice(AGENT_DOCUMENT_BUCKET.length + 1), 300);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('The certificate could not be opened. Please retry.');
  return data.signedUrl;
}
