import { useState } from 'react';
import { File as NodeFile } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DocumentsUploadStep from './DocumentsUploadStep';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const pdf = (name = 'passport.pdf') => new NodeFile(['%PDF-1.7\n' + 'x'.repeat(250) + '%%EOF'], name, { type: '' }) as File;
function Form() {
  const [data, setData] = useState({ passport_photo: pdf('photo.pdf'), transcript: pdf('transcript.pdf'), passport: null as File | null, ielts: null as File | null, sop: pdf('sop.pdf') });
  return <DocumentsUploadStep data={data} onChange={setData} onNext={vi.fn()} onBack={vi.fn()} />;
}
describe('application file selection', () => {
  it('accepts genuine PDF contents with an empty MIME and a filename containing expired', async () => {
    const { container } = render(<Form />);
    await act(async () => { fireEvent.change(container.querySelector('#file-passport')!, { target: { files: [pdf('expired-passport-copy.pdf')] } }); });
    expect(await screen.findByText('File check: Checked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Review' })).toBeEnabled();
    expect(screen.queryByText(/Passport valid and expiry date checks out/)).not.toBeInTheDocument();
  });
  it('blocks genuinely corrupted PDF contents with a useful explanation', async () => {
    const { container } = render(<Form />);
    const corrupt = new NodeFile(['%PDF-1.7\n' + 'x'.repeat(250)], 'scan.pdf', { type: 'application/pdf' });
    await act(async () => { fireEvent.change(container.querySelector('#file-passport')!, { target: { files: [corrupt] } }); });
    await waitFor(() => expect(screen.getByText('File check: Invalid')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Continue to Review' })).toBeDisabled();
  });
});
