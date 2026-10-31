import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const module=process.env.COMMUNICATION_PGLITE_MODULE;if(!module)throw new Error('An isolated PGlite module is required; production connections are not supported.');
const {PGlite}=await import(pathToFileURL(module).href);const db=new PGlite();let checks=0;
const id=n=>`80000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),other=id(2),admin=id(3),inactive=id(4),agent=id(5),student=id(10),foreignStudent=id(11),tenant=id(20),universityTenant=id(21),program=id(30),fallbackProgram=id(31),agentId=id(40);
const sql=await readFile(new URL('../supabase/migrations/20261031162745_guard_application_submission.sql',import.meta.url),'utf8');
const billing=await readFile(new URL('../supabase/migrations/20261031150148_protect_student_billing_fields.sql',import.meta.url),'utf8');
const ok=(value,label)=>{assert.ok(value,label);checks++;};
async function as(user,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user??'',role]);await db.exec(`set role ${role}`);}
async function denied(fn,code='42501'){await assert.rejects(fn,e=>e.code===code);checks++;}
const payload=(n,extra={})=>({id:id(100+n),student_id:student,tenant_id:universityTenant,program_id:program,status:'submitted',submission_channel:'student_portal',...extra});
const insert=(n,extra={})=>db.query('insert into applications select * from jsonb_populate_record(null::applications,$1::jsonb) returning id',[JSON.stringify(payload(n,extra))]);
const trusted=()=>as(null,'service_role');
async function plan(value){await trusted();await db.query('update students set plan_type=$1 where id=$2',[value,student]);await as(owner);}
try{
await db.exec(`create role authenticated;create role anon;create role service_role bypassrls;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
grant usage on schema auth to authenticated,anon,service_role;
create type app_role as enum('student','agent','admin','staff');
create table profiles(id uuid primary key,active boolean);create table user_roles(user_id uuid,role app_role);
create function has_role(p_id uuid,p_role app_role) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles p join user_roles r on r.user_id=p.id where p.id=$1 and p.active is true and r.role=$2)$$;
create function is_admin_or_staff(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$select has_role($1,'admin') or has_role($1,'staff')$$;
create table students(id uuid primary key,profile_id uuid unique,tenant_id uuid,plan_type text default 'free',payment_type text,payment_date timestamptz,payment_amount_cents int,payment_currency text default 'USD',refund_eligibility boolean default false,payment_confirmed_at timestamptz,assigned_agent_id uuid,agent_assigned_at timestamptz,consent boolean default true);
create table programs(id uuid primary key,tenant_id uuid);
create table agents(id uuid primary key,profile_id uuid,active boolean);
create table applications(id uuid primary key,student_id uuid,program_id uuid,tenant_id uuid,status text,agent_id uuid,submission_channel text,notes text,internal_notes text,fees_json jsonb,decision_json jsonb,timeline_json jsonb default '[]',risk_flags_json jsonb);
create function is_agent_for_student(p_id uuid,p_student uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from applications a join agents ag on ag.id=a.agent_id where a.student_id=$2 and ag.profile_id=$1)$$;
alter table applications enable row level security;
create policy own_read on applications for select to authenticated using(student_id in(select id from students where profile_id=auth.uid()));
create policy own_insert on applications for insert to authenticated with check(student_id in(select id from students where profile_id=auth.uid()));
create policy own_draft on applications for update to authenticated using(student_id in(select id from students where profile_id=auth.uid()) and status='draft');
create policy staff on applications for all to authenticated using(is_admin_or_staff(auth.uid())) with check(is_admin_or_staff(auth.uid()));
create function fixture_profile_gate() returns trigger language plpgsql security definer set search_path=public as $$begin if new.status='submitted' and not exists(select 1 from students where id=new.student_id and consent is true) then raise exception 'Synthetic sharing authorisation missing' using errcode='23514';end if;return new;end$$;
create trigger enforce_application_profile_gate before insert or update on applications for each row execute function fixture_profile_gate();
grant select on students to authenticated;grant select,insert,update on applications to authenticated;grant all on students,profiles,applications,programs,agents,user_roles to service_role;`);
for(const[actor,active]of[[owner,true],[other,true],[admin,true],[inactive,false],[agent,true]])await db.query('insert into profiles values($1,$2)',[actor,active]);
await db.query("insert into user_roles values($1,'student'),($2,'student'),($3,'admin'),($4,'staff'),($5,'agent')",[owner,other,admin,inactive,agent]);
await db.query('insert into students(id,profile_id,tenant_id)values($1,$2,$3),($4,$5,$3)',[student,owner,tenant,foreignStudent,other]);await db.query('insert into programs values($1,$2),($3,null)',[program,universityTenant,fallbackProgram]);await db.query('insert into agents values($1,$2,true)',[agentId,agent]);
await db.exec(billing);await db.exec(sql);await db.exec(sql);checks++;
await as(owner);await insert(1);checks++;
await denied(()=>insert(2),'PT409');
await insert(3,{status:'draft'});await insert(4,{status:'draft'});checks++;
await db.query("update applications set notes='Updated own draft' where id=$1",[id(103)]);checks++;
await denied(()=>insert(5,{status:null}));
for(const status of['screening','conditional_offer','unconditional_offer','cas_loa','visa','enrolled','rejected','withdrawn'])await denied(()=>insert(6,{status}));
for(const [field,value] of Object.entries({internal_notes:'Staff decision',fees_json:{paid:true},decision_json:{offer:'accepted'},timeline_json:[{stage:'enrolled'}],risk_flags_json:{cleared:true},agent_id:agentId,submission_channel:'agent_portal'}))await denied(()=>insert(7,{[field]:value}));
await denied(()=>insert(8,{status:'draft',tenant_id:tenant}));
await insert(9,{status:'draft',program_id:fallbackProgram,tenant_id:tenant});checks++;
await denied(()=>insert(10,{program_id:null,status:'submitted',tenant_id:tenant}),'22023');
await denied(()=>db.query("update applications set decision_json='{\"offer\":true}' where id=$1",[id(103)]));
await denied(()=>db.query('update applications set student_id=$1 where id=$2',[foreignStudent,id(103)]));
await denied(()=>insert(1),'23505');
await plan('self_service');await insert(11);await insert(12);checks++;
await plan('agent_supported');await insert(13);checks++;
await plan(null);await denied(()=>insert(14),'PT409');
await trusted();await db.query('update students set consent=false where id=$1',[student]);await as(owner);await denied(()=>insert(15),'23514');await trusted();await db.query('update students set consent=true where id=$1',[student]);
await as(other);await denied(()=>insert(16));
await as(admin);await insert(17,{status:'enrolled',decision_json:{authorised:true},agent_id:agentId});checks++;
await as(inactive);await denied(()=>insert(18,{status:'enrolled'}));
await trusted();await db.query('update profiles set active=false where id=$1',[owner]);await as(owner);await denied(()=>insert(19,{status:'draft'}));await trusted();await db.query('update profiles set active=true where id=$1',[owner]);
await as(null,'anon');await denied(()=>db.query('select public.guard_student_application_submission()'));
await as(owner);await denied(()=>db.query('select public.guard_student_application_submission()'));
// Exercise the delegated branch only with a test-only policy; no production permission is broadened.
await trusted();await db.exec('reset role');await db.exec(`create policy fixture_delegated_insert on applications for insert to authenticated with check(has_role(auth.uid(),'agent') and is_agent_for_student(auth.uid(),student_id));create policy fixture_agent_read on applications for select to authenticated using(exists(select 1 from agents ag where ag.id=applications.agent_id and ag.profile_id=auth.uid()));grant select on applications,agents to authenticated;`);
await plan('agent_supported');await as(agent);await insert(20,{agent_id:agentId,submission_channel:'agent_portal'});checks++;
await denied(()=>insert(21,{agent_id:null,submission_channel:'agent_portal'}));
console.log(`PASS: ${checks} isolated application submission/ownership/status/quota checks. Auth, consent and delegated write policy are fixtures; concurrency requires actual Data API acceptance.`);
}catch(error){console.error('FAIL application submission guard:',error.code??error.name,error.message);process.exitCode=1;}finally{await db.close();}
