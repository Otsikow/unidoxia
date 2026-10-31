/** Disposable staging only: actual Auth sessions and Data API RPCs. Never sends email. */
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const url=process.env.STAGING_SUPABASE_URL,anon=process.env.STAGING_SUPABASE_ANON_KEY,key=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
if(!url||!anon||!key||process.env.EXPECTED_STAGING_PROJECT_REF!=='qazshxpvfbhlybkmmkaf'||new URL(url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Only isolated acceptance backend allowed');
if(process.env.RESEND_API_KEY||process.env.STUDENT_EMAIL_ENABLED==='true')throw new Error('Providers must remain off');
const client=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),sessions=[],results=[];
const run=randomUUID(),ids={tenants:[],users:[],probe:[]};
const requireData=(r,label)=>{if(r.error)throw new Error(label);return r.data;};
const check=async(name,fn)=>{try{if(!await fn())throw new Error('assertion');results.push({name,pass:true});console.log('PASS '+name);}catch{results.push({name,pass:false});console.log('FAIL '+name);}};
async function actor(label,tenant,role,active=true){
 const email=`workspace.${label}.${run}@udx-test.invalid`,password=randomBytes(32).toString('base64url');
 const created=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Synthetic workspace fixture',role:role==='partner'?'partner':'student'}});
 if(created.error||!created.data.user)throw new Error('Synthetic Auth create failed');
 const id=created.data.user.id;ids.users.push(id);
 if(role!=='student')requireData(await db.from('user_roles').upsert({user_id:id,role},{onConflict:'user_id,role',ignoreDuplicates:true}),'trusted role fixture');
 requireData(await db.from('profiles').update({tenant_id:tenant,active}).eq('id',id),'fixture profile');
 const auth=client(),signed=await auth.auth.signInWithPassword({email,password});if(signed.error||!signed.data.session)throw new Error('Actual sign-in failed');sessions.push(auth);
 return {id,api:createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${signed.data.session.access_token}`}}})};
}
const rpc=(actor,name,target)=>actor.api.rpc(name,{p_profile_id:target});
const denied=r=>r.error?.code==='42501';
const ownedTenant=async id=>requireData(await db.from('profiles').select('tenant_id').eq('id',id).single(),'fixture profile read').tenant_id;
try {
 const a=randomUUID(),b=randomUUID();ids.tenants.push(a,b);
 requireData(await db.from('tenants').insert([{id:a,slug:`unidoxia`},{id:b,slug:`workspace-b-${run}`}]),'fixture tenants');
 const owner=await actor('owner',a,'partner'),other=await actor('other',a,'partner'),foreign=await actor('foreign',b,'partner'),student=await actor('student',a,'student'),admin=await actor('admin',a,'admin'),inactive=await actor('inactive',a,'staff',false),inactivePartner=await actor('inactive-partner',a,'partner',false);
 const probe=randomUUID();ids.probe.push(probe);requireData(await db.from('partner_security_probe').insert({id:probe,run,body:'Synthetic private policy fixture'}),'probe fixture');
 await check('Student cannot isolate a partner',async()=>denied(await rpc(student,'isolate_partner_profile',owner.id)));
 await check('Student cannot inspect partner isolation status',async()=>denied(await rpc(student,'partner_needs_isolation',owner.id)));
 await check('Partner cannot move another same-tenant partner',async()=>denied(await rpc(owner,'isolate_partner_profile',other.id)));
 await check('Partner cannot inspect a foreign tenant',async()=>denied(await rpc(owner,'partner_needs_isolation',foreign.id)));
 await check('Inactive staff cannot move a partner',async()=>denied(await rpc(inactive,'isolate_partner_profile',owner.id)));
 await check('Inactive partner cannot move itself',async()=>denied(await rpc(inactivePartner,'isolate_partner_profile',inactivePartner.id)));
 await check('Anonymous caller cannot mutate partner workspace',async()=>denied(await client().rpc('isolate_partner_profile',{p_profile_id:owner.id})));
 await check('Internal permission guard is not exposed to authenticated callers',async()=>denied(await rpc(owner,'can_manage_partner_workspace',owner.id)));
 await check('Inactive staff loses legacy policy read access',async()=>{const r=await inactive.api.from('partner_security_probe').select('id').eq('id',probe);return !r.error&&r.data.length===0;});
 await check('Active admin retains existing legacy policy read access',async()=>{const r=await admin.api.from('partner_security_probe').select('id').eq('id',probe);return !r.error&&r.data.length===1;});
 await check('Owner can see its shared workspace needs isolation',async()=>{const r=await rpc(owner,'partner_needs_isolation',owner.id);return !r.error&&r.data===true;});
 let isolated;
 await check('Concurrent owner requests create exactly one workspace',async()=>{const rr=await Promise.all([rpc(owner,'isolate_partner_profile',owner.id),rpc(owner,'isolate_partner_profile',owner.id)]);for(const r of rr)if(!r.error&&r.data&&!ids.tenants.includes(r.data))ids.tenants.push(r.data);if(rr.some(r=>r.error)||!rr[0].data||rr[0].data!==rr[1].data)return false;isolated=rr[0].data;const universities=requireData(await db.from('universities').select('id').eq('tenant_id',isolated),'new university');return isolated!==a&&universities.length===1&&(await ownedTenant(owner.id))===isolated;});
 // Track any created tenant even if a concurrency assertion fails, for exact cleanup.
 const ownerTenant=await ownedTenant(owner.id);if(!ids.tenants.includes(ownerTenant))ids.tenants.push(ownerTenant);
 await check('Repeated owner call reuses the isolated workspace',async()=>{const r=await rpc(owner,'isolate_partner_profile',owner.id);return !r.error&&r.data===isolated;});
 await check('Dedicated owner workspace does not need isolation',async()=>{const r=await rpc(owner,'partner_needs_isolation',owner.id);return !r.error&&r.data===false;});
 await check('Administrator cannot move a foreign-tenant partner',async()=>denied(await rpc(admin,'isolate_partner_profile',owner.id)));
 await check('Same-tenant active administrator can isolate another partner',async()=>{const r=await rpc(admin,'isolate_partner_profile',other.id);if(!r.error&&r.data)ids.tenants.push(r.data);return !r.error&&r.data!==a;});
 const otherTenant=await ownedTenant(other.id);if(!ids.tenants.includes(otherTenant))ids.tenants.push(otherTenant);
 await check('Trusted service handles already dedicated workspace idempotently',async()=>{const r=await db.rpc('isolate_partner_profile',{p_profile_id:foreign.id});return !r.error&&r.data===b;});
 await check('Account deactivation takes effect for an already issued admin session',async()=>{requireData(await db.from('profiles').update({active:false}).eq('id',admin.id),'deactivate fixture');const r=await admin.api.from('partner_security_probe').select('id').eq('id',probe);return !r.error&&r.data.length===0;});
}finally{
 let cleanupOk=true;for(const auth of sessions)await auth.auth.signOut().catch(()=>{});
 const remove=async(table,column,values)=>{if(values.length&&(await db.from(table).delete().in(column,values)).error)cleanupOk=false;};
 await remove('partner_security_probe','id',ids.probe);await remove('universities','tenant_id',ids.tenants);
 await remove('students','profile_id',ids.users);await remove('agents','profile_id',ids.users);await remove('user_roles','user_id',ids.users);await remove('profiles','id',ids.users);
 for(const id of ids.users)if((await db.auth.admin.deleteUser(id)).error)cleanupOk=false;
 await remove('tenants','id',ids.tenants);
 for(const[table,column,values]of[['profiles','id',ids.users],['universities','tenant_id',ids.tenants],['partner_security_probe','id',ids.probe],['tenants','id',ids.tenants]]){if(!values.length)continue;const r=await db.from(table).select(column).in(column,values);if(r.error||r.data.length)cleanupOk=false;}
 await writeFile(process.env.STAGING_PARTNER_REPORT??'/tmp/unidoxia-staging-partner-security.json',JSON.stringify({run,results,fixtureIds:ids,cleanupOk},null,2));
 console.log(`${cleanupOk?'PASS':'FAIL'} Exact synthetic fixture cleanup`);
 if(!cleanupOk||results.some(r=>!r.pass))process.exitCode=1;
}
