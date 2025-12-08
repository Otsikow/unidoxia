-- ============================================================================
-- FIX MULTI-TENANT PROFILE ISOLATION FOR UNIVERSITY PARTNERS
-- ============================================================================
-- This migration:
-- 1. Creates isolated tenants for each partner profile
-- 2. Creates isolated universities for each partner
-- 3. Updates profile tenant_id references
-- ============================================================================

-- Step 1: Create a function to safely isolate partner profiles
CREATE OR REPLACE FUNCTION public.isolate_partner_profile(p_profile_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_new_tenant_id UUID;
  v_new_university_id UUID;
  v_tenant_slug TEXT;
BEGIN
  -- Get the partner profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id AND role = 'partner';
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Generate unique tenant slug
  v_tenant_slug := 'university-' || gen_random_uuid()::text;
  
  -- Create a new isolated tenant for this partner
  INSERT INTO tenants (name, slug, email_from, active)
  VALUES (
    COALESCE(v_profile.full_name || '''s University', 'University Partner'),
    v_tenant_slug,
    COALESCE(v_profile.email, 'noreply@example.com'),
    true
  )
  RETURNING id INTO v_new_tenant_id;
  
  -- Create a fresh university for this partner's new tenant
  INSERT INTO universities (
    tenant_id,
    name,
    country,
    active,
    submission_config_json
  )
  VALUES (
    v_new_tenant_id,
    COALESCE(v_profile.full_name || '''s University', 'University'),
    COALESCE(v_profile.country, 'Unknown'),
    true,
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
    )
  )
  RETURNING id INTO v_new_university_id;
  
  -- Update the profile to use the new isolated tenant
  UPDATE profiles
  SET tenant_id = v_new_tenant_id
  WHERE id = p_profile_id;
  
  RETURN v_new_tenant_id;
END;
$$;

-- Step 2: Create a helper function to check if a profile needs isolation
CREATE OR REPLACE FUNCTION public.partner_needs_isolation(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN tenants t ON p.tenant_id = t.id
    WHERE p.id = p_profile_id
    AND p.role = 'partner'
    AND (
      -- On a shared/default tenant
      t.slug IN ('geg-global', 'unidoxia', 'default')
      OR
      -- Other partners exist on the same tenant
      EXISTS (
        SELECT 1 FROM profiles p2 
        WHERE p2.tenant_id = p.tenant_id 
        AND p2.role = 'partner' 
        AND p2.id != p.id
      )
    )
  );
$$;

-- Step 3: Get the default shared tenant ID
DO $$
DECLARE
  v_shared_tenant_id UUID;
  v_partner RECORD;
  v_new_tenant_id UUID;
BEGIN
  -- Find the shared tenant (geg-global)
  SELECT id INTO v_shared_tenant_id FROM tenants WHERE slug = 'geg-global' LIMIT 1;
  
  IF v_shared_tenant_id IS NULL THEN
    RAISE NOTICE 'No shared tenant (geg-global) found - nothing to migrate';
    RETURN;
  END IF;
  
  -- Isolate each partner on the shared tenant
  FOR v_partner IN 
    SELECT DISTINCT ON (id) p.* 
    FROM profiles p 
    WHERE p.role = 'partner' 
    AND p.tenant_id = v_shared_tenant_id
    ORDER BY p.id, p.created_at
  LOOP
    RAISE NOTICE 'Isolating partner: % (%)', v_partner.email, v_partner.id;
    
    SELECT public.isolate_partner_profile(v_partner.id) INTO v_new_tenant_id;
    
    IF v_new_tenant_id IS NOT NULL THEN
      RAISE NOTICE 'Created isolated tenant % for partner %', v_new_tenant_id, v_partner.email;
    ELSE
      RAISE WARNING 'Failed to isolate partner: %', v_partner.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Partner isolation complete';
END;
$$;

-- Step 4: Add an index to improve tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_universities_tenant ON universities(tenant_id);

-- Step 5: Clean up duplicate profiles with same email (keep only the first one by created_at)
-- First, identify duplicates
DO $$
DECLARE
  v_dup RECORD;
BEGIN
  FOR v_dup IN
    SELECT email, array_agg(id ORDER BY created_at) as profile_ids
    FROM profiles
    WHERE role = 'partner'
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Duplicate partner email found: % with IDs: %', v_dup.email, v_dup.profile_ids;
    -- We don't delete automatically - just log for review
    -- The newer duplicates should be on their own isolated tenants now
  END LOOP;
END;
$$;