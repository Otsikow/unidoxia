-- ============================================================================
-- DEFINITIVE FIX: University Application Status Update RLS
-- ============================================================================
-- This migration provides a complete fix for the "Permission denied" error
-- when university users try to update application status.
--
-- ROOT CAUSE: The tenant chain verification fails because:
-- 1. University users may have role='university' which isn't in app_role enum
-- 2. The profiles.tenant_id might not be properly set
-- 3. Complex RLS policies with multiple joins can fail silently
--
-- SOLUTION:
-- 1. Create a dedicated RPC function with explicit authorization
-- 2. Add simpler, more direct RLS policies  
-- 3. Ensure proper role mapping
-- 4. Add diagnostic function for troubleshooting
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure all necessary enum values exist
-- ============================================================================

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_rep';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- Add 'university' to handle direct role assignments (if not already present)
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'university';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- Ensure all status values exist
DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'under_review';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'interview';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- ============================================================================
-- STEP 2: Create or update helper functions with better role handling
-- ============================================================================

-- is_university_user: Returns TRUE if user is a university partner
CREATE OR REPLACE FUNCTION public.is_university_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role::TEXT INTO v_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Accept all university-related roles
  RETURN LOWER(COALESCE(v_role, '')) IN (
    'university', 
    'partner', 
    'school_rep', 
    'university_admin', 
    'university_staff'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_university_user(UUID) TO authenticated, anon, service_role;

-- get_university_id_for_user: Returns the university_id for a given user
CREATE OR REPLACE FUNCTION public.get_university_id_for_user(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_university_id UUID;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get user's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = user_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get university_id for this tenant
  SELECT id INTO v_university_id
  FROM public.universities
  WHERE tenant_id = v_tenant_id
  LIMIT 1;
  
  RETURN v_university_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_university_id_for_user(UUID) TO authenticated, anon, service_role;

-- can_update_application: Check if user can update a specific application
CREATE OR REPLACE FUNCTION public.can_update_application(user_id UUID, app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_university BOOLEAN;
  v_user_university_id UUID;
  v_app_university_id UUID;
BEGIN
  IF user_id IS NULL OR app_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin/staff can update anything
  v_is_admin := public.is_admin_or_staff(user_id);
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check if university user
  v_is_university := public.is_university_user(user_id);
  IF NOT v_is_university THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's university
  v_user_university_id := public.get_university_id_for_user(user_id);
  IF v_user_university_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get application's university via program
  SELECT p.university_id INTO v_app_university_id
  FROM public.applications a
  JOIN public.programs p ON p.id = a.program_id
  WHERE a.id = app_id;
  
  IF v_app_university_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if they match
  RETURN v_user_university_id = v_app_university_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_update_application(UUID, UUID) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 3: Create the main university_update_application_status RPC function
-- ============================================================================
-- This is the PRIMARY function to be used for status updates.
-- It uses SECURITY DEFINER to bypass RLS and performs its own authorization.

DROP FUNCTION IF EXISTS public.university_update_application_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.university_update_application_status(
  p_application_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_tenant UUID;
  v_user_university_id UUID;
  v_app_university_id UUID;
  v_app_tenant UUID;
  v_result public.applications;
  v_status_enum public.application_status;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please log in and try again.';
  END IF;

  -- Get user's role and tenant
  SELECT role::TEXT, tenant_id INTO v_user_role, v_user_tenant
  FROM public.profiles
  WHERE id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Please contact support.';
  END IF;

  -- Log for debugging
  RAISE LOG 'university_update_application_status: user_id=%, role=%, tenant=%, app_id=%', 
    v_user_id, v_user_role, v_user_tenant, p_application_id;

  -- Check if user is admin/staff (they can update anything)
  IF public.is_admin_or_staff(v_user_id) THEN
    -- Admin/staff path - proceed with update
    NULL;
  -- Check if user is a university user
  ELSIF public.is_university_user(v_user_id) THEN
    -- University user path - check tenant match
    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Your account is not linked to a university (tenant_id is NULL). Please contact support.';
    END IF;
    
    -- Get user's university
    v_user_university_id := public.get_university_id_for_user(v_user_id);
    IF v_user_university_id IS NULL THEN
      RAISE EXCEPTION 'Your tenant is not associated with a university. Please contact support.';
    END IF;
    
    -- Get application's university
    SELECT p.university_id, u.tenant_id INTO v_app_university_id, v_app_tenant
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;
    
    IF v_app_university_id IS NULL THEN
      RAISE EXCEPTION 'Application not found or program/university not configured. App ID: %', p_application_id;
    END IF;
    
    -- Verify ownership
    IF v_user_university_id != v_app_university_id THEN
      RAISE EXCEPTION 'This application belongs to a different university. You can only update applications to your own programs.';
    END IF;
  ELSE
    -- Not authorized
    RAISE EXCEPTION 'Your role (%) does not have permission to update applications.', v_user_role;
  END IF;

  -- Validate and convert status
  BEGIN
    v_status_enum := p_status::public.application_status;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid status: %. Valid values: draft, submitted, screening, under_review, conditional_offer, unconditional_offer, cas_loa, visa, enrolled, withdrawn, deferred, rejected', p_status;
  END;

  -- Perform the update
  UPDATE public.applications
  SET 
    status = v_status_enum,
    review_notes = COALESCE(p_notes, review_notes),
    updated_at = now(),
    updated_by = v_user_id
  WHERE id = p_application_id
  RETURNING * INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Application not found or update failed. App ID: %', p_application_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Revoke public access, only allow authenticated users
REVOKE ALL ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) IS
  'Update application status for university partners. Performs authorization checks internally.';

-- ============================================================================
-- STEP 4: Ensure review_notes and updated_by columns exist
-- ============================================================================

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS review_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'applications' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ============================================================================
-- STEP 5: Clean up and recreate RLS policies
-- ============================================================================

-- Drop old potentially conflicting policies
DROP POLICY IF EXISTS "applications_select_v2" ON public.applications;
DROP POLICY IF EXISTS "applications_update_v2" ON public.applications;
DROP POLICY IF EXISTS "applications_select_v3" ON public.applications;
DROP POLICY IF EXISTS "applications_update_v3" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_select" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_update" ON public.applications;
DROP POLICY IF EXISTS "university_can_view_own_applications" ON public.applications;
DROP POLICY IF EXISTS "university_can_update_status_on_own_applications" ON public.applications;

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create unified SELECT policy
CREATE POLICY "applications_select_unified"
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
    -- University user can see applications to their university's programs
    (
      public.is_university_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_id
          AND p.university_id = public.get_university_id_for_user(auth.uid())
      )
    )
  );

-- Create unified UPDATE policy
CREATE POLICY "applications_update_unified"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    -- Admin/staff can update all applications
    public.is_admin_or_staff(auth.uid())
    OR
    -- Students can update their own draft applications
    (
      student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
      AND status = 'draft'
    )
    OR
    -- University user can update applications to their university's programs
    (
      public.is_university_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_id
          AND p.university_id = public.get_university_id_for_user(auth.uid())
      )
    )
  )
  WITH CHECK (
    public.is_admin_or_staff(auth.uid())
    OR
    (
      student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    )
    OR
    (
      public.is_university_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_id
          AND p.university_id = public.get_university_id_for_user(auth.uid())
      )
    )
  );

