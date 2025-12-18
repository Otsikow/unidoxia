-- ============================================================================
-- FIX MESSAGING PERSISTENCE SCRIPT
-- ============================================================================
-- This script fixes the messaging system to ensure message persistence.
-- It addresses the "column 'role' of relation 'conversation_participants' 
-- does not exist" error.
--
-- Run this script with: psql -f fix_messaging_persistence.sql
-- Or apply via Supabase SQL editor
-- ============================================================================

BEGIN;

-- Step 1: Check if role column exists and add it if missing
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
        RAISE NOTICE 'role column already exists';
    END IF;
END $$;

-- Step 2: Ensure other required columns exist
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
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants' 
        AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE public.conversation_participants 
        ADD COLUMN joined_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 3: Create/update the get_or_create_conversation function
-- This version handles both with and without role column
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
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_current_user THEN
    RAISE EXCEPTION 'cannot act on behalf of another user';
  END IF;

  -- Get platform tenant ID (optional)
  BEGIN
    v_platform_tenant := public.get_platform_tenant_id();
  EXCEPTION WHEN OTHERS THEN
    v_platform_tenant := NULL;
  END;

  -- Get current user's role and tenant
  SELECT role, tenant_id INTO v_current_role, v_current_tenant
  FROM public.profiles WHERE id = v_current_user;

  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'profile not found for current user';
  END IF;

  -- Get other user's role and tenant
  SELECT role, tenant_id INTO v_other_role, v_other_tenant
  FROM public.profiles WHERE id = p_other_user_id;

  IF v_other_role IS NULL THEN
    RAISE EXCEPTION 'recipient profile not found';
  END IF;

  v_effective_tenant := COALESCE(p_tenant_id, v_current_tenant);

  -- Check messaging permissions
  
  -- Same tenant - always allowed
  IF v_current_tenant = v_other_tenant THEN
    v_can_message := true;
    v_effective_tenant := v_current_tenant;
  
  -- Admin/staff can message anyone
  ELSIF v_current_role IN ('admin'::app_role, 'staff'::app_role, 'counselor'::app_role) THEN
    v_can_message := true;
  
  -- Anyone can message admin/staff on platform tenant
  ELSIF v_other_role IN ('admin'::app_role, 'staff'::app_role, 'counselor'::app_role) THEN
    v_can_message := true;
    v_effective_tenant := COALESCE(v_platform_tenant, v_current_tenant);
  
  -- University messaging student with application
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role) 
    AND v_other_role = 'student'::app_role THEN
    SELECT s.id INTO v_student_id FROM public.students s WHERE s.profile_id = p_other_user_id;
    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.student_id = v_student_id AND a.submitted_at IS NOT NULL AND u.tenant_id = v_current_tenant
      LIMIT 1;
    END IF;
  
  -- University messaging agent with referred application
  ELSIF v_current_role IN ('partner'::app_role, 'school_rep'::app_role) 
    AND v_other_role = 'agent'::app_role THEN
    SELECT true INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = p_other_user_id AND a.submitted_at IS NOT NULL AND u.tenant_id = v_current_tenant
    LIMIT 1;
  
  -- Student messaging university with application
  ELSIF v_current_role = 'student'::app_role 
    AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    SELECT s.id INTO v_student_id FROM public.students s WHERE s.profile_id = v_current_user;
    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.student_id = v_student_id AND a.submitted_at IS NOT NULL AND u.tenant_id = v_other_tenant
      LIMIT 1;
    END IF;
  
  -- Agent messaging university with referred application
  ELSIF v_current_role = 'agent'::app_role 
    AND v_other_role IN ('partner'::app_role, 'school_rep'::app_role) THEN
    SELECT true INTO v_can_message
    FROM public.applications a
    JOIN public.agents ag ON ag.id = a.agent_id
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE ag.profile_id = v_current_user AND a.submitted_at IS NOT NULL AND u.tenant_id = v_other_tenant
    LIMIT 1;
  
  -- Agent-student link
  ELSIF v_current_role = 'agent'::app_role AND v_other_role = 'student'::app_role THEN
    SELECT s.id INTO v_student_id FROM public.students s WHERE s.profile_id = p_other_user_id;
    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.agent_student_links asl
      WHERE asl.agent_profile_id = v_current_user AND asl.student_id = v_student_id;
    END IF;
  
  -- Student-agent link  
  ELSIF v_current_role = 'student'::app_role AND v_other_role = 'agent'::app_role THEN
    SELECT s.id INTO v_student_id FROM public.students s WHERE s.profile_id = v_current_user;
    IF v_student_id IS NOT NULL THEN
      SELECT true INTO v_can_message
      FROM public.agent_student_links asl
      WHERE asl.agent_profile_id = p_other_user_id AND asl.student_id = v_student_id;
    END IF;
  END IF;

  IF NOT v_can_message THEN
    RAISE EXCEPTION 'messaging not permitted between these users';
  END IF;

  -- Find existing conversation
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.is_group = FALSE
    AND EXISTS (SELECT 1 FROM public.conversation_participants cp1 WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user)
    AND EXISTS (SELECT 1 FROM public.conversation_participants cp2 WHERE cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id)
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (tenant_id, created_by, is_group, type)
  VALUES (v_effective_tenant, v_current_user, FALSE, 'direct')
  RETURNING id INTO v_conversation_id;

  -- Insert participants (handles both schema versions)
  BEGIN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, joined_at, last_read_at)
    VALUES
      (v_conversation_id, v_current_user, 'owner', now(), now()),
      (v_conversation_id, p_other_user_id, 'member', now(), now())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  EXCEPTION WHEN undefined_column THEN
    -- Fallback if role column doesn't exist
    INSERT INTO public.conversation_participants (conversation_id, user_id, joined_at, last_read_at)
    VALUES
      (v_conversation_id, v_current_user, now(), now()),
      (v_conversation_id, p_other_user_id, now(), now())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) TO authenticated;

-- Step 4: Verify the fix
DO $$
DECLARE
  v_has_role boolean;
  v_function_exists boolean;
BEGIN
  -- Check if role column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_participants' 
    AND column_name = 'role'
  ) INTO v_has_role;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_or_create_conversation'
  ) INTO v_function_exists;
  
  IF v_has_role AND v_function_exists THEN
    RAISE NOTICE '✅ Messaging persistence fix applied successfully!';
    RAISE NOTICE '   - role column: EXISTS';
    RAISE NOTICE '   - get_or_create_conversation function: EXISTS';
  ELSE
    IF NOT v_has_role THEN
      RAISE WARNING '⚠️ role column is missing from conversation_participants';
    END IF;
    IF NOT v_function_exists THEN
      RAISE WARNING '⚠️ get_or_create_conversation function is missing';
    END IF;
  END IF;
END $$;

COMMIT;

-- Output confirmation
SELECT 'Messaging persistence fix has been applied.' AS status;
