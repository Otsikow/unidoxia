-- ============================================================================
-- ROBUST MESSAGING SYSTEM FIX
-- ============================================================================
-- This migration provides a comprehensive fix for the messaging system to ensure:
-- 1. Conversation persistence across all user types (universities, students, agents)
-- 2. Proper schema for conversation_participants (with or without role column)
-- 3. Robust get_or_create_conversation function that handles all edge cases
-- 4. Proper RLS policies for cross-tenant messaging
-- 5. Message recovery and audit trail capabilities
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure conversation_participants table has correct schema
-- ============================================================================

-- Add the role column if it doesn't exist (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.conversation_participants 
        ADD COLUMN role TEXT DEFAULT 'member';
        
        RAISE NOTICE 'Added role column to conversation_participants';
    ELSE
        RAISE NOTICE 'role column already exists in conversation_participants';
    END IF;
END $$;

-- Ensure last_read_at column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants' 
        AND column_name = 'last_read_at'
    ) THEN
        ALTER TABLE public.conversation_participants 
        ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Added last_read_at column to conversation_participants';
    END IF;
END $$;

-- Ensure joined_at column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants' 
        AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE public.conversation_participants 
        ADD COLUMN joined_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Added joined_at column to conversation_participants';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure conversations table has correct schema
-- ============================================================================

-- Ensure is_group column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'is_group'
    ) THEN
        ALTER TABLE public.conversations 
        ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Ensure created_by column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.conversations 
        ADD COLUMN created_by UUID;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Create helper function for getting platform tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.tenants 
  WHERE slug = 'bridge-global' 
     OR name ILIKE '%bridge global%'
     OR name ILIKE '%unidoxia%'
  ORDER BY created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_platform_tenant_id() IS 
  'Returns the platform (UniDoxia/Bridge Global) tenant ID where admin and staff accounts are located';

GRANT EXECUTE ON FUNCTION public.get_platform_tenant_id() TO authenticated;

-- ============================================================================
-- STEP 4: Create robust get_or_create_conversation function
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
  -- Check messaging permissions based on roles
  -- ========================================================================

  -- Case 1: Same tenant - always allowed
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
  'Supports cross-tenant messaging for: '
  '1. Any user messaging UniDoxia admin/staff for support '
  '2. University partners/school_reps messaging students with applications to their programs '
  '3. University partners/school_reps messaging agents who referred applications '
  '4. Students/agents messaging university partners about their applications '
  '5. Agent-student linked relationships';

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) TO authenticated;

-- ============================================================================
-- STEP 5: Create/update RLS policies for robust access control
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "conversation_participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "View participants in own conversations" ON public.conversation_participants;

-- Create comprehensive select policy
CREATE POLICY "conversation_participants_select_policy"
ON public.conversation_participants
FOR SELECT
USING (
  -- User is a participant in the conversation
  user_id = auth.uid()
  OR
  -- User is part of the same conversation
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "conversation_participants_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_authorized" ON public.conversation_participants;
DROP POLICY IF EXISTS "Join conversations when invited" ON public.conversation_participants;

CREATE POLICY "conversation_participants_insert_policy"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  -- User is the one being added
  user_id = auth.uid()
  OR
  -- User is the conversation creator
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND c.created_by = auth.uid()
  )
);

-- Drop and recreate update policy
DROP POLICY IF EXISTS "conversation_participants_update" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "Update own participant record" ON public.conversation_participants;

CREATE POLICY "conversation_participants_update_policy"
ON public.conversation_participants
FOR UPDATE
USING (user_id = auth.uid());

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "conversation_participants_delete" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "Leave conversations" ON public.conversation_participants;

CREATE POLICY "conversation_participants_delete_policy"
ON public.conversation_participants
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- STEP 6: Ensure conversation_messages policies are robust
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "View messages in own conversations" ON public.conversation_messages;
DROP POLICY IF EXISTS "Send messages to joined conversations" ON public.conversation_messages;

-- Create comprehensive message policies
CREATE POLICY "conversation_messages_select_policy"
ON public.conversation_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "conversation_messages_insert_policy"
ON public.conversation_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 7: Create message audit/recovery functions
-- ============================================================================

-- Create message audit log table if not exists
CREATE TABLE IF NOT EXISTS public.message_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  conversation_id UUID,
  sender_id UUID,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'recovered'
  content_snapshot TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.message_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for audit log (only admins can view)
