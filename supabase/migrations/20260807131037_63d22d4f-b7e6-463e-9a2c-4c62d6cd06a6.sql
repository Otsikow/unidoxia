ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_region text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country_of_residence text;

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