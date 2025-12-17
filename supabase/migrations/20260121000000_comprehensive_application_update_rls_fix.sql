-- ============================================================================
-- COMPREHENSIVE FIX: Application Status Update RLS Policies
-- ============================================================================
-- This migration is a complete cleanup and rebuild of the application update
-- permissions system. It addresses the "Permission denied - row-level security"
-- error that university partners experience when updating application status.
--
-- ROOT CAUSES FIXED:
-- 1. Conflicting policies from multiple migrations not properly dropped
-- 2. Helper functions may not be returning expected values
-- 3. Role mapping may not include all university-related roles
-- 4. Tenant chain (profile -> university -> program -> application) may be broken
--
-- APPROACH:
-- This migration takes a "nuclear" approach - drop ALL application policies
-- and recreate them from scratch with comprehensive coverage.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop ALL existing application policies (comprehensive cleanup)
-- ============================================================================
-- This ensures no conflicting policies remain from any previous migrations

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'applications' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.applications', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END$$;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled on applications table
-- ============================================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create/Replace helper functions with comprehensive role handling
-- ============================================================================

-- get_user_role: Returns the user's role, mapping various role strings to app_role enum
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

  -- Comprehensive role mapping including all possible variants
  CASE raw_role
    WHEN 'university' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_admin' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_staff' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'uni_partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'school_rep' THEN mapped_role := 'school_rep'::public.app_role;
    WHEN 'student' THEN mapped_role := 'student'::public.app_role;
    WHEN 'agent' THEN mapped_role := 'agent'::public.app_role;
    WHEN 'staff' THEN mapped_role := 'staff'::public.app_role;
    WHEN 'admin' THEN mapped_role := 'admin'::public.app_role;
    WHEN 'counselor' THEN mapped_role := 'counselor'::public.app_role;
    WHEN 'verifier' THEN mapped_role := 'verifier'::public.app_role;
    WHEN 'finance' THEN mapped_role := 'finance'::public.app_role;
    ELSE mapped_role := 'student'::public.app_role;
  END CASE;

  RETURN mapped_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon, service_role;

-- get_user_tenant: Returns user's tenant_id from profiles
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

-- is_university_partner: Returns TRUE if user is a university partner type
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
  
  -- Include all roles that should have partner access
  RETURN v_role IN (
    'partner'::public.app_role, 
    'school_rep'::public.app_role,
    'counselor'::public.app_role,
    'verifier'::public.app_role,
    'finance'::public.app_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_university_partner(UUID) TO authenticated, anon, service_role;

-- can_access_application: Checks if user can access a specific application
CREATE OR REPLACE FUNCTION public.can_access_application(user_id UUID, app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_role public.app_role;
  v_user_tenant UUID;
  v_app_tenant UUID;
BEGIN
  IF user_id IS NULL OR app_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_user_role := public.get_user_role(user_id);

  -- Admin/staff can access all
  IF v_user_role IN ('admin'::public.app_role, 'staff'::public.app_role) THEN
    RETURN TRUE;
  END IF;

  -- University partner check via tenant
  IF public.is_university_partner(user_id) THEN
    v_user_tenant := public.get_user_tenant(user_id);
    
    IF v_user_tenant IS NOT NULL THEN
      -- Check if application belongs to a program at user's university
      SELECT u.tenant_id INTO v_app_tenant
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.id = app_id;
      
      RETURN v_app_tenant IS NOT NULL AND v_app_tenant = v_user_tenant;
    END IF;
  END IF;

  -- Student check
  IF v_user_role = 'student'::public.app_role THEN
    RETURN EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.students s ON s.id = a.student_id
      WHERE a.id = app_id AND s.profile_id = user_id
    );
  END IF;

  -- Agent check
  IF v_user_role = 'agent'::public.app_role THEN
    RETURN EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.agents ag ON ag.id = a.agent_id
      WHERE a.id = app_id AND ag.profile_id = user_id
    );
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_application(UUID, UUID) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 4: Create the update_application_review RPC function
-- ============================================================================
-- This uses SECURITY DEFINER to bypass RLS but performs its own auth checks

DROP FUNCTION IF EXISTS public.update_application_review(UUID, public.application_status, TEXT, JSONB);

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
  v_can_access BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please log in and try again.' USING ERRCODE = '28000';
  END IF;

  -- Check if application exists
  IF NOT EXISTS(SELECT 1 FROM public.applications WHERE applications.id = p_application_id) THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  -- Check access using our helper function
  v_can_access := public.can_access_application(v_user_id, p_application_id);
  
  IF NOT v_can_access THEN
    -- Provide more detailed error messages for debugging
    DECLARE
      v_role public.app_role;
      v_tenant UUID;
    BEGIN
      v_role := public.get_user_role(v_user_id);
      v_tenant := public.get_user_tenant(v_user_id);
      
      RAISE EXCEPTION 'Permission denied. Role: %, Tenant: %, App: %', 
        v_role::TEXT, 
        COALESCE(v_tenant::TEXT, 'NULL'),
        p_application_id::TEXT
        USING ERRCODE = '42501';
    END;
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
    RAISE EXCEPTION 'Failed to update application. It may have been deleted.' USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO service_role;

-- ============================================================================
-- STEP 5: Create the text version of update RPC (handles enum conversion)
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_application_review_text(UUID, TEXT, TEXT, JSONB);

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
GRANT EXECUTE ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- STEP 6: Create comprehensive RLS policies for applications
-- ============================================================================
-- These are PERMISSIVE policies (PostgreSQL default) that work together

