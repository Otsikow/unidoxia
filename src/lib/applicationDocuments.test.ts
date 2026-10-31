// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveApplicationDocuments } from './applicationDocuments';
const api = vi.hoisted(() => ({ read: vi.fn(), upload: vi.fn(), save: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: api.read }) }) } }));
vi.mock('@/lib/documentUpload', async () => {
  const actual = await vi.importActual<typeof import('./documentUpload')>('./documentUpload');
  return { ...actual, uploadVerifiedDocument: api.upload, saveApplicationDocument: api.save };
});
const file = () => new File(['%PDF-1.7\n' + 'x'.repeat(250) + '%%EOF'], 'document.pdf', { type: '' });
beforeEach(() => {
  vi.resetAllMocks(); api.upload.mockResolvedValue(undefined); api.save.mockResolvedValue(undefined);
  api.read.mockResolvedValue({ data: [], error: null });
});
describe('application document batches', () => {
  it('passes normalised MIME metadata for a valid file with a blank browser MIME', async () => {
    api.read.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: [{ document_type: 'passport', storage_path: 'app/passport_x' }], error: null });
    await saveApplicationDocuments('app', [{ type: 'passport', file: file() }]);
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ document_type: 'passport', mime_type: 'application/pdf' }));
  });
  it('skips a file already saved on an interrupted earlier attempt', async () => {
    api.read.mockResolvedValue({ data: [{ document_type: 'passport', storage_path: 'app/passport_x' }], error: null });
    await saveApplicationDocuments('app', [{ type: 'passport', file: file() }]);
    expect(api.upload).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });
  it('propagates a failed record write and does not finalise the batch', async () => {
    api.save.mockRejectedValue(new Error('save failed'));
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: file() }])).rejects.toThrow('save failed');
    expect(api.read).toHaveBeenCalledTimes(1);
  });
  it('requires read-back evidence for every supplied type', async () => {
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: file() }])).rejects.toThrow('Some documents have not been saved');
  });
});
