-- ============================================================================
-- APPLICATION TENANT FALLBACKS FOR UNIVERSITY PARTNERS
-- ============================================================================
-- Context: Some legacy application records do not have a fully linked
-- tenant chain via programs → universities. When those records rely on
-- student or agent tenant IDs instead, the current_user_can_manage_application
-- helper can return FALSE, causing RLS to block status/notes updates and
-- triggering the "Update blocked by row-level security" error in the UI.
--
-- This migration makes tenant resolution more tolerant by:
-- 1) Expanding get_application_tenant_id to consider program, application,
--    student, and agent tenant IDs.
-- 2) Updating current_user_can_manage_application to rely on the expanded
--    helper so university partners can update applications even when the
--    program/university link is incomplete but tenant alignment is present
--    through the student or agent records.
-- 3) Refreshing the main RPCs to use the improved tenant resolution so
--    authorization errors report clearer context.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: application tenant resolver with broader fallbacks
-- ---------------------------------------------------------------------------
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

  SELECT
    COALESCE(
      u.tenant_id,          -- Preferred: university tenant via program
      a.tenant_id,          -- Fallback: legacy application tenant
      s.tenant_id,          -- Fallback: student tenant when program missing
      ag.tenant_id          -- Fallback: agent tenant when student not linked
    )
  INTO v_tenant_id
  FROM public.applications a
  LEFT JOIN public.programs p ON p.id = a.program_id
  LEFT JOIN public.universities u ON u.id = p.university_id
  LEFT JOIN public.students s ON s.id = a.student_id
  LEFT JOIN public.agents ag ON ag.id = a.agent_id
  WHERE a.id = p_app_id;

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_application_tenant_id(UUID) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Helper: can the current user manage this application?
-- ---------------------------------------------------------------------------
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

  v_app_tenant := public.get_application_tenant_id(p_application_id);

  RETURN v_app_tenant IS NOT NULL AND v_app_tenant = v_user_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_manage_application(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: university_update_application_status (uses improved tenant resolution)
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

  v_app_tenant := public.get_application_tenant_id(p_application_id);

  IF NOT public.current_user_can_manage_application(p_application_id) THEN
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

-- ---------------------------------------------------------------------------
-- RPC: update_application_review_text (notes + status) with better tenant logic
-- ---------------------------------------------------------------------------
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

  v_app_tenant := public.get_application_tenant_id(p_application_id);

  IF NOT public.current_user_can_manage_application(p_application_id) THEN
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
-- Ensure PostgREST picks up the replaced helpers/RPCs
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;
