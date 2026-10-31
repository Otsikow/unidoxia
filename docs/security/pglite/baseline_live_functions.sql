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
CREATE OR REPLACE FUNCTION public.ensure_user_profile(p_user_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_country text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_role_text text;
  v_role public.app_role;
  v_phone text;
  v_country text;
  v_default_tenant uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user id provided');
  END IF;

  -- Already has a profile
  IF EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = v_user_id) THEN
    RETURN jsonb_build_object('success', true, 'action', 'exists');
  END IF;

  -- Read basic fields from auth.users (server-side only)
  SELECT
    u.email,
    COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''), NULLIF(u.raw_user_meta_data->>'name','')),
    COALESCE(NULLIF(u.raw_user_meta_data->>'role',''), NULLIF(u.raw_user_meta_data->>'app_role','')),
    NULLIF(u.raw_user_meta_data->>'phone',''),
    NULLIF(u.raw_user_meta_data->>'country','')
  INTO v_email, v_full_name, v_role_text, v_phone, v_country
  FROM auth.users u
  WHERE u.id = v_user_id;

  v_email := COALESCE(NULLIF(p_email, ''), v_email, 'unknown@example.com');
  v_full_name := COALESCE(NULLIF(p_full_name, ''), v_full_name, v_email);
  v_role_text := COALESCE(NULLIF(p_role, ''), v_role_text, 'student');

  -- Safe cast to enum with fallback
  BEGIN
    v_role := v_role_text::public.app_role;
  EXCEPTION WHEN others THEN
    v_role := 'student'::public.app_role;
  END;

  -- Insert the minimal required profile row
  INSERT INTO public.profiles (
    id,
    tenant_id,
    role,
    full_name,
    email,
    phone,
    country,
    onboarded,
    active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_default_tenant,
    v_role,
    v_full_name,
    v_email,
    COALESCE(NULLIF(p_phone, ''), v_phone),
    COALESCE(NULLIF(p_country, ''), v_country),
    false,
    true,
    now(),
    now()
  );

  RETURN jsonb_build_object('success', true, 'action', 'created');
END;
$function$;
