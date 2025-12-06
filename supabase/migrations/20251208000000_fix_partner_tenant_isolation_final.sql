-- ============================================================================
-- FINAL FIX FOR UNIVERSITY PARTNER TENANT ISOLATION
-- ============================================================================
-- This migration addresses the root cause of the issue where all university
-- partners were seeing the same "Pineapple University" profile data.
--
-- Root Cause Analysis:
-- 1. Partners were being assigned to shared tenants (e.g., 'unidoxia')
-- 2. Multiple partners with the same tenant_id would share university data
-- 3. The application's fallback logic silently continued with shared data
--
-- This migration:
-- 1. Creates isolated tenants for any partners still on shared tenants
-- 2. Creates new universities for each isolated tenant
-- 3. Adds stricter RLS policies to prevent cross-tenant data access
-- 4. Adds a trigger to log partner tenant assignments for debugging
-- ============================================================================

-- ============================================================================
-- STEP 1: Identify the shared/default tenant
-- ============================================================================

DO $$
DECLARE
  v_default_tenant_id UUID;
  v_default_tenant_slug TEXT := 'unidoxia';
BEGIN
  -- Find the default tenant
  SELECT id INTO v_default_tenant_id
  FROM public.tenants
  WHERE slug = v_default_tenant_slug;

  IF v_default_tenant_id IS NOT NULL THEN
    RAISE NOTICE 'Found default tenant: % (%)', v_default_tenant_slug, v_default_tenant_id;
  ELSE
    RAISE NOTICE 'No default tenant found with slug: %', v_default_tenant_slug;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create a function to migrate partners to isolated tenants
-- ============================================================================

