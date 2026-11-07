import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Documents from './Documents';

const api = vi.hoisted(() => ({
  student: { id: 'student-id', coursefinder_fields_required: true },
  list: vi.fn(), upload: vi.fn(), save: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/hooks/useStudentRecord', () => ({
  useStudentRecord: () => ({ data: api.student, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: api.list }) }) }) },
}));
vi.mock('@/lib/documentUpload', async (original) => ({
  ...await original<typeof import('@/lib/documentUpload')>(),
  uploadVerifiedDocument: api.upload, saveStudentDocument: api.save,
}));
vi.mock('@/lib/fileUpload', () => ({
  validateFileUpload: async (file: File) => ({
    preparedFile: file, sanitizedFileName: file.name, detectedMimeType: file.type,
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue({ data: [], error: null });
});

const photo = new File(['image'], 'passport.jpg', { type: 'image/jpeg' });

describe('student dashboard uploads', () => {
  it('accepts an upload with incomplete profile details and clears the selected file after saving', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/student/documents?upload=passport']}><Documents /></MemoryRouter>);
    const picker = await screen.findByLabelText('File') as HTMLInputElement;
    expect(screen.getByText('Your profile still needs some details')).toBeInTheDocument();
    await user.upload(picker, photo);
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({
      student_id: 'student-id', document_type: 'passport', file_name: 'passport.jpg',
    })));
    expect(picker.files).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('resubmits the rejected record through replacement and never inserts a duplicate', async () => {
    const user = userEvent.setup();
    const existing = { id: 'rejected', document_type: 'passport', file_name: 'old.jpg',
      storage_path: 'student-id/old.jpg', file_size: 10, mime_type: 'image/jpeg',
      verified_status: 'rejected', created_at: '2026-10-01' };
    api.list.mockResolvedValue({ data: [existing], error: null });
    const { container } = render(<MemoryRouter><Documents /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /passport photo page click to resubmit/i }));
    const picker = container.querySelector<HTMLInputElement>('input[type=file].hidden');
    if (!picker) throw new Error('Missing outstanding documents picker');
    await user.upload(picker, photo);
    await waitFor(() => expect(api.save).toHaveBeenCalledWith(
      expect.objectContaining({ document_type: 'passport', storage_path: expect.not.stringMatching(/old\.jpg$/) }),
      { id: existing.id, storage_path: existing.storage_path },
    ));
    expect(api.save).toHaveBeenCalledTimes(1);
  });

  it('preserves the selected file so a student can retry a connection failure', async () => {
    const user = userEvent.setup();
    api.upload.mockRejectedValueOnce(new Error('Connection lost'));
    render(<MemoryRouter initialEntries={['/student/documents?upload=english_proof']}><Documents /></MemoryRouter>);
    const picker = await screen.findByLabelText('File') as HTMLInputElement;
    await user.upload(picker, photo);
    const button = screen.getByRole('button', { name: 'Upload' });
    await user.click(button);
    expect(api.save).not.toHaveBeenCalled();
    expect(picker.files).toHaveLength(1);
    await user.click(button);
    await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ document_type: 'english_proof' })));
  });
});
