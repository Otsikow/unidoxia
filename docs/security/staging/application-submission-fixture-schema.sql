-- Isolated representative write-path acceptance; never apply this fixture to production.
do $$begin if exists(select 1 from auth.users) or exists(select 1 from public.applications) then raise exception 'Test accounts/applications must be empty';end if;end$$;
alter table public.programs add column if not exists tenant_id uuid;
alter table public.students add column if not exists fixture_submission_consent boolean default true;
alter table public.applications
 add column if not exists status text default 'draft',
 add column if not exists agent_id uuid,
 add column if not exists submission_channel text,
 add column if not exists notes text,
 add column if not exists internal_notes text,
 add column if not exists fees_json jsonb,
 add column if not exists decision_json jsonb,
 add column if not exists timeline_json jsonb default '[]',
 add column if not exists risk_flags_json jsonb,
 add column if not exists coursefinder_gate_exempt boolean default false;
drop policy if exists submission_fixture_own_insert on public.applications;
create policy submission_fixture_own_insert on public.applications for insert to authenticated
 with check(student_id in(select s.id from public.students s where s.profile_id=auth.uid()));
drop policy if exists submission_fixture_own_draft on public.applications;
create policy submission_fixture_own_draft on public.applications for update to authenticated
 using(student_id in(select s.id from public.students s where s.profile_id=auth.uid()) and status='draft');
drop policy if exists submission_fixture_staff on public.applications;
create policy submission_fixture_staff on public.applications for all to authenticated
 using(public.is_admin_or_staff(auth.uid())) with check(public.is_admin_or_staff(auth.uid()));
grant select,insert,update on public.applications to authenticated;
-- Representative consent/clamp coexistence, not a full Coursefinder/profile clone.
create or replace function public.fixture_application_sharing_guard() returns trigger
language plpgsql security definer set search_path=public as $$begin
 if TG_OP='INSERT' and coalesce(auth.role(),'')<>'service_role' then new.coursefinder_gate_exempt:=false;end if;
 if new.status='submitted' and not exists(select 1 from public.students s where s.id=new.student_id and s.fixture_submission_consent is true) then raise exception 'Synthetic sharing authorisation missing' using errcode='23514';end if;
 return new;end$$;
revoke all on function public.fixture_application_sharing_guard() from public,anon,authenticated;
drop trigger if exists fixture_application_sharing_guard on public.applications;
create trigger fixture_application_sharing_guard before insert or update on public.applications
for each row execute function public.fixture_application_sharing_guard();
-- Existing production helper required by the non-owner branch; preserve its live semantics.
create or replace function public.is_agent_for_student(_user_id uuid,_student_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.applications a inner join public.agents ag on ag.id=a.agent_id
 where a.student_id=_student_id and ag.profile_id=_user_id);
$$;