CREATE OR REPLACE FUNCTION public.migrate_partner_to_isolated_tenant(
  p_profile_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_old_tenant_id UUID;
  v_new_tenant_id UUID;
  v_university_name TEXT;
  v_tenant_slug TEXT;
BEGIN
  -- Get the partner profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id AND role = 'partner';

  IF NOT FOUND THEN
    RAISE NOTICE 'Profile not found or not a partner: %', p_profile_id;
    RETURN NULL;
  END IF;

  v_old_tenant_id := v_profile.tenant_id;

  -- Check if already on an isolated tenant (one that has a university belonging to this partner)
  PERFORM 1 FROM public.universities u
  JOIN public.tenants t ON t.id = u.tenant_id
  WHERE u.tenant_id = v_old_tenant_id
    AND t.slug NOT IN ('unidoxia', 'default')
    AND (
      -- Check if this is likely this partner's university
      u.name ILIKE '%' || v_profile.full_name || '%'
      OR u.name ILIKE v_profile.full_name || '''s University%'
    );

  IF FOUND THEN
    RAISE NOTICE 'Partner % already has isolated university', p_profile_id;
    RETURN v_old_tenant_id;
  END IF;

  -- Create a new isolated tenant
  v_tenant_slug := 'university-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 12) || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
  
  INSERT INTO public.tenants (name, slug, email_from, active)
  VALUES (
    COALESCE(v_profile.full_name, 'University Partner'),
    v_tenant_slug,
    v_profile.email,
    true
  )
  RETURNING id INTO v_new_tenant_id;

  -- Create a new university for this tenant
  v_university_name := COALESCE(v_profile.full_name, 'University Partner') || '''s University';

  INSERT INTO public.universities (
    name,
    country,
    city,
    website,
    logo_url,
    description,
    tenant_id,
    active,
    created_at,
    updated_at
  ) VALUES (
    v_university_name,
    COALESCE(v_profile.country, 'Unknown'),
    NULL,
    NULL,
    NULL,
    'Welcome! Please update your profile to showcase your institution.',
    v_new_tenant_id,
    true,
    NOW(),
    NOW()
  );

  -- Update the partner's profile to use the new tenant
  UPDATE public.profiles
  SET tenant_id = v_new_tenant_id
  WHERE id = p_profile_id;

  RAISE NOTICE 'Migrated partner % from tenant % to new tenant %', 
    p_profile_id, v_old_tenant_id, v_new_tenant_id;

  RETURN v_new_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.migrate_partner_to_isolated_tenant(UUID) IS
  'Migrates a partner profile to an isolated tenant with their own university.';

-- ============================================================================
-- STEP 3: Migrate existing partners on shared tenants
-- ============================================================================

DO $$
DECLARE
  v_partner RECORD;
  v_default_tenant_id UUID;
  v_migrated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Find the default tenant
  SELECT id INTO v_default_tenant_id
  FROM public.tenants
  WHERE slug = 'unidoxia';

  IF v_default_tenant_id IS NULL THEN
    RAISE NOTICE 'No default tenant found - skipping migration';
    RETURN;
  END IF;

  -- Find all partner profiles on the default tenant
  FOR v_partner IN 
    SELECT p.id, p.full_name, p.email
    FROM public.profiles p
    WHERE p.role = 'partner' 
      AND p.tenant_id = v_default_tenant_id
  LOOP
    BEGIN
      PERFORM public.migrate_partner_to_isolated_tenant(v_partner.id);
      v_migrated_count := v_migrated_count + 1;
      RAISE NOTICE 'Migrated partner: % (%)', v_partner.full_name, v_partner.email;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
      RAISE WARNING 'Failed to migrate partner %: %', v_partner.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Migration complete. Migrated: %, Skipped: %', v_migrated_count, v_skipped_count;
END $$;

-- ============================================================================
-- STEP 4: Add a trigger to prevent partners from being assigned to shared tenants
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_partner_tenant_isolation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug TEXT;
  v_shared_slugs TEXT[] := ARRAY['unidoxia', 'default'];
BEGIN
  -- Only check partner role
  IF NEW.role != 'partner' THEN
    RETURN NEW;
  END IF;

  -- Get the tenant slug
  SELECT slug INTO v_tenant_slug
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  -- Check if it's a shared tenant
  IF v_tenant_slug = ANY(v_shared_slugs) THEN
    -- For INSERT: Reject assignment to shared tenant
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'PARTNER_ISOLATION: Cannot create partner profile on shared tenant "%" - each partner requires an isolated tenant', v_tenant_slug;
    END IF;
    
    -- For UPDATE: Only reject if changing TO a shared tenant
    IF TG_OP = 'UPDATE' AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'PARTNER_ISOLATION: Cannot migrate partner profile to shared tenant "%" - partners must have isolated tenants', v_tenant_slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_partner_tenant_isolation() IS
  'Prevents partner profiles from being assigned to shared tenants.';

-- Note: We don't enable this trigger by default as it might break existing workflows
-- Enable it manually after verifying all partners are migrated:
-- CREATE TRIGGER enforce_partner_tenant_isolation_trigger
--   BEFORE INSERT OR UPDATE ON public.profiles
--   FOR EACH ROW
--   WHEN (NEW.role = 'partner')
--   EXECUTE FUNCTION public.enforce_partner_tenant_isolation();

-- ============================================================================
-- STEP 5: Ensure universities table has proper constraints
-- ============================================================================

-- Ensure unique constraint on tenant_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'universities_tenant_id_unique'
      AND conrelid = 'public.universities'::regclass
  ) THEN
    -- Clean up any duplicates first
    WITH ranked AS (
      SELECT 
        id,
        tenant_id,
        ROW_NUMBER() OVER (
          PARTITION BY tenant_id 
          ORDER BY active DESC NULLS LAST, updated_at DESC NULLS LAST
        ) as rn
      FROM public.universities
      WHERE tenant_id IS NOT NULL
    ),
    duplicates AS (
      SELECT id FROM ranked WHERE rn > 1
    )
    DELETE FROM public.universities WHERE id IN (SELECT id FROM duplicates);

    -- Add the unique constraint
    ALTER TABLE public.universities
    ADD CONSTRAINT universities_tenant_id_unique UNIQUE (tenant_id);
    
    RAISE NOTICE 'Added unique constraint universities_tenant_id_unique';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Update RLS policies for stricter isolation
-- ============================================================================

-- Drop existing university policies for partners
DROP POLICY IF EXISTS "partner_read_own_university" ON public.universities;
DROP POLICY IF EXISTS "partner_create_university" ON public.universities;
DROP POLICY IF EXISTS "partner_update_university" ON public.universities;
DROP POLICY IF EXISTS "university_select" ON public.universities;
DROP POLICY IF EXISTS "university_insert" ON public.universities;
DROP POLICY IF EXISTS "university_update" ON public.universities;

-- Enable RLS
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- SELECT: Partners can only see their own tenant's university OR public (active) universities
CREATE POLICY "university_strict_select"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own tenant's university
    tenant_id = public.get_user_tenant(auth.uid())
    OR
    -- Active universities are public for browsing (students, agents)
    (
      active = true 
      AND public.get_user_role(auth.uid()) IN ('student'::public.app_role, 'agent'::public.app_role)
    )
    OR
    -- Admins can see all
    public.is_admin_or_staff(auth.uid())
  );