-- ============================================================================
-- STEP 6: Create diagnostic function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.diagnose_application_update_permission(target_app_id UUID DEFAULT NULL)
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
  v_role TEXT;
  v_tenant UUID;
  v_university_id UUID;
  v_app_university_id UUID;
  v_app_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Step 1: Authentication
  step := '1. User Authenticated';
  IF v_user_id IS NULL THEN
    result := 'NO';
    status := 'FAIL';
    RETURN NEXT;
    RETURN;
  ELSE
    result := v_user_id::TEXT;
    status := 'PASS';
    RETURN NEXT;
  END IF;

  -- Step 2: Profile role
  step := '2. Profile Role';
  SELECT role::TEXT INTO v_role FROM public.profiles WHERE id = v_user_id;
  result := COALESCE(v_role, 'NOT FOUND');
  status := CASE WHEN v_role IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- Step 3: Is admin/staff?
  step := '3. Is Admin/Staff';
  result := public.is_admin_or_staff(v_user_id)::TEXT;
  status := 'INFO';
  RETURN NEXT;

  -- Step 4: Is university user?
  step := '4. Is University User';
  result := public.is_university_user(v_user_id)::TEXT;
  status := CASE WHEN public.is_university_user(v_user_id) THEN 'PASS' ELSE 'INFO' END;
  RETURN NEXT;

  -- Step 5: User tenant
  step := '5. User Tenant ID';
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = v_user_id;
  result := COALESCE(v_tenant::TEXT, 'NULL - NOT SET');
  status := CASE WHEN v_tenant IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  -- Step 6: User's university
  step := '6. User University ID';
  v_university_id := public.get_university_id_for_user(v_user_id);
  result := COALESCE(v_university_id::TEXT, 'NULL - NOT LINKED');
  status := CASE WHEN v_university_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

  IF target_app_id IS NOT NULL THEN
    -- Step 7: Application exists
    step := '7. Application Exists';
    SELECT EXISTS(SELECT 1 FROM public.applications WHERE id = target_app_id) INTO v_app_exists;
    result := v_app_exists::TEXT;
    status := CASE WHEN v_app_exists THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    IF v_app_exists THEN
      -- Step 8: Application's university
      step := '8. Application University ID';
      SELECT p.university_id INTO v_app_university_id
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      WHERE a.id = target_app_id;
      result := COALESCE(v_app_university_id::TEXT, 'NULL - PROGRAM NOT LINKED');
      status := CASE WHEN v_app_university_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
      RETURN NEXT;

      -- Step 9: Universities match?
      step := '9. University Match';
      IF public.is_admin_or_staff(v_user_id) THEN
        result := 'ADMIN BYPASS';
        status := 'PASS';
      ELSIF v_university_id IS NULL OR v_app_university_id IS NULL THEN
        result := 'Cannot compare - missing university';
        status := 'FAIL';
      ELSIF v_university_id = v_app_university_id THEN
        result := 'MATCH';
        status := 'PASS';
      ELSE
        result := 'MISMATCH: user=' || v_university_id::TEXT || ' app=' || v_app_university_id::TEXT;
        status := 'FAIL';
      END IF;
      RETURN NEXT;

      -- Step 10: Can update?
      step := '10. Can Update Application';
      result := public.can_update_application(v_user_id, target_app_id)::TEXT;
      status := CASE WHEN public.can_update_application(v_user_id, target_app_id) THEN 'PASS' ELSE 'FAIL' END;
      RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_application_update_permission(UUID) TO authenticated;

