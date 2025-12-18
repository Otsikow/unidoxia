-- ============================================================================
-- FIX: Cross-Tenant Messaging Between Students, Universities, and Agents
-- ============================================================================
-- This migration fixes the "Unable to start conversation" error by:
-- 1. Properly finding existing direct conversations regardless of tenant_id
-- 2. Implementing comprehensive authorization checks for cross-tenant messaging
-- 3. Creating new conversations in the appropriate tenant
--
-- Supported messaging relationships:
-- - Students <-> Universities (via submitted applications)
-- - Agents <-> Students (via agent_student_links)
-- - Agents <-> Universities (via referred applications)
-- - Staff/Admin <-> Anyone in their tenant
-- - Same tenant users can always message each other
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create robust get_or_create_conversation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_id UUID,
  p_other_user_id UUID,
  p_tenant_id UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  v_conversation_id UUID;
  v_current_role app_role;
  v_current_tenant UUID;
  v_other_role app_role;
  v_other_tenant UUID;
  v_student_id UUID;
  v_can_message BOOLEAN := FALSE;
  v_effective_tenant UUID;
BEGIN
  -- Validate authentication
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Security check: user can only act as themselves
  IF p_user_id IS NOT NULL AND p_user_id <> v_current_user THEN
    RAISE EXCEPTION 'cannot act on behalf of another user';
  END IF;

  -- Prevent self-messaging
  IF p_other_user_id = v_current_user THEN
    RAISE EXCEPTION 'cannot message yourself';
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

  -- Determine effective tenant for new conversations
  v_effective_tenant := COALESCE(p_tenant_id, v_current_tenant);

  -- =========================================================================
  -- Authorization Logic: Determine if messaging is permitted
  -- =========================================================================

  -- Case 1: Same tenant - always allowed
  IF v_current_tenant = v_other_tenant THEN
    v_can_message := TRUE;
    v_effective_tenant := v_current_tenant;
  
  -- Case 2: Admin/staff can message anyone
  ELSIF v_current_role IN ('admin'::app_role, 'staff'::app_role) THEN
    v_can_message := TRUE;
  
  -- Case 3: University (partner/school_rep) messaging a student
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role) 
    AND v_other_role = 'student'::app_role THEN
    -- Check if student has a submitted application to the university's programs
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = p_other_user_id;
    
    IF v_student_id IS NOT NULL THEN
      SELECT TRUE INTO v_can_message
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
    SELECT TRUE INTO v_can_message
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
      SELECT TRUE INTO v_can_message
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
    SELECT TRUE INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = v_current_user
      AND a.submitted_at IS NOT NULL
      AND u.tenant_id = v_other_tenant
    LIMIT 1;
  
  -- Case 7: Agent messaging their linked student
  ELSIF v_current_role = 'agent'::app_role AND v_other_role = 'student'::app_role THEN
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = p_other_user_id;

    IF v_student_id IS NOT NULL THEN
      SELECT TRUE INTO v_can_message
      FROM public.agent_student_links asl
      WHERE asl.agent_profile_id = v_current_user
        AND asl.student_id = v_student_id
      LIMIT 1;
    END IF;
  
  -- Case 8: Student messaging their linked agent
  ELSIF v_current_role = 'student'::app_role AND v_other_role = 'agent'::app_role THEN
    SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.profile_id = v_current_user;

    IF v_student_id IS NOT NULL THEN
      SELECT TRUE INTO v_can_message
      FROM public.agent_student_links asl
      WHERE asl.agent_profile_id = p_other_user_id
        AND asl.student_id = v_student_id
      LIMIT 1;
    END IF;
  END IF;

  -- Default to NULL if not explicitly set to TRUE
  v_can_message := COALESCE(v_can_message, FALSE);

  -- Final check - raise exception if not allowed to message
  IF NOT v_can_message THEN
    RAISE EXCEPTION 'messaging not permitted between these users';
  END IF;

  -- =========================================================================
  -- Find existing conversation (search across ALL tenants to avoid duplicates)
  -- =========================================================================
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
    -- Ensure both participants are properly registered (idempotent)
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, v_current_user, 'owner'),
      (v_conversation_id, p_other_user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET joined_at = now();
    
    RETURN v_conversation_id;
  END IF;

  -- =========================================================================
  -- Create new conversation
  -- =========================================================================
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

COMMENT ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) IS 
  'Creates or retrieves a direct conversation between two users. '
  'Supports cross-tenant messaging for: '
  '1. Students/agents messaging university reps with applications to their programs '
  '2. University reps messaging students/agents with applications '
  '3. Agents messaging their linked students '
  'Always finds existing conversations across tenants to prevent duplicates.';

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO authenticated;

-- ============================================================================
-- STEP 2: Update conversation RLS policies for cross-tenant access
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;

-- Create unified SELECT policy for conversations
-- Users can view conversations they are participants of
CREATE POLICY "conversations_select_policy"
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
  -- OR admin/staff can view all in their tenant
  OR (
    public.is_admin_or_staff(auth.uid())
    AND tenant_id = public.get_user_tenant(auth.uid())
  )
);

-- ============================================================================
-- STEP 3: Update conversation_participants RLS for cross-tenant viewing
-- ============================================================================

DROP POLICY IF EXISTS "conversation_participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "View participants in own conversations" ON public.conversation_participants;

-- Users can view participants of conversations they are part of
CREATE POLICY "conversation_participants_select_policy"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  -- User can see their own participant records
  user_id = auth.uid()
  OR
  -- User can see other participants if they are also in the conversation
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 4: Update conversation_messages RLS for cross-tenant viewing
-- ============================================================================

DROP POLICY IF EXISTS "conversation_messages_select" ON public.conversation_messages;
DROP POLICY IF EXISTS "View messages in own conversations" ON public.conversation_messages;

-- Users can view messages in conversations they are part of
CREATE POLICY "conversation_messages_select_policy"
ON public.conversation_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 5: Ensure message INSERT policy is correct
-- ============================================================================

DROP POLICY IF EXISTS "conversation_messages_insert" ON public.conversation_messages;
DROP POLICY IF EXISTS "Send messages to joined conversations" ON public.conversation_messages;

CREATE POLICY "conversation_messages_insert_policy"
ON public.conversation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;
