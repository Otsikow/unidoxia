-- ============================================================================
-- FIX: Partner Tenant Sharing / University Profile Mirroring Issue
-- ============================================================================
--
-- This migration fixes the critical issue where multiple university partners
-- share the same tenant, causing their profile updates to mirror/overwrite
-- each other's data.
--
-- Root cause: Multiple partners were assigned to the same tenant_id, and since
-- there's only ONE university record per tenant (unique constraint), they all
-- edit the same university record.
--
-- Solution:
-- 1. Identify all tenants that have multiple partner profiles
-- 2. For each additional partner (beyond the first), create a new isolated tenant
-- 3. Migrate those partners to their new tenants
-- 4. Create new university records for each newly isolated partner
--
-- ============================================================================

-- Step 1: Create a function to safely migrate a partner to a new isolated tenant
CREATE OR REPLACE FUNCTION public.migrate_partner_to_isolated_tenant(
  p_profile_id UUID,
  p_original_tenant_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_university RECORD;
  v_new_tenant_id UUID;
  v_new_university_id UUID;
BEGIN
  -- Get the profile details
  SELECT * INTO v_profile 
  FROM profiles 
  WHERE id = p_profile_id;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Profile % not found', p_profile_id;
    RETURN NULL;
  END IF;
  
  -- Get the existing university for reference (to copy data)
  SELECT * INTO v_university
  FROM universities
  WHERE tenant_id = p_original_tenant_id
  LIMIT 1;
  
  -- Create a new isolated tenant for this partner
  INSERT INTO tenants (
    name,
    slug,
    email_from,
    active,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(v_profile.full_name, 'University Partner') || ' Organization',
    'university-' || gen_random_uuid()::TEXT,
    COALESCE(v_profile.email, 'noreply@example.com'),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_tenant_id;
  
  -- Update the profile to use the new tenant
  UPDATE profiles
  SET tenant_id = v_new_tenant_id,
      updated_at = NOW()
  WHERE id = p_profile_id;
  
  -- Create a new university for the new tenant
  -- Copy submission_config_json but start fresh to avoid carrying over other's data
  INSERT INTO universities (
    name,
    country,
    city,
    website,
    logo_url,
    description,
    tenant_id,
    active,
    submission_config_json,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(v_profile.full_name, 'University Partner') || '''s University',
    COALESCE(v_university.country, 'Unknown'),
    NULL, -- Don't copy city to force profile update
    NULL, -- Don't copy website to force profile update
    NULL, -- Don't copy logo to force profile update
    'Welcome! Please update your university profile.', -- Fresh description
    v_new_tenant_id,
    TRUE,
    jsonb_build_object(
      'tagline', NULL,
      'highlights', '[]'::jsonb,
      'contacts', jsonb_build_object(
        'primary', jsonb_build_object(
          'name', v_profile.full_name,
          'email', v_profile.email,
          'phone', v_profile.phone,
          'title', NULL
        )
      ),
      'social', '{}'::jsonb,
      'media', '{}'::jsonb
    ),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_university_id;
  
  RAISE NOTICE 'Migrated partner % (%) to new tenant % with university %', 
    p_profile_id, v_profile.email, v_new_tenant_id, v_new_university_id;
  
  RETURN v_new_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.migrate_partner_to_isolated_tenant(UUID, UUID) IS
  'Migrates a partner profile to a new isolated tenant, creating a fresh university for them.';

-- Step 2: Identify and fix all tenants with multiple partners
DO $$
DECLARE
  v_tenant RECORD;
  v_partner RECORD;
  v_first_partner_id UUID;
  v_partner_count INT;
  v_migrated_count INT := 0;
BEGIN
  RAISE NOTICE '=== FIXING PARTNER TENANT SHARING ===';
  RAISE NOTICE 'Looking for tenants with multiple partner profiles...';
  
  -- Find all tenants that have more than one partner profile
  FOR v_tenant IN
    SELECT 
      tenant_id,
      COUNT(*) as partner_count,
      array_agg(id ORDER BY created_at ASC) as partner_ids,
      array_agg(email ORDER BY created_at ASC) as partner_emails
    FROM profiles
    WHERE role IN ('partner', 'university')
      AND tenant_id IS NOT NULL
    GROUP BY tenant_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Found tenant % with % partners: %', 
      v_tenant.tenant_id, 
      v_tenant.partner_count,
      v_tenant.partner_emails;
    
    -- Keep the first partner on the original tenant, migrate the rest
    v_first_partner_id := v_tenant.partner_ids[1];
    
    FOR i IN 2..v_tenant.partner_count LOOP
      RAISE NOTICE '  Migrating partner % (%)', 
        v_tenant.partner_ids[i], 
        v_tenant.partner_emails[i];
      
      -- Migrate this partner to a new isolated tenant
      PERFORM migrate_partner_to_isolated_tenant(
        v_tenant.partner_ids[i],
        v_tenant.tenant_id
      );
      
      v_migrated_count := v_migrated_count + 1;
    END LOOP;
  END LOOP;
  
  IF v_migrated_count = 0 THEN
    RAISE NOTICE 'No partners needed migration - all tenants are properly isolated.';
  ELSE
    RAISE NOTICE 'Migration complete. Migrated % partners to isolated tenants.', v_migrated_count;
  END IF;
  
  RAISE NOTICE '=== PARTNER TENANT SHARING FIX COMPLETE ===';
END $$;

-- Step 3: Verify the fix - no tenant should have multiple partners now
DO $$
DECLARE
  v_shared_count INT;
BEGIN
  SELECT COUNT(*) INTO v_shared_count
  FROM (
    SELECT tenant_id
    FROM profiles
    WHERE role IN ('partner', 'university')
      AND tenant_id IS NOT NULL
    GROUP BY tenant_id
    HAVING COUNT(*) > 1
  ) shared_tenants;
  
  IF v_shared_count > 0 THEN
    RAISE WARNING 'VERIFICATION FAILED: Still found % tenants with multiple partners!', v_shared_count;
  ELSE
    RAISE NOTICE 'Verification passed: No tenants have multiple partners.';
  END IF;
END $$;

-- Step 4: Add a constraint to prevent future sharing (via a trigger since we need flexibility)
-- Note: We can't use a unique constraint because admins/staff can share tenants
CREATE OR REPLACE FUNCTION public.check_partner_tenant_isolation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_partner_count INT;
BEGIN
  -- Only check for partner and university roles
  IF NEW.role NOT IN ('partner', 'university') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if tenant_id is null
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if another partner already exists on this tenant
  SELECT COUNT(*) INTO v_existing_partner_count
  FROM profiles
  WHERE tenant_id = NEW.tenant_id
    AND role IN ('partner', 'university')
    AND id != NEW.id;
  
  IF v_existing_partner_count > 0 THEN
    RAISE EXCEPTION 'Cannot assign partner to tenant % - another partner already exists on this tenant. Each university partner must have their own isolated tenant to prevent data mirroring.', NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_partner_tenant_isolation ON profiles;
CREATE TRIGGER enforce_partner_tenant_isolation
  BEFORE INSERT OR UPDATE OF tenant_id, role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_partner_tenant_isolation();

COMMENT ON FUNCTION public.check_partner_tenant_isolation() IS
  'Prevents multiple partner/university profiles from sharing the same tenant, which causes data mirroring.';

-- Step 5: Grant execute on the migration function
GRANT EXECUTE ON FUNCTION public.migrate_partner_to_isolated_tenant(UUID, UUID) TO authenticated;

-- Final log message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Added trigger to prevent future partner tenant sharing.';
END $$;
