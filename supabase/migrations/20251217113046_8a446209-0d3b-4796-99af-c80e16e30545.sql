-- Fix university application review permissions + student details access

-- 1) Helper: can the current user (partner university) manage a given application?
create or replace function public.can_manage_university_application(p_user_id uuid, p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_or_staff(p_user_id)
    or (
      public.has_role(p_user_id, 'partner'::app_role)
      and exists (
        select 1
        from public.applications a
        join public.programs pr on pr.id = a.program_id
        join public.universities u on u.id = pr.university_id
        where a.id = p_application_id
          and u.tenant_id = public.get_user_tenant(p_user_id)
      )
    );
$$;

-- 2) Allow university partners to UPDATE applications they own (status + internal_notes)
--    NOTE: partners already have SELECT; this adds only what is needed for the review card.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='applications'
      and policyname='Partners can update applications to their university'
  ) then
    create policy "Partners can update applications to their university"
    on public.applications
    for update
    using (public.can_manage_university_application(auth.uid(), id))
    with check (public.can_manage_university_application(auth.uid(), id));
  end if;
end $$;

-- 3) Allow university partners to manage document requests in their tenant
--    (needed for requesting documents from the review card)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='document_requests'
      and policyname='Partners can manage document requests in their tenant'
  ) then
    create policy "Partners can manage document requests in their tenant"
    on public.document_requests
    for all
    using (
      tenant_id = public.get_user_tenant(auth.uid())
      and public.has_role(auth.uid(), 'partner'::app_role)
    )
    with check (
      tenant_id = public.get_user_tenant(auth.uid())
      and public.has_role(auth.uid(), 'partner'::app_role)
    );
  end if;
end $$;

-- 4) Secure RPC: return student details for a specific application (for university review UI)
--    This intentionally bypasses tenant-based profile visibility but only when the caller
--    is authorized to manage the application.
create or replace function public.get_student_details_for_application(p_application_id uuid)
returns table(
  student_id uuid,
  profile_id uuid,
  legal_name text,
  preferred_name text,
  contact_email text,
  contact_phone text,
  nationality text,
  date_of_birth date,
  passport_number text,
  passport_expiry date,
  current_country text,
  address jsonb,
  guardian jsonb,
  finances_json jsonb,
  visa_history_json jsonb,
  profile_full_name text,
  profile_email text,
  profile_phone text,
  profile_avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_university_application(auth.uid(), p_application_id) then
    raise exception 'permission denied: not authorized to view student details for this application'
      using errcode = '42501';
  end if;

  return query
  select
    s.id as student_id,
    s.profile_id,
    s.legal_name,
    s.preferred_name,
    s.contact_email,
    s.contact_phone,
    s.nationality,
    s.date_of_birth,
    s.passport_number,
    s.passport_expiry,
    s.current_country,
    s.address,
    s.guardian,
    s.finances_json,
    s.visa_history_json,
    p.full_name as profile_full_name,
    p.email as profile_email,
    p.phone as profile_phone,
    p.avatar_url as profile_avatar_url
  from public.applications a
  join public.students s on s.id = a.student_id
  left join public.profiles p on p.id = s.profile_id
  where a.id = p_application_id
  limit 1;
end;
$$;

-- 5) Secure RPC: hydrate basic student info for lists (university applications table)
create or replace function public.get_students_for_university_applications(p_student_ids uuid[])
returns table(
  id uuid,
  legal_name text,
  preferred_name text,
  nationality text,
  date_of_birth date,
  current_country text,
  profile_name text,
  profile_email text,
  profile_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.legal_name,
    s.preferred_name,
    s.nationality,
    s.date_of_birth,
    s.current_country,
    p.full_name as profile_name,
    p.email as profile_email,
    p.avatar_url as profile_avatar_url
  from public.students s
  left join public.profiles p on p.id = s.profile_id
  where s.id = any(p_student_ids)
    and (
      public.is_admin_or_staff(auth.uid())
      or (
        public.has_role(auth.uid(), 'partner'::app_role)
        and exists (
          select 1
          from public.applications a
          join public.programs pr on pr.id = a.program_id
          join public.universities u on u.id = pr.university_id
          where a.student_id = s.id
            and u.tenant_id = public.get_user_tenant(auth.uid())
        )
      )
    );
$$;