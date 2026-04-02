
-- Update handle_new_user to store phone in students table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      address
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
      END
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
$$;

-- Backfill existing students: copy phone from profiles into contact_phone and address.whatsapp
UPDATE public.students s
SET 
  contact_phone = COALESCE(s.contact_phone, p.phone),
  contact_email = COALESCE(s.contact_email, p.email),
  legal_name = COALESCE(s.legal_name, p.full_name),
  current_country = COALESCE(s.current_country, p.country),
  address = CASE
    WHEN (s.address IS NULL OR s.address = '{}'::jsonb OR s.address->>'whatsapp' IS NULL)
         AND p.phone IS NOT NULL
    THEN COALESCE(s.address, '{}'::jsonb) || jsonb_build_object('whatsapp', p.phone)
    ELSE s.address
  END
FROM public.profiles p
WHERE s.profile_id = p.id
  AND (
    s.contact_phone IS NULL 
    OR s.contact_email IS NULL 
    OR s.legal_name IS NULL
    OR (s.address IS NULL OR s.address->>'whatsapp' IS NULL)
  );
