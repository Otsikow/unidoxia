import { supabase } from '@/integrations/supabase/client';
import type { ApplicationProfileGate } from '@/lib/coursefinderProfile';

/**
 * Asks the server whether an application can move on (the same rule the
 * enforce_application_profile_gate trigger applies).
 */
export const fetchApplicationProfileGate = async (applicationId: string): Promise<ApplicationProfileGate> => {
  const { data, error } = await supabase.rpc('application_profile_gate_status', { p_application_id: applicationId });
  if (error) throw error;
  return (data ?? {}) as ApplicationProfileGate;
};

/** Records an admin override with its reason. The server logs who and when. */
export const overrideApplicationProfileGate = async (applicationId: string, reason: string) => {
  const { error } = await supabase.rpc('override_application_profile_gate', {
    p_application_id: applicationId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
};
