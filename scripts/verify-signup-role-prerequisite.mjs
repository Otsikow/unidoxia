// Isolated PostgreSQL acceptance for the proposed SQL. No network or real users.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
if (!process.env.COMMUNICATION_PGLITE_MODULE) throw new Error('Set COMMUNICATION_PGLITE_MODULE to an isolated PGlite runtime.');
const {PGlite}=await import(pathToFileURL(process.env.COMMUNICATION_PGLITE_MODULE).href);
const db=new PGlite();
const tenant='00000000-0000-0000-0000-000000000001';
const id=(n)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub',nullif(current_setting('request.jwt.claim.sub',true),''))::uuid$$;
 create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
 grant usage on schema auth to authenticated,service_role;
 grant execute on function auth.uid(),auth.role() to authenticated,service_role;
 create type app_role as enum('student','agent','partner','staff','admin','counselor','verifier','finance','school_rep');
 create table tenants(id uuid primary key,name text,slug text,email_from text,active boolean default true,created_at timestamptz default now());
 create table profiles(id uuid primary key,tenant_id uuid references tenants(id),email text,full_name text,role app_role,phone text,country text,username text,onboarded boolean,active boolean default true,created_at timestamptz default now(),updated_at timestamptz default now());
 create table user_roles(user_id uuid,role app_role,unique(user_id,role));
 create table students(id uuid default gen_random_uuid() primary key,tenant_id uuid,profile_id uuid unique,referral_source text,contact_email text,contact_phone text,legal_name text,current_country text,address jsonb,address_line_1 text,address_line_2 text,city text,state_region text,postal_code text,country_of_residence text);
 create table agents(tenant_id uuid,profile_id uuid unique,verification_status text,active boolean);
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',aud text,role text); grant select,update on profiles to authenticated;grant all on profiles to service_role;`);
 await db.query('insert into tenants(id,slug) values($1,$2)',[tenant,'default']);
 const sql=await readFile(new URL('../docs/security/20261107000000_restrict_signup_role_metadata.sql',import.meta.url),'utf8');
 await db.exec(sql);await db.exec(sql);
 await db.exec('create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();');
 const cases=[['admin','student'],['staff','student'],['counselor','student'],['finance','student'],['school_rep','student'],['verifier','student'],['student','student'],['agent','agent'],['partner','partner'],['university','partner'],['malformed','student']];
 let n=1;
 for(const [requested,expected] of cases){
  const user=id(n++);
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[user,`fixture-${n}@test.invalid`,{role:requested,full_name:'Synthetic test'}]);
  assert.equal((await db.query('select role from profiles where id=$1',[user])).rows[0]?.role,expected,`signup ${requested}`);
  assert.equal((await db.query('select role from user_roles where user_id=$1',[user])).rows[0]?.role,expected,`role ledger ${requested}`);
  if(expected==='student') assert.equal((await db.query('select count(*)::int as n from students where profile_id=$1',[user])).rows[0].n,1);
  if(expected==='agent') assert.equal((await db.query('select count(*)::int as n from agents where profile_id=$1',[user])).rows[0].n,1);
 }
 const trusted=id(n++);
 await db.query('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values($1,$2,$3,$4)',[trusted,'trusted@test.invalid',{role:'student'},{role:'staff'}]);
 assert.equal((await db.query('select role from profiles where id=$1',[trusted])).rows[0].role,'staff');
 // Profile repair must reject another identity and cannot elevate the caller.
 await db.exec('alter table auth.users disable trigger on_auth_user_created');
 const missing=id(n++),other=id(n++);
 for(const user of [missing,other]) await db.query('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values($1,$2,$3,$4)',[user,`${user}@test.invalid`,{role:'admin'},{}]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[missing]);
 await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
 await db.exec('set role authenticated');
 const denied=(await db.query('select public.ensure_user_profile($1,$2) as result',[other,'admin'])).rows[0].result;
 assert.equal(denied.success,false);
 const own=(await db.query('select public.ensure_user_profile($1,$2) as result',[missing,'admin'])).rows[0].result;
 assert.equal(own.success,true);
 await db.exec('reset role');
 assert.equal((await db.query('select role from profiles where id=$1',[missing])).rows[0].role,'student');
 assert.equal((await db.query('select count(*)::int as n from profiles where id=$1',[other])).rows[0].n,0);
 await db.exec('set role anon');
 await assert.rejects(()=>db.exec('select public.ensure_user_profile()'),/permission denied/);
 await db.exec('reset role');
 await db.exec('alter table auth.users enable trigger on_auth_user_created');
 await db.exec(await readFile(new URL('../supabase/tests/signup_role_trust.test.sql',import.meta.url),'utf8'));
 console.log('PASS: proposed migration replay; real trigger signup cases; profile/user_roles consistency; student/agent records; trusted staff; own-only non-privileged repair; anonymous denial. Isolated PostgreSQL, not Auth-issued/live acceptance.');
} catch(error) {console.error(error.message, error.detail ?? '', error.where ?? '');process.exitCode=1;} finally {await db.close();}
