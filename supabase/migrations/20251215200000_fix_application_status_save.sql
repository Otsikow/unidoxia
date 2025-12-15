-- ============================================================================
-- Fix: Application Status Save - Complete Solution
-- ============================================================================
-- This migration fixes the "Permission denied" error when university partners
-- try to update application status. The issue was caused by:
-- 1. Future-dated migrations (2026) that may not be applied
-- 2. Conflicting/overlapping RLS policies from multiple migrations
-- 3. Missing or improperly granted RPC function
--
-- Solution:
-- 1. Drop all conflicting policies and recreate clean ones
-- 2. Ensure the RPC function exists with proper permissions
-- 3. Add debug function to help troubleshoot access issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure helper functions exist
-- ============================================================================

-- get_user_role function with 'university' -> 'partner' mapping
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

-- get_user_tenant function
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

-- is_admin_or_staff function
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

-- ============================================================================
-- STEP 2: Clean up ALL conflicting application policies
-- ============================================================================

-- Drop ALL policies that might conflict
DROP POLICY IF EXISTS "applications_partner_select" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_update" ON public.applications;
DROP POLICY IF EXISTS "university_partner_applications_select" ON public.applications;
DROP POLICY IF EXISTS "university_partner_applications_update" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can update applications to their programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their university" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their university programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can update applications to their university programs" ON public.applications;
DROP POLICY IF EXISTS "applications_school_rep_select" ON public.applications;
DROP POLICY IF EXISTS "applications_school_rep_update" ON public.applications;

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create clean, unified RLS policies for applications
-- ============================================================================

-- SELECT policy: Multiple roles can view applications
CREATE POLICY "app_select_policy"
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
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  );

-- UPDATE policy: Partners and admin/staff can update applications
CREATE POLICY "app_update_policy"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    -- Admin/staff can update all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partner (partner or school_rep) can update applications to their programs
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
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
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  );

-- ============================================================================
-- STEP 4: Recreate the RPC function with better error messages
-- ============================================================================

