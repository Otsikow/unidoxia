-- ============================================================================
-- DEFINITIVE FIX FOR MULTI-TENANT PROFILE ISOLATION
-- ============================================================================
-- 
-- This migration provides a comprehensive fix for the profile-mixing bug where
-- multiple users were being assigned the same profile record, and edits made by
-- one user would overwrite another user's profile.
--
-- ROOT CAUSE ANALYSIS:
-- 1. The profiles table uses auth.users.id as the primary key, which correctly
--    ensures each user has exactly one profile record.
-- 2. The issue is NOT at the profiles level - it's at the TENANT level for partners.
-- 3. Multiple university partners were getting assigned to shared tenants (e.g., 'unidoxia')
-- 4. Since there's ONE university record per tenant, all partners on that tenant
--    would see and edit the SAME university data.
--
-- SOLUTION:
-- 1. Enforce strict 1:1 relationship between partner profiles and tenants
-- 2. Migrate any remaining partners on shared tenants to isolated tenants
-- 3. Add proper unique constraints and triggers
-- 4. Strengthen RLS policies for complete isolation
-- 5. Add verification checks for data integrity
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Create comprehensive helper functions
-- ============================================================================

-- Function to check if a tenant is a "shared" tenant (should not have partners)
CREATE OR REPLACE FUNCTION public.is_shared_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant_slug TEXT;
  v_shared_slugs TEXT[] := ARRAY['unidoxia', 'default', 'demo', 'test'];
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT slug INTO v_tenant_slug
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  RETURN v_tenant_slug = ANY(v_shared_slugs);
END;
$$;

COMMENT ON FUNCTION public.is_shared_tenant(UUID) IS 
  'Checks if a tenant is a shared/default tenant that should not have partner profiles.';

