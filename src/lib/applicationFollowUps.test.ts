import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApplicationFollowUp, updateApplicationFollowUp } from './applicationFollowUps';
const api = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), single: vi.fn(), read: vi.fn(), mutation: vi.fn(), eq: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  insert: (payload: unknown) => { api.insert(payload); return { select: () => ({ single: api.single }) }; },
  select: () => ({ eq: () => ({ maybeSingle: api.read }) }),
  update: (payload: unknown) => { api.update(payload); const chain = { eq: (...args: unknown[]) => { api.eq(...args); return chain; }, is: () => chain, select: () => ({ maybeSingle: api.mutation }) }; return chain; },
}) } }));
const input = { id: 'stable-id', applicationId: 'app', tenantId: 'staff-tenant', userId: 'staff', title: ' Check statement ', date: '' };
beforeEach(() => { vi.resetAllMocks(); api.single.mockResolvedValue({ data: { id: input.id }, error: null }); api.mutation.mockResolvedValue({ data: { id: input.id }, error: null }); });
describe('application follow-up persistence', () => {
  it('uses the staff tenant and assigns a real application task to its creator', async () => {
    await createApplicationFollowUp(input);
    expect(api.insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'stable-id', application_id: 'app', tenant_id: 'staff-tenant', assignee_id: 'staff', title: 'Check statement', status: 'open', due_at: null }));
  });
  it('recovers response loss only when the same task payload is readable', async () => {
    api.single.mockResolvedValue({ data: null, error: new Error('response lost') });
    api.read.mockResolvedValue({ data: { application_id: 'app', created_by: 'staff', title: 'Check statement', due_at: null }, error: null });
    await expect(createApplicationFollowUp(input)).resolves.toBeUndefined();
    api.read.mockResolvedValue({ data: { application_id: 'other-app' }, error: null });
    await expect(createApplicationFollowUp(input)).rejects.toThrow('response lost');
    expect(api.insert.mock.calls.map(c => c[0].id)).toEqual(['stable-id', 'stable-id']);
  });
  it('never reports success for a denied or missing insert', async () => {
    api.single.mockResolvedValue({ data: null, error: new Error('denied') });
    api.read.mockResolvedValue({ data: null, error: null });
    await expect(createApplicationFollowUp(input)).rejects.toThrow('denied');
    await expect(createApplicationFollowUp({ ...input, title: '' })).rejects.toThrow('next action');
  });
  it('scopes updates to the application and last version and detects zero-row writes', async () => {
    api.mutation.mockResolvedValue({ data: null, error: null });
    await expect(updateApplicationFollowUp({ id: 'task', applicationId: 'app', currentStatus: 'open', updatedAt: 'before', status: 'done' })).rejects.toThrow('changed');
    expect(api.eq.mock.calls).toEqual([['id', 'task'], ['application_id', 'app'], ['status', 'open'], ['updated_at', 'before']]);
  });
});
