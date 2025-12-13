-- Fix university document requests and messaging
-- This migration addresses two issues:
-- 1. Universities (partner/school_rep) cannot insert document_requests due to missing RLS policies
-- 2. Universities cannot message students/agents across tenants for application-related conversations

BEGIN;

-- ============================================================================
-- STEP 1: Fix document_requests RLS policies for university users
-- ============================================================================

-- Enable RLS (idempotent)
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "document_requests_partner_select" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_partner_manage" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_university_manage" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_school_rep_manage" ON public.document_requests;
DROP POLICY IF EXISTS "Staff can manage document requests" ON public.document_requests;

-- Create comprehensive policy for university users (both partner and school_rep roles)
-- Universities can manage document requests for students who have applications to their programs
CREATE POLICY "document_requests_university_manage"
  ON public.document_requests
  FOR ALL
  TO authenticated
  USING (
    -- Admin/staff can manage all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partners/school_reps can manage requests in their tenant
    (
      (
        public.get_user_role(auth.uid()) = 'partner'::public.app_role
        OR public.get_user_role(auth.uid()) = 'school_rep'::public.app_role
      )
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
    OR
    -- Partners/school_reps can also manage requests for students with applications to their university
    (
      (
        public.get_user_role(auth.uid()) = 'partner'::public.app_role
        OR public.get_user_role(auth.uid()) = 'school_rep'::public.app_role
      )
      AND student_id IN (
        SELECT DISTINCT a.student_id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.submitted_at IS NOT NULL
      )
    )
  )
  WITH CHECK (
    -- Admin/staff can manage all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partners/school_reps can create requests in their tenant
    (
      (
        public.get_user_role(auth.uid()) = 'partner'::public.app_role
        OR public.get_user_role(auth.uid()) = 'school_rep'::public.app_role
      )
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
    OR
    -- Partners/school_reps can also create requests for students with applications to their university
    (
      (
        public.get_user_role(auth.uid()) = 'partner'::public.app_role
        OR public.get_user_role(auth.uid()) = 'school_rep'::public.app_role
      )
      AND student_id IN (
        SELECT DISTINCT a.student_id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.submitted_at IS NOT NULL
      )
    )
  );

-- Ensure students can still view their document requests
DROP POLICY IF EXISTS "Students can view their document requests" ON public.document_requests;
CREATE POLICY "Students can view their document requests"
  ON public.document_requests
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 2: Update get_or_create_conversation to allow university messaging
-- ============================================================================

-- This function allows universities to message students and agents who are
-- associated with applications to their university's programs.
-- Cross-tenant messaging is allowed for:
-- 1. University (partner/school_rep) → Student with submitted application to university
-- 2. University (partner/school_rep) → Agent who referred an application to university
-- 3. Student → University (partner/school_rep) with their application
-- 4. Agent → University (partner/school_rep) with their referred applications

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
  'Supports cross-tenant messaging for: '
  '1. University partners/school_reps messaging students with applications to their programs '
  '2. University partners/school_reps messaging agents who referred applications '
  '3. Students/agents messaging university partners about their applications';

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) TO authenticated;

-- ============================================================================
-- STEP 3: Update conversation RLS policies to handle cross-tenant viewing
-- ============================================================================

-- Universities should be able to view conversations with students/agents 
-- who have applications to their programs

DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;
CREATE POLICY "conversations_select_participants"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    -- User is a participant in the conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
    -- OR admin/staff can view all
    OR public.is_admin_or_staff(auth.uid())
  );

-- ============================================================================
-- STEP 4: Update get_messaging_contacts to include cross-tenant contacts
-- ============================================================================

-- Universities (partner/school_rep) need to see students and agents who have
-- applications to their programs, even if they're in different tenants

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
  v_search_filter text := NULL;
  v_student_id uuid;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Get current user's role and tenant
  SELECT role, tenant_id
    INTO v_user_role, v_tenant_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  -- Prepare search filter
  IF p_search IS NOT NULL AND trim(p_search) != '' THEN
    v_search_filter := '%' || trim(p_search) || '%';
  END IF;

  -- Return contacts based on role
  IF v_user_role = 'agent'::app_role THEN
    -- Agents can message their linked students and staff
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
    JOIN public.agent_student_links asl
      ON asl.student_id = s.id
     AND asl.agent_profile_id = v_user_id
    JOIN public.profiles p
      ON p.id = s.profile_id
    WHERE (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

    -- Return staff members
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

  ELSIF v_user_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    -- University users can message:
    -- 1. Students with applications to their programs (cross-tenant)
    -- 2. Agents who referred applications to their programs (cross-tenant)
    -- 3. Staff in their tenant

    -- Return students with applications to university programs
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

    -- Return agents who referred applications to university programs
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

    -- Return staff members
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

  ELSIF v_user_role = 'staff'::app_role THEN
    -- Staff can message everyone in their tenant
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

  ELSIF v_user_role = 'student'::app_role THEN
    -- Students can message their assigned agents, university reps with their applications, and staff
    
    -- Get student ID
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = v_user_id;

    -- Return assigned agents
    IF v_student_id IS NOT NULL THEN
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
      JOIN public.profiles p
        ON p.id = asl.agent_profile_id
      WHERE asl.student_id = v_student_id
        AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
      ORDER BY p.full_name
      LIMIT p_limit;

      -- Return university reps for universities with student's applications
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

    -- Return staff
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
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;

  ELSIF v_user_role IN ('admin'::app_role, 'counselor'::app_role) THEN
    -- Admins and counselors can message everyone in their tenant
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

  ELSE
    -- Default: can message staff and admins
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
      AND (v_search_filter IS NULL OR p.full_name ILIKE v_search_filter OR p.email ILIKE v_search_filter)
    ORDER BY p.full_name
    LIMIT p_limit;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_messaging_contacts(text, integer) IS 
  'Returns all users that the current user can message based on their role and relationships. '
  'Supports cross-tenant contacts for university users (students/agents with applications).';

GRANT EXECUTE ON FUNCTION public.get_messaging_contacts(text, integer) TO authenticated;

COMMIT;
