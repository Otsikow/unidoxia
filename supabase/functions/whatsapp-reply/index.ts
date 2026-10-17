import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { database, whatsappConfig } from '../_shared/whatsappRuntime.ts';
import { createWhatsAppReplyHandler } from '../_shared/whatsappReplyHandler.ts';
serve(req => createWhatsAppReplyHandler(database(), whatsappConfig())(req));