-- INSERT: Partners can only create university for their own tenant
CREATE POLICY "university_strict_insert"
  ON public.universities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a partner
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    -- Must be for their tenant
    AND tenant_id = public.get_user_tenant(auth.uid())
    -- Tenant must not already have a university (unique constraint backup)
    AND NOT EXISTS (
      SELECT 1 FROM public.universities u 
      WHERE u.tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- UPDATE: Partners can only update their own tenant's university
CREATE POLICY "university_strict_update"
  ON public.universities
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    AND tenant_id = public.get_user_tenant(auth.uid())
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    AND tenant_id = public.get_user_tenant(auth.uid())
    -- Cannot change tenant_id
    AND tenant_id = public.get_user_tenant(auth.uid())
  );

-- Admin policy for full access
CREATE POLICY "university_admin_all"
  ON public.universities
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- ============================================================================
-- STEP 7: Add logging for debugging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_partner_tenant_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug TEXT;
BEGIN
  IF NEW.role != 'partner' THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_tenant_slug
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  IF TG_OP = 'INSERT' THEN
    RAISE LOG 'PARTNER_ASSIGNMENT [INSERT]: Partner % (%) assigned to tenant % (%)',
      NEW.id, NEW.email, NEW.tenant_id, v_tenant_slug;
  ELSIF TG_OP = 'UPDATE' AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE LOG 'PARTNER_ASSIGNMENT [MIGRATE]: Partner % (%) moved from tenant % to % (%)',
      NEW.id, NEW.email, OLD.tenant_id, NEW.tenant_id, v_tenant_slug;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_partner_tenant_assignment_trigger ON public.profiles;
CREATE TRIGGER log_partner_tenant_assignment_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'partner')
  EXECUTE FUNCTION public.log_partner_tenant_assignment();

-- ============================================================================
-- VERIFICATION: Show current state of partner tenants
-- ============================================================================

DO $$
DECLARE
  v_partner_count INTEGER;
  v_isolated_count INTEGER;
  v_shared_count INTEGER;
BEGIN
  -- Count total partners
  SELECT COUNT(*) INTO v_partner_count
  FROM public.profiles WHERE role = 'partner';

  -- Count partners on shared tenants
  SELECT COUNT(*) INTO v_shared_count
  FROM public.profiles p
  JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.role = 'partner' AND t.slug IN ('unidoxia', 'default');

  v_isolated_count := v_partner_count - v_shared_count;

  RAISE NOTICE '=== PARTNER TENANT ISOLATION STATUS ===';
  RAISE NOTICE 'Total partners: %', v_partner_count;
  RAISE NOTICE 'Isolated partners: %', v_isolated_count;
  RAISE NOTICE 'Partners on shared tenants: %', v_shared_count;
  
  IF v_shared_count > 0 THEN
    RAISE WARNING 'There are still % partners on shared tenants. Run migrate_partner_to_isolated_tenant() for each.', v_shared_count;
  ELSE
    RAISE NOTICE 'All partners are properly isolated!';
  END IF;
END $$;

-- ============================================================================
-- DONE: Partner tenant isolation is now enforced at the database level
-- ============================================================================
