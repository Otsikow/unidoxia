import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { database } from '../_shared/whatsappRuntime.ts';
import { createZoeHandoffHandler } from '../_shared/zoeHandoff.ts';
serve(createZoeHandoffHandler(database(), Deno.env.get('ZOE_HANDOFF_IP_SALT')));
