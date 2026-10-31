import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StaffApplicationWorkspace } from './StaffApplicationWorkspace';
const fake = vi.hoisted(() => ({ read: vi.fn(), mutation: vi.fn(), update: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: fake.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => ({
  select: () => ({ eq: () => ({ single: fake.read }) }),
  update: (payload: unknown) => {
    fake.update(table, payload);
    const chain = { eq: () => chain, is: () => chain, select: () => ({ maybeSingle: fake.mutation }) };
    return chain;
  },
}) } }));
const app = { id: 'app', student_id: 'student', program_id: 'program', app_number: 'REF123', status: 'submitted', intake_month: 9, intake_year: 2027, notes: null, internal_notes: null, timeline_json: [], updated_at: '2026-10-31T09:00:00Z', student: { legal_name: 'Test student' }, program: { name: 'Course', university: { name: 'Test university' } }, documents: [{ id: 'doc', document_type: 'passport', verified: false, verification_notes: null, storage_path: 'app/passport_file' }] };
function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter><StaffApplicationWorkspace applicationId="app" onClose={vi.fn()} onSaved={vi.fn()} /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  fake.read.mockResolvedValue({ data: app, error: null });
  fake.mutation.mockResolvedValue({ data: { id: 'app' }, error: null });
});
describe('staff application workspace', () => {
  it('saves staff notes and a manually recorded university reference without pretending to submit externally', async () => {
    show(); await screen.findByText('Test student');
    await act(async () => { await userEvent.type(screen.getByLabelText('Staff notes'), 'Follow up on Monday'); });
    await act(async () => { await act(async () => { await userEvent.type(screen.getByLabelText('Submission route'), 'University portal'); }); });
    await act(async () => { await userEvent.type(screen.getByLabelText('University reference'), 'UNI123'); });
    await act(async () => { await act(async () => { await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Save changes' })); }); }); });
    expect(fake.update).toHaveBeenCalledWith('applications', expect.objectContaining({
      internal_notes: 'Follow up on Monday',
      timeline_json: [expect.objectContaining({ action: 'University submission recorded', details: expect.stringContaining('UNI123') })],
    }));
  });
  it('rejects an incomplete university submission reference', async () => {
    show(); await screen.findByText('Test student');
    await act(async () => { await act(async () => { await userEvent.type(screen.getByLabelText('Submission route'), 'University portal'); }); });
    await act(async () => { await act(async () => { await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Save changes' })); }); }); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter both');
    expect(fake.update).not.toHaveBeenCalled();
  });
  it('reports a concurrent change or permission loss instead of claiming success', async () => {
    fake.mutation.mockResolvedValue({ data: null, error: null });
    show(); await screen.findByText('Test student');
    await act(async () => { await userEvent.type(screen.getByLabelText('Staff notes'), 'New note'); });
    await act(async () => { await act(async () => { await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Save changes' })); }); }); });
    expect(await screen.findByRole('alert')).toHaveTextContent('application changed');
    expect(fake.toast).not.toHaveBeenCalled();
  });
  it('records explicit staff verification with the reviewer identity', async () => {
    show(); await screen.findByText('Test student');
    await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Mark verified' })); });
    expect(fake.update).toHaveBeenCalledWith('application_documents', { verified: true, verifier_id: 'staff' });
  });
});
