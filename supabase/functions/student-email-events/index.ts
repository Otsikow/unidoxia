import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';
import { createStudentEmailEventHandler, recordStudentEmailReceipt } from '../_shared/studentEmailEventHandler.ts';
import { verifyStudentEmailEvent } from './signature.ts';
const secret=Deno.env.get('STUDENT_EMAIL_WEBHOOK_SECRET');
Deno.serve(createStudentEmailEventHandler({
  enabled:Deno.env.get('STUDENT_EMAIL_EVENTS_ENABLED')==='true' && Boolean(secret),
  verify:(raw,headers)=>verifyStudentEmailEvent(secret!,raw,headers),
  record:async event=>{
    const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!key)throw new Error('Receipt service unavailable');
    const db=createClient(url,key,{auth:{persistSession:false}});
    return recordStudentEmailReceipt(db,event);
  },
}));