-- Function to count partners on a tenant
CREATE OR REPLACE FUNCTION public.count_partners_on_tenant(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
    AND role IN ('partner', 'university');
  
  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.count_partners_on_tenant(UUID) IS 
  'Returns the number of partner/university profiles on a given tenant.';

-- ============================================================================
-- STEP 2: Create function to safely migrate a partner to an isolated tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.isolate_partner_tenant(p_profile_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_old_tenant_id UUID;
  v_new_tenant_id UUID;
  v_new_university_id UUID;
  v_tenant_slug TEXT;
  v_partners_on_tenant INTEGER;
BEGIN
  -- Get the partner profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Profile not found: %', p_profile_id;
    RETURN NULL;
  END IF;

  IF v_profile.role NOT IN ('partner', 'university') THEN
    RAISE WARNING 'Profile % is not a partner (role: %)', p_profile_id, v_profile.role;
    RETURN v_profile.tenant_id;
  END IF;

  v_old_tenant_id := v_profile.tenant_id;
  
  -- Check if isolation is needed
  IF NOT public.is_shared_tenant(v_old_tenant_id) THEN
    -- Check if there are other partners on this tenant
    v_partners_on_tenant := public.count_partners_on_tenant(v_old_tenant_id);
    IF v_partners_on_tenant <= 1 THEN
      RAISE NOTICE 'Partner % already has isolated tenant %', p_profile_id, v_old_tenant_id;
      RETURN v_old_tenant_id;
    END IF;
  END IF;

  -- Generate unique tenant slug
  v_tenant_slug := 'university-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8) || '-' || SUBSTRING(p_profile_id::TEXT, 1, 8);

  -- Create a new isolated tenant
  INSERT INTO public.tenants (name, slug, email_from, active, created_at, updated_at)
  VALUES (
    COALESCE(v_profile.full_name, 'University Partner') || ' Organization',
    v_tenant_slug,
    COALESCE(v_profile.email, 'noreply@unidoxia.com'),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_tenant_id;

  -- Create a new university for this tenant
  INSERT INTO public.universities (
    name,
    country,
    city,
    website,
    logo_url,
    description,
    featured_image_url,
    tenant_id,
    active,
    submission_config_json,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(v_profile.full_name, 'University Partner') || '''s University',
    COALESCE(v_profile.country, 'Unknown'),
    NULL,
    NULL,
    NULL,
    'Welcome! Please update your university profile to showcase your institution.',
    NULL,
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
      'social', jsonb_build_object(
        'website', NULL,
        'facebook', NULL,
        'instagram', NULL,
        'linkedin', NULL,
        'youtube', NULL
      ),
      'media', jsonb_build_object(
        'heroImageUrl', NULL,
        'gallery', '[]'::jsonb
      )
    ),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_university_id;

  -- Update the partner's profile to use the new tenant
  UPDATE public.profiles
  SET tenant_id = v_new_tenant_id,
      updated_at = NOW()
  WHERE id = p_profile_id;

  RAISE NOTICE 'Isolated partner % (%) from tenant % to new tenant % with university %',
    p_profile_id, v_profile.email, v_old_tenant_id, v_new_tenant_id, v_new_university_id;

  RETURN v_new_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.isolate_partner_tenant(UUID) IS 
  'Migrates a partner profile to a new isolated tenant with their own university record.';

GRANT EXECUTE ON FUNCTION public.isolate_partner_tenant(UUID) TO authenticated;

-- ============================================================================
-- STEP 3: Migrate all partners currently on shared tenants
-- ============================================================================

DO $$
DECLARE
  v_partner RECORD;
  v_migrated_count INTEGER := 0;
  v_already_isolated INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  RAISE NOTICE '=== STARTING PARTNER TENANT ISOLATION ===';

  -- Find all partner profiles that need isolation
  FOR v_partner IN 
    SELECT p.id, p.full_name, p.email, p.tenant_id, t.slug as tenant_slug
    FROM public.profiles p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.role IN ('partner', 'university')
    ORDER BY p.created_at ASC
  LOOP
    -- Check if partner needs isolation
    IF public.is_shared_tenant(v_partner.tenant_id) 
       OR public.count_partners_on_tenant(v_partner.tenant_id) > 1 
    THEN
      BEGIN
        PERFORM public.isolate_partner_tenant(v_partner.id);
        v_migrated_count := v_migrated_count + 1;
        RAISE NOTICE 'Migrated: % (%)', v_partner.full_name, v_partner.email;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors + 1;
        RAISE WARNING 'Error migrating partner % (%): %', v_partner.id, v_partner.email, SQLERRM;
      END;
    ELSE
      v_already_isolated := v_already_isolated + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '=== PARTNER TENANT ISOLATION COMPLETE ===';
  RAISE NOTICE 'Migrated: %, Already isolated: %, Errors: %', v_migrated_count, v_already_isolated, v_errors;
END $$;

-- ============================================================================
-- STEP 4: Create trigger to enforce partner tenant isolation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_partner_isolation_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_partner_count INTEGER;
BEGIN
  -- Only check for partner/university roles
  IF NEW.role NOT IN ('partner', 'university') THEN
    RETURN NEW;
  END IF;

  -- Skip if tenant_id is null (will be set later)
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent assignment to shared tenants
  IF public.is_shared_tenant(NEW.tenant_id) THEN
    RAISE EXCEPTION 'PROFILE_ISOLATION_ERROR: Cannot assign partner/university role to shared tenant. Each partner must have their own isolated tenant.';
  END IF;

  -- Check if another partner already exists on this tenant
  SELECT COUNT(*) INTO v_existing_partner_count
  FROM public.profiles
  WHERE tenant_id = NEW.tenant_id
    AND role IN ('partner', 'university')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  IF v_existing_partner_count > 0 THEN
    RAISE EXCEPTION 'PROFILE_ISOLATION_ERROR: Tenant % already has a partner profile. Each partner must have their own isolated tenant to prevent data sharing.', NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_partner_isolation_trigger() IS 
  'Trigger function that prevents multiple partners from sharing the same tenant.';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS enforce_partner_isolation ON public.profiles;
DROP TRIGGER IF EXISTS enforce_partner_tenant_isolation ON public.profiles;
DROP TRIGGER IF EXISTS enforce_partner_tenant_isolation_trigger ON public.profiles;

-- Create the trigger
CREATE TRIGGER enforce_partner_isolation
  BEFORE INSERT OR UPDATE OF tenant_id, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_partner_isolation_trigger();

-- ============================================================================
-- STEP 5: Ensure unique constraint on universities.tenant_id
-- ============================================================================

-- First, clean up any duplicate universities per tenant (keep the most recently updated)
DO $$
DECLARE
  v_duplicate RECORD;
  v_to_delete UUID[];
BEGIN
  FOR v_duplicate IN
    SELECT tenant_id, COUNT(*) as cnt
    FROM public.universities
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id
    HAVING COUNT(*) > 1
  LOOP
    -- Get IDs to delete (all except the most recently updated)
    SELECT ARRAY_AGG(id) INTO v_to_delete
    FROM (
      SELECT id
      FROM public.universities
      WHERE tenant_id = v_duplicate.tenant_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      OFFSET 1
    ) sub;

    IF v_to_delete IS NOT NULL AND array_length(v_to_delete, 1) > 0 THEN
      RAISE NOTICE 'Cleaning up % duplicate universities for tenant %', array_length(v_to_delete, 1), v_duplicate.tenant_id;
      DELETE FROM public.universities WHERE id = ANY(v_to_delete);
    END IF;
  END LOOP;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'universities_tenant_id_unique'
  ) THEN
    ALTER TABLE public.universities
    ADD CONSTRAINT universities_tenant_id_unique UNIQUE (tenant_id);
    RAISE NOTICE 'Added unique constraint universities_tenant_id_unique';
  ELSE
    RAISE NOTICE 'Constraint universities_tenant_id_unique already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Ensure proper RLS policies on profiles table
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view linked student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- POLICY: Users can ONLY view their own profile (strictest isolation)
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );

-- POLICY: Staff and admins can view all profiles
CREATE POLICY "profiles_select_staff"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_staff(auth.uid())
  );

-- POLICY: Agents can view profiles of students linked to them
CREATE POLICY "profiles_select_agent_students"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'agent'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.agent_student_links asl
      JOIN public.students s ON asl.student_id = s.id
      WHERE asl.agent_profile_id = auth.uid()
        AND s.profile_id = profiles.id
    )
  );

-- POLICY: Partners can view profiles of students who applied to their university
CREATE POLICY "profiles_select_partner_applicants"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.programs p ON a.program_id = p.id
      JOIN public.universities u ON p.university_id = u.id
      JOIN public.students s ON a.student_id = s.id
      WHERE u.tenant_id = public.get_user_tenant(auth.uid())
        AND s.profile_id = profiles.id
    )
  );

-- POLICY: Users can update ONLY their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- POLICY: Admins can manage all profiles
CREATE POLICY "profiles_admin_all"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- ============================================================================
-- STEP 7: Ensure proper RLS policies on universities table
-- ============================================================================

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "uni_select_policy" ON public.universities;
DROP POLICY IF EXISTS "uni_insert_policy" ON public.universities;
DROP POLICY IF EXISTS "uni_update_policy" ON public.universities;
DROP POLICY IF EXISTS "uni_delete_policy" ON public.universities;
DROP POLICY IF EXISTS "university_strict_select" ON public.universities;
DROP POLICY IF EXISTS "university_strict_insert" ON public.universities;
DROP POLICY IF EXISTS "university_strict_update" ON public.universities;
DROP POLICY IF EXISTS "university_admin_all" ON public.universities;
DROP POLICY IF EXISTS "Public can view active universities" ON public.universities;
DROP POLICY IF EXISTS "Admins can manage universities" ON public.universities;

-- Enable RLS
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- POLICY: SELECT - Users can view active universities or their own tenant's university
CREATE POLICY "universities_select"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (
    -- Active universities are public
    active = TRUE
    OR
    -- Users can see their own tenant's university
    tenant_id = public.get_user_tenant(auth.uid())
    OR
    -- Admins/staff can see all
    public.is_admin_or_staff(auth.uid())
  );

-- POLICY: INSERT - Only partners can create university for their own tenant
CREATE POLICY "universities_insert"
  ON public.universities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a partner
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    -- Must be for their tenant
    AND tenant_id = public.get_user_tenant(auth.uid())
  );

-- POLICY: UPDATE - Only partners can update their own tenant's university
CREATE POLICY "universities_update"
  ON public.universities
  FOR UPDATE
  TO authenticated
  USING (
    -- Partners can update their own tenant's university
    (
      public.get_user_role(auth.uid()) = 'partner'::public.app_role
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
    OR
    -- Admins can update any
    public.is_admin_or_staff(auth.uid())
  )
  WITH CHECK (
    -- Same conditions for the new values
    (
      public.get_user_role(auth.uid()) = 'partner'::public.app_role
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
    OR
    public.is_admin_or_staff(auth.uid())
  );

-- POLICY: DELETE - Only admins can delete universities
CREATE POLICY "universities_delete"
  ON public.universities
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

-- ============================================================================
-- STEP 8: Create debug function for troubleshooting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_profile_isolation(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  check_name TEXT,
  check_result TEXT,
  is_ok BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_tenant RECORD;
  v_university RECORD;
  v_partners_on_tenant INTEGER;
BEGIN
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  -- Check 1: User ID
  check_name := 'Current User ID';
  check_result := COALESCE(v_user_id::TEXT, 'NULL - not authenticated');
  is_ok := v_user_id IS NOT NULL;
  RETURN NEXT;
  
  -- Check 2: Profile exists
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  check_name := 'Profile exists';
  check_result := CASE WHEN v_profile.id IS NOT NULL THEN 'YES - ' || v_profile.email ELSE 'NO' END;
  is_ok := v_profile.id IS NOT NULL;
  RETURN NEXT;
  
  IF v_profile.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check 3: Role
  check_name := 'User Role';
  check_result := v_profile.role::TEXT;
  is_ok := TRUE;
  RETURN NEXT;
  
  -- Check 4: Tenant ID
  check_name := 'Tenant ID';
  check_result := COALESCE(v_profile.tenant_id::TEXT, 'NULL');
  is_ok := v_profile.tenant_id IS NOT NULL;
  RETURN NEXT;
  
  -- Check 5: Tenant details
  SELECT * INTO v_tenant FROM public.tenants WHERE id = v_profile.tenant_id;
  check_name := 'Tenant Name/Slug';
  check_result := COALESCE(v_tenant.name || ' (' || v_tenant.slug || ')', 'NOT FOUND');
  is_ok := v_tenant.id IS NOT NULL;
  RETURN NEXT;
  
  -- Check 6: Is shared tenant
  check_name := 'Is Shared Tenant';
  check_result := public.is_shared_tenant(v_profile.tenant_id)::TEXT;
  is_ok := NOT public.is_shared_tenant(v_profile.tenant_id) OR v_profile.role NOT IN ('partner', 'university');
  RETURN NEXT;
  
  -- Check 7: Partners on tenant
  v_partners_on_tenant := public.count_partners_on_tenant(v_profile.tenant_id);
  check_name := 'Partners on Tenant';
  check_result := v_partners_on_tenant::TEXT;
  is_ok := v_partners_on_tenant <= 1 OR v_profile.role NOT IN ('partner', 'university');
  RETURN NEXT;
  
  -- For partners, check university
  IF v_profile.role IN ('partner', 'university') THEN
    SELECT * INTO v_university
    FROM public.universities
    WHERE tenant_id = v_profile.tenant_id;
    
    check_name := 'University exists for tenant';
    check_result := CASE WHEN v_university.id IS NOT NULL THEN 'YES - ' || v_university.name ELSE 'NO' END;
    is_ok := v_university.id IS NOT NULL;
    RETURN NEXT;
    
    IF v_university.id IS NOT NULL THEN
      check_name := 'University tenant matches profile tenant';
      check_result := (v_university.tenant_id = v_profile.tenant_id)::TEXT;
      is_ok := v_university.tenant_id = v_profile.tenant_id;
      RETURN NEXT;
    END IF;
  END IF;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.debug_profile_isolation(UUID) IS 
  'Debug function to check profile isolation status for a user.';

GRANT EXECUTE ON FUNCTION public.debug_profile_isolation(UUID) TO authenticated;

-- ============================================================================
-- STEP 9: Verification
-- ============================================================================

DO $$
DECLARE
  v_total_partners INTEGER;
  v_isolated_partners INTEGER;
  v_shared_partners INTEGER;
  v_tenants_with_multiple INTEGER;
BEGIN
  -- Count total partners
  SELECT COUNT(*) INTO v_total_partners
  FROM public.profiles
  WHERE role IN ('partner', 'university');
  
  -- Count partners on shared tenants
  SELECT COUNT(*) INTO v_shared_partners
  FROM public.profiles p
  WHERE p.role IN ('partner', 'university')
    AND public.is_shared_tenant(p.tenant_id);
  
  -- Count tenants with multiple partners
  SELECT COUNT(*) INTO v_tenants_with_multiple
  FROM (
    SELECT tenant_id
    FROM public.profiles
    WHERE role IN ('partner', 'university')
    GROUP BY tenant_id
    HAVING COUNT(*) > 1
  ) multi;
  
  v_isolated_partners := v_total_partners - v_shared_partners;
  
  RAISE NOTICE '=== PROFILE ISOLATION VERIFICATION ===';
  RAISE NOTICE 'Total partners: %', v_total_partners;
  RAISE NOTICE 'Properly isolated partners: %', v_isolated_partners;
  RAISE NOTICE 'Partners on shared tenants (ERROR): %', v_shared_partners;
  RAISE NOTICE 'Tenants with multiple partners (ERROR): %', v_tenants_with_multiple;
  
  IF v_shared_partners > 0 THEN
    RAISE WARNING '!!! CRITICAL: % partners are still on shared tenants!', v_shared_partners;
  END IF;
  
  IF v_tenants_with_multiple > 0 THEN
    RAISE WARNING '!!! CRITICAL: % tenants have multiple partners!', v_tenants_with_multiple;
  END IF;
  
  IF v_shared_partners = 0 AND v_tenants_with_multiple = 0 THEN
    RAISE NOTICE 'All partners are properly isolated.';
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
COMMENT ON SCHEMA public IS 'Profile isolation fix applied - each partner has their own tenant.';
