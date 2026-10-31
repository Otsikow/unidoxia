import {supabase} from '@/integrations/supabase/client';

/** Link only a confirmed application file; the server rechecks ownership and Storage. */
export async function submitDocumentRequest(input: {
  requestId:string; applicationId:string; storagePath:string; expectedUpdatedAt:string|null;
}): Promise<void> {
  const {data:document,error:documentError}=await supabase.from('application_documents')
    .select('id').eq('application_id',input.applicationId).eq('storage_path',input.storagePath).single();
  if(documentError||!document?.id)throw new Error('The saved application file could not be confirmed. Refresh the application before retrying.');
  const {data,error}=await supabase.rpc('submit_student_document_request',{
    p_request_id:input.requestId,p_document_id:document.id,p_expected_updated_at:input.expectedUpdatedAt,
  });
  if(error)throw new Error(error.code==='40001'
    ? 'This request changed or was reviewed. Refresh the application before submitting again.'
    : 'Your file is saved, but the request update could not be confirmed. Retry the request update; you do not need to upload the file again.');
  const result=data as {id?:string;status?:string;storage_path?:string}|null;
  if(result?.id!==input.requestId||result.storage_path!==input.storagePath||!['received','submitted'].includes(result.status??''))
    throw new Error('Your file is saved, but its request receipt could not be confirmed. Retry the request update.');
}
