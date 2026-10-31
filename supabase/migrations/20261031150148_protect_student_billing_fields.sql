-- Preserve self-service profile editing while reserving trusted operational fields.
-- Forward-only: creates a guard; no existing student row is rewritten.
begin;
create or replace function public.protect_student_billing_fields()
returns trigger language plpgsql security definer
set search_path = public set row_security = off
as $$
declare
  protected_fields text[] := array[
    'id','profile_id','tenant_id','plan_type','payment_type','payment_date',
    'payment_amount_cents','payment_currency','refund_eligibility','payment_confirmed_at',
    'assigned_agent_id','agent_assigned_at'
  ];
  field_name text;
  old_row jsonb;
  new_row jsonb := to_jsonb(new);
begin
  -- Only trusted signed service calls, current active staff, or direct DB maintenance.
  -- Never trust caller-editable signup metadata or a missing JWT by itself.
  if coalesce(auth.role(),'')='service_role'
     or public.is_admin_or_staff(auth.uid())
     or (session_user in ('postgres','supabase_admin') and auth.uid() is null and coalesce(auth.role(),'')='') then
    return new;
  end if;
  if TG_OP='INSERT' then
    if new.plan_type is distinct from 'free'
       or new.payment_type is not null or new.payment_date is not null
       or new.payment_amount_cents is not null or new.payment_confirmed_at is not null
       or coalesce(new.payment_currency,'USD') <> 'USD'
       or coalesce(new.refund_eligibility,false)
       or new.assigned_agent_id is not null or new.agent_assigned_at is not null then
      raise exception 'Student billing and assignment must be confirmed by UniDoxia.' using errcode='42501';
    end if;
  else
    old_row := to_jsonb(old);
    foreach field_name in array protected_fields loop
      if new_row->field_name is distinct from old_row->field_name then
        raise exception 'This student field can only be changed by authorised UniDoxia staff or a trusted service.' using errcode='42501';
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_student_billing_fields() from public,anon,authenticated;
drop trigger if exists guard_student_billing_fields on public.students;
create trigger guard_student_billing_fields before insert or update on public.students
for each row execute function public.protect_student_billing_fields();
commit;
