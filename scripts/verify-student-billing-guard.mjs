import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const module=process.env.COMMUNICATION_PGLITE_MODULE;if(!module)throw new Error('An isolated PGlite module is required; no production connection is supported.');
const {PGlite}=await import(pathToFileURL(module).href);const db=new PGlite();let checks=0;
const id=n=>`70000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const student=id(1),other=id(2),admin=id(3),inactive=id(4),newStudent=id(5),tenant=id(10),record=id(20);
const sql=await readFile(new URL('../supabase/migrations/20261031150148_protect_student_billing_fields.sql',import.meta.url),'utf8');
const ok=(value,label)=>{assert.ok(value,label);checks++;};
async function as(user,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user??'',role]);await db.exec(`set role ${role}`);}
async function denied(fn){await assert.rejects(fn,e=>e.code==='42501');checks++;}
async function row(){await as(null,'service_role');return (await db.query('select * from students where id=$1',[record])).rows[0];}
try{
await db.exec(`create role authenticated;create role anon;create role service_role bypassrls;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
grant usage on schema auth to authenticated,anon,service_role;
create table profiles(id uuid primary key,active boolean);create table user_roles(user_id uuid,role text);
create function public.is_admin_or_staff(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles p join public.user_roles r on r.user_id=p.id where p.id=$1 and p.active is true and r.role in('admin','staff'))$$;
create table students(id uuid primary key,profile_id uuid,tenant_id uuid,contact_phone text,plan_type text default 'free',payment_type text,payment_date timestamptz,payment_amount_cents int,payment_currency text default 'USD',refund_eligibility boolean default false,payment_confirmed_at timestamptz,assigned_agent_id uuid,agent_assigned_at timestamptz);
alter table students enable row level security;
create policy own_read on students for select to authenticated using(profile_id=auth.uid());
create policy own_insert on students for insert to authenticated with check(profile_id=auth.uid());
create policy own_update on students for update to authenticated using(profile_id=auth.uid());
create policy staff on students for all to authenticated using(is_admin_or_staff(auth.uid())) with check(is_admin_or_staff(auth.uid()));
grant select,insert,update on students to authenticated;grant all on students to service_role;`);
for(const [actor,active]of[[student,true],[other,true],[admin,true],[inactive,false],[newStudent,true]])await db.query('insert into profiles values($1,$2)',[actor,active]);
await db.query("insert into user_roles values($1,'admin'),($2,'staff')",[admin,inactive]);await db.query('insert into students(id,profile_id,tenant_id)values($1,$2,$3)',[record,student,tenant]);
await db.exec(sql);await db.exec(sql);checks++;
await as(student);await db.query("update students set contact_phone='synthetic-phone' where id=$1",[record]);ok((await row()).contact_phone==='synthetic-phone','ordinary profile edit');
const protectedChanges={id:id(21),profile_id:other,tenant_id:id(11),plan_type:'agent_supported',payment_type:'one_time',payment_date:'2026-10-31T12:00:00Z',payment_amount_cents:20000,payment_currency:'GBP',refund_eligibility:true,payment_confirmed_at:'2026-10-31T12:00:00Z',assigned_agent_id:id(30),agent_assigned_at:'2026-10-31T12:00:00Z'};
for(const[field,value]of Object.entries(protectedChanges)){await as(student);await denied(()=>db.query(`update students set ${field}=$1 where id=$2`,[value,record]));}
ok((await row()).plan_type==='free','denials preserve unpaid plan');
await as(newStudent);await denied(()=>db.query("insert into students(id,profile_id,tenant_id,plan_type,payment_confirmed_at)values($1,$2,$3,'agent_supported',now())",[id(22),newStudent,tenant]));
await denied(()=>db.query('insert into students(id,profile_id,tenant_id,plan_type)values($1,$2,$3,null)',[id(22),newStudent,tenant]));
await db.query('insert into students(id,profile_id,tenant_id)values($1,$2,$3)',[id(22),newStudent,tenant]);checks++;
await as(null,'service_role');await db.query("update students set plan_type='self_service',payment_type='one_time',payment_amount_cents=4900,payment_confirmed_at=now() where id=$1",[record]);checks++;
await as(student);await db.query("update students set contact_phone='updated-phone' where id=$1",[record]);ok((await row()).plan_type==='self_service','existing paid access retained during ordinary edit');
await as(admin);await db.query("update students set plan_type='agent_supported',payment_amount_cents=20000 where id=$1",[record]);ok((await row()).plan_type==='agent_supported','active staff operation');
await as(inactive);await denied(()=>db.query("insert into students(id,profile_id,tenant_id,plan_type)values($1,$2,$3,'agent_supported')",[id(23),inactive,tenant]));
await as(other);const foreign=await db.query("update students set contact_phone='foreign-change' where id=$1 returning id",[record]);ok(foreign.rows.length===0,'foreign RLS isolation');
await as(null,'anon');await denied(()=>db.query('select public.protect_student_billing_fields()'));
await as(student);await denied(()=>db.query('select public.protect_student_billing_fields()'));
await as(null,'service_role');await db.exec('reset role');await db.query('update profiles set active=false where id=$1',[admin]);
await as(admin);await denied(()=>db.query("insert into students(id,profile_id,tenant_id,plan_type)values($1,$2,$3,'agent_supported')",[id(24),admin,tenant]));
console.log(`PASS: ${checks} isolated student billing/ownership guard checks. Auth claims and policy tables are fixtures, not real-Auth acceptance.`);
}finally{await db.close();}
