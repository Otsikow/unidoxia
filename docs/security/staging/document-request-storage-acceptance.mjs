/** Actual Auth + private Storage acceptance. Synthetic bytes only; strict test-backend guard. */
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const url=process.env.STAGING_SUPABASE_URL,anon=process.env.STAGING_SUPABASE_ANON_KEY,key=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
if(!url||!anon||!key||process.env.EXPECTED_STAGING_PROJECT_REF!=='qazshxpvfbhlybkmmkaf'||new URL(url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Only isolated Storage acceptance backend allowed');
if(process.env.RESEND_API_KEY||process.env.STUDENT_EMAIL_ENABLED==='true')throw new Error('External messaging must remain off');
const options={auth:{persistSession:false,autoRefreshToken:false}},db=createClient(url,key,options),sessions=[],results=[];
const ids={tenants:[],users:[],students:[],universities:[],programs:[],applications:[],documents:[],requests:[],objects:[]};
let createdBucket=false;const bucket='application-documents',run=randomUUID();
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const need=(r,label)=>{if(r.error)throw new Error(label);return r.data;};
const check=async(name,fn)=>{try{if(!await fn())throw new Error('assertion');results.push({name,pass:true});console.log('PASS '+name);}catch{results.push({name,pass:false});console.log('FAIL '+name);}};
const client=()=>createClient(url,anon,options);
async function actor(label,tenant,role='student'){
 const email=`request.${label}.${run}@udx-test.invalid`,password=randomBytes(32).toString('base64url');
 const created=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Synthetic request fixture'}});
 if(created.error||!created.data.user)throw new Error('Synthetic account create failed');
 const id=created.data.user.id;ids.users.push(id);
 if(role!=='student')need(await db.from('user_roles').upsert({user_id:id,role},{onConflict:'user_id,role',ignoreDuplicates:true}),'trusted role');
 need(await db.from('profiles').update({tenant_id:tenant}).eq('id',id),'profile scope');
 const student=need(await db.from('students').select('id').eq('profile_id',id).single(),'student fixture');ids.students.push(student.id);
 need(await db.from('students').update({tenant_id:tenant}).eq('id',student.id),'student scope');
 const auth=client(),signed=await auth.auth.signInWithPassword({email,password});if(signed.error||!signed.data.session)throw new Error('Actual Auth sign-in failed');sessions.push(auth);
 return {id,student:student.id,tenant,api:createClient(url,anon,{...options,global:{headers:{Authorization:`Bearer ${signed.data.session.access_token}`}}})};
}
const read=async id=>need(await db.from('document_requests').select('*').eq('id',id).single(),'request read');
async function fixture(actor,application,type='transcript',tenant=actor.tenant){
 const request=randomUUID(),document=randomUUID(),path=`${application}/${type==='passport_photo'?'passport_photo':'transcript'}_${randomUUID()}.png`;
 ids.requests.push(request);ids.documents.push(document);ids.objects.push(path);
 need(await actor.api.storage.from(bucket).upload(path,bytes,{contentType:'image/png',upsert:false}),'actual private upload');
 need(await actor.api.from('application_documents').insert({id:document,application_id:application,document_type:type==='passport_photo'?'other':'transcript',storage_path:path,mime_type:'image/png',file_size:bytes.length,verified:false}),'document row');
 need(await db.from('document_requests').insert({id:request,tenant_id:tenant,student_id:actor.student,document_type:type,status:'pending',notes:'Synthetic staff instructions'}),'request fixture');
 return {request,document,path,version:(await read(request)).updated_at};
}
const submit=(actor,item,version=item.version)=>actor.api.rpc('submit_student_document_request',{p_request_id:item.request,p_document_id:item.document,p_expected_updated_at:version});
try{
 const existing=await db.storage.getBucket(bucket);if(existing.error){need(await db.storage.createBucket(bucket,{public:false,fileSizeLimit:10485760,allowedMimeTypes:['image/png','application/pdf']}),'private fixture bucket');createdBucket=true;}else if(existing.data.public)throw new Error('Test bucket must be private');
 const a=randomUUID(),b=randomUUID(),u=randomUUID();ids.tenants.push(a,b,u);need(await db.from('tenants').insert(ids.tenants.map((id,n)=>({id,slug:`requests-${n}-${run}`,name:'Synthetic request tenant',email_from:'synthetic@udx-test.invalid'}))),'test tenants');
 const alice=await actor('owner',a),bob=await actor('foreign',b),admin=await actor('reviewer',a,'admin');
 const university=randomUUID(),program=randomUUID();ids.universities.push(university);ids.programs.push(program);
 need(await db.from('universities').insert({id:university,tenant_id:u,name:'Synthetic request university',country:'Test',active:true}),'test university');need(await db.from('programs').insert({id:program,university_id:university}),'test program');
 const appA=randomUUID(),appB=randomUUID();ids.applications.push(appA,appB);need(await db.from('applications').insert([{id:appA,tenant_id:a,student_id:alice.student,program_id:program},{id:appB,tenant_id:b,student_id:bob.student,program_id:program}]),'test applications');
 const normal=await fixture(alice,appA),universityRequest=await fixture(alice,appA,'transcript',u),reviewed=await fixture(alice,appA),inactive=await fixture(alice,appA),missing=await fixture(alice,appA),mismatch=await fixture(alice,appA),photo=await fixture(alice,appA,'passport_photo'),foreignDoc=await fixture(bob,appB);
 await check('Student cannot bypass the server with a direct request update',async()=>{const r=await alice.api.from('document_requests').update({status:'approved'}).eq('id',normal.request).select('id');return !r.error&&r.data.length===0&&(await read(normal.request)).status==='pending';});
 await check('Anonymous submission is denied',async()=>{const r=await client().rpc('submit_student_document_request',{p_request_id:normal.request,p_document_id:normal.document,p_expected_updated_at:normal.version});return !!r.error;});
 await check('Foreign student cannot submit another student request',async()=>!!(await submit(bob,normal)).error);
 await check('Administrator has no student-owner RPC override',async()=>!!(await submit(admin,normal)).error);
 await check('Foreign application document cannot be linked to an owned request',async()=>!!(await submit(alice,{...normal,document:foreignDoc.document})).error);
 await check('Foreign student cannot download private uploaded bytes',async()=>!!(await bob.api.storage.from(bucket).download(normal.path)).error);
 await check('Concurrent receipts resolve one saved file and request',async()=>{const rr=await Promise.all([submit(alice,normal),submit(alice,normal)]);return rr.every(r=>!r.error&&r.data.id===normal.request&&r.data.status==='received'&&r.data.storage_path===normal.path);});
 const received=await read(normal.request);
 await check('Received status is not document verification or staff approval',async()=>{const d=need(await db.from('application_documents').select('verified').eq('id',normal.document).single(),'verification read');return received.status==='received'&&!d.verified&&!received.reviewed_by&&received.notes==='Synthetic staff instructions';});
 await check('A lost-response retry keeps the same receipt timestamp',async()=>{const r=await submit(alice,normal);return !r.error&&(await read(normal.request)).updated_at===received.updated_at;});
 await check('Received file opens via the owning student private signed URL',async()=>{const signed=await alice.api.storage.from(bucket).createSignedUrl(received.storage_path,60);if(signed.error||!signed.data?.signedUrl)return false;const r=await fetch(signed.data.signedUrl);const data=Buffer.from(await r.arrayBuffer());return r.ok&&data.equals(bytes);});
 await check('The same object is not publicly downloadable',async()=>{const publicUrl=alice.api.storage.from(bucket).getPublicUrl(normal.path).data.publicUrl;return !(await fetch(publicUrl)).ok;});
 await check('An associated university-tenant request is supported',async()=>{const r=await submit(alice,universityRequest);return !r.error&&r.data.status==='received';});
 need(await admin.api.from('document_requests').update({status:'approved',reviewed_by:admin.id,reviewed_at:new Date().toISOString()}).eq('id',reviewed.request),'real staff fixture review');
 await check('A staff-approved request cannot be overwritten by a student upload',async()=>{const r=await submit(alice,reviewed);return !!r.error&&(await read(reviewed.request)).status==='approved';});
 await check('A request changed by staff requires refresh',async()=>{need(await admin.api.from('document_requests').update({notes:'Changed synthetic instruction'}).eq('id',mismatch.request),'changed request');const r=await submit(alice,mismatch);return !!r.error&&(await read(mismatch.request)).status==='pending';});
 need(await db.storage.from(bucket).remove([missing.path]),'remove exact missing-object fixture');
 await check('A database file row without real private Storage bytes is rejected',async()=>!!(await submit(alice,missing)).error);
 await check('Passport-photo mapping uses a dedicated saved photo file',async()=>{const r=await submit(alice,photo);return !r.error&&r.data.status==='received';});
 need(await db.from('profiles').update({active:false}).eq('id',alice.id),'deactivate synthetic owner');
 await check('Deactivation denies submission with an already issued token',async()=>!!(await submit(alice,inactive)).error);
}finally{
 let cleanupOk=true;for(const auth of sessions)await auth.auth.signOut().catch(()=>{});
 if(ids.objects.length&&(await db.storage.from(bucket).remove(ids.objects)).error)cleanupOk=false;
 const remove=async(table,column,values)=>{if(values.length&&(await db.from(table).delete().in(column,values)).error)cleanupOk=false;};
 await remove('document_requests','id',ids.requests);await remove('application_documents','id',ids.documents);await remove('applications','id',ids.applications);await remove('programs','id',ids.programs);await remove('universities','id',ids.universities);
 await remove('students','profile_id',ids.users);await remove('agents','profile_id',ids.users);await remove('user_roles','user_id',ids.users);await remove('profiles','id',ids.users);
 for(const id of ids.users)if((await db.auth.admin.deleteUser(id)).error)cleanupOk=false;
 await remove('tenants','id',ids.tenants);
 if(createdBucket&&(await db.storage.deleteBucket(bucket)).error)cleanupOk=false;
 for(const[table,column,values]of[['document_requests','id',ids.requests],['application_documents','id',ids.documents],['profiles','id',ids.users],['applications','id',ids.applications],['tenants','id',ids.tenants]]){if(!values.length)continue;const r=await db.from(table).select(column).in(column,values);if(r.error||r.data.length)cleanupOk=false;}
 await writeFile(process.env.STAGING_REQUEST_REPORT??'/tmp/unidoxia-request-storage-report.json',JSON.stringify({run,results,fixtureIds:ids,createdBucket,cleanupOk},null,2));
 console.log(`${cleanupOk?'PASS':'FAIL'} Exact synthetic account, row, bucket and Storage object cleanup`);
 if(!cleanupOk||results.some(r=>!r.pass))process.exitCode=1;
}
