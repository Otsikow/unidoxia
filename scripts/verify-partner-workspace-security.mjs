import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.COMMUNICATION_PGLITE_MODULE;
if(!modulePath)throw new Error('Set COMMUNICATION_PGLITE_MODULE to the isolated PGlite module. No production connection is used.');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite();let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const tenantA=id(1),tenantB=id(2),admin=id(10),staff=id(11),inactive=id(12),student=id(13),owner=id(14),other=id(15),foreign=id(16),inactivePartner=id(17),missing=id(18);
const sql=await readFile(new URL('../supabase/migrations/20261031134909_secure_partner_workspace_access.sql',import.meta.url),'utf8');
async function as(user,role='authenticated') {await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user??'',role]);await db.exec(`set role ${role}`);}
const isolate=async target=>(await db.query('select public.isolate_partner_profile($1) as tenant',[target])).rows[0].tenant;
const needs=async target=>(await db.query('select public.partner_needs_isolation($1) as needed',[target])).rows[0].needed;
async function denied(action,label) {await assert.rejects(action,e=>e.code==='42501');checks++;}
async function counts(){await db.exec('reset role');return (await db.query('select (select count(*)::int from tenants) as tenants,(select count(*)::int from universities) as universities')).rows[0];}
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 grant usage on schema auth to anon,authenticated,service_role;
 create type public.app_role as enum('student','agent','partner','admin','staff');
 create table tenants(id uuid primary key default gen_random_uuid(),name text,slug text,email_from text,active boolean default true);
 create table profiles(id uuid primary key,tenant_id uuid references tenants(id),role app_role,active boolean,full_name text,email text,phone text,country text);
 create table user_roles(user_id uuid,role app_role);
 create table universities(id uuid primary key default gen_random_uuid(),tenant_id uuid references tenants(id),name text,country text,active boolean,submission_config_json jsonb);
 create function public.has_role(user_id uuid,requested app_role) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.user_roles r where r.user_id=$1 and r.role=$2)$$;
 create function public.is_admin_or_staff(user_id uuid) returns boolean language sql stable security definer set search_path=public as $$select public.has_role($1,'admin') or public.has_role($1,'staff')$$;
 create function public.guard_protected_profile_fields() returns trigger language plpgsql security invoker set search_path=public as $$begin if new.tenant_id is distinct from old.tenant_id and current_user in ('anon','authenticated') then raise exception 'direct tenant edit denied' using errcode='42501';end if;return new;end$$;
 create trigger protected_tenant before update on profiles for each row execute function public.guard_protected_profile_fields();
 create table protected_records(id int primary key,value text);insert into protected_records values(1,'synthetic private row');
 alter table protected_records enable row level security;
 create policy existing_staff_policy on protected_records for all to authenticated using(public.is_admin_or_staff(auth.uid())) with check(public.is_admin_or_staff(auth.uid()));
 grant select,insert,update,delete on protected_records to authenticated;`);
 await db.query("insert into tenants(id,slug) values($1,'unidoxia'),($2,'other')",[tenantA,tenantB]);
 for(const [user,tenant,role,active]of [[admin,tenantA,'admin',true],[staff,tenantA,'staff',true],[inactive,tenantA,'admin',false],[student,tenantA,'student',true],[owner,tenantA,'partner',true],[other,tenantA,'partner',true],[foreign,tenantB,'partner',true],[inactivePartner,tenantA,'partner',false]]) {
  await db.query('insert into profiles values($1,$2,$3,$4,$5,$6,null,null)',[user,tenant,role,active,'Synthetic Partner','synthetic@example.invalid']);
  await db.query('insert into user_roles values($1,$2)',[user,role]);
 }
 // Prove the baseline authorization defect against the original deployed routines.
 const original=await readFile(new URL('../supabase/migrations/20251208132649_de78ad27-64b8-4aba-b2b6-99096f3bfad7.sql',import.meta.url),'utf8');
 await db.exec(original.slice(original.indexOf('CREATE OR REPLACE FUNCTION public.isolate_partner_profile'),original.indexOf('-- Step 3:')));
 await as(student);await db.exec('begin');ok(await isolate(foreign)!==tenantB,'Baseline permits cross-account mutation');await db.exec('rollback');
 await as(inactive);ok((await db.query('select * from protected_records')).rows.length===1,'Baseline inactive administrator can read');
 await db.exec('reset role');const before=await counts();await db.exec(sql);ok(JSON.stringify(await counts())===JSON.stringify(before),'Migration makes no business data changes');
 for(const target of [owner,foreign,missing]){await as(student);await denied(()=>isolate(target),'Student denied');await denied(()=>needs(target),'Foreign partner status denied');}
 await as(owner);await denied(()=>isolate(other),'Partner cannot move another partner');await denied(()=>needs(foreign),'Partner cannot inspect foreign workspace');
 await as(inactive);await denied(()=>isolate(owner),'Inactive admin denied');ok((await db.query('select * from protected_records')).rows.length===0,'Inactive administrator no longer reads protected rows');
 ok((await db.query("update protected_records set value='forbidden' returning id")).rows.length===0,'Inactive administrator cannot update');
 await denied(()=>db.query("insert into protected_records values(2,'forbidden')"),'Inactive administrator cannot insert');
 await as(inactivePartner);await denied(()=>isolate(inactivePartner),'Inactive partner cannot isolate');
 await as(null,'anon');await denied(()=>isolate(owner),'Anonymous RPC execution denied');await denied(()=>needs(owner),'Anonymous helper denied');
 await as(owner);await denied(()=>db.query('select public.can_manage_partner_workspace($1)',[owner]),'Internal guard cannot be called by browser');
 ok(await needs(owner),'Own shared workspace detected');const ownTenant=await isolate(owner);ok(ownTenant!==tenantA,'Owner can isolate self through guarded routine');
 ok(await needs(owner)===false,'Dedicated owner workspace no longer needs isolation');const ownCounts=await counts();await as(owner);ok(await isolate(owner)===ownTenant,'Repeat returns existing workspace');ok(JSON.stringify(await counts())===JSON.stringify(ownCounts),'Repeat creates no duplicate tenant/university');
 await as(admin);ok((await db.query('select * from protected_records')).rows.length===1,'Active admin retains existing read access');await denied(()=>isolate(owner),'Administrator cannot move a foreign-tenant partner');
 await as(staff);const otherTenant=await isolate(other);ok(otherTenant!==tenantA,'Active same-tenant staff can isolate partner');
 await as(null,'service_role');ok(await isolate(foreign)===tenantB,'Trusted server can handle already isolated partner idempotently');await denied(()=>isolate(inactivePartner),'Inactive target remains protected even for server');
 await db.exec('reset role');await db.exec(sql);await as(owner);ok(await isolate(owner)===ownTenant,'Migration replay preserves isolated workspace');
 ok((await db.query("select has_function_privilege('anon','public.isolate_partner_profile(uuid)','EXECUTE') as allowed")).rows[0].allowed===false,'Public grant removed');
 console.log(`PASS: ${checks} isolated partner-workspace security checks. Real SQL/RLS roles; Auth claims are local stubs, not production or actual-Auth acceptance.`);
}finally{await db.close();}
