/** Real Auth / Data API guard acceptance. Strict isolated backend; no payment or messaging provider. */
import {createClient} from '@supabase/supabase-js';import {randomUUID,randomBytes} from 'node:crypto';import {writeFile} from 'node:fs/promises';
const url=process.env.STAGING_SUPABASE_URL,key=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,anon=process.env.STAGING_SUPABASE_ANON_KEY;
if(!url||!key||!anon||process.env.EXPECTED_STAGING_PROJECT_REF!=='qazshxpvfbhlybkmmkaf'||new URL(url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Isolated backend required');
if(process.env.RESEND_API_KEY||process.env.STRIPE_SECRET_KEY||process.env.STUDENT_EMAIL_ENABLED==='true')throw new Error('No payment or sending providers allowed');
const boundedFetch=(input,init={})=>fetch(input,{...init,signal:AbortSignal.timeout(30000)});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedFetch}};
const db=createClient(url,key,options),ids={users:[],emails:[],tenants:[],programs:[],applications:[]},sessions=[],results=[],run=randomUUID();
const report=process.env.STAGING_APPLICATION_REPORT??'/tmp/unidoxia-application-submission-report.json';
const checkpoint=()=>writeFile(report,JSON.stringify({run,results,fixtureIds:ids,cleanupOk:false},null,2));
const need=(r,label)=>{if(r.error)throw new Error(label);return r.data;};
const check=async(name,fn)=>{try{if(!await fn())throw new Error('assertion');results.push({name,pass:true});console.log('PASS '+name);}catch{results.push({name,pass:false});console.log('FAIL '+name);}await checkpoint();};
async function actor(label,tenant,admin=false){
 const email=`submission.${label}.${run}@udx-test.invalid`,password=randomBytes(32).toString('base64url');ids.emails.push(email);await checkpoint();
 const created=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Synthetic application fixture'}});if(created.error||!created.data.user)throw new Error('Synthetic Auth create failed');
 const id=created.data.user.id;ids.users.push(id);await checkpoint();
 if(admin)need(await db.from('user_roles').upsert({user_id:id,role:'admin'},{onConflict:'user_id,role',ignoreDuplicates:true}),'trusted admin');
 need(await db.from('profiles').update({tenant_id:tenant}).eq('id',id),'profile scope');
 const student=need(await db.from('students').select('id').eq('profile_id',id).single(),'owned student');
 need(await db.from('students').update({tenant_id:tenant}).eq('id',student.id),'student scope');
 const auth=createClient(url,anon,options),signed=await auth.auth.signInWithPassword({email,password});if(signed.error||!signed.data.session)throw new Error('Real password sign-in failed');sessions.push(auth);
 return {id,student:student.id,tenant,api:createClient(url,anon,{...options,global:{...options.global,headers:{Authorization:`Bearer ${signed.data.session.access_token}`}}})};
}
const saved=async id=>need(await db.from('applications').select('*').eq('id',id).single(),'application readback');
function payload(actor,program,tenant,extra={}){const id=randomUUID();ids.applications.push(id);return {id,student_id:actor.student,program_id:program,tenant_id:tenant,status:'submitted',submission_channel:'student_portal',...extra};}
const insert=async(actor,data)=>{await checkpoint();return actor.api.from('applications').insert(data).select('id');};
try{
 const a=randomUUID(),b=randomUUID(),u=randomUUID();ids.tenants.push(a,b,u);await checkpoint();need(await db.from('tenants').insert(ids.tenants.map((id,n)=>({id,name:'Synthetic submission tenant',slug:`submission-${n}-${run}`,email_from:'synthetic@udx-test.invalid'}))),'fixture tenants');
 const owner=await actor('owner',a),foreign=await actor('foreign',b),paid=await actor('paid',a),admin=await actor('reviewer',a,true);
 const program=randomUUID(),fallbackProgram=randomUUID();ids.programs.push(program,fallbackProgram);await checkpoint();need(await db.from('programs').insert([{id:program,tenant_id:u},{id:fallbackProgram,tenant_id:null}]),'fixture programmes');
 const left=payload(owner,program,u),right=payload(owner,program,u);await checkpoint();
 await check('Concurrent free submissions save exactly one application with one HTTP409 quota conflict',async()=>{
  const responses=await Promise.all([owner.api.from('applications').insert(left).select('id'),owner.api.from('applications').insert(right).select('id')]);
  const savedRows=need(await db.from('applications').select('id').eq('student_id',owner.student).neq('status','draft'),'concurrent readback');
  return responses.filter(r=>!r.error&&r.data.length===1).length===1&&responses.filter(r=>r.error?.code==='PT409'&&r.status===409).length===1&&savedRows.length===1;
 });
 await check('Another free submission remains blocked',async()=>{const r=await insert(owner,payload(owner,program,u));return r.error?.code==='PT409'&&r.status===409;});
 await check('Owning student cannot bypass the quota by editing its paid plan',async()=>{const r=await owner.api.from('students').update({plan_type:'agent_supported'}).eq('id',owner.student);return r.error?.code==='42501';});
 for(const status of['screening','unconditional_offer','enrolled',null])await check(`Owning student cannot create later-stage application ${status}`,async()=>{const r=await insert(owner,payload(owner,program,u,{status}));return r.error?.code==='42501';});
 for(const[field,value]of Object.entries({decision_json:{offer:'accepted'},fees_json:{paid:true},timeline_json:[{stage:'enrolled'}],internal_notes:'Staff-approved decision',agent_id:randomUUID()}))await check(`Owning student cannot forge ${field}`,async()=>{const r=await insert(owner,payload(owner,program,u,{[field]:value}));return r.error?.code==='42501';});
 await check('Draft cannot use an unrelated workspace',async()=>{const r=await insert(owner,payload(owner,program,a,{status:'draft'}));return r.error?.code==='42501';});
 const draft=payload(owner,fallbackProgram,a,{status:'draft',coursefinder_gate_exempt:true});
 await check('A free draft keeps programme fallback routing and representative profile-gate clamp',async()=>{const r=await insert(owner,draft);const row=!r.error?await saved(draft.id):null;return !r.error&&r.data.length===1&&row.tenant_id===a&&row.coursefinder_gate_exempt===false;});
 await check('Owning student can edit ordinary draft notes',async()=>{const r=await owner.api.from('applications').update({notes:'Updated synthetic draft'}).eq('id',draft.id).select('id');return !r.error&&r.data.length===1&&(await saved(draft.id)).notes==='Updated synthetic draft';});
 await check('Owning student cannot insert a decision through a draft edit',async()=>{const r=await owner.api.from('applications').update({decision_json:{offer:true}}).eq('id',draft.id);return r.error?.code==='42501';});
 await check('Foreign student cannot submit another student application',async()=>{const r=await insert(foreign,payload(owner,program,u));return r.error?.code==='42501';});
 need(await db.from('students').update({plan_type:'self_service',payment_amount_cents:4900}).eq('id',paid.student),'trusted legacy fixture plan');
 const paidLeft=payload(paid,program,u),paidRight=payload(paid,program,u);await checkpoint();
 await check('Existing paid plan retains multiple concurrent submissions',async()=>{const responses=await Promise.all([paid.api.from('applications').insert(paidLeft).select('id'),paid.api.from('applications').insert(paidRight).select('id')]);return responses.every(r=>!r.error&&r.data.length===1);});
 const authorised=payload(owner,program,u,{status:'enrolled',decision_json:{authorised:true}});await checkpoint();
 await check('Active authorised staff retains later-stage application operations',async()=>{const r=await admin.api.from('applications').insert(authorised).select('id');return !r.error&&r.data.length===1&&(await saved(authorised.id)).status==='enrolled';});
 need(await db.from('students').update({fixture_submission_consent:false}).eq('id',owner.student),'synthetic consent missing');
 await check('Representative existing consent gate still blocks submission',async()=>{const r=await insert(owner,payload(owner,program,u));return r.error?.code==='23514';});
 need(await db.from('students').update({fixture_submission_consent:true}).eq('id',owner.student),'restore synthetic consent');
 need(await db.from('profiles').update({active:false}).eq('id',admin.id),'deactivate synthetic administrator');
 await check('Deactivated staff token cannot use its owning-student insertion path',async()=>{const r=await insert(admin,payload(admin,program,u,{status:'draft'}));return r.error?.code==='42501';});
 need(await db.from('profiles').update({active:false}).eq('id',owner.id),'deactivate synthetic owner');
 await check('Inactive owner token cannot create a new draft',async()=>{const r=await insert(owner,payload(owner,program,u,{status:'draft'}));return r.error?.code==='42501';});
 const anonymousPayload=payload(foreign,program,u);await checkpoint();
 await check('Anonymous submission remains denied',async()=>!!(await createClient(url,anon,options).from('applications').insert(anonymousPayload)).error);
}finally{
 let cleanupOk=true;
 if(ids.emails.length){const list=await db.auth.admin.listUsers({page:1,perPage:1000});if(list.error)cleanupOk=false;else for(const user of list.data.users)if(ids.emails.includes(user.email)&&!ids.users.includes(user.id))ids.users.push(user.id);}
 for(const auth of sessions)await auth.auth.signOut().catch(()=>{});
 const remove=async(table,column,values)=>{if(values.length&&(await db.from(table).delete().in(column,values)).error)cleanupOk=false;};
 await remove('applications','id',ids.applications);await remove('programs','id',ids.programs);
 await remove('students','profile_id',ids.users);await remove('agents','profile_id',ids.users);await remove('user_roles','user_id',ids.users);await remove('profiles','id',ids.users);
 for(const id of ids.users)if((await db.auth.admin.deleteUser(id)).error)cleanupOk=false;
 await remove('tenants','id',ids.tenants);
 for(const[table,column,values]of[['applications','id',ids.applications],['programs','id',ids.programs],['students','profile_id',ids.users],['profiles','id',ids.users],['user_roles','user_id',ids.users],['tenants','id',ids.tenants]]){if(!values.length)continue;const r=await db.from(table).select(column).in(column,values);if(r.error||r.data.length)cleanupOk=false;}
 await writeFile(report,JSON.stringify({run,results,fixtureIds:ids,cleanupOk},null,2));console.log(`${cleanupOk?'PASS':'FAIL'} Exact synthetic account and application cleanup`);
 if(!cleanupOk||results.some(r=>!r.pass))process.exitCode=1;
}
