/** Synthetic receipt HTTP + actual Auth/RLS acceptance. Never sends mail. */
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {startReceiptAdapter,RECEIPT_FIXTURE_KEY} from './receipt-handler-adapter.ts';
const url=process.env.STAGING_SUPABASE_URL,anon=process.env.STAGING_SUPABASE_ANON_KEY,key=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
if(!url||!anon||!key||process.env.EXPECTED_STAGING_PROJECT_REF!=='qazshxpvfbhlybkmmkaf'||new URL(url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Wrong disposable staging backend');
if(process.env.RESEND_API_KEY||process.env.STUDENT_EMAIL_ENABLED==='true')throw new Error('External providers must remain off');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const ids={tenants:[],users:[],students:[],messages:[]},sessions=[],results=[];
const run=randomUUID();let adapter;
const requireData=(r,label)=>{if(r.error)throw new Error(label);return r.data;};
const check=async(name,fn)=>{try{if(!await fn())throw new Error('assertion');results.push({name,pass:true});console.log('PASS '+name);}catch{results.push({name,pass:false});console.log('FAIL '+name);}};
async function actor(label,tenant,role){
 const email=`receipt.${label}.${run}@udx-test.invalid`,password=randomBytes(32).toString('base64url');
 const created=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Synthetic receipt fixture'}});
 if(created.error||!created.data.user)throw new Error('Synthetic Auth create failed');
 const id=created.data.user.id;ids.users.push(id);
 if(role==='admin')requireData(await db.from('user_roles').upsert({user_id:id,role},{onConflict:'user_id,role',ignoreDuplicates:true}),'trusted fixture grant');
 requireData(await db.from('profiles').update({tenant_id:tenant}).eq('id',id),'fixture scope');
 const student=requireData(await db.from('students').select('id').eq('profile_id',id).single(),'fixture student');ids.students.push(student.id);
 requireData(await db.from('students').update({tenant_id:tenant}).eq('id',student.id),'student scope');
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const signed=await auth.auth.signInWithPassword({email,password});if(signed.error||!signed.data.session)throw new Error('Real Auth sign-in failed');sessions.push(auth);
 const token=signed.data.session.access_token;
 return {id,email,studentId:student.id,token,api:createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}})};
}
const read=async id=>requireData(await db.from('student_communications').select('*').eq('id',id).single(),'audit read');
async function signedEvent(eventId,body,{seconds=Math.floor(Date.now()/1000),tamper=false,signature=true}={}){
 const raw=typeof body==='string'?body:JSON.stringify(body);
 const digest=createHmac('sha256',RECEIPT_FIXTURE_KEY).update(`${eventId}.${seconds}.${raw}`).digest('base64');
 const r=await fetch(adapter.origin+'/student-email-events',{method:'POST',headers:{'Content-Type':'application/json','svix-id':eventId,'svix-timestamp':String(seconds),...(signature?{'svix-signature':'v1,'+digest}:{})},body:raw+(tamper?' ':'')});
 return {code:r.status,body:await r.json().catch(()=>({}))};
}
try{
 const a=randomUUID(),b=randomUUID();ids.tenants.push(a,b);
 requireData(await db.from('tenants').insert([{id:a,slug:`receipt-a-${run}`},{id:b,slug:`receipt-b-${run}`}]),'test tenants');
 const admin=await actor('admin-a',a,'admin'),student=await actor('student-a',a,'student'),foreign=await actor('admin-b',b,'admin');
 adapter=await startReceiptAdapter({url,anon,key});
 const messageId=randomUUID(),wrongId=randomUUID();ids.messages.push(messageId,wrongId);
 requireData(await db.from('student_communications').insert([messageId,wrongId].map(id=>({id,tenant_id:a,student_id:student.studentId,author_id:admin.id,channel:'email',status:'pending',recipient:student.email,subject:'Synthetic acceptance only',body:'No email was sent',receipt_tagged:true}))), 'pending fixtures');
 const providerId=randomUUID(),eventId='synthetic-'+randomUUID();
 const event={type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:providerId,to:[student.email],tags:{unidoxia_communication:messageId}}};
 await check('Unsigned receipt cannot reach storage',async()=>{const r=await signedEvent(eventId,event,{signature:false});return r.code===401&&(await read(messageId)).delivery_status===null;});
 await check('Tampered raw bytes are rejected by the actual signature SDK',async()=>{const r=await signedEvent(eventId,event,{tamper:true});return r.code===401&&(await read(messageId)).provider_id===null;});
 await check('Stale signed replay is rejected',async()=>(await signedEvent(eventId,event,{seconds:Math.floor(Date.now()/1000)-600})).code===401);
 await check('Valid signed early receipt resolves the exact pending audit atomically',async()=>{const r=await signedEvent(eventId,event);const row=await read(messageId);return r.code===200&&row.provider_id===providerId&&row.status==='accepted'&&row.delivery_status==='delivered';});
 await check('Same signed receipt is deduplicated in real PostgreSQL',async()=>{const r=await signedEvent(eventId,event);const rows=requireData(await db.from('student_email_delivery_events').select('event_id').eq('event_id',eventId),'receipt read');return r.code===200&&r.body.status==='duplicate'&&rows.length===1;});
 await check('Receipt event-ID conflict cannot overwrite the delivery outcome',async()=>{const r=await signedEvent(eventId,{...event,type:'email.bounced'});return r.code===503&&(await read(messageId)).delivery_status==='delivered';});
 await check('A signed delay cannot erase confirmed delivery',async()=>{const r=await signedEvent('delay-'+randomUUID(),{...event,type:'email.delivery_delayed',created_at:new Date().toISOString()});return r.code===200&&(await read(messageId)).delivery_status==='delivered';});
 await check('Wrong recipient cannot relink another pending attempt',async()=>{const r=await signedEvent('wrong-'+randomUUID(),{...event,data:{email_id:randomUUID(),to:['other@test.invalid'],tags:{unidoxia_communication:wrongId}}});const row=await read(wrongId);return r.code===503&&row.provider_id===null&&row.status==='pending';});
 await check('Provider open tracking is ignored',async()=>(await signedEvent('open-'+randomUUID(),{...event,type:'email.opened'})).code===202);
 await check('Unrelated provider messages are not retained',async()=>{const id='unknown-'+randomUUID();const r=await signedEvent(id,{...event,data:{email_id:randomUUID()}});const rows=requireData(await db.from('student_email_delivery_events').select('event_id').eq('event_id',id),'ignored receipt check');return r.code===200&&r.body.status==='ignored'&&!rows.length;});
 await check('Authenticated clients cannot call the private receipt recorder',async()=>{const r=await admin.api.rpc('record_student_email_delivery_event',{p_event_id:'forged-'+randomUUID(),p_provider_id:providerId,p_event_type:'email.bounced',p_occurred_at:new Date().toISOString()});return Boolean(r.error)&&(await read(messageId)).delivery_status==='delivered';});
 await check('Authenticated clients cannot read raw private receipt metadata',async()=>Boolean((await admin.api.from('student_email_delivery_events').select('event_id')).error));
 await check('Other tenant cannot read the receipt-bearing communication',async()=>{const r=await foreign.api.from('student_communications').select('id').eq('id',messageId);return !r.error&&!r.data.length;});
 await check('Real staff-handler history exposes only its student delivery fields',async()=>{const r=await fetch(adapter.origin+'/student-communication',{method:'POST',headers:{'Content-Type':'application/json',apikey:anon,Authorization:`Bearer ${admin.token}`},body:JSON.stringify({action:'history',studentId:student.studentId})});const body=await r.json();return r.status===200&&body.rows.some(row=>row.id===messageId&&row.delivery_status==='delivered')&&body.rows.every(row=>row.student_id===student.studentId);});
 await check('New sender capabilities still keep outbound email off',async()=>{const r=await fetch(adapter.origin+'/student-communication',{method:'POST',headers:{'Content-Type':'application/json',apikey:anon,Authorization:`Bearer ${admin.token}`},body:JSON.stringify({action:'capabilities'})});const body=await r.json();return r.status===200&&body.emailEnabled===false;});
}catch{results.push({name:'Synthetic receipt acceptance setup completed',pass:false});console.log('FAIL Synthetic receipt acceptance setup completed');}
finally{
 let cleanupOk=true;
 for(const session of sessions)await session.auth.signOut({scope:'global'}).catch(()=>{});
 const remove=async(table,column,values)=>{if(values.length&&(await db.from(table).delete().in(column,values)).error)cleanupOk=false;};
 await remove('student_communications','student_id',ids.students);await remove('student_communications','id',ids.messages);
 await remove('students','profile_id',ids.users);await remove('agents','profile_id',ids.users);await remove('user_roles','user_id',ids.users);await remove('profiles','id',ids.users);
 for(const id of ids.users)if((await db.auth.admin.deleteUser(id)).error)cleanupOk=false;
 await remove('tenants','id',ids.tenants);
 for(const[table,column,values]of[['profiles','id',ids.users],['students','id',ids.students],['student_communications','id',ids.messages],['student_email_delivery_events','communication_id',ids.messages],['tenants','id',ids.tenants]]){if(!values.length)continue;const r=await db.from(table).select(column).in(column,values);if(r.error||r.data.length)cleanupOk=false;}
 await adapter?.stop();
 await writeFile(process.env.STAGING_RECEIPT_REPORT??'/tmp/unidoxia-staging-receipts.json',JSON.stringify({run,results,fixtureIds:ids,cleanupOk},null,2));
 console.log(`${cleanupOk?'PASS':'FAIL'} Exact synthetic fixture and receipt cleanup`);
 if(!cleanupOk||results.some(r=>!r.pass))process.exitCode=1;
}
