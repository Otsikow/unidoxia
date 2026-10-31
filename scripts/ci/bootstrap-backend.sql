-- Disposable local Supabase only; bridge the representative fixtures, never production.
alter table public.tenants add column if not exists name text;
alter table public.tenants add column if not exists email_from text;
alter table public.tenants add column if not exists active boolean default true;
alter table public.tenants alter column id set default gen_random_uuid();
create table public.universities(id uuid primary key default gen_random_uuid(),tenant_id uuid references public.tenants(id),name text,country text,active boolean,submission_config_json jsonb);
create table public.programs(id uuid primary key default gen_random_uuid(),university_id uuid references public.universities(id),tenant_id uuid);
alter table public.applications add column program_id uuid references public.programs(id);
grant all on public.universities,public.programs to service_role;
