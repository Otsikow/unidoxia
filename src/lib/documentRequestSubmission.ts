import {supabase} from '@/integrations/supabase/client';

export class DocumentRequestSubmissionError extends Error {
  constructor(message:string,readonly refreshRequired=false){super(message);}
}

/** Link only a confirmed application file; the server rechecks ownership and Storage. */
export async function submitDocumentRequest(input: {
  requestId:string; applicationId:string; storagePath:string; expectedUpdatedAt:string|null;
}): Promise<void> {
  const {data:document,error:documentError}=await supabase.from('application_documents')
    .select('id').eq('application_id',input.applicationId).eq('storage_path',input.storagePath).single();
  if(documentError||!document?.id)throw new DocumentRequestSubmissionError('The saved application file could not be confirmed. Refresh the application before retrying.',true);
  let response;
  try { response=await supabase.rpc('submit_student_document_request',{
    p_request_id:input.requestId,p_document_id:document.id,p_expected_updated_at:input.expectedUpdatedAt,
  }); } catch { throw new DocumentRequestSubmissionError('Your file is saved, but the request update could not be confirmed. Retry the request update without uploading again.'); }
  const {data,error}=response;
  if(error?.code==='42501'||error?.code==='22023')throw new DocumentRequestSubmissionError('Your file is saved, but it could not be linked to this request. Refresh the application or contact UniDoxia for help.',true);
  if(error)throw new DocumentRequestSubmissionError((error.code==='PT409'||error.code==='40001')
    ? 'Your file is saved. This request changed or was reviewed. Refresh the application before submitting again.'
    : 'Your file is saved, but the request update could not be confirmed. Retry the request update; you do not need to upload the file again.',(error.code==='PT409'||error.code==='40001'));
  const result=data as {id?:string;status?:string;storage_path?:string}|null;
  if(result?.id!==input.requestId||result.storage_path!==input.storagePath||!['received','submitted'].includes(result.status??''))
    throw new DocumentRequestSubmissionError('Your file is saved, but its request receipt could not be confirmed. Refresh the application.',true);
}
