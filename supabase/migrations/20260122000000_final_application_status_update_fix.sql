-- ============================================================================
-- FINAL FIX: Application Status Update for University Partners
-- ============================================================================
-- This migration provides a complete and definitive fix for the 
-- "Permission denied - row-level security" error when university partners
-- attempt to update application status.
--
-- This consolidates all previous attempts into one clean migration.
--
-- KEY CHANGES:
-- 1. RPC functions use SECURITY DEFINER to bypass RLS and perform own auth
-- 2. RLS policies are simplified for direct table access as fallback
-- 3. Helper functions properly check role and tenant chains
-- 4. Diagnostic function added for troubleshooting
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop all existing application policies to start fresh
-- ============================================================================

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

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create/Update essential helper functions
-- ============================================================================

-- Helper: Get user's role as text (avoids enum issues)
CREATE OR REPLACE FUNCTION public.get_user_role_text(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT role::TEXT INTO v_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN LOWER(TRIM(COALESCE(v_role, '')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role_text(UUID) TO authenticated, anon, service_role;

-- Helper: Check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_role := public.get_user_role_text(p_user_id);
  
  RETURN v_role IN ('admin', 'staff');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(UUID) TO authenticated, anon, service_role;

-- Helper: Check if user is a university-type role
CREATE OR REPLACE FUNCTION public.is_university_role(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_role := public.get_user_role_text(p_user_id);
  
  -- Accept all university-related roles
  RETURN v_role IN (
    'university',
    'partner',
    'school_rep',
    'university_admin',
    'university_staff',
    'university_partner',
    'uni_partner',
    'counselor',
    'verifier',
    'finance'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_university_role(UUID) TO authenticated, anon, service_role;

-- Helper: Get user's tenant ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(UUID) TO authenticated, anon, service_role;

-- Helper: Get application's tenant ID (through program -> university chain)
CREATE OR REPLACE FUNCTION public.get_application_tenant_id(p_app_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF p_app_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT u.tenant_id INTO v_tenant_id
  FROM public.applications a
  JOIN public.programs p ON p.id = a.program_id
  JOIN public.universities u ON u.id = p.university_id
  WHERE a.id = p_app_id;
  
  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_application_tenant_id(UUID) TO authenticated, anon, service_role;

-- Helper: Check if user can access/update a specific application
CREATE OR REPLACE FUNCTION public.user_can_access_application(p_user_id UUID, p_app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_tenant UUID;
  v_app_tenant UUID;
BEGIN
  IF p_user_id IS NULL OR p_app_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin/staff can access all
  IF public.is_admin_or_staff(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- University role - check tenant match
  IF public.is_university_role(p_user_id) THEN
    v_user_tenant := public.get_user_tenant_id(p_user_id);
    v_app_tenant := public.get_application_tenant_id(p_app_id);
    
    IF v_user_tenant IS NOT NULL AND v_app_tenant IS NOT NULL THEN
      RETURN v_user_tenant = v_app_tenant;
    END IF;
  END IF;
  
  -- Student can access own applications
  IF EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.students s ON s.id = a.student_id
    WHERE a.id = p_app_id AND s.profile_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Agent can access applications they created
  IF EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    WHERE a.id = p_app_id AND ag.profile_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_application(UUID, UUID) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 3: Create the main RPC function for status updates
-- ============================================================================
-- This is the PRIMARY method for updating application status.
-- It uses SECURITY DEFINER to bypass RLS and performs its own authorization.

DROP FUNCTION IF EXISTS public.university_update_application_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.university_update_application_status(
  p_application_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_tenant UUID;
  v_app_tenant UUID;
  v_result RECORD;
  v_status_enum public.application_status;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please log in and try again.';
  END IF;

  -- Get user info
  v_user_role := public.get_user_role_text(v_user_id);
  v_user_tenant := public.get_user_tenant_id(v_user_id);
  
  RAISE LOG '[university_update_application_status] user_id=%, role=%, tenant=%, app_id=%, status=%', 
    v_user_id, v_user_role, v_user_tenant, p_application_id, p_status;

  -- Check authorization
  IF NOT public.user_can_access_application(v_user_id, p_application_id) THEN
    -- Get more details for error message
    v_app_tenant := public.get_application_tenant_id(p_application_id);
    
    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Your account is not linked to a university (tenant_id is NULL). Please contact support.';
    ELSIF v_app_tenant IS NULL THEN
      RAISE EXCEPTION 'Application not found or program not properly configured. App ID: %', p_application_id;
    ELSIF v_user_tenant != v_app_tenant THEN
      RAISE EXCEPTION 'This application belongs to a different university. You can only update applications to your own programs.';
    ELSE
      RAISE EXCEPTION 'Your role (%) does not have permission to update applications.', v_user_role;
    END IF;
  END IF;

  -- Validate and convert status
  BEGIN
    v_status_enum := p_status::public.application_status;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid status: %. Valid values: draft, submitted, screening, under_review, conditional_offer, unconditional_offer, cas_loa, visa, enrolled, withdrawn, deferred, rejected', p_status;
  END;

  -- Perform the update (SECURITY DEFINER bypasses RLS here)
  UPDATE public.applications
  SET 
    status = v_status_enum,
    review_notes = COALESCE(p_notes, review_notes),
    updated_at = now()
  WHERE id = p_application_id
  RETURNING id, status, updated_at INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Application not found or update failed. App ID: %', p_application_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_result.id,
    'status', v_result.status::TEXT,
    'updated_at', v_result.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) IS
  'Update application status. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- STEP 4: Create text-based update RPC (alternative that handles enum conversion)
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
  v_user_id UUID;
  v_status public.application_status;
  v_result RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  
  -- Check authorization
  IF NOT public.user_can_access_application(v_user_id, p_application_id) THEN
    RAISE EXCEPTION 'Permission denied. You cannot update this application.' USING ERRCODE = '42501';
  END IF;
  
  -- Convert text status to enum if provided
  IF p_new_status IS NOT NULL AND p_new_status != '' THEN
    BEGIN
      v_status := p_new_status::public.application_status;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid status value: %', p_new_status USING ERRCODE = '22P02';
    END;
  ELSE
    v_status := NULL;
  END IF;

  -- Perform the update (SECURITY DEFINER bypasses RLS)
  UPDATE public.applications a
  SET
    status = COALESCE(v_status, a.status),
    internal_notes = COALESCE(p_internal_notes, a.internal_notes),
    timeline_json = CASE
      WHEN p_append_timeline_event IS NULL THEN a.timeline_json
      WHEN a.timeline_json IS NULL THEN jsonb_build_array(p_append_timeline_event)
      WHEN jsonb_typeof(a.timeline_json) = 'array' THEN a.timeline_json || jsonb_build_array(p_append_timeline_event)
      ELSE jsonb_build_array(p_append_timeline_event)
    END,
    updated_at = now()
  WHERE a.id = p_application_id
  RETURNING a.id, a.status::TEXT, a.internal_notes, a.timeline_json, a.updated_at
  INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  id := v_result.id;
  status := v_result.status;
  internal_notes := v_result.internal_notes;
  timeline_json := v_result.timeline_json;
  updated_at := v_result.updated_at;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- STEP 5: Create the enum-based update RPC (for compatibility)
-- ============================================================================

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
  v_result RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Check authorization
  IF NOT public.user_can_access_application(v_user_id, p_application_id) THEN
    RAISE EXCEPTION 'Permission denied. You cannot update this application.' USING ERRCODE = '42501';
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
  INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  id := v_result.id;
  status := v_result.status;
  internal_notes := v_result.internal_notes;
  timeline_json := v_result.timeline_json;
  updated_at := v_result.updated_at;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- STEP 6: Create RLS policies for direct table access (fallback)
-- ============================================================================

-- SELECT: Who can view applications
CREATE POLICY "app_select"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_application(auth.uid(), id)
  );

-- INSERT: Who can create applications
CREATE POLICY "app_insert"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin/staff can create any
    public.is_admin_or_staff(auth.uid())
    OR
    -- Students can create their own
    student_id IN (SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid())
    OR
    -- Agents can create for their students
    agent_id IN (SELECT ag.id FROM public.agents ag WHERE ag.profile_id = auth.uid())
  );

-- UPDATE: Who can update applications
CREATE POLICY "app_update"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    public.user_can_access_application(auth.uid(), id)
  )
  WITH CHECK (
    public.user_can_access_application(auth.uid(), id)
  );

-- DELETE: Only admin/staff or students deleting drafts
CREATE POLICY "app_delete"
  ON public.applications FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_staff(auth.uid())
    OR
    (
      student_id IN (SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid())
      AND status = 'draft'
    )
  );

-- ============================================================================
-- STEP 7: Ensure review_notes column exists
-- ============================================================================

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- ============================================================================
-- STEP 8: Create diagnostic function
-- ============================================================================

DROP FUNCTION IF EXISTS public.diagnose_app_update_issue(UUID);

CREATE OR REPLACE FUNCTION public.diagnose_app_update_issue(p_app_id UUID DEFAULT NULL)
RETURNS TABLE(
  step TEXT,
  result TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_tenant UUID;
  v_app_tenant UUID;
  v_app_exists BOOLEAN;
  v_can_access BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Step 1: User ID
  step := '1. User Authenticated';
  IF v_user_id IS NULL THEN
    result := 'NO - Not logged in';
    status := 'FAIL';
    RETURN NEXT;
    RETURN;
  END IF;
  result := v_user_id::TEXT;
  status := 'PASS';
  RETURN NEXT;

  -- Step 2: User Role
  step := '2. User Role';
  v_user_role := public.get_user_role_text(v_user_id);
  result := COALESCE(v_user_role, 'NULL');
  status := CASE WHEN v_user_role IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- Step 3: Is Admin/Staff
  step := '3. Is Admin/Staff';
  result := public.is_admin_or_staff(v_user_id)::TEXT;
  status := 'INFO';
  RETURN NEXT;

  -- Step 4: Is University Role
  step := '4. Is University Role';
  result := public.is_university_role(v_user_id)::TEXT;
  status := CASE WHEN public.is_university_role(v_user_id) THEN 'PASS' ELSE 'INFO' END;
  RETURN NEXT;

  -- Step 5: User Tenant
  step := '5. User Tenant ID';
  v_user_tenant := public.get_user_tenant_id(v_user_id);
  result := COALESCE(v_user_tenant::TEXT, 'NULL - NOT SET');
  status := CASE WHEN v_user_tenant IS NOT NULL OR public.is_admin_or_staff(v_user_id) THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  IF p_app_id IS NOT NULL THEN
    -- Step 6: Application Exists
    step := '6. Application Exists';
    SELECT EXISTS(SELECT 1 FROM public.applications WHERE applications.id = p_app_id) INTO v_app_exists;
    result := v_app_exists::TEXT;
    status := CASE WHEN v_app_exists THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    IF v_app_exists THEN
      -- Step 7: Application Tenant
      step := '7. Application Tenant ID';
      v_app_tenant := public.get_application_tenant_id(p_app_id);
      result := COALESCE(v_app_tenant::TEXT, 'NULL - BROKEN CHAIN');
      status := CASE WHEN v_app_tenant IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
      RETURN NEXT;

      -- Step 8: Tenant Match
      step := '8. Tenant Match';
      IF public.is_admin_or_staff(v_user_id) THEN
        result := 'ADMIN BYPASS';
        status := 'PASS';
      ELSIF v_user_tenant IS NULL THEN
        result := 'User tenant is NULL';
        status := 'FAIL';
      ELSIF v_app_tenant IS NULL THEN
        result := 'App tenant is NULL';
        status := 'FAIL';
      ELSIF v_user_tenant = v_app_tenant THEN
        result := 'MATCH';
        status := 'PASS';
      ELSE
        result := 'MISMATCH: user=' || v_user_tenant::TEXT || ' app=' || v_app_tenant::TEXT;
        status := 'FAIL';
      END IF;
      RETURN NEXT;

      -- Step 9: Can Access
      step := '9. Can Access Application';
      v_can_access := public.user_can_access_application(v_user_id, p_app_id);
      result := v_can_access::TEXT;
      status := CASE WHEN v_can_access THEN 'PASS' ELSE 'FAIL' END;
      RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_app_update_issue(UUID) TO authenticated;

-- ============================================================================
-- STEP 9: Create indexes for performance
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
-- STEP 10: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- USAGE:
-- 
-- 1. To update status (primary method):
--    SELECT * FROM university_update_application_status(
--      'app-uuid', 
--      'under_review', 
--      'Optional notes'
--    );
--
-- 2. To diagnose issues:
--    SELECT * FROM diagnose_app_update_issue('app-uuid');
--
-- 3. Alternative method (with timeline):
--    SELECT * FROM update_application_review_text(
--      'app-uuid',
--      'under_review',
--      'internal notes',
--      '{"id": "...", "action": "...", "timestamp": "..."}'::jsonb
--    );
-- ============================================================================
