// Isolated PGlite regression harness for docs/security/20261107000000_restrict_signup_role_metadata.sql
// REVIEW ONLY. Never connects to production. Run:
//   mkdir -p /tmp/pgl && cd /tmp/pgl && bun add @electric-sql/pglite
//   NODE_PATH=/tmp/pgl/node_modules bun docs/security/pglite/signup-role-trust.pglite.mjs
// Runs every case twice: BASELINE (live definitions snapshot) and PROPOSED (baseline + fix).
// Baseline is expected to show the defects; PROPOSED must pass every case.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baselineFns = readFileSync(join(here, "baseline_live_functions.sql"), "utf8");
const proposal = readFileSync(join(here, "..", "20261107000000_restrict_signup_role_metadata.sql"), "utf8");

const T1 = "00000000-0000-0000-0000-000000000001";
const T2 = "00000000-0000-0000-0000-000000000002";
const U = (n) => `10000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const schema = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claims', true)::json->>'role' $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create type public.app_role as enum ('student','agent','partner','staff','admin','counselor','verifier','finance','school_rep');
create table public.tenants (id uuid primary key, slug text, created_at timestamptz default now());
insert into public.tenants values ('${T1}','unidoxia', now() - interval '1 day'), ('${T2}','other', now());
create table public.profiles (id uuid primary key, tenant_id uuid not null, role app_role not null default 'student', full_name text not null,
  email text not null, phone text, avatar_url text, locale text default 'en', timezone text default 'UTC', onboarded boolean default false,
  active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now(), username text, country text);
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null, role app_role not null,
  created_at timestamptz default now(), unique (user_id, role));
create table public.students (id uuid primary key default gen_random_uuid(), tenant_id uuid, profile_id uuid unique, referral_source text,
  contact_email text, contact_phone text, legal_name text, current_country text, address jsonb, address_line_1 text, address_line_2 text,
  city text, state_region text, postal_code text, country_of_residence text);
create table public.agents (id uuid primary key default gen_random_uuid(), tenant_id uuid, profile_id uuid unique, verification_status text, active boolean);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles, public.user_roles to authenticated;
grant all on all tables in schema public to service_role;
${baselineFns}
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger trg_prevent_direct_role_update before update on public.profiles for each row execute function prevent_direct_role_update();
create trigger trg_sync_profile_role_after_change after insert or delete or update on public.user_roles for each row execute function sync_profile_role_from_user_roles();
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
create policy "Profiles: users can view own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Profiles: staff can view all" on public.profiles for select to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "Profiles: users can update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Profiles: staff can update" on public.profiles for update to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "Admins can manage user roles" on public.user_roles using (is_admin_or_staff(auth.uid())) with check (is_admin_or_staff(auth.uid()));
create policy "Allow user_roles creation during signup" on public.user_roles for insert to authenticated with check (user_id = auth.uid() and role = 'student');
create policy "Users can view their own roles" on public.user_roles for select using (user_id = auth.uid() or is_admin_or_staff(auth.uid()));
`;

// The original ensure_user_profile is not in the baseline snapshot; a no-op stub keeps baseline runnable.
const ensureStub = `create function public.ensure_user_profile(p_user_id uuid default null, p_role text default null, p_full_name text default null,
  p_email text default null, p_phone text default null, p_country text default null) returns jsonb language sql as $$ select '{"baseline":"not modelled"}'::jsonb $$;`;

async function build(withProposal) {
  const db = new PGlite();
  await db.exec(schema);
  if (withProposal) await db.exec(proposal);
  else await db.exec(ensureStub);
  // Seed via trusted path (superuser = migrations/service): signups through auth.users trigger.
  const signup = (id, meta = {}, app = {}) =>
    db.query("insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values ($1,$2,$3,$4)", [id, `u${id.slice(-3)}@test.invalid`, meta, app]);
  await signup(U(1), { full_name: "Active Admin" }, { role: "admin" });
  await signup(U(2), { full_name: "Inactive Admin" }, { role: "admin" });
  await signup(U(3), { full_name: "Student A" });
  await signup(U(4), { full_name: "Alt account" });
  await signup(U(5), { full_name: "Inactive Student" });
  await signup(U(6), { full_name: "Staff target" });
  // Baseline handle_new_user ignores app_meta; insert trusted roles directly as superuser (service path).
  for (const id of [U(1), U(2)]) await db.query("insert into public.user_roles(user_id,role) values ($1,'admin') on conflict do nothing", [id]);
  await db.query("update public.profiles set active=false where id in ($1,$2)", [U(2), U(5)]);
  return { db, signup };
}

