import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { whatsappConfig } from '../_shared/whatsappRuntime.ts';
import { isWhatsAppEnabled } from '../_shared/whatsappSend.ts';
import { whatsappCors } from '../_shared/whatsappReplyHandler.ts';
// Public readiness boolean only. No identifiers, secrets or database contents.
serve(req => new Response(req.method === 'OPTIONS' ? null : JSON.stringify({ enabled: isWhatsAppEnabled(whatsappConfig()) }), {
  headers: { ...whatsappCors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
}));
