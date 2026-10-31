/** Real Auth / Data API guard acceptance. Strict isolated backend; no payment or messaging provider. */
import {createClient} from '@supabase/supabase-js';import {randomUUID,randomBytes} from 'node:crypto';import {writeFile} from 'node:fs/promises';
const url=process.env.STAGING_SUPABASE_URL,key=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,anon=process.env.STAGING_SUPABASE_ANON_KEY;
if(!url||!key||!anon||process.env.EXPECTED_STAGING_PROJECT_REF!=='qazshxpvfbhlybkmmkaf'||new URL(url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Isolated backend required');
if(process.env.RESEND_API_KEY||process.env.STRIPE_SECRET_KEY||process.env.STUDENT_EMAIL_ENABLED==='true')throw new Error('No payment or sending providers allowed');
const boundedFetch=(input,init={})=>fetch(input,{...init,signal:AbortSignal.timeout(30000)});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedFetch}};
const db=createClient(url,key,options),ids={users:[],emails:[],tenants:[]},sessions=[],results=[],run=randomUUID();
const report=process.env.STAGING_BILLING_REPORT??'/tmp/unidoxia-billing-auth-report.json';
const checkpoint=()=>writeFile(report,JSON.stringify({run,results,fixtureIds:ids,cleanupOk:false},null,2));
const need=(r,label)=>{if(r.error)throw new Error(label);return r.data;};
const check=async(name,fn)=>{try{if(!await fn())throw new Error('assertion');results.push({name,pass:true});console.log('PASS '+name);}catch{results.push({name,pass:false});console.log('FAIL '+name);}await checkpoint();};
async function actor(label,tenant,admin=false){
 const email=`billing.${label}.${run}@udx-test.invalid`,password=randomBytes(32).toString('base64url');ids.emails.push(email);await checkpoint();
 const created=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Synthetic billing guard fixture'}});if(created.error||!created.data.user)throw new Error('Synthetic Auth create failed');
 const id=created.data.user.id;ids.users.push(id);await checkpoint();
 if(admin)need(await db.from('user_roles').upsert({user_id:id,role:'admin'},{onConflict:'user_id,role',ignoreDuplicates:true}),'trusted admin');
 need(await db.from('profiles').update({tenant_id:tenant}).eq('id',id),'profile scope');
 const student=need(await db.from('students').select('id').eq('profile_id',id).single(),'owned student');
 need(await db.from('students').update({tenant_id:tenant}).eq('id',student.id),'student scope');
 const auth=createClient(url,anon,options),signed=await auth.auth.signInWithPassword({email,password});if(signed.error||!signed.data.session)throw new Error('Real password sign-in failed');sessions.push(auth);
 return {id,student:student.id,tenant,api:createClient(url,anon,{...options,global:{...options.global,headers:{Authorization:`Bearer ${signed.data.session.access_token}`}}})};
}
const saved=async id=>need(await db.from('students').select('*').eq('id',id).single(),'readback');
try{
 const a=randomUUID(),b=randomUUID();ids.tenants.push(a,b);await checkpoint();need(await db.from('tenants').insert(ids.tenants.map((id,n)=>({id,name:'Synthetic billing tenant',slug:`billing-${n}-${run}`,email_from:'synthetic@udx-test.invalid'}))),'fixture tenants');
 const owner=await actor('owner',a),foreign=await actor('foreign',b),admin=await actor('admin',a,true),fresh=await actor('insert',a);
 await check('Ordinary owning-student profile edits still save',async()=>{const r=await owner.api.from('students').update({contact_phone:'synthetic-phone'}).eq('id',owner.student).select('id');return !r.error&&r.data.length===1&&(await saved(owner.student)).contact_phone==='synthetic-phone';});
 await check('Foreign student update remains isolated',async()=>{const r=await foreign.api.from('students').update({contact_phone:'foreign-change'}).eq('id',owner.student).select('id');return !r.error&&r.data.length===0&&(await saved(owner.student)).contact_phone==='synthetic-phone';});
 const changes={id:randomUUID(),profile_id:foreign.id,tenant_id:b,plan_type:'agent_supported',payment_type:'one_time',payment_date:'2026-10-31T12:00:00Z',payment_amount_cents:20000,payment_currency:'GBP',refund_eligibility:true,payment_confirmed_at:'2026-10-31T12:00:00Z',assigned_agent_id:randomUUID(),agent_assigned_at:'2026-10-31T12:00:00Z'};
 for(const[field,value]of Object.entries(changes))await check(`Owning student cannot change protected ${field}`,async()=>{const r=await owner.api.from('students').update({[field]:value}).eq('id',owner.student).select('id');return r.error?.code==='42501';});
 need(await db.from('students').delete().eq('id',fresh.student),'remove exact starter row for insertion acceptance');
 await check('Owning-student insertion cannot claim a paid plan',async()=>{const r=await fresh.api.from('students').insert({id:fresh.student,profile_id:fresh.id,tenant_id:a,plan_type:'agent_supported',payment_confirmed_at:new Date().toISOString()});return r.error?.code==='42501';});
 await check('Default free student insertion remains supported',async()=>{const r=await fresh.api.from('students').insert({id:fresh.student,profile_id:fresh.id,tenant_id:a}).select('id');return !r.error&&r.data.length===1;});
 await check('Trusted service can record a paid plan',async()=>{const r=await db.from('students').update({plan_type:'self_service',payment_amount_cents:4900,payment_confirmed_at:new Date().toISOString()}).eq('id',owner.student).select('id');return !r.error&&r.data.length===1;});
 await check('Existing legacy paid access survives an ordinary profile edit',async()=>{const r=await owner.api.from('students').update({contact_phone:'updated-phone'}).eq('id',owner.student);const data=await saved(owner.student);return !r.error&&data.plan_type==='self_service'&&data.payment_amount_cents===4900&&!!data.payment_confirmed_at;});
 await check('Current active staff retains authorised billing management',async()=>{const r=await admin.api.from('students').update({plan_type:'agent_supported',payment_amount_cents:20000}).eq('id',owner.student).select('id');return !r.error&&r.data.length===1&&(await saved(owner.student)).plan_type==='agent_supported';});
 need(await db.from('profiles').update({active:false}).eq('id',admin.id),'deactivate synthetic staff');
 await check('Deactivated staff token cannot alter its own billing',async()=>{const r=await admin.api.from('students').update({plan_type:'agent_supported'}).eq('id',admin.student);return r.error?.code==='42501';});
 await check('Anonymous client cannot alter student billing',async()=>{const r=await createClient(url,anon,options).from('students').update({plan_type:'agent_supported'}).eq('id',owner.student).select('id');return !!r.error||r.data.length===0;});
}finally{
 let cleanupOk=true;
 if(ids.emails.length){const list=await db.auth.admin.listUsers({page:1,perPage:1000});if(list.error)cleanupOk=false;else for(const u of list.data.users)if(ids.emails.includes(u.email)&&!ids.users.includes(u.id))ids.users.push(u.id);}
 for(const auth of sessions)await auth.auth.signOut().catch(()=>{});
 const remove=async(table,column,values)=>{if(values.length&&(await db.from(table).delete().in(column,values)).error)cleanupOk=false;};
 await remove('students','profile_id',ids.users);await remove('agents','profile_id',ids.users);await remove('user_roles','user_id',ids.users);await remove('profiles','id',ids.users);
 for(const id of ids.users)if((await db.auth.admin.deleteUser(id)).error)cleanupOk=false;
 await remove('tenants','id',ids.tenants);
 for(const[table,column,values]of[['students','profile_id',ids.users],['profiles','id',ids.users],['user_roles','user_id',ids.users],['tenants','id',ids.tenants]]){if(!values.length)continue;const r=await db.from(table).select(column).in(column,values);if(r.error||r.data.length)cleanupOk=false;}
 await writeFile(report,JSON.stringify({run,results,fixtureIds:ids,cleanupOk},null,2));console.log(`${cleanupOk?'PASS':'FAIL'} Exact synthetic account and row cleanup`);
 if(!cleanupOk||results.some(r=>!r.pass))process.exitCode=1;
}
