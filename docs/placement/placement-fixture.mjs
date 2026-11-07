// Synthetic, in-memory PostgreSQL fixture. Never connects to a hosted database.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
export async function createPlacementFixture() {
  const { PGlite } = await import(
    process.env.PLACEMENT_PGLITE_MODULE
      ? pathToFileURL(process.env.PLACEMENT_PGLITE_MODULE).href
      : "@electric-sql/pglite"
  );
  const db = new PGlite();
  const uid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to authenticated,anon;
create table profiles(id uuid primary key,tenant_id uuid,role text,active boolean default true,user_metadata jsonb);
create table user_roles(user_id uuid,role text);
insert into user_roles values('${uid(3)}','staff'),('${uid(4)}','staff');
create table students(id uuid primary key,profile_id uuid,tenant_id uuid,archived_at timestamptz,legal_name text,contact_email text,nationality text,secondary_qualification text,secondary_school_name text);
create table universities(id uuid primary key,name text,country text,active boolean default true);
create table programs(id uuid primary key,name text,university_id uuid,active boolean);
create table education_records(id uuid primary key,student_id uuid);
create table student_documents(id uuid primary key,student_id uuid,document_type text,storage_path text,admin_review_status text);
create function public.is_admin_or_staff(id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where profiles.id=$1 and role in ('admin','staff'))$$;
insert into profiles values('${uid(1)}','${uid(90)}','student',true,'{"role":"admin"}'),('${uid(2)}','${uid(90)}','student',true,'{}'),('${uid(3)}','${uid(90)}','staff',true,'{}'),('${uid(4)}','${uid(91)}','staff',true,'{}'),('${uid(5)}','${uid(90)}','partner',true,'{}'),('${uid(6)}','${uid(90)}','student',false,'{}');
insert into students values('${uid(11)}','${uid(1)}','${uid(90)}',null,'Student A','a@example.invalid','Ghana',null,null),('${uid(12)}','${uid(2)}','${uid(90)}',null,'Student B','b@example.invalid','Ghana',null,null),('${uid(16)}','${uid(6)}','${uid(90)}',null,'Inactive','i@example.invalid','Ghana',null,null);
insert into universities values('${uid(30)}','Fixture University','Canada');insert into programs values('${uid(31)}','Fixture Computing','${uid(30)}',true);
`);
  await db.exec(
    readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../../supabase/migrations/20261107124135_adviser_led_student_placement.sql",
      ),
      "utf8",
    ),
  );
  let pending = Promise.resolve();
  const as = (who, statement, args = []) => {
    const work = pending.then(async () => {
      await db.exec("begin");
      try {
        await db.exec("set local role authenticated");
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
          uid(who),
        ]);
        const r = await db.query(statement, args);
        await db.exec("commit");
        return r;
      } catch (e) {
        await db.exec("rollback");
        throw e;
      }
    });
    pending = work.catch(() => {});
    return work;
  };
  return { db, uid, as };
}
