-- ISOLATED TEST HARNESS ONLY; minimal representative columns and write policies.
do $$begin if exists(select 1 from auth.users) or exists(select 1 from public.students) then raise exception 'Stop: test fixtures are not empty';end if;end$$;
alter table public.students
 add column if not exists plan_type text default 'free',
 add column if not exists payment_type text,
 add column if not exists payment_date timestamptz,
 add column if not exists payment_amount_cents integer,
 add column if not exists payment_currency text default 'USD',
 add column if not exists refund_eligibility boolean default false,
 add column if not exists payment_confirmed_at timestamptz,
 add column if not exists assigned_agent_id uuid,
 add column if not exists agent_assigned_at timestamptz;
-- Mirrors the owning-student/staff write paths under review, not a full production clone.
drop policy if exists billing_fixture_own_insert on public.students;
create policy billing_fixture_own_insert on public.students for insert to authenticated
 with check(profile_id=auth.uid() and tenant_id=(select p.tenant_id from public.profiles p where p.id=auth.uid()));
drop policy if exists billing_fixture_own_update on public.students;
create policy billing_fixture_own_update on public.students for update to authenticated using(profile_id=auth.uid());
drop policy if exists billing_fixture_staff on public.students;
create policy billing_fixture_staff on public.students for all to authenticated
 using(public.is_admin_or_staff(auth.uid())) with check(public.is_admin_or_staff(auth.uid()));
grant select,insert,update on public.students to authenticated;
