import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

import { fetchApplicationProfileGate, overrideApplicationProfileGate } from './applicationProfileGate';

describe('applicationProfileGate', () => {
  beforeEach(() => rpc.mockReset());

  it('asks the server for the gate status', async () => {
    rpc.mockResolvedValue({ data: { exempt: false, overridden: false, missing_count: 4 }, error: null });
    await expect(fetchApplicationProfileGate('app-1')).resolves.toEqual({ exempt: false, overridden: false, missing_count: 4 });
    expect(rpc).toHaveBeenCalledWith('application_profile_gate_status', { p_application_id: 'app-1' });
  });

  it('logs an override with the trimmed reason', async () => {
    rpc.mockResolvedValue({ data: 'override-1', error: null });
    await overrideApplicationProfileGate('app-1', '  Passport renewal in progress  ');
    expect(rpc).toHaveBeenCalledWith('override_application_profile_gate', { p_application_id: 'app-1', p_reason: 'Passport renewal in progress' });
  });

  it('surfaces a refused override', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Only admins can override the profile check.' } });
    await expect(overrideApplicationProfileGate('app-1', 'Passport renewal in progress')).rejects.toBeTruthy();
  });
});
