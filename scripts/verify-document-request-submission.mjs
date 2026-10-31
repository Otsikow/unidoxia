import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const module=process.env.COMMUNICATION_PGLITE_MODULE;if(!module)throw new Error('Use the isolated PGlite module; no production connection is allowed.');
const {PGlite}=await import(pathToFileURL(module).href);const db=new PGlite();let checks=0;
const id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const actor=id(1),foreign=id(2),inactive=id(3),tenant=id(10),universityTenant=id(11),foreignTenant=id(12),student=id(20),foreignStudent=id(21),application=id(30),foreignApplication=id(31),program=id(40),university=id(41);
const expected='2026-10-31T10:00:00.000Z';
const sql=await readFile(new URL('../supabase/migrations/20261031142407_receive_student_document_request.sql',import.meta.url),'utf8');
const ok=(value,label)=>{assert.ok(value,label);checks++;};
async function as(user,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec(`set role ${role}`);}
const submit=async(n,doc=n,version=expected)=>(await db.query('select public.submit_student_document_request($1,$2,$3) as result',[id(100+n),id(200+doc),version])).rows[0].result;
const row=async n=>{await db.exec('reset role');return (await db.query('select *,updated_at::text as updated_version from document_requests where id=$1',[id(100+n)])).rows[0];};
async function rejects(action,code,label){await assert.rejects(action,e=>e.code===code);checks++;}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;
 create type document_type as enum('passport','transcript','ielts','toefl','sop','cv','lor','portfolio','other');
 create table profiles(id uuid primary key,active boolean);create table students(id uuid primary key,profile_id uuid,tenant_id uuid);
 create table universities(id uuid primary key,tenant_id uuid);create table programs(id uuid primary key,university_id uuid);
 create table applications(id uuid primary key,tenant_id uuid,student_id uuid,program_id uuid);
 create table application_documents(id uuid primary key,application_id uuid,document_type document_type,storage_path text,mime_type text,file_size int,verified boolean default false);
 create table document_requests(id uuid primary key,tenant_id uuid,student_id uuid,document_type text,status text check(status in('pending','submitted','received','approved','rejected')),storage_path text,document_url text,file_url text,uploaded_file_url text,submitted_at timestamptz,reviewed_at timestamptz,reviewed_by uuid,updated_at timestamptz,notes text);
 create function request_updated_at() returns trigger language plpgsql as $$begin new.updated_at:=now();return new;end$$;
 create trigger update_document_requests_updated_at before update on document_requests for each row execute function request_updated_at();
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
 alter table document_requests enable row level security;grant select,update on document_requests to authenticated;
 create policy owner_read on document_requests for select to authenticated using(student_id in(select id from students where profile_id=auth.uid()));grant select on students to authenticated;`);
 await db.query('insert into profiles values($1,true),($2,true),($3,false)',[actor,foreign,inactive]);
 await db.query('insert into students values($1,$2,$3),($4,$5,$6)',[student,actor,tenant,foreignStudent,foreign,foreignTenant]);
 await db.query('insert into universities values($1,$2)',[university,universityTenant]);await db.query('insert into programs values($1,$2)',[program,university]);
 await db.query('insert into applications values($1,$2,$3,$4),($5,$6,$7,$4)',[application,tenant,student,program,foreignApplication,foreignTenant,foreignStudent]);
 for(let n=1;n<=14;n++){
  await db.query("insert into document_requests values($1,$2,$3,'transcript','pending',null,'https://old.invalid',null,null,null,null,null,$4,'Staff instructions')",[id(100+n),tenant,student,expected]);
  await db.query("insert into application_documents values($1,$2,'transcript',$3,'application/pdf',10,false)",[id(200+n),application,`${application}/transcript_${id(200+n)}.pdf`]);
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('application-documents',$1,'{\"size\":10}')",[`${application}/transcript_${id(200+n)}.pdf`]);
 }
 await db.query("update document_requests set tenant_id=$1 where id=$2",[universityTenant,id(102)]);
 await db.exec(sql);await as(actor);
 ok((await db.query("update document_requests set status='approved' returning id")).rows.length===0,'Student still cannot directly update request status');
 ok((await submit(1)).status==='received','Owned student-level request received');
 const received=await row(1);ok(received.document_url===null&&received.submitted_at&&received.notes==='Staff instructions','Private path linked and staff instructions preserved');
 ok((await db.query('select verified from application_documents where id=$1',[id(201)])).rows[0].verified===false,'Receipt does not verify the document');
 await as(actor);ok((await submit(1)).status==='received','Lost-response retry is idempotent despite version changing');
 const uniVersion=(await row(2)).updated_version;await as(actor);ok((await submit(2,2,uniVersion)).status==='received','Valid university-workspace request supported across student/university tenants');
 await as(foreign);await rejects(()=>submit(3),'42501','Foreign student denied');
 await as(null,'anon');await rejects(()=>submit(3),'42501','Anonymous execution denied');
 await as(null,'service_role');await rejects(()=>submit(3),'42501','Server key is not an owner override');
 await db.exec('reset role');await db.query('update profiles set active=false where id=$1',[actor]);await as(actor);await rejects(()=>submit(3),'42501','Inactive student denied');
 await db.exec('reset role');await db.query('update profiles set active=true where id=$1',[actor]);await as(actor);await rejects(()=>submit(3,3,'2026-10-30T00:00:00Z'),'40001','Stale request version denied');
 await db.exec('reset role');await db.query('update application_documents set application_id=$1,storage_path=$2 where id=$3',[foreignApplication,`${foreignApplication}/transcript.pdf`,id(204)]);await as(actor);await rejects(()=>submit(4),'42501','Foreign application document denied');
 await db.exec('reset role');await db.query('update document_requests set tenant_id=$1 where id=$2',[foreignTenant,id(105)]);await as(actor);await rejects(()=>submit(5),'42501','Unrelated requesting tenant denied');
 await db.exec('reset role');await db.query("update application_documents set storage_path='another/path' where id=$1",[id(206)]);await as(actor);await rejects(()=>submit(6),'22023','Cross-path file reference denied');
 await db.exec('reset role');await db.query("update application_documents set document_type='cv' where id=$1",[id(207)]);await as(actor);await rejects(()=>submit(7),'22023','Wrong document category denied');
 await db.exec('reset role');await db.query('delete from storage.objects where name=$1',[`${application}/transcript_${id(208)}.pdf`]);await as(actor);await rejects(()=>submit(8),'22023','Missing actual Storage object denied');
 await db.exec('reset role');await db.query("update storage.objects set metadata='{\"size\":9}' where name=$1",[`${application}/transcript_${id(209)}.pdf`]);await as(actor);await rejects(()=>submit(9),'22023','Storage size mismatch denied');
 await db.exec('reset role');await db.query("update document_requests set status='approved',reviewed_at=now(),reviewed_by=$1 where id=$2",[foreign,id(110)]);await as(actor);await rejects(()=>submit(10),'40001','Reviewed request cannot be overwritten');
 ok((await row(10)).status==='approved','Approval retained unchanged');
 await db.exec('reset role');await db.query("update document_requests set document_type='passport_photo' where id=$1",[id(111)]);await db.query("update application_documents set document_type='other' where id=$1",[id(211)]);await as(actor);await rejects(()=>submit(11),'22023','Other document cannot masquerade as passport photo');
 await db.exec('reset role');const photoPath=`${application}/passport_photo_${id(211)}.jpg`;await db.query("update application_documents set storage_path=$1,mime_type='image/jpeg' where id=$2",[photoPath,id(211)]);await db.query("insert into storage.objects(bucket_id,name,metadata) values('application-documents',$1,'{\"size\":10}')",[photoPath]);const photoVersion=(await row(11)).updated_version;await as(actor);ok((await submit(11,11,photoVersion)).status==='received','Dedicated passport photo mapping supported');
 await db.exec('reset role');await db.query("update document_requests set status='rejected',reviewed_by=$1,reviewed_at=now() where id=$2",[foreign,id(112)]);const rejectionVersion=(await row(12)).updated_version;await as(actor);ok((await submit(12,12,rejectionVersion)).status==='received','Rejected request accepts an owned replacement');const replacement=await row(12);ok(!replacement.reviewed_by&&!replacement.reviewed_at,'Prior review markers cleared, never approved automatically');
 await db.exec(sql);await as(actor);ok((await submit(12)).status==='received','Migration replay preserves receipt');
 console.log(`PASS: ${checks} isolated document-request SQL/RLS checks. Auth and Storage metadata are fixtures, not actual Storage acceptance.`);
}finally{await db.close();}
