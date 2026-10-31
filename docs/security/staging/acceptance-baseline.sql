-- DISPOSABLE STAGING ONLY. NEVER APPLY TO UNIDOXIA PRODUCTION.
-- Requires the new project's REAL Supabase Auth schema/functions/roles.
-- Do not install PGlite auth stubs here. Only schema and synthetic defaults.
-- After this baseline, apply the exact ledger and proposed identity migrations.
begin;
do $$ begin
  if exists (select 1 from auth.users limit 1) or to_regclass('public.profiles') is not null then
    raise exception 'Staging bootstrap requires an empty disposable backend; existing accounts/schema found';
  end if;
end $$;
set check_function_bodies = off;
create type public.app_role as enum ('student','agent','partner','staff','admin','counselor','verifier','finance','school_rep');
create table public.tenants (id uuid primary key, slug text, created_at timestamptz default now());
insert into public.tenants values ('00000000-0000-0000-0000-000000000001','unidoxia', now() - interval '1 day'), ('00000000-0000-0000-0000-000000000002','other', now());
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, tenant_id uuid not null, role app_role not null default 'student', full_name text not null,
  email text not null, phone text, avatar_url text, locale text default 'en', timezone text default 'UTC', onboarded boolean default false,
  active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now(), username text, country text);
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null,
  created_at timestamptz default now(), unique (user_id, role));
create table public.students (id uuid primary key default gen_random_uuid(), tenant_id uuid, profile_id uuid unique references public.profiles(id) on delete cascade, referral_source text,
  whatsapp_number text, contact_email text, contact_phone text, legal_name text, current_country text, address jsonb, address_line_1 text, address_line_2 text,
  city text, state_region text, postal_code text, country_of_residence text);
create table public.agents (id uuid primary key default gen_random_uuid(), tenant_id uuid, profile_id uuid unique references public.profiles(id) on delete cascade, verification_status text, active boolean);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles, public.user_roles to authenticated;
grant all on all tables in schema public to service_role;
-- Read-only snapshot of live function definitions (2026-10-31) used as the PGlite baseline.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_tenant_id uuid;
  new_role app_role;
  raw_phone text;
BEGIN
  SELECT id INTO default_tenant_id
  FROM public.tenants
  WHERE slug IN ('geg-global', 'unidoxia', 'default')
  ORDER BY
    CASE slug
      WHEN 'geg-global' THEN 1
      WHEN 'unidoxia' THEN 2
      WHEN 'default' THEN 3
    END
  LIMIT 1;

  IF default_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id
    FROM public.tenants
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF default_tenant_id IS NULL THEN
    RAISE WARNING 'No tenant found, profile creation skipped';
    RETURN NEW;
  END IF;

  new_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  raw_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

  INSERT INTO public.profiles (
    id, tenant_id, email, full_name, role, phone, country, username, onboarded
  ) VALUES (
    NEW.id,
    default_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    new_role,
    raw_phone,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'country', '')), ''),
    COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'username', '')), ''),
      'user_' || LEFT(NEW.id::text, 12)
    ),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF new_role = 'student'::app_role THEN
    INSERT INTO public.students (
      tenant_id, profile_id, referral_source,
      contact_email, contact_phone,
      legal_name, current_country,
      address,
      address_line_1, address_line_2, city, state_region, postal_code, country_of_residence
    )
    VALUES (
      default_tenant_id,
      NEW.id,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_source', '')), ''),
      NEW.email,
      raw_phone,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'country', '')), ''),
      CASE WHEN raw_phone IS NOT NULL
        THEN jsonb_build_object('whatsapp', raw_phone)
        ELSE '{}'::jsonb
      END,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'address_line_1', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'address_line_2', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'city', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'state_region', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'postal_code', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'country_of_residence', '')), '')
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF new_role = 'agent'::app_role THEN
    INSERT INTO public.agents (tenant_id, profile_id, verification_status, active)
    VALUES (default_tenant_id, NEW.id, 'pending', true)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_direct_role_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bypass TEXT;
BEGIN
  bypass := current_setting('app.bypass_role_guard', true);
  IF (TG_OP = 'UPDATE') AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF bypass = 'true' THEN
      RETURN NEW; -- allow sync function to proceed
    END IF;
    RAISE EXCEPTION 'Direct updates to profiles.role are not allowed. Use user_roles instead.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_user_id UUID;
BEGIN
  affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
  -- Bypass the guard trigger when we are syncing from user_roles
  PERFORM set_config('app.bypass_role_guard', 'true', true);
  UPDATE public.profiles
  SET role = public.get_primary_role(affected_user_id),
      updated_at = NOW()
  WHERE id = affected_user_id;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(user_id, 'admin'::app_role) OR public.has_role(user_id, 'staff'::app_role);
$function$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT tenant_id FROM public.profiles WHERE id = user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_primary_role(p_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT COALESCE((
    SELECT ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    ORDER BY
      CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'staff' THEN 2
        WHEN 'partner' THEN 3
        WHEN 'agent' THEN 4
        WHEN 'counselor' THEN 5
        WHEN 'verifier' THEN 6
        WHEN 'finance' THEN 7
        WHEN 'school_rep' THEN 8
        ELSE 9
      END
    LIMIT 1
  ), 'student'::app_role);
$function$;
;
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_role
  );
$function$;
;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger trg_prevent_direct_role_update before update on public.profiles for each row execute function prevent_direct_role_update();
create trigger trg_sync_profile_role_after_change after insert or delete or update on public.user_roles for each row execute function sync_profile_role_from_user_roles();
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
create policy "Profiles: users can view own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Profiles: staff can view all" on public.profiles for select to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "Profiles: users can update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Profiles: staff can update" on public.profiles for update to authenticated using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff')) with check (has_role(auth.uid(),'admin') or has_role(auth.uid(),'staff'));
create policy "Admins can manage user roles" on public.user_roles using (is_admin_or_staff(auth.uid())) with check (is_admin_or_staff(auth.uid()));
create policy "Allow user_roles creation during signup" on public.user_roles for insert to authenticated with check (user_id = auth.uid() and role = 'student');
create policy "Users can view their own roles" on public.user_roles for select using (user_id = auth.uid() or is_admin_or_staff(auth.uid()));

create table public.applications (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), student_id uuid not null references students(id) on delete cascade, app_number text);
alter table public.students enable row level security;
alter table public.applications enable row level security;
grant select on public.students,public.applications to authenticated;
grant all on public.applications to service_role;
-- Deliberately broad synthetic reads stress the handler's own tenant/student predicates.
-- This does NOT reproduce every production students/applications policy.
create policy staging_adversarial_student_reads on public.students for select to authenticated using (true);
create policy staging_adversarial_application_reads on public.applications for select to authenticated using (true);

commit;
