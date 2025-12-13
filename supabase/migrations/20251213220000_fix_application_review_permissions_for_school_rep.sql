-- ============================================================================
-- Fix: allow school_rep (university partner) to update application review
-- ============================================================================
-- The UI uses the SECURITY DEFINER RPC `public.update_application_review` to
-- update application status and internal notes. That RPC (and the tenant-scoped
-- RLS policies) previously only allowed role = 'partner', but university partner
-- accounts can also use role = 'school_rep'. This caused status updates to fail
-- with a "may not have permission" toast.
-- ============================================================================

-- 1) Update RPC authorization to include school_rep
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
    RAISE EXCEPTION 'Not authorized to update applications' USING ERRCODE = '42501';
  END IF;

  -- For university partner roles: ensure the application belongs to their tenant (via program->university).
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

-- 2) Align tenant-scoped application policies to include school_rep
DO $$
BEGIN
  -- If these policies exist, replace them. (Policies can't be ALTERed.)
  EXECUTE 'DROP POLICY IF EXISTS "applications_partner_select" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "applications_partner_update" ON public.applications';
EXCEPTION WHEN OTHERS THEN
  -- Ignore if policies/table don't exist in this environment yet.
  NULL;
END$$;

-- SELECT: University partner roles can only see applications to their university's programs
CREATE POLICY "applications_partner_select"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_id
          AND p.university_id = public.get_user_university_id()
          AND p.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
    OR
    public.is_admin_or_staff(auth.uid())
    OR
    student_id IN (
      SELECT id FROM public.students
      WHERE profile_id = auth.uid()
    )
    OR
    agent_id IN (
      SELECT id FROM public.agents
      WHERE profile_id = auth.uid()
    )
  );

-- UPDATE: University partner roles can update applications to their university's programs
CREATE POLICY "applications_partner_update"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id
        AND p.university_id = public.get_user_university_id()
        AND p.tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = program_id
        AND p.university_id = public.get_user_university_id()
        AND p.tenant_id = public.get_user_tenant(auth.uid())
    )
  );

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Authorized application review update for university partners (partner + school_rep) and staff/admin (status + internal_notes + timeline event).';