-- SELECT Policy: Who can view applications
CREATE POLICY "applications_select_policy"
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
    -- University partner can see applications to their programs
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

-- INSERT Policy: Who can create applications
CREATE POLICY "applications_insert_policy"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin/staff can create any
    public.is_admin_or_staff(auth.uid())
    OR
    -- Students can create their own
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
    OR
    -- Agents can create for their linked students
    agent_id IN (
      SELECT id FROM public.agents WHERE profile_id = auth.uid()
    )
  );

-- UPDATE Policy: Who can update applications
CREATE POLICY "applications_update_policy"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    -- Admin/staff can update ALL applications
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partner can update applications to their programs
    (
      public.is_university_partner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
    OR
    -- Students can update their own draft applications
    (
      student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
      AND status = 'draft'
    )
    OR
    -- Agents can update draft applications they created
    (
      agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
      AND status = 'draft'
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row (relaxed for partners)
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
    OR
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR
    agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
  );

-- DELETE Policy: Who can delete applications (restricted)
CREATE POLICY "applications_delete_policy"
  ON public.applications FOR DELETE
  TO authenticated
  USING (
    -- Only admin/staff can delete
    public.is_admin_or_staff(auth.uid())
    OR
    -- Students can delete their own draft applications
    (
      student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
      AND status = 'draft'
    )
  );

-- ============================================================================
-- STEP 7: Create debug function for troubleshooting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_application_access(p_application_id UUID DEFAULT NULL)
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
  v_can_access BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Check 1: Authentication
  check_name := '1. User ID';
  IF v_user_id IS NULL THEN
    check_result := 'NOT AUTHENTICATED';
    check_status := 'FAIL';
  ELSE
    check_result := v_user_id::TEXT;
    check_status := 'PASS';
  END IF;
  RETURN NEXT;

  IF v_user_id IS NULL THEN RETURN; END IF;

  -- Check 2: Raw role from profiles
  check_name := '2. Raw Profile Role';
  SELECT role::TEXT INTO v_raw_role FROM public.profiles WHERE id = v_user_id;
  check_result := COALESCE(v_raw_role, 'NULL - no profile');
  check_status := CASE WHEN v_raw_role IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- Check 3: Mapped role
  check_name := '3. Mapped Role';
  v_mapped_role := public.get_user_role(v_user_id);
  check_result := v_mapped_role::TEXT;
  check_status := 'PASS';
  RETURN NEXT;

  -- Check 4: Is university partner?
  check_name := '4. Is University Partner';
  check_result := public.is_university_partner(v_user_id)::TEXT;
  check_status := 'INFO';
  RETURN NEXT;

  -- Check 5: User tenant
  check_name := '5. User Tenant ID';
  v_user_tenant := public.get_user_tenant(v_user_id);
  check_result := COALESCE(v_user_tenant::TEXT, 'NULL');
  check_status := CASE WHEN v_user_tenant IS NOT NULL OR public.is_admin_or_staff(v_user_id) THEN 'PASS' ELSE 'WARN' END;
  RETURN NEXT;

  -- Application-specific checks
  IF p_application_id IS NOT NULL THEN
    -- Check 6: Application exists
    check_name := '6. Application Exists';
    IF EXISTS(SELECT 1 FROM public.applications WHERE id = p_application_id) THEN
      check_result := 'YES';
      check_status := 'PASS';
    ELSE
      check_result := 'NO';
      check_status := 'FAIL';
      RETURN NEXT;
      RETURN;
    END IF;
    RETURN NEXT;

    -- Check 7: Application tenant
    check_name := '7. Application Tenant';
    SELECT u.tenant_id INTO v_app_tenant
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;
    check_result := COALESCE(v_app_tenant::TEXT, 'NULL - broken chain');
    check_status := CASE WHEN v_app_tenant IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    -- Check 8: Tenant match
    check_name := '8. Tenant Match';
    IF public.is_admin_or_staff(v_user_id) THEN
      check_result := 'ADMIN BYPASS';
      check_status := 'PASS';
    ELSIF v_user_tenant IS NULL THEN
      check_result := 'User has no tenant';
      check_status := 'FAIL';
    ELSIF v_app_tenant IS NULL THEN
      check_result := 'App has no tenant';
      check_status := 'FAIL';
    ELSIF v_user_tenant = v_app_tenant THEN
      check_result := 'MATCH: ' || v_user_tenant::TEXT;
      check_status := 'PASS';
    ELSE
      check_result := 'MISMATCH: user=' || v_user_tenant::TEXT || ' app=' || v_app_tenant::TEXT;
      check_status := 'FAIL';
    END IF;
    RETURN NEXT;

    -- Check 9: Can access (final check)
    check_name := '9. Can Access Application';
    v_can_access := public.can_access_application(v_user_id, p_application_id);
    check_result := v_can_access::TEXT;
    check_status := CASE WHEN v_can_access THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_application_access(UUID) TO authenticated;

-- ============================================================================
-- STEP 8: Create indexes for performance
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
-- STEP 9: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually after migration):
-- 
-- 1. Check function exists:
--    SELECT proname FROM pg_proc WHERE proname LIKE 'update_application%';
--
-- 2. Test debug function:
--    SELECT * FROM debug_application_access('your-application-id-here');
--
-- 3. Check active policies on applications table:
--    SELECT policyname, cmd, qual FROM pg_policies 
--    WHERE tablename = 'applications' ORDER BY cmd;
--
-- 4. Test your user's role:
--    SELECT get_user_role(auth.uid()), get_user_tenant(auth.uid()), 
--           is_university_partner(auth.uid());
-- ============================================================================
