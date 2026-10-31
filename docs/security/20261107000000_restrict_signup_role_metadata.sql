-- SECURITY: signup must not trust caller-editable user metadata for privileged roles.
-- PROPOSED FORWARD MIGRATION - REVIEW ONLY. Not applied. Apply only with explicit approval.
-- Self-service roles: student, agent, partner ('university' accepted as alias of partner).
-- Privileged roles (admin, staff, counselor, verifier, finance, school_rep) are honoured only
-- from raw_app_meta_data, which only the service role (trusted server code) can set.

create or replace function public.resolve_signup_role(p_user_meta jsonb, p_app_meta jsonb)
returns public.app_role
language plpgsql
immutable
set search_path = public
as $$
declare
  v_trusted text := nullif(trim(coalesce(p_app_meta->>'role', '')), '');
  v_requested text := lower(nullif(trim(coalesce(p_user_meta->>'role', p_user_meta->>'app_role', '')), ''));
begin
  if v_trusted is not null then
    begin
      return v_trusted::public.app_role;
    exception when others then
      null;
    end;
  end if;
  if v_requested = 'university' then
    return 'partner'::public.app_role;
  end if;
  if v_requested in ('student', 'agent', 'partner') then
    return v_requested::public.app_role;
  end if;
  return 'student'::public.app_role;
end;
$$;

revoke all on function public.resolve_signup_role(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.resolve_signup_role(jsonb, jsonb) to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  default_tenant_id uuid;
  new_role app_role;
  raw_phone text;
begin
  select id into default_tenant_id
  from public.tenants
  where slug in ('geg-global', 'unidoxia', 'default')
  order by case slug when 'geg-global' then 1 when 'unidoxia' then 2 when 'default' then 3 end
  limit 1;

  if default_tenant_id is null then
    select id into default_tenant_id from public.tenants order by created_at asc limit 1;
  end if;

  if default_tenant_id is null then
    raise warning 'No tenant found, profile creation skipped';
    return new;
  end if;

  new_role := public.resolve_signup_role(new.raw_user_meta_data, new.raw_app_meta_data);
  raw_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');

  insert into public.profiles (id, tenant_id, email, full_name, role, phone, country, username, onboarded)
  values (
    new.id, default_tenant_id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new_role, raw_phone,
    nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''), 'user_' || left(new.id::text, 12)),
    false
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, new_role)
  on conflict (user_id, role) do nothing;

  if new_role = 'student'::app_role then
    insert into public.students (
      tenant_id, profile_id, referral_source, contact_email, contact_phone, legal_name, current_country,
      address, address_line_1, address_line_2, city, state_region, postal_code, country_of_residence
    ) values (
      default_tenant_id, new.id,
      nullif(trim(coalesce(new.raw_user_meta_data->>'referral_source', '')), ''),
      new.email, raw_phone,
      coalesce(new.raw_user_meta_data->>'full_name', 'User'),
      nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
      case when raw_phone is not null then jsonb_build_object('whatsapp', raw_phone) else '{}'::jsonb end,
      nullif(trim(coalesce(new.raw_user_meta_data->>'address_line_1', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'address_line_2', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'state_region', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'postal_code', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'country_of_residence', '')), '')
    )
    on conflict (profile_id) do nothing;
  end if;

  if new_role = 'agent'::app_role then
    insert into public.agents (tenant_id, profile_id, verification_status, active)
    values (default_tenant_id, new.id, 'pending', true)
    on conflict (profile_id) do nothing;
  end if;

  return new;
exception
  when others then
    raise log 'Error in handle_new_user for %: %', new.id, sqlerrm;
    return new;
end;
$function$;