COMMENT ON FUNCTION public.diagnose_application_update_permission(UUID) IS
  'Diagnose why an application update might fail. Call with application ID for specific check.';

-- ============================================================================
-- STEP 7: Also update the existing update_application_review functions to use new helpers
-- ============================================================================

-- Update the text version to use the new helper
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
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  
  -- Check permission using new helper
  IF NOT public.is_admin_or_staff(v_user_id) AND NOT public.can_update_application(v_user_id, p_application_id) THEN
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

  -- Perform the update
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
    updated_at = now(),
    updated_by = v_user_id
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
-- STEP 8: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_programs_university_id ON public.programs(university_id);
CREATE INDEX IF NOT EXISTS idx_universities_tenant_id ON public.universities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_applications_program_id ON public.applications(program_id);

-- ============================================================================
-- STEP 9: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES:
-- 
-- 1. The frontend should call:
--    supabase.rpc('university_update_application_status', {
--      p_application_id: applicationId,
--      p_status: newStatus,
--      p_notes: notes ?? null
--    })
--
-- 2. To diagnose issues, call:
--    SELECT * FROM diagnose_application_update_permission('application-uuid');
--
-- 3. Verify user setup:
--    - profiles.role should be 'university', 'partner', or 'school_rep'
--    - profiles.tenant_id should match universities.tenant_id
-- ============================================================================
