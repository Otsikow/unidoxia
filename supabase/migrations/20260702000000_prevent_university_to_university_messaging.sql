-- Prevent university-to-university messaging
-- This migration adds a restriction to prevent users with university roles (partner/school_rep)
-- from messaging other users with university roles, regardless of tenant.

BEGIN;

-- ============================================================================
-- Update get_or_create_conversation to block university-to-university messaging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_id uuid,
  p_other_user_id uuid,
  p_tenant_id uuid
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_user uuid := auth.uid();
  v_conversation_id uuid;
  v_current_role app_role;
  v_current_tenant uuid;
  v_other_role app_role;
  v_other_tenant uuid;
  v_student_id uuid;
  v_can_message boolean := false;
  v_effective_tenant uuid;
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_current_user THEN
    RAISE EXCEPTION 'cannot act on behalf of another user';
  END IF;

  -- Get current user's role and tenant
  SELECT role, tenant_id
    INTO v_current_role, v_current_tenant
  FROM public.profiles
  WHERE id = v_current_user;

  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'profile not found for current user';
  END IF;

  -- Get other user's role and tenant
  SELECT role, tenant_id
    INTO v_other_role, v_other_tenant
  FROM public.profiles
  WHERE id = p_other_user_id;

  IF v_other_role IS NULL THEN
    RAISE EXCEPTION 'recipient profile not found';
  END IF;

  -- ============================================================================
  -- BLOCK: Universities cannot message other universities
  -- This check runs BEFORE any other permission checks
  -- ============================================================================
  IF v_current_role IN ('partner'::app_role, 'school_rep'::app_role)
     AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    RAISE EXCEPTION 'universities cannot message other universities';
  END IF;

  -- Determine effective tenant for conversation
  -- Use the provided tenant if specified, otherwise use current user's tenant
  v_effective_tenant := COALESCE(p_tenant_id, v_current_tenant);

  -- Check messaging permissions based on roles

  -- Case 1: Same tenant - always allowed (existing behavior)
  IF v_current_tenant = v_other_tenant THEN
    v_can_message := true;
    v_effective_tenant := v_current_tenant;

  -- Case 2: Admin/staff can message anyone
  ELSIF v_current_role IN ('admin'::app_role, 'staff'::app_role) THEN
    v_can_message := true;

  -- Case 3: University (partner/school_rep) messaging a student
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role)
    AND v_other_role = 'student'::app_role THEN
    -- Check if student has a submitted application to the university's programs
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = p_other_user_id;

    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.student_id = v_student_id
        AND a.submitted_at IS NOT NULL
        AND u.tenant_id = v_current_tenant
      LIMIT 1;
    END IF;

  -- Case 4: University (partner/school_rep) messaging an agent
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role)
    AND v_other_role = 'agent'::app_role THEN
    -- Check if agent has referred a submitted application to the university's programs
    SELECT true INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = p_other_user_id
      AND a.submitted_at IS NOT NULL
      AND u.tenant_id = v_current_tenant
    LIMIT 1;

  -- Case 5: Student messaging a university
  ELSIF v_current_role = 'student'::app_role
    AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    -- Check if student has a submitted application to the university
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = v_current_user;

    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.student_id = v_student_id
        AND a.submitted_at IS NOT NULL
        AND u.tenant_id = v_other_tenant
      LIMIT 1;
    END IF;

  -- Case 6: Agent messaging a university
  ELSIF v_current_role = 'agent'::app_role
    AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    -- Check if agent has referred a submitted application to the university
    SELECT true INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = v_current_user
      AND a.submitted_at IS NOT NULL
      AND u.tenant_id = v_other_tenant
    LIMIT 1;

  -- Case 7: Agent-student relationship (existing behavior)
  ELSIF v_current_role = 'agent'::app_role AND v_other_role = 'student'::app_role THEN
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = p_other_user_id;

    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.agent_student_links asl
      WHERE asl.agent_profile_id = v_current_user
        AND asl.student_id = v_student_id;
    END IF;

  -- Case 8: Student-agent relationship (existing behavior)
  ELSIF v_current_role = 'student'::app_role AND v_other_role = 'agent'::app_role THEN
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = v_current_user;

    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.agent_student_links asl
      WHERE asl.agent_profile_id = p_other_user_id
        AND asl.student_id = v_student_id;
    END IF;
  END IF;

  -- Final check - raise exception if not allowed to message
  IF NOT v_can_message THEN
    RAISE EXCEPTION 'messaging not permitted between these users';
  END IF;

  -- Try to find existing conversation (check both tenants for cross-tenant conversations)
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.is_group = FALSE
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      WHERE cp1.conversation_id = c.id
        AND cp1.user_id = v_current_user
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = c.id
        AND cp2.user_id = p_other_user_id
    )
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation in the effective tenant
  INSERT INTO public.conversations (tenant_id, created_by, is_group, type)
  VALUES (v_effective_tenant, v_current_user, FALSE, 'direct')
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES
    (v_conversation_id, v_current_user, 'owner'),
    (v_conversation_id, p_other_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) IS
  'Creates or retrieves a direct conversation between two users. '
  'Universities (partner/school_rep) cannot message other universities. '
  'Supports cross-tenant messaging for: '
  '1. University partners/school_reps messaging students with applications to their programs '
  '2. University partners/school_reps messaging agents who referred applications '
  '3. Students/agents messaging university partners about their applications';

COMMIT;
