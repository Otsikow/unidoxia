-- ============================================================================
-- RESTRICT SAME-ROLE MESSAGING
-- ============================================================================
-- This migration restricts messaging between users of the same role:
-- 1. Students cannot message other students
-- 2. Agents cannot message other agents
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Update get_or_create_conversation to block same-role messaging
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
  v_platform_tenant uuid;
  v_has_role_column boolean;
BEGIN
  -- Validate authentication
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_current_user THEN
    RAISE EXCEPTION 'cannot act on behalf of another user';
  END IF;

  -- Get platform tenant ID
  v_platform_tenant := public.get_platform_tenant_id();

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

  -- Determine effective tenant for conversation
  v_effective_tenant := COALESCE(p_tenant_id, v_current_tenant);

  -- ========================================================================
  -- RESTRICTION: Block student-to-student messaging
  -- ========================================================================
  IF v_current_role = 'student'::app_role AND v_other_role = 'student'::app_role THEN
    RAISE EXCEPTION 'students cannot message other students';
  END IF;

  -- ========================================================================
  -- RESTRICTION: Block agent-to-agent messaging
  -- ========================================================================
  IF v_current_role = 'agent'::app_role AND v_other_role = 'agent'::app_role THEN
    RAISE EXCEPTION 'agents cannot message other agents';
  END IF;

  -- ========================================================================
  -- Check messaging permissions based on roles
  -- ========================================================================

  -- Case 1: Same tenant - always allowed (except same-role restrictions above)
  IF v_current_tenant = v_other_tenant THEN
    v_can_message := true;
    v_effective_tenant := v_current_tenant;

  -- Case 2: Admin/staff/counselor can message anyone
  ELSIF v_current_role IN ('admin'::app_role, 'staff'::app_role, 'counselor'::app_role) THEN
    v_can_message := true;

  -- Case 3: Anyone can message admin/staff on the platform tenant (UniDoxia support)
  ELSIF v_other_role IN ('admin'::app_role, 'staff'::app_role, 'counselor'::app_role)
    AND (v_other_tenant = v_platform_tenant OR v_platform_tenant IS NULL) THEN
    v_can_message := true;
    v_effective_tenant := COALESCE(v_platform_tenant, v_current_tenant);

  -- Case 4: University (partner/school_rep) messaging a student
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role)
    AND v_other_role = 'student'::app_role THEN
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

  -- Case 5: University messaging an agent
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role)
    AND v_other_role = 'agent'::app_role THEN
    SELECT true INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = p_other_user_id
      AND a.submitted_at IS NOT NULL
      AND u.tenant_id = v_current_tenant
    LIMIT 1;

  -- Case 6: Student messaging a university
  ELSIF v_current_role = 'student'::app_role
    AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
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

  -- Case 7: Agent messaging a university
  ELSIF v_current_role = 'agent'::app_role
    AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    SELECT true INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = v_current_user
      AND a.submitted_at IS NOT NULL
      AND u.tenant_id = v_other_tenant
    LIMIT 1;

  -- Case 8: Agent-student relationship
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

  -- Case 9: Student-agent relationship
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

  -- Raise exception if not allowed to message
  IF NOT v_can_message THEN
    RAISE EXCEPTION 'messaging not permitted between these users';
  END IF;

  -- ========================================================================
  -- Find existing conversation
  -- ========================================================================
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

  -- ========================================================================
  -- Create new conversation
  -- ========================================================================
  INSERT INTO public.conversations (tenant_id, created_by, is_group, type)
  VALUES (v_effective_tenant, v_current_user, FALSE, 'direct')
  RETURNING id INTO v_conversation_id;

  -- Check if role column exists before inserting
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'conversation_participants'
    AND column_name = 'role'
  ) INTO v_has_role_column;

  -- Insert participants with or without role column
  IF v_has_role_column THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, joined_at, last_read_at)
    VALUES
      (v_conversation_id, v_current_user, 'owner', now(), now()),
      (v_conversation_id, p_other_user_id, 'member', now(), now())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO public.conversation_participants (conversation_id, user_id, joined_at, last_read_at)
    VALUES
      (v_conversation_id, v_current_user, now(), now()),
      (v_conversation_id, p_other_user_id, now(), now())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN v_conversation_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) IS
  'Creates or retrieves a direct conversation between two users. '
  'Restricts: Students cannot message other students. Agents cannot message other agents. '
  'Supports cross-tenant messaging for: '
  '1. Any user messaging UniDoxia admin/staff for support '
  '2. University partners/school_reps messaging students with applications to their programs '
  '3. University partners/school_reps messaging agents who referred applications '
  '4. Students/agents messaging university partners about their applications '
  '5. Agent-student linked relationships';

