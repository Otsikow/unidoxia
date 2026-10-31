import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentUploadDialog } from './DocumentUploadDialog';
const api = vi.hoisted(() => ({ upload: vi.fn(), save: vi.fn(), request: vi.fn(), requestPayload: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock('@/lib/fileUpload', () => ({ validateFileUpload: async (file: File) => ({ preparedFile: file, sanitizedFileName: file.name, detectedMimeType: 'image/jpeg' }) }));
vi.mock('@/lib/documentUpload', async () => ({
  ...await vi.importActual<typeof import('@/lib/documentUpload')>('@/lib/documentUpload'),
  uploadVerifiedDocument: api.upload, saveApplicationDocument: api.save,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ update: (payload: unknown) => {
  api.requestPayload(payload); return { eq: () => ({ select: () => ({ maybeSingle: api.request }) }) };
} }) } }));
beforeEach(() => { vi.resetAllMocks(); api.upload.mockResolvedValue(undefined); api.save.mockResolvedValue(undefined); api.request.mockResolvedValue({ data: { id: 'request' }, error: null }); });
async function openPhotoRequest() {
  render(<DocumentUploadDialog applicationId="app" documentRequest={{ id: 'request', document_type: 'passport_photo' }} />);
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Upload Document' })); });
  await act(async () => { fireEvent.change(screen.getByLabelText('Select File'), { target: { files: [new File(['photo'], 'portrait.jpg', { type: 'image/jpeg' })] } }); });
}
describe('requested document uploads', () => {
  it('saves a passport photo using the supported enum and a private path', async () => {
    await openPhotoRequest();
    await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Submit Document' })); });
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ document_type: 'other', storage_path: expect.stringMatching(/^app\/passport_photo_/) }));
    expect(api.requestPayload).toHaveBeenCalledWith(expect.objectContaining({ document_url: null, storage_path: expect.stringMatching(/^app\//), status: 'received' }));
    expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Document submitted' }));
  });
  it('does not claim the request was fulfilled when its status update is denied', async () => {
    api.request.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await openPhotoRequest();
    await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Submit Document' })); });
    expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'File saved; request needs attention' }));
    expect(api.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Document submitted' }));
  });
  it('keeps the form available after an upload failure and does not write a document record', async () => {
    api.upload.mockRejectedValue(new Error('connection failed'));
    await openPhotoRequest();
    await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Submit Document' })); });
    expect(api.save).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit Document' })).toBeEnabled());
    expect(screen.getByLabelText('Select File')).toBeInTheDocument();
  });
});
