-- DISPOSABLE LOCALHOST CI ONLY. Representative agent schema, not production.
alter table public.agents alter column id set default gen_random_uuid();
alter table public.agents alter column verification_status set default 'pending';
alter table public.agents alter column active set default true;
alter table public.agents add column company_name text;
alter table public.agents add column verification_document_url text;
alter table public.agents add column payout_account jsonb;
alter table public.agents add column parent_agent_id uuid;
alter table public.agents add column commission_rate_l1 numeric default 15;
alter table public.agents add column commission_rate_l2 numeric default 10;
alter table public.agents add column username text not null unique;
alter table public.agents add column team_invite_code text not null unique;
alter table public.agents add column created_at timestamptz default now();
alter table public.agents add column updated_at timestamptz default now();
alter table public.agents enable row level security;
create policy "Agents can view their own record" on public.agents for select to authenticated
using(profile_id=auth.uid() or public.is_admin_or_staff(auth.uid()));
create policy "Admins can manage agents" on public.agents for all to authenticated
using(public.is_admin_or_staff(auth.uid())) with check(public.is_admin_or_staff(auth.uid()));
grant select,insert,update,delete on public.agents to authenticated;