-- Self-heal RPC: callers may only repair their OWN profile; p_role limited to self-service roles.
create or replace function public.ensure_user_profile(
  p_user_id uuid default null, p_role text default null, p_full_name text default null,
  p_email text default null, p_phone text default null, p_country text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
set row_security to 'off'
as $function$
declare
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_user_meta jsonb;
  v_app_meta jsonb;
  v_role public.app_role;
  v_default_tenant uuid := '00000000-0000-0000-0000-000000000001'::uuid;
begin
  if auth.role() = 'service_role' then
    v_user_id := coalesce(p_user_id, auth.uid());
  else
    v_user_id := auth.uid();
    if p_user_id is not null and p_user_id is distinct from v_user_id then
      return jsonb_build_object('success', false, 'error', 'Not allowed');
    end if;
  end if;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'No user id provided');
  end if;

  if exists (select 1 from public.profiles pr where pr.id = v_user_id) then
    return jsonb_build_object('success', true, 'action', 'exists');
  end if;

  select u.email,
         coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', '')),
         coalesce(u.raw_user_meta_data, '{}'::jsonb),
         coalesce(u.raw_app_meta_data, '{}'::jsonb)
  into v_email, v_full_name, v_user_meta, v_app_meta
  from auth.users u where u.id = v_user_id;

  if nullif(p_role, '') is not null then
    v_user_meta := v_user_meta || jsonb_build_object('role', p_role);
  end if;
  v_role := public.resolve_signup_role(v_user_meta, v_app_meta);

  v_email := coalesce(nullif(p_email, ''), v_email, 'unknown@example.com');
  v_full_name := coalesce(nullif(p_full_name, ''), v_full_name, v_email);

  insert into public.profiles (id, tenant_id, role, full_name, email, phone, country, onboarded, active, created_at, updated_at)
  values (
    v_user_id, v_default_tenant, v_role, v_full_name, v_email,
    coalesce(nullif(p_phone, ''), nullif(v_user_meta->>'phone', '')),
    coalesce(nullif(p_country, ''), nullif(v_user_meta->>'country', '')),
    false, true, now(), now()
  );

  return jsonb_build_object('success', true, 'action', 'created');
end;
$function$;

revoke all on function public.ensure_user_profile(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.ensure_user_profile(uuid, text, text, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Protected profile fields: tenant_id and active.
-- SECURITY INVOKER on purpose: current_user is the real caller role, so trusted
-- paths (service_role, SECURITY DEFINER functions owned by postgres, migrations)
-- pass, while Data API callers (authenticated/anon) are checked. No GUC/bypass flag.
-- ---------------------------------------------------------------------------
create or replace function public.actor_is_active_admin_or_staff(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null
    and exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role in ('admin', 'staff'))
    and exists (select 1 from public.profiles p where p.id = p_user_id and p.active is true);
$$;
revoke all on function public.actor_is_active_admin_or_staff(uuid) from public, anon;
grant execute on function public.actor_is_active_admin_or_staff(uuid) to authenticated, service_role;

create or replace function public.guard_protected_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if new.tenant_id is not distinct from old.tenant_id and new.active is not distinct from old.active then
    return new;
  end if;
  if current_user not in ('authenticated', 'anon') then
    return new; -- service_role, SECURITY DEFINER owners (invite/sync/isolate functions), migrations
  end if;
  if v_actor is null then
    raise exception 'Not allowed to change protected profile fields' using errcode = '42501';
  end if;
  -- Self: may only deactivate own account; never switch tenant or reactivate.
  if old.id = v_actor then
    if new.tenant_id is distinct from old.tenant_id
       or not (old.active is true and new.active is false) then
      raise exception 'Not allowed to change own tenant or reactivate own account' using errcode = '42501';
    end if;
    return new;
  end if;
  -- Other users: only an active admin/staff (roles from user_roles, active checked).
  if public.actor_is_active_admin_or_staff(v_actor) then
    return new;
  end if;
  raise exception 'Not allowed to change protected profile fields' using errcode = '42501';
end;
$$;
revoke all on function public.guard_protected_profile_fields() from public, anon, authenticated;

drop trigger if exists trg_guard_protected_profile_fields on public.profiles;
create trigger trg_guard_protected_profile_fields
before update of tenant_id, active on public.profiles
for each row execute function public.guard_protected_profile_fields();
