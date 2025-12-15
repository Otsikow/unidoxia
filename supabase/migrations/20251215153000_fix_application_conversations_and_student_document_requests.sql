-- ============================================================================
-- Fix University Partner Dashboard: application-scoped messaging + student doc requests
-- ============================================================================
-- Adds:
-- 1) Stable per-application conversation RPC (group thread per application)
-- 2) Student ability to UPDATE their own document_requests when uploading
-- 3) Ensure document_requests.application_id exists + index (idempotent)
--
-- NOTE: Several environments had historical tenant mismatches on applications.
-- This migration keeps authorization anchored to program->university tenant.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Ensure document_requests.application_id exists (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_requests'
      AND column_name = 'application_id'
  ) THEN
    ALTER TABLE public.document_requests
      ADD COLUMN application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_document_requests_application_id
      ON public.document_requests(application_id);
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 2) Allow students to UPDATE their own document requests (upload fulfillment)
-- ---------------------------------------------------------------------------
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_requests_student_update" ON public.document_requests;

CREATE POLICY "document_requests_student_update"
  ON public.document_requests
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id
      FROM public.students
      WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id
      FROM public.students
      WHERE profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Application-scoped conversation (stable thread per application_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_application_conversation(
  p_application_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role public.app_role;
  v_user_tenant UUID;

  v_student_profile_id UUID;
  v_university_tenant UUID;
  v_app_number TEXT;

  v_conversation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  v_user_role := public.get_user_role(v_user_id);
  v_user_tenant := public.get_user_tenant(v_user_id);

  -- Resolve application -> student profile + university tenant
  SELECT
    s.profile_id,
    u.tenant_id,
    a.app_number
  INTO
    v_student_profile_id,
    v_university_tenant,
    v_app_number
  FROM public.applications a
  JOIN public.students s ON s.id = a.student_id
  JOIN public.programs p ON p.id = a.program_id
  JOIN public.universities u ON u.id = p.university_id
  WHERE a.id = p_application_id;

  IF v_student_profile_id IS NULL THEN
    RAISE EXCEPTION 'application has no linked student profile' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization
  IF public.is_admin_or_staff(v_user_id) THEN
    -- ok
    NULL;
  ELSIF v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role) THEN
    IF v_user_tenant IS NULL OR v_university_tenant <> v_user_tenant THEN
      RAISE EXCEPTION 'not authorized for this application' USING ERRCODE = '42501';
    END IF;
  ELSIF v_user_role = 'student'::public.app_role THEN
    IF v_user_id <> v_student_profile_id THEN
      RAISE EXCEPTION 'not authorized for this application' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Conservative default
    RAISE EXCEPTION 'messaging not permitted for role %', v_user_role USING ERRCODE = '42501';
  END IF;

  -- Use university tenant as the shared conversation tenant.
  -- (Students may be in a different tenant; RLS is participant-based.)
  IF v_university_tenant IS NULL THEN
    -- Fallback to provided tenant or current user tenant
    v_university_tenant := COALESCE(p_tenant_id, v_user_tenant);
  END IF;

  -- Find existing application conversation
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.type = 'application'
    AND (c.metadata->>'application_id')::uuid = p_application_id
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (tenant_id, created_by, is_group, type, title, metadata)
    VALUES (
      v_university_tenant,
      v_user_id,
      TRUE,
      'application',
      COALESCE('Application ' || v_app_number, 'Application'),
      jsonb_build_object('application_id', p_application_id)
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Ensure participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_user_id),
    (v_conversation_id, v_student_profile_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_application_conversation(UUID, UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_conversations_application_id
  ON public.conversations ((metadata->>'application_id'))
  WHERE type = 'application';

-- Refresh PostgREST schema cache so RPC is immediately available
NOTIFY pgrst, 'reload config';

COMMIT;
