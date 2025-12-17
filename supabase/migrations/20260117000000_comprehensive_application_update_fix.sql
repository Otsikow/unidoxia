-- ============================================================================
-- COMPREHENSIVE FIX: Application Status/Notes Update Permissions
-- ============================================================================
-- This migration permanently fixes the "Permission denied" and RLS errors
-- when university partners try to update application status or internal notes.
--
-- ROOT CAUSES ADDRESSED:
-- 1. Users with role='university' not recognized (enum only has 'partner')
-- 2. Missing or incorrectly configured SECURITY DEFINER RPC function
-- 3. Tenant mismatch between user profile and application's university
-- 4. RLS policies blocking the fallback direct UPDATE path
-- 5. Missing columns in programs/students tables causing 400/406 errors
--
-- SOLUTION:
-- 1. Convert all 'university' roles to 'partner' in profiles table
-- 2. Ensure all helper functions exist and work correctly
-- 3. Recreate RPC function with comprehensive authorization checks
-- 4. Add missing columns to programs and students tables
-- 5. Create unified RLS policies that work with the RPC pattern
-- 6. Force PostgREST schema cache reload
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add Missing Columns to Tables
-- ============================================================================
-- These columns are expected by the frontend but may be missing

-- Programs table additions
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS app_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- Ensure 'active' column exists (should already exist but be safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'programs' 
    AND column_name = 'active'
  ) THEN
    ALTER TABLE public.programs ADD COLUMN active BOOLEAN DEFAULT TRUE;
  END IF;
END$$;

-- Students table additions
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS guardian JSONB,
ADD COLUMN IF NOT EXISTS finances_json JSONB,
ADD COLUMN IF NOT EXISTS visa_history_json JSONB,
ADD COLUMN IF NOT EXISTS passport_expiry DATE,
ADD COLUMN IF NOT EXISTS current_country TEXT,
ADD COLUMN IF NOT EXISTS preferred_name TEXT,
ADD COLUMN IF NOT EXISTS legal_name TEXT;

-- Applications table: ensure timeline_json column exists
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS timeline_json JSONB,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS app_number TEXT;

-- ============================================================================
-- STEP 2: Convert all 'university' roles to 'partner'
-- ============================================================================
-- The app_role enum does NOT include 'university', only 'partner'

UPDATE public.profiles
SET role = 'partner'::public.app_role
WHERE role::TEXT IN ('university', 'university_admin', 'university_staff');

-- ============================================================================
-- STEP 3: Ensure app_role enum has 'school_rep' value
-- ============================================================================

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_rep';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'counselor';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'verifier';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- ============================================================================
-- STEP 4: Ensure application_status enum has all required values
-- ============================================================================

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'under_review';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'pending_documents';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'interview_scheduled';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- ============================================================================
-- STEP 5: Create/Replace helper functions
-- ============================================================================

-- get_user_role: Returns mapped app_role, converting 'university' to 'partner'
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
  IF user_id IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

  SELECT role::TEXT INTO raw_role
  FROM public.profiles
  WHERE id = user_id;

  IF raw_role IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

  raw_role := LOWER(TRIM(raw_role));

  CASE raw_role
    WHEN 'university' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_admin' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_staff' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'student' THEN mapped_role := 'student'::public.app_role;
    WHEN 'agent' THEN mapped_role := 'agent'::public.app_role;
    WHEN 'staff' THEN mapped_role := 'staff'::public.app_role;
    WHEN 'admin' THEN mapped_role := 'admin'::public.app_role;
    WHEN 'counselor' THEN mapped_role := 'counselor'::public.app_role;
    WHEN 'verifier' THEN mapped_role := 'verifier'::public.app_role;
    WHEN 'finance' THEN mapped_role := 'finance'::public.app_role;
    WHEN 'school_rep' THEN mapped_role := 'school_rep'::public.app_role;
    ELSE mapped_role := 'student'::public.app_role;
  END CASE;

  RETURN mapped_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon, service_role;

-- get_user_tenant: Returns user's tenant_id
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

GRANT EXECUTE ON FUNCTION public.get_user_tenant(UUID) TO authenticated, anon, service_role;

-- is_admin_or_staff: Returns TRUE if user is admin or staff
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

GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(UUID) TO authenticated, anon, service_role;

-- is_university_partner: Returns TRUE if user is a university partner
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

GRANT EXECUTE ON FUNCTION public.is_university_partner(UUID) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 6: Create the main update_application_review RPC function
-- ============================================================================
-- This function uses SECURITY DEFINER to bypass RLS, but performs its own
-- authorization checks to ensure users can only update applications they own.

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
  
  -- Log for debugging (visible in Supabase logs)
  RAISE LOG 'update_application_review: user_id=%, role=%, app_id=%', v_user_id, v_user_role, p_application_id;

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
      RAISE EXCEPTION 'Your account is not associated with a university. Please contact support.' 
        USING ERRCODE = '42501';
    END IF;

    -- Get the application's tenant via program -> university
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Update application status, internal notes, and timeline. Authorized for university partners and staff/admin.';

-- ============================================================================
-- STEP 7: Create an alternative RPC with text status parameter
-- ============================================================================
-- This version accepts status as TEXT and converts it to the enum internally,
-- which can help avoid enum casting issues on the client side.

CREATE OR REPLACE FUNCTION public.update_application_review_text(
  p_application_id UUID,
  p_new_status TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_append_timeline_event JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  internal_notes TEXT,
  timeline_json JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.application_status;
  v_result RECORD;
BEGIN
  -- Convert text status to enum if provided
  IF p_new_status IS NOT NULL AND p_new_status != '' THEN
    BEGIN
      v_status := p_new_status::public.application_status;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid status value: %. Valid values are: draft, submitted, screening, under_review, conditional_offer, unconditional_offer, cas_loa, visa, enrolled, withdrawn, deferred, rejected', p_new_status
        USING ERRCODE = '22P02';
    END;
  ELSE
    v_status := NULL;
  END IF;

  -- Call the main function
  SELECT * INTO v_result
  FROM public.update_application_review(
    p_application_id,
    v_status,
    p_internal_notes,
    p_append_timeline_event
  );

  id := v_result.id;
  status := v_result.status::TEXT;
  internal_notes := v_result.internal_notes;
  timeline_json := v_result.timeline_json;
  updated_at := v_result.updated_at;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- STEP 8: Create debug function for troubleshooting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_application_update_access(target_application_id UUID DEFAULT NULL)
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
      check_name := '9. Application Tenant ID (via program->university)';
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

GRANT EXECUTE ON FUNCTION public.debug_application_update_access(UUID) TO authenticated;

COMMENT ON FUNCTION public.debug_application_update_access(UUID) IS
  'Debug function to diagnose why updating applications might fail. Call with application ID to check specific access.';

-- ============================================================================
-- STEP 9: Clean up and recreate RLS policies for applications
-- ============================================================================

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "applications_select_comprehensive" ON public.applications;
DROP POLICY IF EXISTS "applications_update_comprehensive" ON public.applications;
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

-- Create comprehensive SELECT policy
CREATE POLICY "applications_select_v2"
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

-- Create comprehensive UPDATE policy
-- Note: With SECURITY DEFINER RPC, this policy is less critical but provides
-- a fallback for direct updates and additional security layer
CREATE POLICY "applications_update_v2"
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
-- STEP 10: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_applications_program_id ON public.applications(program_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_agent_id ON public.applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_programs_university_id ON public.programs(university_id);
CREATE INDEX IF NOT EXISTS idx_universities_tenant_id ON public.universities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- STEP 11: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES (run manually):
-- 
-- 1. Check function exists:
--    SELECT proname FROM pg_proc WHERE proname = 'update_application_review';
--
-- 2. Test debug function:
--    SELECT * FROM debug_application_update_access('your-application-id');
--
-- 3. Verify table columns:
--    SELECT column_name FROM information_schema.columns 
--    WHERE table_name = 'programs' AND column_name IN ('image_url', 'app_fee', 'active');
--
--    SELECT column_name FROM information_schema.columns 
--    WHERE table_name = 'students' AND column_name IN ('guardian', 'finances_json', 'visa_history_json');
--
-- 4. Check for any remaining 'university' roles:
--    SELECT id, email, role FROM profiles WHERE role::TEXT = 'university';
--
-- ============================================================================
