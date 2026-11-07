import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), storage: vi.fn(), validate: vi.fn(), upload: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, storage: { from: mocks.storage } } }));
vi.mock('@/lib/fileUpload', () => ({ validateFileUpload: mocks.validate }));
vi.mock('@/lib/documentUpload', () => ({ uploadVerifiedDocument: mocks.upload, isAmbiguousWriteError: (e: {code?: string}) => !e.code }));
import { getAgentCertificateUrl, saveAgentDetails, uploadAgentCertificate, validateAgentDocumentReference } from './agentDocuments';
const owner = { id: 'owner', tenant_id: 'tenant' };
function lookup(data: unknown, error: unknown = null) {
  const chain = { eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error }) }; chain.eq.mockReturnValue(chain); return { select: vi.fn().mockReturnValue(chain), chain };
}
function mutation(data: unknown, error: unknown = null) {
  const chain = { eq: vi.fn(), select: vi.fn(), single: vi.fn().mockResolvedValue({ data, error }) }; chain.eq.mockReturnValue(chain); chain.select.mockReturnValue(chain);
  return { update: vi.fn().mockReturnValue(chain), insert: vi.fn().mockReturnValue(chain), chain };
}
beforeEach(() => { vi.clearAllMocks(); mocks.storage.mockReturnValue({ remove: vi.fn().mockResolvedValue({error:null}) }); });
describe('agent details', () => {
  it('updates an existing agent with owner and tenant filters, without upsert/insert', async () => {
    const read = lookup({id:'agent'}); const write = mutation({id:'agent'}); mocks.from.mockReturnValueOnce(read).mockReturnValueOnce(write);
    await saveAgentDetails(owner, {company_name:'Agency'});
    expect(write.update).toHaveBeenCalledWith({company_name:'Agency'}); expect(write.insert).not.toHaveBeenCalled();
    expect(write.chain.eq.mock.calls).toEqual([['id','agent'],['profile_id','owner'],['tenant_id','tenant']]);
  });
  it('repairs a missing record with identity from the signed-in profile', async () => {
    const write = mutation({id:'agent'}); mocks.from.mockReturnValueOnce(lookup(null)).mockReturnValueOnce(write);
    await saveAgentDetails(owner,{company_name:'Agency'});
    expect(write.insert).toHaveBeenCalledWith({profile_id:'owner',tenant_id:'tenant',company_name:'Agency'});
  });
  it('does not insert when the lookup failed', async () => {
    mocks.from.mockReturnValueOnce(lookup(null,{code:'42501'})); await expect(saveAgentDetails(owner,{})).rejects.toEqual({code:'42501'}); expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it('rejects silent zero-row updates', async () => {
    mocks.from.mockReturnValueOnce(lookup({id:'agent'})).mockReturnValueOnce(mutation(null)); await expect(saveAgentDetails(owner,{})).rejects.toThrow('could not be saved');
  });
  it('validates links and blocks script or foreign private paths', () => {
    expect(()=>validateAgentDocumentReference('https://example.org/certificate.pdf','owner')).not.toThrow();
    expect(()=>validateAgentDocumentReference('agent-documents/owner/certificate.pdf','owner')).not.toThrow();
    for(const ref of ['javascript:alert(1)','http://example.org','agent-documents/foreign/file.pdf','agent-documents/owner/../foreign']) expect(()=>validateAgentDocumentReference(ref,'owner')).toThrow();
  });
});
describe('private agent certificate', () => {
  const file = new File(['pdf'], 'proof.pdf',{type:'application/pdf'});
  beforeEach(()=>mocks.validate.mockResolvedValue({preparedFile:file,sanitizedFileName:'proof.pdf',detectedMimeType:'application/pdf'}));
  it('links only after verified upload and stores a private path rather than a public URL', async () => {
    const write=mutation({id:'agent'}); mocks.from.mockReturnValueOnce(lookup({id:'agent'})).mockReturnValueOnce(write);
    const ref=await uploadAgentCertificate(owner,file);
    expect(mocks.upload).toHaveBeenCalledWith('agent-documents',expect.stringMatching(/^owner\/.+\.pdf$/),file,'application/pdf');
    expect(ref).toMatch(/^agent-documents\/owner\/.+\.pdf$/); expect(write.update).toHaveBeenCalledWith({verification_document_url:ref});
  });
  it('never changes the saved certificate after an upload rejection', async () => {
    mocks.upload.mockRejectedValueOnce({code:'42501'}); await expect(uploadAgentCertificate(owner,file)).rejects.toEqual({code:'42501'}); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('cleans only the new file after a definitive save rejection', async () => {
    const remove=vi.fn().mockResolvedValue({error:null}); mocks.storage.mockReturnValue({remove}); mocks.from.mockReturnValueOnce(lookup({id:'agent'})).mockReturnValueOnce(mutation(null,{code:'42501'}));
    await expect(uploadAgentCertificate(owner,file)).rejects.toEqual({code:'42501'}); expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^owner\/.+\.pdf$/)]);
  });
  it('preserves files after an ambiguous save failure', async () => {
    const remove=vi.fn(); mocks.storage.mockReturnValue({remove}); mocks.from.mockReturnValueOnce(lookup({id:'agent'})).mockReturnValueOnce(mutation(null,new Error('network'))).mockReturnValueOnce(lookup(null));
    await expect(uploadAgentCertificate(owner,file)).rejects.toThrow('could not confirm'); expect(remove).not.toHaveBeenCalled();
  });
  it('opens private certificates using a short-lived signed URL', async () => {
    const createSignedUrl=vi.fn().mockResolvedValue({data:{signedUrl:'https://storage.example/signed'},error:null}); mocks.storage.mockReturnValue({createSignedUrl});
    expect(await getAgentCertificateUrl('agent-documents/owner/proof.pdf')).toBe('https://storage.example/signed'); expect(createSignedUrl).toHaveBeenCalledWith('owner/proof.pdf',300);
  });
});
