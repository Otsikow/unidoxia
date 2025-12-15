-- ============================================================================
-- Fix: University partner cannot update application status/notes
-- ============================================================================
-- Symptoms:
-- - Partner UI attempts direct UPDATE on public.applications
-- - RLS may block UPDATE resulting in 0 rows updated (no error), which the UI
--   surfaces as "Status update could not be saved..."
--
-- Fix:
-- 1) Ensure application_status enum includes 'rejected' (UI supports it)
-- 2) Provide a SECURITY DEFINER RPC that performs a properly-authorized update
--    (partner owns application via program->university tenant), and appends
--    a timeline event atomically.
-- ============================================================================

-- 1) Align DB enum with UI statuses
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2) Authorized update RPC for partner/staff/admin
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Only partner users (university partners) and staff/admin can update.
  IF NOT (public.get_user_role(v_user_id) = 'partner'::public.app_role OR public.is_admin_or_staff(v_user_id)) THEN
    RAISE EXCEPTION 'Not authorized to update applications' USING ERRCODE = '42501';
  END IF;

  -- For partners: ensure the application belongs to their university tenant (via program->university).
  IF NOT public.is_admin_or_staff(v_user_id) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);

    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Partner tenant not found' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.id = p_application_id
        AND u.tenant_id = v_user_tenant
    ) THEN
      RAISE EXCEPTION 'You do not have permission to update this application' USING ERRCODE = '42501';
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
    RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Authorized application review update for university partners (status + internal_notes + timeline event).';

-- Ensure PostgREST picks up the new/updated function immediately.
-- Without this, clients can hit "Could not find the function ... in the schema cache".
NOTIFY pgrst, 'reload config';

