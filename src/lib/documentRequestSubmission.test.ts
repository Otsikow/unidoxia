import {beforeEach,describe,it,expect,vi} from 'vitest';
import {submitDocumentRequest} from './documentRequestSubmission';
const api=vi.hoisted(()=>({rpc:vi.fn(),find:vi.fn(),scope:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:api.rpc,from:()=>{const q={select:()=>q,eq:(...args:unknown[])=>{api.scope(...args);return q;},single:api.find};return q;}}}));
const input={requestId:'request',applicationId:'app',storagePath:'app/transcript_uuid.pdf',expectedUpdatedAt:'2026-10-31T10:00:00Z'};
beforeEach(()=>{vi.clearAllMocks();api.find.mockResolvedValue({data:{id:'document'},error:null});api.rpc.mockResolvedValue({data:{id:input.requestId,status:'received',storage_path:input.storagePath},error:null});});
describe('confirmed document-request receipt',()=>{
 it('uses a saved document ID and the original request version',async()=>{await submitDocumentRequest(input);expect(api.scope).toHaveBeenCalledWith('application_id','app');expect(api.scope).toHaveBeenCalledWith('storage_path',input.storagePath);expect(api.rpc).toHaveBeenCalledWith('submit_student_document_request',{p_request_id:'request',p_document_id:'document',p_expected_updated_at:input.expectedUpdatedAt});});
 it('never calls the receipt operation before the document row is confirmed',async()=>{api.find.mockResolvedValue({data:null,error:null});await expect(submitDocumentRequest(input)).rejects.toThrow('saved application file');expect(api.rpc).not.toHaveBeenCalled();});
 it('returns a clear refresh message for a concurrent review',async()=>{api.rpc.mockResolvedValue({data:null,error:{code:'PT409'}});await expect(submitDocumentRequest(input)).rejects.toThrow('changed or was reviewed');});
 it('does not claim receipt on a denied or lost response',async()=>{api.rpc.mockResolvedValue({data:null,error:{code:'42501'}});await expect(submitDocumentRequest(input)).rejects.toThrow('file is saved');});
 it.each([{id:'other',status:'received',storage_path:input.storagePath},{id:'request',status:'approved',storage_path:input.storagePath},{id:'request',status:'received',storage_path:'other/path'}])('rejects a mismatched receipt result: %j',async data=>{api.rpc.mockResolvedValue({data,error:null});await expect(submitDocumentRequest(input)).rejects.toThrow('receipt could not be confirmed');});
});
