import assert from 'node:assert/strict';
import {assertAcceptanceTarget} from '../../docs/security/staging/acceptance-target.mjs';
const stage='https://qazshxpvfbhlybkmmkaf.supabase.co',local='http://127.0.0.1:54321';let count=0;
for(const [url,ref,mode]of[[stage,'qazshxpvfbhlybkmmkaf',undefined],[local,'local-ci-only','true']]){assert.doesNotThrow(()=>assertAcceptanceTarget(url,ref,mode));count++;}
for(const [url,ref,mode]of[
 [stage,'qazshxpvfbhlybkmmkaf','true'],[local,'local-ci-only',undefined],
 ['https://gbustuntgvmwkcttjojo.supabase.co','local-ci-only','true'],
 ['http://localhost:54321','local-ci-only','true'],['http://127.0.0.1:54322','local-ci-only','true'],
 ['https://127.0.0.1:54321','local-ci-only','true'],[local,'qazshxpvfbhlybkmmkaf','true'],
 ['http://user:password@127.0.0.1:54321','local-ci-only','true'],[local+'/extra','local-ci-only','true'],
 [local+'?target=production','local-ci-only','true'],[local+'#target','local-ci-only','true'],
 ['https://qazshxpvfbhlybkmmkaf.supabase.co.attacker.test','qazshxpvfbhlybkmmkaf',undefined],
 ['not-a-url','local-ci-only','true']
]){assert.throws(()=>assertAcceptanceTarget(url,ref,mode));count++;}
console.log(`PASS: ${count} acceptance target boundaries; production and ambiguous hosts denied.`);