async function as(db, uid, role, sql, params = []) {
  try {
    return await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role })]);
      await tx.exec(`set local role ${role}`);
      const r = await tx.query(sql, params);
      return { ok: true, rows: r.rows, affected: r.affectedRows ?? 0 };
    });
  } catch (e) {
    return { ok: false, error: e.message, affected: 0 };
  }
}
const read = async (db, sql, p = []) => (await db.query(sql, p)).rows;
const profile = async (db, id) => (await read(db, "select role, tenant_id, active from public.profiles where id=$1", [id]))[0];
const roles = async (db, id) => (await read(db, "select role from public.user_roles where user_id=$1 order by role", [id])).map((r) => r.role);

// Each case returns true when the SECURE behaviour holds (verified by readback, not by statement success).
const cases = [
  ["signup metadata role=admin yields student only", async ({ db, signup }) => {
    await signup(U(20), { role: "admin" });
    return (await profile(db, U(20))).role === "student" && (await roles(db, U(20))).join() === "student";
  }],
  ["signup metadata role=staff yields student only", async ({ db, signup }) => {
    await signup(U(21), { role: "staff" });
    return (await profile(db, U(21))).role === "student";
  }],
  ["legit signup agent keeps agent + agents row", async ({ db, signup }) => {
    await signup(U(22), { role: "agent" });
    return (await profile(db, U(22))).role === "agent" && (await read(db, "select 1 from agents where profile_id=$1", [U(22)])).length === 1;
  }],
  ["legit signup partner keeps partner", async ({ db, signup }) => {
    await signup(U(23), { role: "partner" });
    return (await profile(db, U(23))).role === "partner";
  }],
  ["legit signup student creates students row", async ({ db }) =>
    (await profile(db, U(3))).role === "student" && (await read(db, "select 1 from students where profile_id=$1", [U(3)])).length === 1],
  ["trusted invite (app_metadata role=staff) yields staff", async ({ db, signup }) => {
    await signup(U(24), {}, { role: "staff" });
    return (await profile(db, U(24))).role === "staff" && (await roles(db, U(24))).includes("staff");
  }],
  ["user cannot switch own tenant (readback unchanged)", async ({ db }) => {
    const r = await as(db, U(3), "authenticated", "update profiles set tenant_id=$1 where id=$2", [T2, U(3)]);
    return !(r.ok && r.affected === 1) && (await profile(db, U(3))).tenant_id === T1;
  }],
  ["inactive user cannot reactivate self", async ({ db }) => {
    await as(db, U(5), "authenticated", "update profiles set active=true where id=$1", [U(5)]);
    return (await profile(db, U(5))).active === false;
  }],
  ["user may self-deactivate (1 row, readback false)", async ({ db }) => {
    const r = await as(db, U(4), "authenticated", "update profiles set active=false where id=$1", [U(4)]);
    return r.ok && r.affected === 1 && (await profile(db, U(4))).active === false;
  }],
  ["student update of other profile affects 0 rows", async ({ db }) => {
    const r = await as(db, U(3), "authenticated", "update profiles set active=false where id=$1", [U(6)]);
    return r.affected === 0 && (await profile(db, U(6))).active === true;
  }],
  ["active admin can deactivate+reactivate other (AdminUsers workflow)", async ({ db }) => {
    const a = await as(db, U(1), "authenticated", "update profiles set active=false where id=$1", [U(6)]);
    const ok1 = a.ok && a.affected === 1 && (await profile(db, U(6))).active === false;
    const b = await as(db, U(1), "authenticated", "update profiles set active=true where id=$1", [U(6)]);
    return ok1 && b.ok && b.affected === 1 && (await profile(db, U(6))).active === true;
  }],
  ["inactive admin cannot deactivate others", async ({ db }) => {
    await as(db, U(2), "authenticated", "update profiles set active=false where id=$1", [U(6)]);
    return (await profile(db, U(6))).active === true;
  }],
  ["inactive admin cannot move a user to another tenant", async ({ db }) => {
    await as(db, U(2), "authenticated", "update profiles set tenant_id=$1 where id=$2", [T2, U(6)]);
    return (await profile(db, U(6))).tenant_id === T1;
  }],
  ["inactive admin cannot promote alternate account to admin", async ({ db }) => {
    await as(db, U(2), "authenticated", "insert into user_roles(user_id,role) values ($1,'admin')", [U(4)]);
    return !(await roles(db, U(4))).includes("admin") && (await profile(db, U(4))).role === "student";
  }],
  ["inactive admin cannot update an existing role row to admin", async ({ db }) => {
    await as(db, U(2), "authenticated", "update user_roles set role='admin' where user_id=$1", [U(4)]);
    return !(await roles(db, U(4))).includes("admin");
  }],
  ["inactive admin cannot delete a role", async ({ db }) => {
    await as(db, U(2), "authenticated", "delete from user_roles where user_id=$1", [U(1)]);
    return (await roles(db, U(1))).includes("admin");
  }],
  ["student cannot self-grant admin", async ({ db }) => {
    await as(db, U(3), "authenticated", "insert into user_roles(user_id,role) values ($1,'admin')", [U(3)]);
    return !(await roles(db, U(3))).includes("admin");
  }],
  ["self signup student role insert still allowed", async ({ db }) => {
    await db.query("insert into profiles(id,tenant_id,full_name,email) values ($1,$2,'x','x@test.invalid')", [U(30), T1]);
    const r = await as(db, U(30), "authenticated", "insert into user_roles(user_id,role) values ($1,'student')", [U(30)]);
    return r.ok && r.affected === 1 && (await roles(db, U(30))).join() === "student";
  }],
  ["active admin grants staff -> profile.role synced to staff", async ({ db }) => {
    const r = await as(db, U(1), "authenticated", "insert into user_roles(user_id,role) values ($1,'staff')", [U(6)]);
    return r.ok && r.affected === 1 && (await profile(db, U(6))).role === "staff";
  }],
  ["active admin revokes staff -> profile.role synced back to student", async ({ db }) => {
    await as(db, U(1), "authenticated", "insert into user_roles(user_id,role) values ($1,'staff')", [U(6)]);
    const r = await as(db, U(1), "authenticated", "delete from user_roles where user_id=$1 and role='staff'", [U(6)]);
    return r.ok && r.affected === 1 && (await profile(db, U(6))).role === "student";
  }],
  ["service_role can grant roles (trusted sync path)", async ({ db }) => {
    const r = await as(db, null, "service_role", "insert into user_roles(user_id,role) values ($1,'finance')", [U(6)]);
    return r.ok && r.affected === 1 && (await profile(db, U(6))).role === "finance";
  }],
  ["direct profiles.role edit still blocked", async ({ db }) => {
    await as(db, U(3), "authenticated", "update profiles set role='admin' where id=$1", [U(3)]);
    return (await profile(db, U(3))).role === "student";
  }],
  ["ensure_user_profile: cannot create profile for another user", async ({ db }) => {
    await db.query("insert into auth.users(id,email) values ($1,'v@test.invalid')", [U(40)]);
    await db.query("delete from profiles where id=$1", [U(40)]);
    await as(db, U(3), "authenticated", "select ensure_user_profile($1,'admin')", [U(40)]);
    return (await profile(db, U(40))) === undefined;
  }],
  ["ensure_user_profile: own repair with p_role=admin yields student", async ({ db }) => {
    await db.query("insert into auth.users(id,email) values ($1,'w@test.invalid')", [U(41)]);
    await db.query("delete from profiles where id=$1", [U(41)]);
    await as(db, U(41), "authenticated", "select ensure_user_profile(null,'admin')");
    return (await profile(db, U(41)))?.role === "student";
  }],
];

let failedProposal = 0;
for (const mode of ["BASELINE", "PROPOSED"]) {
  console.log(`\n== ${mode} ==`);
  for (let [name, fn] of cases) {
    const ctx = await build(mode === "PROPOSED"); // fresh DB per case: no cross-case leakage
    let pass;
    try { pass = await fn(ctx); } catch (e) { pass = false; name += ` [threw: ${e.message}]`; }
    console.log(`${pass ? "SECURE " : "DEFECT "} ${name}`);
    if (mode === "PROPOSED" && !pass) failedProposal++;
    await ctx.db.close();
  }
}
console.log(`\nPROPOSED failures: ${failedProposal}`);
process.exit(failedProposal ? 1 : 0);
