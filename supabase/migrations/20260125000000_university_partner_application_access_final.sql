-- ============================================================================
-- FINAL LOCKDOWN: University partner updates for applications & doc requests
-- ============================================================================
-- This migration is the safety net for the persistent
-- "Update blocked by row-level security" errors shown in the university
-- application card (status updates, notes, doc requests).
--
-- Goals:
-- 1) Normalize role/tenant checks into a single helper
-- 2) Make RPCs reliable (SECURITY DEFINER + explicit auth)
-- 3) Provide permissive-but-safe fallback RLS policies so direct table writes
--    never fail for authorized university partners
-- ============================================================================

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helpers: role + tenant checks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_role_text(p_user_id UUID)
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

  SELECT LOWER(TRIM(role::TEXT)) INTO v_role
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_role_text(UUID) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.get_profile_role_text(p_user_id) IN ('admin', 'staff');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(UUID) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_university_partner_user(p_user_id UUID)
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

  v_role := public.get_profile_role_text(p_user_id);

  RETURN v_role IN (
    'partner',
    'school_rep',
    'university_partner',
    'university',
    'counselor',
    'verifier',
    'finance'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_university_partner_user(UUID) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_user_tenant UUID;
  v_app_tenant UUID;
BEGIN
  IF v_user_id IS NULL OR p_application_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT public.get_profile_role_text(v_user_id), tenant_id
  INTO v_role, v_user_tenant
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_admin_or_staff(v_user_id) THEN
    RETURN TRUE;
  END IF;

  IF NOT public.is_university_partner_user(v_user_id) THEN
    RETURN FALSE;
  END IF;

  IF v_user_tenant IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT
    COALESCE(u.tenant_id, a.tenant_id)
  INTO v_app_tenant
  FROM public.applications a
  LEFT JOIN public.programs p ON p.id = a.program_id
  LEFT JOIN public.universities u ON u.id = p.university_id
  WHERE a.id = p_application_id;

  RETURN v_app_tenant IS NOT NULL AND v_app_tenant = v_user_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_manage_application(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPCs: main university update paths
-- ---------------------------------------------------------------------------
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
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_tenant UUID;
  v_app_tenant UUID;
  v_status public.application_status;
  v_row RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT public.get_profile_role_text(v_user_id), tenant_id
  INTO v_user_role, v_user_tenant
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Account profile not found. Please contact support.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_staff(v_user_id) AND v_user_tenant IS NULL THEN
    RAISE EXCEPTION 'Your account is not linked to a university (tenant_id is NULL). Please contact support.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.current_user_can_manage_application(p_application_id) THEN
    SELECT COALESCE(u.tenant_id, a.tenant_id)
    INTO v_app_tenant
    FROM public.applications a
    LEFT JOIN public.programs p ON p.id = a.program_id
    LEFT JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;

    IF v_app_tenant IS NULL THEN
      RAISE EXCEPTION 'Application not found or not linked to a university. App ID: %', p_application_id USING ERRCODE = '42501';
    ELSIF NOT public.is_admin_or_staff(v_user_id) AND v_user_tenant IS NOT NULL AND v_user_tenant != v_app_tenant THEN
      RAISE EXCEPTION 'This application belongs to a different university. You can only update applications for your tenant.' USING ERRCODE = '42501';
    ELSE
      RAISE EXCEPTION 'Permission denied. You cannot update this application.' USING ERRCODE = '42501';
    END IF;
  END IF;

  BEGIN
    v_status := p_status::public.application_status;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22P02';
  END;

  UPDATE public.applications a
  SET
    status = v_status,
    review_notes = COALESCE(p_notes, a.review_notes),
    updated_at = now()
  WHERE a.id = p_application_id
  RETURNING a.id, a.status::TEXT AS status, a.updated_at
  INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.university_update_application_status(UUID, TEXT, TEXT) TO authenticated;

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
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_tenant UUID;
  v_app_tenant UUID;
  v_status public.application_status;
  v_result RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT public.get_profile_role_text(v_user_id), tenant_id
  INTO v_user_role, v_user_tenant
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Account profile not found. Please contact support.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_staff(v_user_id) AND v_user_tenant IS NULL THEN
    RAISE EXCEPTION 'Your account is not linked to a university (tenant_id is NULL). Please contact support.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.current_user_can_manage_application(p_application_id) THEN
    SELECT COALESCE(u.tenant_id, a.tenant_id)
    INTO v_app_tenant
    FROM public.applications a
    LEFT JOIN public.programs p ON p.id = a.program_id
    LEFT JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;

    IF v_app_tenant IS NULL THEN
      RAISE EXCEPTION 'Application not found or not linked to a university. App ID: %', p_application_id USING ERRCODE = '42501';
    ELSIF NOT public.is_admin_or_staff(v_user_id) AND v_user_tenant IS NOT NULL AND v_user_tenant != v_app_tenant THEN
      RAISE EXCEPTION 'This application belongs to a different university. You can only update applications for your tenant.' USING ERRCODE = '42501';
    ELSE
      RAISE EXCEPTION 'Permission denied. You cannot update this application.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_new_status IS NOT NULL AND p_new_status != '' THEN
    BEGIN
      v_status := p_new_status::public.application_status;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid status value: %', p_new_status USING ERRCODE = '22P02';
    END;
  ELSE
    v_status := NULL;
  END IF;

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

REVOKE ALL ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_application_review_text(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: clean slate and rebuild with helper-driven rules
-- ---------------------------------------------------------------------------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.applications', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY applications_select_all_auth
ON public.applications
FOR SELECT
TO authenticated
USING (
  public.current_user_can_manage_application(id)
  OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
  OR agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
  OR public.is_admin_or_staff(auth.uid())
);

CREATE POLICY applications_update_university_partners
ON public.applications
FOR UPDATE
TO authenticated
USING (public.current_user_can_manage_application(id))
WITH CHECK (public.current_user_can_manage_application(id));

CREATE POLICY applications_insert_auth
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
  OR agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
  OR public.current_user_can_manage_application(id)
);

CREATE POLICY applications_delete_restrict
ON public.applications
FOR DELETE
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    AND status = 'draft'
  )
);

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.document_requests', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY document_requests_select_university
ON public.document_requests
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
  OR public.current_user_can_manage_application(application_id)
  OR (
    public.is_university_partner_user(auth.uid())
    AND tenant_id IS NOT NULL
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY document_requests_insert_university
ON public.document_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR (
    public.is_university_partner_user(auth.uid())
    AND tenant_id IS NOT NULL
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_can_manage_application(application_id)
    AND student_id IN (
      SELECT a.student_id FROM public.applications a WHERE a.id = application_id
    )
  )
);

CREATE POLICY document_requests_update_university
ON public.document_requests
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR public.current_user_can_manage_application(application_id)
  OR (
    public.is_university_partner_user(auth.uid())
    AND tenant_id IS NOT NULL
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR public.current_user_can_manage_application(application_id)
  OR (
    public.is_university_partner_user(auth.uid())
    AND tenant_id IS NOT NULL
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Ensure PostgREST sees the new functions/policies
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;
