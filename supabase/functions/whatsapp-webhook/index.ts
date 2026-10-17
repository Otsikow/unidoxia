import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createWhatsAppWebhookHandler } from '../_shared/whatsappWebhookRequest.ts';
import { processWhatsAppPayload } from '../_shared/whatsappProcess.ts';
import { database, whatsappConfig } from '../_shared/whatsappRuntime.ts';
serve(createWhatsAppWebhookHandler({
  getSecret: () => Deno.env.get('WHATSAPP_APP_SECRET'),
  getVerifyToken: () => Deno.env.get('WHATSAPP_VERIFY_TOKEN'),
  process: payload => processWhatsAppPayload(database(), whatsappConfig(), payload, Deno.env.get('WHATSAPP_OPENING_HOURS')),
}));
