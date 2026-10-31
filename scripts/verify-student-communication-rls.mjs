import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
// Install a pinned test-only runtime outside the application; see COMMUNICATION_CENTRE.md.
const modulePath=process.env.COMMUNICATION_PGLITE_MODULE;
if(!modulePath)throw new Error('Set COMMUNICATION_PGLITE_MODULE to the isolated PGlite dist/index.js path.');
const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();
const tenantA='11111111-1111-4111-8111-111111111111',tenantB='22222222-2222-4222-8222-222222222222';
const staffA='33333333-3333-4333-8333-333333333333',staffB='44444444-4444-4444-8444-444444444444',studentActor='55555555-5555-4555-8555-555555555555',inactive='66666666-6666-4666-8666-666666666666';
const studentA='77777777-7777-4777-8777-777777777777',studentB='88888888-8888-4888-8888-888888888888';
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.tenants(id uuid primary key);
 create table public.profiles(id uuid primary key,tenant_id uuid references tenants(id),role text,active boolean);
 create table public.students(id uuid primary key,tenant_id uuid references tenants(id),profile_id uuid);
 create table public.applications(id uuid primary key,student_id uuid references students(id));
 grant select on public.profiles to authenticated;`);
 await db.query('insert into tenants values($1),($2)',[tenantA,tenantB]);
 for(const [id,tenant,role,active] of [[staffA,tenantA,'admin',true],[staffB,tenantB,'staff',true],[studentActor,tenantA,'student',true],[inactive,tenantA,'staff',false]])await db.query('insert into profiles values($1,$2,$3,$4)',[id,tenant,role,active]);
 await db.query('insert into students values($1,$2,$3),($4,$5,null)',[studentA,tenantA,studentActor,studentB,tenantB]);
 const migration=await readFile(new URL('../supabase/migrations/20261106000000_student_communication_ledger.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration); // Safe replay, no duplicate policies/indexes.
 await db.query(`insert into student_communications(id,tenant_id,student_id,author_id,channel,status,subject,body) values
 ('99999999-9999-4999-8999-999999999991',$1,$2,$3,'note','recorded','A','Private A'),
 ('99999999-9999-4999-8999-999999999992',$4,$5,$6,'note','recorded','B','Private B')`,[tenantA,studentA,staffA,tenantB,studentB,staffB]);
 await db.exec('set role authenticated');
 for(const [actor,expected] of [[staffA,['Private A']],[staffB,['Private B']],[studentActor,[]],[inactive,[]]]){
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);
  assert.deepEqual((await db.query('select body from student_communications order by body')).rows.map(r=>r.body),expected);
 }
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[staffA]);
 for(const statement of ["update student_communications set body='tampered'","delete from student_communications","insert into student_communications(id,tenant_id,student_id,channel,status,body) values(gen_random_uuid(),'11111111-1111-4111-8111-111111111111','77777777-7777-4777-8777-777777777777','note','recorded','tampered')"]){await assert.rejects(()=>db.exec(statement),/permission denied/);}
 await db.exec('reset role;set role anon');await assert.rejects(()=>db.exec('select * from student_communications'),/permission denied/);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int as count from student_communications')).rows[0].count,2);
 console.log('PASS: migration replay; tenant-isolated staff reads; student/inactive/anonymous denial; authenticated INSERT/UPDATE/DELETE denial; audit rows preserved. Synthetic PostgreSQL roles only, not production Auth-issued sessions.');
}finally{await db.close();}
