-- ============================================================================
-- Fix: Application Status Update - PGRST116 Error Resolution
-- ============================================================================
-- This migration addresses the "Cannot coerce the result to a single JSON 
-- object The result contains 0 rows (code: PGRST116)" error when university
-- partners attempt to update application status.
--
-- Root causes addressed:
-- 1. RPC function may not be properly visible in PostgREST schema cache
-- 2. RLS policies may silently block updates
-- 3. Tenant isolation not properly enforced
--
-- Solution:
-- - Recreate the update_application_review RPC with better error handling
-- - Ensure RLS policies allow partner/school_rep to update their applications
-- - Force PostgREST schema cache reload
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure helper functions exist
-- ============================================================================

-- get_user_role: returns the app_role for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID DEFAULT NULL)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role::public.app_role INTO v_role
  FROM public.profiles
  WHERE id = COALESCE(p_user_id, auth.uid());
  
  RETURN v_role;
END;
$$;

-- get_user_tenant: returns the tenant_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_tenant(p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = COALESCE(p_user_id, auth.uid());
  
  RETURN v_tenant_id;
END;
$$;

-- is_admin_or_staff: checks if user has admin/staff privileges
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role::public.app_role INTO v_role
  FROM public.profiles
  WHERE id = COALESCE(p_user_id, auth.uid());
  
  RETURN v_role IN ('admin'::public.app_role, 'staff'::public.app_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(UUID) TO authenticated;

-- ============================================================================
-- STEP 2: Recreate update_application_review RPC with improved error handling
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
  v_user_tenant UUID;
  v_user_role public.app_role;
  v_app_exists BOOLEAN;
  v_has_access BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please sign in and try again.'
      USING ERRCODE = '28000';
  END IF;

  -- Get user role and tenant
  SELECT role::public.app_role, tenant_id
  INTO v_user_role, v_user_tenant
  FROM public.profiles
  WHERE profiles.id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Please contact support.'
      USING ERRCODE = '42501';
  END IF;

  -- Check if user has permission to update applications
  IF NOT (
    v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    OR public.is_admin_or_staff(v_user_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied. Only university partners and administrators can update applications. Your role: %', v_user_role
      USING ERRCODE = '42501';
  END IF;

  -- Check if application exists
  SELECT EXISTS(SELECT 1 FROM public.applications WHERE applications.id = p_application_id)
  INTO v_app_exists;

  IF NOT v_app_exists THEN
    RAISE EXCEPTION 'Application not found. The application (%) may have been deleted or does not exist.', p_application_id
      USING ERRCODE = 'P0002';
  END IF;

  -- For university partners, verify they have access to this application via tenant
  IF NOT public.is_admin_or_staff(v_user_id) THEN
    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Your account is not associated with a university tenant. Please contact your administrator.'
        USING ERRCODE = '42501';
    END IF;

    -- Check if application belongs to a program at the user's university
    SELECT EXISTS(
      SELECT 1
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.id = p_application_id
        AND u.tenant_id = v_user_tenant
    ) INTO v_has_access;

    IF NOT v_has_access THEN
      RAISE EXCEPTION 'Access denied. You can only update applications for programs at your university. Application: %, Your tenant: %', p_application_id, v_user_tenant
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

  -- This should never happen due to earlier checks, but just in case
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Update failed unexpectedly. The application (%) could not be updated.', p_application_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

-- Grant execute to authenticated users (anon will fail auth check in function)
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO anon;

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Updates application status, internal notes, and timeline for university partners. '
  'Uses SECURITY DEFINER to bypass RLS while enforcing tenant-based access control internally. '
  'Partners can only update applications for programs at their own university.';

-- ============================================================================
-- STEP 3: Ensure RLS policies for applications table are correct
-- ============================================================================

-- Ensure the UPDATE policy exists for university partners
DO $$
BEGIN
  -- Drop existing conflicting policies
  DROP POLICY IF EXISTS "university_partner_applications_update" ON public.applications;
  DROP POLICY IF EXISTS "applications_partner_update" ON public.applications;
  DROP POLICY IF EXISTS "Partners can update applications to their university programs" ON public.applications;
EXCEPTION
  WHEN undefined_object THEN NULL;
END$$;

-- Create the UPDATE policy for university partners
CREATE POLICY "university_partner_applications_update"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    -- Admin/staff can update all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partners can update applications to their programs
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
    -- Admin/staff can update all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partners can update applications to their programs
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
-- STEP 4: Force PostgREST to reload schema cache
-- ============================================================================

-- This notifies PostgREST to reload its cached schema
-- so the new/updated function becomes available immediately
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================================
-- 
-- 1. Check if the RPC function exists:
--    SELECT proname, prosecdef 
--    FROM pg_proc 
--    WHERE proname = 'update_application_review';
--
-- 2. Check RLS policies on applications table:
--    SELECT policyname, cmd, qual::text, with_check::text 
--    FROM pg_policies 
--    WHERE tablename = 'applications';
--
-- 3. Test the function (as a university partner):
--    SELECT * FROM update_application_review(
--      '<application_id>'::uuid,
--      'screening'::application_status,
--      NULL,
--      NULL
--    );
-- ============================================================================