-- Ensure 'rejected' status exists in enum
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_user_role := public.get_user_role(v_user_id);

  -- Allow university partner roles (partner + school_rep) and staff/admin.
  IF NOT (
    v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    OR public.is_admin_or_staff(v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to update applications. Your role: %', v_user_role USING ERRCODE = '42501';
  END IF;

  -- For university partner roles: ensure the application belongs to their tenant
  IF NOT public.is_admin_or_staff(v_user_id) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);

    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Your account is not associated with a tenant. Please contact support. User ID: %', v_user_id USING ERRCODE = '42501';
    END IF;

    -- Get the application's tenant for the error message
    SELECT u.tenant_id INTO v_app_tenant
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;

    IF v_app_tenant IS NULL THEN
      RAISE EXCEPTION 'Application not found or program/university not properly configured. App ID: %', p_application_id USING ERRCODE = '42501';
    END IF;

    IF v_app_tenant != v_user_tenant THEN
      RAISE EXCEPTION 'You do not have permission to update this application. Your tenant: %, App tenant: %', v_user_tenant, v_app_tenant USING ERRCODE = '42501';
    END IF;
  END IF;

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
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO anon;

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Authorized application review update for university partners (partner + school_rep) and staff/admin.';

-- ============================================================================
-- STEP 5: Create debug function for application access troubleshooting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_application_access(target_application_id UUID DEFAULT NULL)
RETURNS TABLE(
  check_name TEXT,
  check_result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role public.app_role;
  v_user_tenant UUID;
  v_app_tenant UUID;
  v_app_program_id UUID;
  v_program_university_id UUID;
  v_app_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Check 1: User ID
  check_name := 'Current User ID';
  check_result := COALESCE(v_user_id::TEXT, 'NULL - not authenticated');
  RETURN NEXT;

  -- Check 2: User Role (raw)
  check_name := 'Profile Role (raw from DB)';
  SELECT role::TEXT INTO check_result FROM public.profiles WHERE id = v_user_id;
  check_result := COALESCE(check_result, 'NULL - profile not found');
  RETURN NEXT;

  -- Check 3: User Role (mapped)
  check_name := 'User Role (mapped via get_user_role)';
  v_user_role := public.get_user_role(v_user_id);
  check_result := v_user_role::TEXT;
  RETURN NEXT;

  -- Check 4: Is Partner or School Rep
  check_name := 'Is Partner or School Rep';
  check_result := (v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role))::TEXT;
  RETURN NEXT;

  -- Check 5: User Tenant
  check_name := 'User Tenant ID';
  v_user_tenant := public.get_user_tenant(v_user_id);
  check_result := COALESCE(v_user_tenant::TEXT, 'NULL - no tenant assigned');
  RETURN NEXT;

  -- Check 6: Is Admin/Staff
  check_name := 'Is Admin or Staff';
  check_result := public.is_admin_or_staff(v_user_id)::TEXT;
  RETURN NEXT;

  -- If application ID provided, check specific access
  IF target_application_id IS NOT NULL THEN
    -- Check 7: Application exists
    check_name := 'Target Application Exists';
    SELECT EXISTS(SELECT 1 FROM public.applications WHERE id = target_application_id) INTO v_app_exists;
    check_result := v_app_exists::TEXT;
    RETURN NEXT;

    IF v_app_exists THEN
      -- Check 8: Application program
      check_name := 'Application Program ID';
      SELECT program_id INTO v_app_program_id FROM public.applications WHERE id = target_application_id;
      check_result := COALESCE(v_app_program_id::TEXT, 'NULL');
      RETURN NEXT;

      -- Check 9: Program university
      check_name := 'Program University ID';
      SELECT university_id INTO v_program_university_id FROM public.programs WHERE id = v_app_program_id;
      check_result := COALESCE(v_program_university_id::TEXT, 'NULL - program not found');
      RETURN NEXT;

      -- Check 10: University tenant
      check_name := 'University Tenant ID';
      SELECT tenant_id INTO v_app_tenant FROM public.universities WHERE id = v_program_university_id;
      check_result := COALESCE(v_app_tenant::TEXT, 'NULL - university not found or no tenant');
      RETURN NEXT;

      -- Check 11: Tenant match
      check_name := 'Tenant Match (user vs application)';
      check_result := CASE
        WHEN v_user_tenant IS NULL THEN 'FALSE - user has no tenant'
        WHEN v_app_tenant IS NULL THEN 'FALSE - application has no tenant'
        WHEN v_user_tenant = v_app_tenant THEN 'TRUE - tenants match'
        ELSE 'FALSE - tenant mismatch: user=' || v_user_tenant::TEXT || ', app=' || v_app_tenant::TEXT
      END;
      RETURN NEXT;

      -- Check 12: Would UPDATE pass
      check_name := 'UPDATE Access (should be TRUE for success)';
      check_result := (
        public.is_admin_or_staff(v_user_id)
        OR (
          v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
          AND v_app_tenant IS NOT NULL
          AND v_app_tenant = v_user_tenant
        )
      )::TEXT;
      RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_application_access(UUID) TO authenticated;

COMMENT ON FUNCTION public.debug_application_access(UUID) IS
  'Debug function to check why a user might not have access to update an application. Call with SELECT * FROM debug_application_access() or SELECT * FROM debug_application_access(''application-uuid'')';

-- ============================================================================
-- STEP 6: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- SUMMARY:
-- 1. Helper functions ensured (get_user_role, get_user_tenant, is_admin_or_staff)
-- 2. Cleaned up all conflicting application RLS policies
-- 3. Created unified SELECT and UPDATE policies for applications
-- 4. Recreated RPC function with better error messages
-- 5. Added debug_application_access function for troubleshooting
-- 6. Triggered PostgREST cache reload
-- ============================================================================
