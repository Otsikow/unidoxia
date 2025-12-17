-- ============================================================================
-- FIX: Application Status/Notes Update Permissions (Final Fix)
-- ============================================================================
-- This migration fixes the "Permission denied" (42501) error when university 
-- partners try to update application status or internal notes.
--
-- The issue was that:
-- 1. The RPC function or RLS policies may not exist
-- 2. The tenant_id chain may be broken (profile -> university -> program -> app)
-- 3. The user role may not be properly recognized
--
-- This migration:
-- 1. Ensures all helper functions exist with correct permissions
-- 2. Creates both enum and text versions of the update RPC
-- 3. Sets up proper RLS policies for fallback direct updates
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure app_role enum has required values
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

-- ============================================================================
-- STEP 2: Create/replace helper functions
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
-- STEP 3: Create the main update_application_review RPC function
-- ============================================================================

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
  
  -- Log for debugging
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

GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO service_role;

-- ============================================================================
-- STEP 4: Create the text version of update RPC (handles enum conversion)
-- ============================================================================

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
-- STEP 5: Clean up and recreate RLS policies for applications
-- ============================================================================

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "applications_select_comprehensive" ON public.applications;
DROP POLICY IF EXISTS "applications_update_comprehensive" ON public.applications;
DROP POLICY IF EXISTS "applications_select_v2" ON public.applications;
DROP POLICY IF EXISTS "applications_update_v2" ON public.applications;
DROP POLICY IF EXISTS "app_select_policy" ON public.applications;
DROP POLICY IF EXISTS "app_update_policy" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_select" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_update" ON public.applications;
DROP POLICY IF EXISTS "university_partner_applications_select" ON public.applications;
DROP POLICY IF EXISTS "university_partner_applications_update" ON public.applications;

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create comprehensive SELECT policy
CREATE POLICY "applications_select_v3"
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
CREATE POLICY "applications_update_v3"
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
    OR
    -- Students can update their own draft applications
    (
      student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
      AND status = 'draft'
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
    OR
    (
      student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 6: Create indexes for performance
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
-- STEP 7: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;