CREATE POLICY "message_audit_log_admin_only"
ON public.message_audit_log
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin'::app_role, 'staff'::app_role)
  )
);

-- Create trigger to log message operations
CREATE OR REPLACE FUNCTION public.log_message_operation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.message_audit_log (message_id, conversation_id, sender_id, action, content_snapshot)
    VALUES (NEW.id, NEW.conversation_id, NEW.sender_id, 'created', NEW.content);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO public.message_audit_log (message_id, conversation_id, sender_id, action, content_snapshot)
      VALUES (NEW.id, NEW.conversation_id, NEW.sender_id, 'deleted', OLD.content);
    ELSE
      INSERT INTO public.message_audit_log (message_id, conversation_id, sender_id, action, content_snapshot, metadata)
      VALUES (NEW.id, NEW.conversation_id, NEW.sender_id, 'updated', NEW.content, jsonb_build_object('old_content', OLD.content));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.message_audit_log (message_id, conversation_id, sender_id, action, content_snapshot)
    VALUES (OLD.id, OLD.conversation_id, OLD.sender_id, 'hard_deleted', OLD.content);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS message_audit_trigger ON public.conversation_messages;

CREATE TRIGGER message_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.log_message_operation();

-- ============================================================================
-- STEP 8: Create conversation recovery function for admins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recover_deleted_messages(
  p_conversation_id uuid,
  p_since_date timestamptz DEFAULT (NOW() - INTERVAL '30 days')
)
RETURNS TABLE (
  message_id uuid,
  content text,
  sender_id uuid,
  deleted_at timestamptz,
  can_recover boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_role app_role;
BEGIN
  -- Only admins can recover messages
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_role NOT IN ('admin'::app_role, 'staff'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can recover deleted messages';
  END IF;

  RETURN QUERY
  SELECT 
    mal.message_id,
    mal.content_snapshot,
    mal.sender_id,
    mal.created_at as deleted_at,
    (mal.message_id IS NOT NULL) as can_recover
  FROM public.message_audit_log mal
  WHERE mal.conversation_id = p_conversation_id
    AND mal.action IN ('deleted', 'hard_deleted')
    AND mal.created_at >= p_since_date
  ORDER BY mal.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recover_deleted_messages(uuid, timestamptz) TO authenticated;

-- ============================================================================
-- STEP 9: Update get_messaging_contacts for all user types
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
    -- Agents can message their linked students
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

    -- Staff and support contacts
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
      -- Assigned agents
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

    -- Staff and support
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

GRANT EXECUTE ON FUNCTION public.get_messaging_contacts(text, integer) TO authenticated;

-- ============================================================================
-- STEP 10: Create function to validate and repair conversation integrity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_conversation_integrity(p_conversation_id uuid DEFAULT NULL)
RETURNS TABLE (
  conversation_id uuid,
  issue_type text,
  issue_description text,
  auto_fixed boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Find conversations without participants
  RETURN QUERY
  SELECT 
    c.id,
    'orphan_conversation'::text,
    'Conversation has no participants'::text,
    FALSE
  FROM public.conversations c
  WHERE (p_conversation_id IS NULL OR c.id = p_conversation_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
    );

  -- Find participants referencing non-existent conversations
  RETURN QUERY
  SELECT 
    cp.conversation_id,
    'orphan_participant'::text,
    'Participant references non-existent conversation'::text,
    FALSE
  FROM public.conversation_participants cp
  WHERE (p_conversation_id IS NULL OR cp.conversation_id = p_conversation_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = cp.conversation_id
    );

  -- Find messages in conversations user doesn't participate in
  RETURN QUERY
  SELECT DISTINCT
    cm.conversation_id,
    'message_access_issue'::text,
    'Messages exist but sender is not a participant'::text,
    FALSE
  FROM public.conversation_messages cm
  WHERE (p_conversation_id IS NULL OR cm.conversation_id = p_conversation_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = cm.conversation_id
      AND cp.user_id = cm.sender_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_conversation_integrity(uuid) TO authenticated;

-- ============================================================================
-- STEP 11: Ensure realtime is enabled for all messaging tables
-- ============================================================================

DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversation_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add tables to realtime publication: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 12: Create indexes for optimal query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last_message 
  ON public.conversations (tenant_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_created_by 
  ON public.conversations (created_by);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation 
  ON public.conversation_participants (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_created 
  ON public.conversation_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_audit_log_conversation 
  ON public.message_audit_log (conversation_id, created_at DESC);

COMMIT;
