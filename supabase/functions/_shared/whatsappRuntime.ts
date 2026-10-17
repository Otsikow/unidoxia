import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import type { WhatsAppConfig } from './whatsappSend.ts';

export function whatsappConfig(): WhatsAppConfig {
  return {
    enabled: Deno.env.get('WHATSAPP_ASSISTANT_ENABLED'), provider: Deno.env.get('WHATSAPP_PROVIDER'),
    accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN'), phoneNumberId: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'),
  };
}
export const database = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
export { checked, notifyHandover } from './whatsappStore.ts';
