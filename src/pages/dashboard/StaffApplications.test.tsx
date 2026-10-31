import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import StaffApplications from './StaffApplications';
const api = vi.hoisted(() => ({ range: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ order: () => ({ order: () => ({ range: api.range }) }) }) }) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }));
vi.mock('@/components/layout/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/applications/ChooseApplicationStudent', () => ({ ChooseApplicationStudent: ({ open }: { open: boolean }) => open ? <div>Student picker opened</div> : null }));
vi.mock('@/components/applications/StaffApplicationWorkspace', () => ({ StaffApplicationWorkspace: ({ applicationId }: { applicationId: string | null }) => applicationId ? <div>Workspace {applicationId}</div> : null }));
const application = (id: string, name: string, status = 'submitted') => ({ id, app_number: `REF-${id}`, student_id: id, program_id: 'course', status, intake_month: 9, intake_year: 2027, updated_at: '', student: { legal_name: name, contact_email: '' }, program: { name: 'Computer Science', university: { name: 'Test institution', country: 'UK' } }, documents: [] });
function show() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter><StaffApplications /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.resetAllMocks(); });
describe('staff application queue', () => {
  it('uses real records, searches by student and opens the correct application', async () => {
    api.range.mockResolvedValue({ data: [application('a', 'Ama Test'), application('b', 'Kojo Test')], error: null });
    show();
    await screen.findByText('Ama Test');
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search applications' }), 'Kojo');
    expect(screen.queryByText('Ama Test')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open application for Kojo Test' }));
    expect(await screen.findByText('Workspace b')).toBeInTheDocument();
  });
  it('shows a genuine empty state and a student-first start action', async () => {
    api.range.mockResolvedValue({ data: [], error: null });
    show();
    expect(await screen.findByText('No applications yet. Choose a student to start.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New application' }));
    expect(screen.getByText('Student picker opened')).toBeInTheDocument();
  });
  it('shows a retryable error without invented totals or sample applicants', async () => {
    api.range.mockResolvedValue({ data: null, error: new Error('offline') });
    show();
    expect(await screen.findByText('Applications could not be loaded. Refresh to try again.')).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    api.range.mockResolvedValue({ data: [application('a', 'Ama Test')], error: null });
    await userEvent.click(screen.getByRole('button', { name: 'Refresh applications' }));
    expect(await screen.findByText('Ama Test')).toBeInTheDocument();
  });
  it('fetches beyond the database page limit and displays 20 rows at a time', async () => {
    api.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => application(String(i), `Applicant ${i}`)), error: null })
      .mockResolvedValueOnce({ data: [application('last', 'Last applicant')], error: null });
    show();
    await waitFor(() => expect(screen.getByText('501 applications · Page 1 of 26')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /Open application for/ })).toHaveLength(20);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search applications' }), 'Last applicant');
    expect(await screen.findByText('Last applicant')).toBeInTheDocument();
  });
});
