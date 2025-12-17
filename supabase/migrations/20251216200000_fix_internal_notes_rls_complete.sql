-- ============================================================================
-- FIX: Internal Notes Save Failing (RLS / Permissions)
-- ============================================================================
-- This migration permanently fixes the "Permission denied" error when university
-- staff attempt to save internal notes on application cards.
--
-- ROOT CAUSE:
-- 1. Users have role='university' but app_role enum only has 'partner', not 'university'
-- 2. Some RLS policies check raw role column instead of using get_user_role() function
-- 3. Missing admin/staff in UPDATE policy USING clause
--
-- SOLUTION:
-- 1. Convert ALL 'university' roles to 'partner' in profiles table
-- 2. Fix get_user_role() function to be more robust
-- 3. Recreate RLS policies with correct role checks
-- 4. Recreate update_application_review RPC with proper permissions
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Convert all 'university' roles to 'partner' in profiles table
-- ============================================================================
-- The app_role enum does NOT include 'university', only 'partner'.
-- This is a data fix to ensure all university users have the correct role.

UPDATE public.profiles
SET role = 'partner'
WHERE role::TEXT = 'university';

-- Log how many rows were updated
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Converted % profiles from role "university" to "partner"', v_count;
  ELSE
    RAISE NOTICE 'No profiles with role "university" found - no conversion needed';
  END IF;
END$$;

-- ============================================================================
-- STEP 2: Create/replace robust get_user_role function
-- ============================================================================
-- This function handles the 'university' -> 'partner' mapping and other edge cases

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  raw_role TEXT;
  mapped_role public.app_role;
BEGIN
  -- Handle NULL user_id
  IF user_id IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

  -- Get the raw role from profiles
  SELECT role::TEXT INTO raw_role
  FROM public.profiles
  WHERE id = user_id;

  -- Handle missing profile
  IF raw_role IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

  -- Normalize and map the role
  raw_role := LOWER(TRIM(raw_role));

  CASE raw_role
    -- University users -> partner (this is the critical mapping)
    WHEN 'university' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_admin' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_staff' THEN mapped_role := 'partner'::public.app_role;
    -- Direct mappings
    WHEN 'partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'student' THEN mapped_role := 'student'::public.app_role;
    WHEN 'agent' THEN mapped_role := 'agent'::public.app_role;
    WHEN 'staff' THEN mapped_role := 'staff'::public.app_role;
    WHEN 'admin' THEN mapped_role := 'admin'::public.app_role;
    WHEN 'counselor' THEN mapped_role := 'counselor'::public.app_role;
    WHEN 'verifier' THEN mapped_role := 'verifier'::public.app_role;
    WHEN 'finance' THEN mapped_role := 'finance'::public.app_role;
    WHEN 'school_rep' THEN mapped_role := 'school_rep'::public.app_role;
    -- Default fallback
    ELSE mapped_role := 'student'::public.app_role;
  END CASE;

  RETURN mapped_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon;

COMMENT ON FUNCTION public.get_user_role(UUID) IS 
  'Returns the mapped app_role for a user, converting "university" to "partner".';

