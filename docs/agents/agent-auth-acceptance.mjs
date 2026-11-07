// Actual Auth/Data API/Storage acceptance: only the disposable localhost CI stack.
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {assertAcceptanceTarget} from '../security/staging/acceptance-target.mjs';
const url=process.env.STAGING_SUPABASE_URL,key=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,anon=process.env.STAGING_SUPABASE_ANON_KEY;
assertAcceptanceTarget(url,process.env.EXPECTED_STAGING_PROJECT_REF,process.env.UNIDOXIA_LOCAL_ACCEPTANCE);
if(process.env.UNIDOXIA_LOCAL_ACCEPTANCE!=='true'||process.env.RESEND_API_KEY||process.env.STRIPE_SECRET_KEY)throw Error('Provider-free localhost only');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,key,opts),users=[],objects=[],sessions=[];
let passes=0;
const data=(r,label)=>{if(r.error)throw Error(`${label}: ${r.error.code||r.error.status||'failed'}`);return r.data;};
const check=(ok,label)=>{if(!ok)throw Error(label);console.log(`PASS ${++passes}: ${label}`);};
async function actor(role,tenant='00000000-0000-0000-0000-000000000001',trusted=false){
 const email=`agent-${randomUUID()}@udx-test.invalid`,password=randomBytes(24).toString('hex');
 const api=createClient(url,anon,opts);sessions.push(api);
 const signup=trusted
  ? data(await service.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{role},user_metadata:{full_name:'Synthetic reviewer'}}),'trusted local reviewer')
  : data(await api.auth.signUp({email,password,options:{data:{role,full_name:'Synthetic agent',username:`agent_${randomUUID().replaceAll('-','')}`}}}),'public signup');
 const id=signup.user?.id;if(!id)throw Error('No Auth user');users.push(id);
 data(await service.auth.admin.updateUserById(id,{email_confirm:true}),'confirm local account');
 data(await service.from('profiles').update({tenant_id:tenant}).eq('id',id),'scope fixture');
 if(role==='agent')data(await service.from('agents').update({tenant_id:tenant}).eq('profile_id',id),'scope agent');
 data(await api.auth.signInWithPassword({email,password}),'password login');
 return {api,id};
}
try{
 const a=await actor('agent'),b=await actor('agent'),student=await actor('student');
 const reviewer=await actor('staff','00000000-0000-0000-0000-000000000001',true);
 const foreign=await actor('staff','00000000-0000-0000-0000-000000000002',true);
 const row=data(await a.api.from('agents').select('*').eq('profile_id',a.id).single(),'agent row');
 check(row.verification_status==='pending'&&row.username&&row.team_invite_code,'real signup creates complete pending agent');
 check(data(await a.api.from('agents').update({company_name:'Synthetic agency'}).eq('id',row.id).select('id'),'save agency').length===1,'existing agent update saves');
 check(data(await b.api.from('agents').update({company_name:'forbidden'}).eq('id',row.id).select('id'),'foreign update').length===0,'other agent cannot update agency');
 const blocked=await a.api.from('agents').update({verification_status:'approved',commission_rate_l1:99}).eq('id',row.id);
 check(!!blocked.error,'self approval and commission manipulation rejected');
 data(await service.from('agents').delete().eq('profile_id',b.id),'simulate missing row');
 check(data(await b.api.from('agents').insert({profile_id:b.id,tenant_id:'00000000-0000-0000-0000-000000000001'}).select('id'),'repair').length===1,'agent repairs missing record');
 check(!!(await student.api.from('agents').insert({profile_id:student.id,tenant_id:'00000000-0000-0000-0000-000000000001'})).error,'student cannot create an agent');
 const path=`${a.id}/${randomUUID()}.pdf`,body=Buffer.from('%PDF-1.4\nSynthetic disposable agent certificate\n%%EOF');objects.push(path);
 data(await a.api.storage.from('agent-documents').upload(path,body,{contentType:'application/pdf'}),'private upload');
 const downloaded=data(await a.api.storage.from('agent-documents').download(path),'owner download');
 check(Buffer.from(await downloaded.arrayBuffer()).equals(body),'uploaded file round trips byte for byte');
 check(!!(await b.api.storage.from('agent-documents').download(path)).error,'other agent cannot download file');
 check(!!(await foreign.api.storage.from('agent-documents').download(path)).error,'foreign tenant reviewer cannot download file');
 check(data(await reviewer.api.rpc('is_admin_or_staff',{user_id:reviewer.id}),'reviewer role helper')===true,'reviewer has trusted active staff role');
 check(data(await reviewer.api.rpc('get_user_tenant',{user_id:reviewer.id}),'reviewer tenant helper')===row.tenant_id,'reviewer tenant matches agent tenant');
 check(data(await reviewer.api.from('agents').select('id').eq('id',row.id),'reviewer agent read').length===1,'reviewer can read agent record');
 const reviewDownload=await reviewer.api.storage.from('agent-documents').download(path);
 if(reviewDownload.error)console.log('Reviewer download diagnostic:',reviewDownload.error.statusCode,reviewDownload.error.message);
 check(!reviewDownload.error,'same tenant reviewer can download file');
 const signed=data(await a.api.storage.from('agent-documents').createSignedUrl(path,60),'signed link');
 const response=await fetch(signed.signedUrl);check(response.ok&&Buffer.from(await response.arrayBuffer()).equals(body),'short lived signed link serves exact uploaded file');
 data(await service.from('agents').update({verification_status:'approved'}).eq('id',row.id),'review fixture');
 data(await a.api.from('agents').update({verification_document_url:`agent-documents/${path}`}).eq('id',row.id),'link certificate');
 check(data(await a.api.from('agents').select('verification_status').eq('id',row.id).single(),'review status').verification_status==='pending','certificate replacement requires review');
 await a.api.storage.from('agent-documents').remove([path]);
 check(!(await a.api.storage.from('agent-documents').download(path)).error,'linked certificate survives owner cleanup');
 const raw=await fetch(`${url}/storage/v1/object/public/agent-documents/${path}`);check(!raw.ok,'certificate is not publicly accessible');
 data(await service.from('profiles').update({active:false}).eq('id',a.id),'inactive fixture');
 check(!!(await a.api.storage.from('agent-documents').download(path)).error,'inactive owner cannot download private certificate');
 console.log(`${passes} actual Auth/Data API/Storage checks passed; representative localhost backend only.`);
}finally{
 for(const api of sessions)await api.auth.signOut();
 if(objects.length)data(await service.storage.from('agent-documents').remove(objects),'cleanup files');
 for(const id of users)data(await service.auth.admin.deleteUser(id),'cleanup auth');
}
