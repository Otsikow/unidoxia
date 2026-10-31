-- Owner/delegated-agent submission safeguards; trusted operations and existing rows are preserved.
begin;
do $dependency$ begin
  if not exists(select 1 from pg_trigger where tgrelid='public.students'::regclass and tgname='guard_student_billing_fields' and tgenabled='O') then
    raise exception 'Activate the reviewed student billing guard before the application submission guard.';
  end if;
end $dependency$;
create or replace function public.guard_student_application_submission()
returns trigger language plpgsql security definer
set search_path=public set row_security=off
as $$
declare
  student_scope record;
  own_student boolean;
  authorised_agent uuid;
  program_tenant uuid;
  found_program boolean;
  existing_count integer;
  field_name text;
  new_row jsonb := to_jsonb(new);
  old_row jsonb;
begin
  if coalesce(auth.role(),'')='service_role'
     or public.is_admin_or_staff(auth.uid())
     or (session_user in ('postgres','supabase_admin') and auth.uid() is null and coalesce(auth.role(),'')='') then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'Sign in to prepare an application.' using errcode='42501';
  end if;
  -- The shared student row serialises concurrent quota checks and trusted plan changes.
  select s.id,s.profile_id,s.tenant_id,s.plan_type,p.active into student_scope
  from public.students s join public.profiles p on p.id=s.profile_id
  where s.id=new.student_id for update of s;
  if not found then
    raise exception 'Student application unavailable.' using errcode='42501';
  end if;
  own_student := student_scope.profile_id=auth.uid();
  if not own_student then
    select a.id into authorised_agent from public.agents a join public.profiles p on p.id=a.profile_id
    where a.profile_id=auth.uid() and a.active is true and p.active is true
      and public.has_role(auth.uid(),'agent'::public.app_role)
      and public.is_agent_for_student(auth.uid(),new.student_id);
  end if;
  if student_scope.active is not true or (not own_student and authorised_agent is null)
     or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.active is true) then
    raise exception 'This account cannot prepare this student application.' using errcode='42501';
  end if;
  if TG_OP='UPDATE' then
    old_row := to_jsonb(old);
    if old.status::text is distinct from 'draft' then
      raise exception 'Submitted applications must be managed by UniDoxia.' using errcode='42501';
    end if;
    foreach field_name in array array['id','student_id','agent_id','internal_notes','fees_json','decision_json','timeline_json','risk_flags_json','submission_channel'] loop
      if new_row->field_name is distinct from old_row->field_name then
        raise exception 'Application ownership, decisions and operational records are managed by UniDoxia.' using errcode='42501';
      end if;
    end loop;
  else
    if (own_student and new.agent_id is not null)
       or (not own_student and new.agent_id is distinct from authorised_agent)
       or (own_student and new.submission_channel is not null and new.submission_channel<>'student_portal')
       or (not own_student and new.submission_channel is not null and new.submission_channel<>'agent_portal') then
      raise exception 'Application attribution must match the authorised submitter.' using errcode='42501';
    end if;
    if coalesce(btrim(new.internal_notes),'')<>'' then
      raise exception 'Internal application notes are managed by UniDoxia.' using errcode='42501';
    end if;
    foreach field_name in array array['fees_json','decision_json','timeline_json','risk_flags_json'] loop
      if new_row->field_name is not null and new_row->field_name not in ('null'::jsonb,'{}'::jsonb,'[]'::jsonb) then
        raise exception 'Application decisions and operational records are managed by UniDoxia.' using errcode='42501';
      end if;
    end loop;
  end if;
  if new.status is null or new.status::text not in ('draft','submitted') then
    raise exception 'Students and delegated agents may prepare drafts or submit applications; UniDoxia manages later stages.' using errcode='42501';
  end if;
  -- Match the existing form's programme workspace, with student workspace fallback.
  -- Unchanged legacy drafts can still be edited; submission/scope changes revalidate routing.
  if TG_OP='INSERT' or new.program_id is distinct from old.program_id
     or new.tenant_id is distinct from old.tenant_id or new.status::text='submitted' then
    if new.program_id is null then
      if new.status::text='submitted' then
        raise exception 'Select a programme before submitting.' using errcode='22023';
      end if;
      program_tenant := student_scope.tenant_id;
    else
      select coalesce(p.tenant_id,student_scope.tenant_id) into program_tenant
      from public.programs p where p.id=new.program_id;
      found_program := found;
      if not found_program then
        raise exception 'The selected programme is unavailable.' using errcode='22023';
      end if;
    end if;
    if new.tenant_id is distinct from program_tenant then
      raise exception 'The application workspace does not match the selected programme.' using errcode='42501';
    end if;
  end if;
  if new.status::text='submitted' and coalesce(student_scope.plan_type,'free') not in ('self_service','agent_supported') then
    select count(*) into existing_count from public.applications a
    where a.student_id=new.student_id and a.id<>new.id and a.status::text is distinct from 'draft';
    if existing_count>=1 then
      raise exception 'Your free plan includes one submitted application. Open your existing application or contact UniDoxia.' using errcode='PT409';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_student_application_submission() from public,anon,authenticated;
drop trigger if exists guard_student_application_submission on public.applications;
create trigger guard_student_application_submission before insert or update on public.applications
for each row execute function public.guard_student_application_submission();
commit;
