create or replace function public.enforce_application_limit()
returns trigger
language plpgsql
as $$
declare
  student_plan text;
  existing_count integer;
begin
  if new.student_id is null then
    return new;
  end if;

  select plan_type
    into student_plan
    from public.students
   where id = new.student_id;

  if coalesce(student_plan, 'free') = 'free' and coalesce(new.status, '') <> 'draft' then
    select count(*)
      into existing_count
      from public.applications
     where student_id = new.student_id
       and status <> 'draft';

    if existing_count >= 1 then
      raise exception 'APPLICATION_LIMIT_REACHED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_application_limit on public.applications;

create trigger trg_enforce_application_limit
before insert on public.applications
for each row
execute function public.enforce_application_limit();
