-- Isolated backend qazshxpvfbhlybkmmkaf ONLY. NOT A PRODUCTION MIGRATION.
-- Minimal extra schema for the partner RPC actual-Auth test; no real user data.
begin;
do $$begin
 if exists(select 1 from auth.users) or exists(select 1 from profiles) then
  raise exception 'Partner fixture schema requires the empty isolated test backend';
 end if;
end$$;
alter table public.tenants add column if not exists name text;
alter table public.tenants add column if not exists email_from text;
alter table public.tenants add column if not exists active boolean default true;
alter table public.tenants alter column id set default gen_random_uuid();
create table if not exists public.universities(id uuid primary key default gen_random_uuid(),tenant_id uuid references public.tenants(id),name text,country text,active boolean,submission_config_json jsonb);
create table if not exists public.partner_security_probe(id uuid primary key,run uuid,body text);
alter table public.universities enable row level security;
alter table public.partner_security_probe enable row level security;
drop policy if exists synthetic_legacy_staff_policy on public.partner_security_probe;
create policy synthetic_legacy_staff_policy on public.partner_security_probe for all to authenticated using(public.is_admin_or_staff(auth.uid())) with check(public.is_admin_or_staff(auth.uid()));
drop policy if exists synthetic_direct_role_policy on public.partner_security_probe;
create policy synthetic_direct_role_policy on public.partner_security_probe for select to authenticated using(public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
grant select,insert,update,delete on public.partner_security_probe to authenticated;
grant all on public.universities,public.partner_security_probe to service_role;
notify pgrst,'reload schema';
commit;