-- ============================================================================
-- STEP 3: Create/replace get_user_tenant function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (SELECT tenant_id FROM public.profiles WHERE id = user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_tenant(UUID) TO authenticated, anon;

-- ============================================================================
-- STEP 4: Create/replace is_admin_or_staff function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.get_user_role(user_id) IN ('admin'::public.app_role, 'staff'::public.app_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(UUID) TO authenticated, anon;

-- ============================================================================
-- STEP 5: Create is_university_partner function for cleaner RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_university_partner(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_role := public.get_user_role(user_id);
  
  RETURN v_role IN ('partner'::public.app_role, 'school_rep'::public.app_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_university_partner(UUID) TO authenticated, anon;

COMMENT ON FUNCTION public.is_university_partner(UUID) IS 
  'Returns TRUE if user is a university partner (partner or school_rep role).';

-- ============================================================================
-- STEP 6: Drop ALL conflicting application policies
-- ============================================================================

DROP POLICY IF EXISTS "app_select_policy" ON public.applications;
DROP POLICY IF EXISTS "app_update_policy" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_select" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_update" ON public.applications;
DROP POLICY IF EXISTS "university_partner_applications_select" ON public.applications;
DROP POLICY IF EXISTS "university_partner_applications_update" ON public.applications;
DROP POLICY IF EXISTS "applications_school_rep_select" ON public.applications;
DROP POLICY IF EXISTS "applications_school_rep_update" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can update applications to their programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their university" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their university programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can update applications to their university programs" ON public.applications;

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create comprehensive SELECT policy for applications
-- ============================================================================

CREATE POLICY "applications_select_comprehensive"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can see their own applications
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
    OR
    -- Agent can see applications they submitted
    agent_id IN (
      SELECT id FROM public.agents WHERE profile_id = auth.uid()
    )
    OR
    -- University partner (partner or school_rep) can see applications to their programs
    (
      public.is_university_partner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  );

-- ============================================================================
-- STEP 8: Create comprehensive UPDATE policy for applications
-- ============================================================================
-- CRITICAL: This policy must include BOTH admin/staff AND university partners

CREATE POLICY "applications_update_comprehensive"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    -- Admin/staff can update ALL applications
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partner (partner or school_rep) can update applications to their programs
    (
      public.is_university_partner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row
    public.is_admin_or_staff(auth.uid())
    OR
    (
      public.is_university_partner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  );

-- ============================================================================
-- STEP 9: Recreate update_application_review RPC with better error handling
-- ============================================================================

-- Ensure 'rejected' status exists in enum (in case it's missing)
DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE OR REPLACE FUNCTION public.update_application_review(
  p_application_id UUID,
  p_new_status public.application_status DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_append_timeline_event JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status public.application_status,
  internal_notes TEXT,
  timeline_json JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_tenant UUID;
  v_user_role public.app_role;
  v_app_tenant UUID;
  v_app_exists BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please log in and try again.' USING ERRCODE = '28000';
  END IF;

  -- Get user role using the mapping function
  v_user_role := public.get_user_role(v_user_id);

  -- Check if user has permission to update applications
  IF NOT (
    v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    OR public.is_admin_or_staff(v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to update applications. Your role (%) does not have permission.', v_user_role 
      USING ERRCODE = '42501';
  END IF;

  -- Check if application exists
  SELECT EXISTS(SELECT 1 FROM public.applications WHERE applications.id = p_application_id) INTO v_app_exists;
  IF NOT v_app_exists THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  -- For university partner roles: ensure the application belongs to their tenant
  IF NOT public.is_admin_or_staff(v_user_id) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);

    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Your account is not associated with a university. Please contact support. User ID: %', v_user_id 
        USING ERRCODE = '42501';
    END IF;

    -- Get the application's tenant
    SELECT u.tenant_id INTO v_app_tenant
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;

    IF v_app_tenant IS NULL THEN
      RAISE EXCEPTION 'Application program or university not properly configured. App ID: %', p_application_id 
        USING ERRCODE = '42501';
    END IF;

    IF v_app_tenant != v_user_tenant THEN
      RAISE EXCEPTION 'You do not have permission to update this application. It belongs to a different university.' 
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Perform the update
  UPDATE public.applications a
  SET
    status = COALESCE(p_new_status, a.status),
    internal_notes = COALESCE(p_internal_notes, a.internal_notes),
    timeline_json = CASE
      WHEN p_append_timeline_event IS NULL THEN a.timeline_json
      WHEN a.timeline_json IS NULL THEN jsonb_build_array(p_append_timeline_event)
      WHEN jsonb_typeof(a.timeline_json) = 'array' THEN a.timeline_json || jsonb_build_array(p_append_timeline_event)
      ELSE jsonb_build_array(p_append_timeline_event)
    END,
    updated_at = now()
  WHERE a.id = p_application_id
  RETURNING a.id, a.status, a.internal_notes, a.timeline_json, a.updated_at
  INTO id, status, internal_notes, timeline_json, updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update application. It may have been deleted. App ID: %', p_application_id 
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO anon;

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Update application status, internal notes, and timeline. Authorized for university partners and staff/admin.';

-- ============================================================================
-- STEP 10: Create debug function for troubleshooting access issues
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_notes_access(target_application_id UUID DEFAULT NULL)
RETURNS TABLE(
  check_name TEXT,
  check_result TEXT,
  check_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_raw_role TEXT;
  v_mapped_role public.app_role;
  v_user_tenant UUID;
  v_app_tenant UUID;
  v_app_exists BOOLEAN;
  v_is_partner BOOLEAN;
  v_is_admin BOOLEAN;
  v_can_update BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Check 1: Authentication
  check_name := '1. Authenticated User';
  IF v_user_id IS NULL THEN
    check_result := 'NOT AUTHENTICATED';
    check_status := 'FAIL';
  ELSE
    check_result := v_user_id::TEXT;
    check_status := 'PASS';
  END IF;
  RETURN NEXT;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check 2: Raw role from profiles
  check_name := '2. Raw Profile Role';
  SELECT role::TEXT INTO v_raw_role FROM public.profiles WHERE id = v_user_id;
  check_result := COALESCE(v_raw_role, 'NULL - no profile found');
  check_status := CASE WHEN v_raw_role IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- Check 3: Mapped role
  check_name := '3. Mapped Role (via get_user_role)';
  v_mapped_role := public.get_user_role(v_user_id);
  check_result := v_mapped_role::TEXT;
  check_status := 'PASS';
  RETURN NEXT;

  -- Check 4: Is university partner?
  check_name := '4. Is University Partner (partner/school_rep)';
  v_is_partner := public.is_university_partner(v_user_id);
  check_result := v_is_partner::TEXT;
  check_status := CASE WHEN v_is_partner THEN 'PASS' ELSE 'INFO' END;
  RETURN NEXT;

  -- Check 5: Is admin/staff?
  check_name := '5. Is Admin/Staff';
  v_is_admin := public.is_admin_or_staff(v_user_id);
  check_result := v_is_admin::TEXT;
  check_status := CASE WHEN v_is_admin THEN 'PASS' ELSE 'INFO' END;
  RETURN NEXT;

  -- Check 6: Has any update permission?
  check_name := '6. Has Update Permission (partner OR admin)';
  check_result := (v_is_partner OR v_is_admin)::TEXT;
  check_status := CASE WHEN (v_is_partner OR v_is_admin) THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- Check 7: User tenant
  check_name := '7. User Tenant ID';
  v_user_tenant := public.get_user_tenant(v_user_id);
  check_result := COALESCE(v_user_tenant::TEXT, 'NULL - no tenant assigned');
  check_status := CASE WHEN v_user_tenant IS NOT NULL OR v_is_admin THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- If application ID provided, check specific access
  IF target_application_id IS NOT NULL THEN
    -- Check 8: Application exists
    check_name := '8. Application Exists';
    SELECT EXISTS(SELECT 1 FROM public.applications WHERE id = target_application_id) INTO v_app_exists;
    check_result := v_app_exists::TEXT;
    check_status := CASE WHEN v_app_exists THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    IF v_app_exists THEN
      -- Check 9: Application's tenant
      check_name := '9. Application Tenant ID';
      SELECT u.tenant_id INTO v_app_tenant
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.id = target_application_id;
      check_result := COALESCE(v_app_tenant::TEXT, 'NULL - program/university not configured');
      check_status := CASE WHEN v_app_tenant IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
      RETURN NEXT;

      -- Check 10: Tenant match
      check_name := '10. Tenant Match (user vs application)';
      IF v_is_admin THEN
        check_result := 'ADMIN - bypasses tenant check';
        check_status := 'PASS';
      ELSIF v_user_tenant IS NULL THEN
        check_result := 'FAIL - user has no tenant';
        check_status := 'FAIL';
      ELSIF v_app_tenant IS NULL THEN
        check_result := 'FAIL - app has no tenant';
        check_status := 'FAIL';
      ELSIF v_user_tenant = v_app_tenant THEN
        check_result := 'MATCH - ' || v_user_tenant::TEXT;
        check_status := 'PASS';
      ELSE
        check_result := 'MISMATCH - user: ' || v_user_tenant::TEXT || ', app: ' || v_app_tenant::TEXT;
        check_status := 'FAIL';
      END IF;
      RETURN NEXT;

      -- Check 11: Final update permission
      check_name := '11. CAN UPDATE THIS APPLICATION';
      v_can_update := v_is_admin OR (v_is_partner AND v_user_tenant IS NOT NULL AND v_user_tenant = v_app_tenant);
      check_result := v_can_update::TEXT;
      check_status := CASE WHEN v_can_update THEN 'PASS' ELSE 'FAIL' END;
      RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_notes_access(UUID) TO authenticated;

COMMENT ON FUNCTION public.debug_notes_access(UUID) IS
  'Debug function to diagnose why saving notes might fail. Call with application ID to check specific access.';

-- ============================================================================
-- STEP 11: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_applications_program_id ON public.applications(program_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_programs_university_id ON public.programs(university_id);
CREATE INDEX IF NOT EXISTS idx_universities_tenant_id ON public.universities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- STEP 12: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY (run manually after migration):
-- SELECT * FROM debug_notes_access('your-application-id-here');
-- ============================================================================