-- ============================================================================
-- STEP 2: Update get_messaging_contacts to exclude same-role users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_messaging_contacts(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role app_role,
  contact_type text,
  headline text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role app_role;
  v_tenant_id uuid;
  v_platform_tenant uuid;
  v_search_filter text := NULL;
  v_student_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role, tenant_id
    INTO v_user_role, v_tenant_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  v_platform_tenant := public.get_platform_tenant_id();

  IF p_search IS NOT NULL AND trim(p_search) != '' THEN
    v_search_filter := '%' || trim(p_search) || '%';
  END IF;

  -- Return contacts based on role
  IF v_user_role = 'agent'::app_role THEN
    -- Agents can message their linked students (NOT other agents)
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      'student'::text as contact_type,
      COALESCE(s.headline, '')::text as headline
    FROM public.students s
    JOIN public.agent_student_links asl ON asl.student_id = s.id AND asl.agent_profile_id = v_user_id
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

    -- Staff and support contacts (excluding other agents)
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      CASE WHEN p.tenant_id = v_platform_tenant AND p.tenant_id != v_tenant_id
           THEN 'support'::text ELSE 'staff'::text END as contact_type,
      ''::text as headline
    FROM public.profiles p
    WHERE (p.tenant_id = v_tenant_id OR p.tenant_id = v_platform_tenant)
      AND p.role IN ('staff'::app_role, 'admin'::app_role, 'counselor'::app_role)
      AND p.id != v_user_id
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

  ELSIF v_user_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    -- University users can message students with applications
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      'student'::text as contact_type,
      COALESCE(s.headline, '')::text as headline
    FROM public.applications a
    JOIN public.students s ON s.id = a.student_id
    JOIN public.profiles p ON p.id = s.profile_id
    JOIN public.programs pr ON pr.id = a.program_id
    JOIN public.universities u ON u.id = pr.university_id
    WHERE u.tenant_id = v_tenant_id
      AND a.submitted_at IS NOT NULL
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

    -- Agents who referred applications
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      'agent'::text as contact_type,
      ''::text as headline
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.profiles p ON p.id = ag.profile_id
    JOIN public.programs pr ON pr.id = a.program_id
    JOIN public.universities u ON u.id = pr.university_id
    WHERE u.tenant_id = v_tenant_id
      AND a.submitted_at IS NOT NULL
      AND a.agent_id IS NOT NULL
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

    -- Staff and support
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      'staff'::text as contact_type,
      ''::text as headline
    FROM public.profiles p
    WHERE p.tenant_id = v_tenant_id
      AND p.role IN ('staff'::app_role, 'admin'::app_role, 'counselor'::app_role)
      AND p.id != v_user_id
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

    -- UniDoxia support (platform tenant)
    IF v_platform_tenant IS NOT NULL AND v_platform_tenant != v_tenant_id THEN
      RETURN QUERY
      SELECT
        p.id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.role,
        'support'::text as contact_type,
        'UniDoxia Support'::text as headline
      FROM public.profiles p
      WHERE p.tenant_id = v_platform_tenant
        AND p.role IN ('staff'::app_role, 'admin'::app_role, 'counselor'::app_role)
        AND p.id != v_user_id
        AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
      ORDER BY CASE p.role WHEN 'admin' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END, p.full_name
      LIMIT p_limit;
    END IF;

  ELSIF v_user_role = 'student'::app_role THEN
    SELECT s.id INTO v_student_id FROM public.students s WHERE s.profile_id = v_user_id;

    IF v_student_id IS NOT NULL THEN
      -- Assigned agents (NOT other students)
      RETURN QUERY
      SELECT
        p.id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.role,
        'agent'::text as contact_type,
        ''::text as headline
      FROM public.agent_student_links asl
      JOIN public.profiles p ON p.id = asl.agent_profile_id
      WHERE asl.student_id = v_student_id
        AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
      ORDER BY p.full_name
      LIMIT p_limit;

      -- University reps for applications
      RETURN QUERY
      SELECT DISTINCT
        p.id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.role,
        'university'::text as contact_type,
        ''::text as headline
      FROM public.applications a
      JOIN public.programs pr ON pr.id = a.program_id
      JOIN public.universities u ON u.id = pr.university_id
      JOIN public.profiles p ON p.tenant_id = u.tenant_id AND p.role IN ('partner'::app_role, 'school_rep'::app_role)
      WHERE a.student_id = v_student_id
        AND a.submitted_at IS NOT NULL
        AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
      ORDER BY p.full_name
      LIMIT p_limit;
    END IF;

    -- Staff and support (NOT other students)
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      CASE WHEN p.tenant_id = v_platform_tenant AND p.tenant_id != v_tenant_id
           THEN 'support'::text ELSE 'staff'::text END as contact_type,
      ''::text as headline
    FROM public.profiles p
    WHERE (p.tenant_id = v_tenant_id OR p.tenant_id = v_platform_tenant)
      AND p.role IN ('staff'::app_role, 'admin'::app_role, 'counselor'::app_role)
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

  ELSIF v_user_role IN ('admin'::app_role, 'staff'::app_role, 'counselor'::app_role) THEN
    -- Admin/staff can message everyone in their tenant
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      CASE
        WHEN p.role = 'student' THEN 'student'
        WHEN p.role IN ('agent', 'partner') THEN 'agent'
        WHEN p.role = 'school_rep' THEN 'university'
        ELSE 'staff'
      END::text as contact_type,
      COALESCE((SELECT s.headline FROM public.students s WHERE s.profile_id = p.id), '')::text as headline
    FROM public.profiles p
    WHERE p.tenant_id = v_tenant_id
      AND p.id != v_user_id
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_messaging_contacts(text, integer) IS
  'Returns messaging contacts for the current user based on their role. '
  'Students only see their assigned agents, university reps, and staff (NOT other students). '
  'Agents only see their linked students and staff (NOT other agents). '
  'University users see students with applications and referring agents. '
  'Admin/staff see everyone in their tenant.';

COMMIT;
