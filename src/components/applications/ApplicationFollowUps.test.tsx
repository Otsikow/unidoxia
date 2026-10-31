import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApplicationFollowUps } from './ApplicationFollowUps';
const fake = vi.hoisted(() => ({ read: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }));
vi.mock('@/lib/applicationFollowUps', () => ({ createApplicationFollowUp: fake.create, updateApplicationFollowUp: fake.update }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ order: () => ({ range: fake.read }) }) }) }) }) } }));
function show() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const onSaved = vi.fn(); render(<QueryClientProvider client={client}><ApplicationFollowUps applicationId="app" tenantId="staff-tenant" onSaved={onSaved} /></QueryClientProvider>); return onSaved; }
beforeEach(() => { vi.resetAllMocks(); fake.read.mockResolvedValue({ data: [], error: null }); fake.create.mockResolvedValue(undefined); fake.update.mockResolvedValue(undefined); });
describe('application follow-up actions', () => {
  it('creates an assigned action and clears the form only after success', async () => {
    const onSaved = show(); await screen.findByText('No follow-ups yet. Add the next action above.');
    await userEvent.type(screen.getByLabelText('Next action'), 'Check statement');
    await userEvent.click(screen.getByRole('button', { name: 'Add follow-up' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fake.create).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 'app', tenantId: 'staff-tenant', userId: 'staff', title: 'Check statement' }));
    expect(screen.getByLabelText('Next action')).toHaveValue('');
  });
  it('retains inputs and reuses the task ID after a save failure', async () => {
    fake.create.mockRejectedValue(new Error('Save unavailable'));
    show(); await screen.findByText('No follow-ups yet. Add the next action above.');
    await userEvent.type(screen.getByLabelText('Next action'), 'Check statement');
    await userEvent.click(screen.getByRole('button', { name: 'Add follow-up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Add follow-up' }));
    expect(fake.create).toHaveBeenCalledTimes(2);
    expect(fake.create.mock.calls[0][0].id).toBe(fake.create.mock.calls[1][0].id);
    expect(screen.getByLabelText('Next action')).toHaveValue('Check statement');
  });
  it('marks a task done using its current application and version', async () => {
    fake.read.mockResolvedValue({ data: [{ id: 'task', title: 'Check statement', status: 'open', due_at: null, assignee_id: 'staff', updated_at: 'previous' }], error: null });
    show(); await screen.findByText('Check statement');
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    expect(fake.update).toHaveBeenCalledWith({ id: 'task', applicationId: 'app', currentStatus: 'open', updatedAt: 'previous', status: 'done' });
  });
});
