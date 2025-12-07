-- Fix handle_new_user trigger to properly map roles and handle errors gracefully
-- This migration addresses the "Database error saving new user" issue when signing up
-- with the 'university' role (which should be mapped to 'partner')

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_tenant_id UUID;
  new_role app_role;
  raw_role TEXT;
  new_username TEXT;
  provided_phone TEXT;
  provided_country TEXT;
  referrer_username TEXT;
  referrer_profile_id UUID;
  level_two_referrer_id UUID;
BEGIN
  -- Get the default tenant
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;

  IF default_tenant_id IS NULL THEN
    RAISE WARNING 'No tenant found, creating default tenant';
    INSERT INTO public.tenants (name, slug, email_from, active)
    VALUES ('UniDoxia', 'unidoxia', 'noreply@unidoxia.com', true)
    RETURNING id INTO default_tenant_id;
  END IF;

  -- Extract and map the role from metadata
  -- Map 'university' to 'partner' for backward compatibility
  raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Normalize role names to valid app_role enum values
  CASE LOWER(TRIM(raw_role))
    WHEN 'student' THEN new_role := 'student'::app_role;
    WHEN 'agent' THEN new_role := 'agent'::app_role;
    WHEN 'partner' THEN new_role := 'partner'::app_role;
    WHEN 'university' THEN new_role := 'partner'::app_role;  -- Map university -> partner
    WHEN 'staff' THEN new_role := 'staff'::app_role;
    WHEN 'admin' THEN new_role := 'admin'::app_role;
    ELSE new_role := 'student'::app_role;  -- Default to student for unknown roles
  END CASE;

  -- Extract username from metadata
  new_username := NEW.raw_user_meta_data->>'username';
  provided_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  provided_country := NULLIF(NEW.raw_user_meta_data->>'country', '');
  referrer_username := NEW.raw_user_meta_data->>'referrer_username';

  -- Generate username if not provided
  IF new_username IS NULL OR LENGTH(TRIM(new_username)) = 0 THEN
    new_username := 'user_' || SUBSTRING(NEW.id::text, 1, 12);
  ELSE
    new_username := LOWER(REGEXP_REPLACE(new_username, '\s+', '', 'g'));
  END IF;

  -- Prevent collisions by appending part of the UUID if needed
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = new_username
  ) THEN
    new_username := new_username || '_' || SUBSTRING(NEW.id::text, 1, 6);
  END IF;

  -- Handle referrer_id
  IF NEW.raw_user_meta_data ? 'referrer_id' THEN
    BEGIN
      referrer_profile_id := (NEW.raw_user_meta_data->>'referrer_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      referrer_profile_id := NULL;
    END;
  END IF;

  -- Look up referrer by username if no direct ID
  IF referrer_profile_id IS NULL AND referrer_username IS NOT NULL THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE LOWER(username) = LOWER(referrer_username)
    LIMIT 1;
  END IF;

  -- Create the profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    email,
    full_name,
    role,
    phone,
    country,
    username,
    referrer_id,
    referred_by,
    onboarded
  ) VALUES (
    NEW.id,
    default_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    new_role,
    provided_phone,
    provided_country,
    new_username,
    referrer_profile_id,
    CASE
      WHEN referrer_profile_id IS NOT NULL THEN (
        SELECT username FROM public.profiles WHERE id = referrer_profile_id
      )
      ELSE NULL
    END,
    false
  );

  -- Create user_roles entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create role-specific records
  IF new_role = 'student'::app_role THEN
    INSERT INTO public.students (tenant_id, profile_id)
    VALUES (default_tenant_id, NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF new_role = 'agent'::app_role THEN
    INSERT INTO public.agents (tenant_id, profile_id, username)
    VALUES (default_tenant_id, NEW.id, new_username)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Handle referral relationships
  IF referrer_profile_id IS NOT NULL THEN
    INSERT INTO public.referral_relations (referrer_id, referred_user_id, level)
    VALUES (referrer_profile_id, NEW.id, 1)
    ON CONFLICT DO NOTHING;

    SELECT referrer_id INTO level_two_referrer_id
    FROM public.profiles
    WHERE id = referrer_profile_id;

    IF level_two_referrer_id IS NOT NULL THEN
      INSERT INTO public.referral_relations (referrer_id, referred_user_id, level)
      VALUES (level_two_referrer_id, NEW.id, 2)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    -- Re-raise the error to ensure the caller knows something went wrong
    -- But provide a more helpful message
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
