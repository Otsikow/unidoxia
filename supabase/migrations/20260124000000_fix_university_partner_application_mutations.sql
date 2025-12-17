-- ============================================================================
-- FINAL SAFETY NET: University partner mutations (status, notes, doc requests)
-- ============================================================================
-- Why this exists:
-- - The UI first uses RPCs (preferred) and only falls back to direct table writes
--   when PostgREST can't see the RPC (schema cache / missing function).
-- - When that fallback happens, RLS can block the write and the UI shows:
--   "Update blocked by row-level security".
--
-- This migration guarantees:
-- 1) A simple, reliable authorization helper for "can manage this application"
-- 2) A dedicated status update RPC used by the UI
-- 3) A text-based review RPC used by the UI for status/notes
-- 4) Minimal fallback RLS UPDATE/INSERT policies to prevent the UI from getting
--    stuck when the RPC is temporarily unavailable.
--
-- Security model:
-- - Admin/staff can mutate any application.
-- - University partner roles (partner/school_rep) can mutate applications that
--   belong to their university, determined by matching tenant_id via
--   programs -> universities.
-- - We also allow matching directly on applications.tenant_id as a compatibility
--   fallback, since older data models sometimes used applications.tenant_id.
-- ============================================================================

BEGIN;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: current user can manage a specific application
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
  v_role_text TEXT;
  v_user_tenant UUID;
  v_app_tenant UUID;
BEGIN
  IF v_user_id IS NULL OR p_application_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT LOWER(TRIM(role::TEXT)), tenant_id
  INTO v_role_text, v_user_tenant
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_role_text IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_role_text IN ('admin', 'staff') THEN
    RETURN TRUE;
  END IF;

  IF v_role_text NOT IN ('partner', 'school_rep', 'university', 'university_partner') THEN
    RETURN FALSE;
  END IF;

  IF v_user_tenant IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT
    COALESCE(
      u.tenant_id,
      a.tenant_id
    )
  INTO v_app_tenant
  FROM public.applications a
  LEFT JOIN public.programs p ON p.id = a.program_id
  LEFT JOIN public.universities u ON u.id = p.university_id
  WHERE a.id = p_application_id;

  RETURN v_app_tenant IS NOT NULL AND v_app_tenant = v_user_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_can_manage_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_application(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: university_update_application_status (preferred path from UI)
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
  v_status public.application_status;
  v_row RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.current_user_can_manage_application(p_application_id) THEN
    RAISE EXCEPTION 'Permission denied. You cannot update this application.' USING ERRCODE = '42501';
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
-- RPC: update_application_review_text (used by UI for notes + fallback)
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
  v_status public.application_status;
  v_result RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.current_user_can_manage_application(p_application_id) THEN
    RAISE EXCEPTION 'Permission denied. You cannot update this application.' USING ERRCODE = '42501';
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
-- RLS fallback: allow university partners to UPDATE applications they can manage
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "university_partner_applications_update_fallback" ON public.applications;

CREATE POLICY "university_partner_applications_update_fallback"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  public.current_user_can_manage_application(id)
)
WITH CHECK (
  public.current_user_can_manage_application(id)
);

-- ---------------------------------------------------------------------------
-- RLS fallback: allow university partners to INSERT document_requests for apps
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "university_partner_document_requests_insert_fallback" ON public.document_requests;

CREATE POLICY "university_partner_document_requests_insert_fallback"
ON public.document_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- Sender must be a university partner (or admin/staff) and must be requesting
  -- docs for an application they can manage.
  (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(TRIM(p.role::TEXT)) IN ('admin', 'staff')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(TRIM(p.role::TEXT)) IN ('partner', 'school_rep', 'university', 'university_partner')
        AND p.tenant_id IS NOT NULL
        AND public.current_user_can_manage_application(document_requests.application_id)
        AND document_requests.tenant_id = p.tenant_id
        AND EXISTS (
          SELECT 1
          FROM public.applications a
          WHERE a.id = document_requests.application_id
            AND a.student_id = document_requests.student_id
        )
    )
  )
);

-- ---------------------------------------------------------------------------
-- Ensure PostgREST sees the updated functions/policies
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;
