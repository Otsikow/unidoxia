-- ============================================================================
-- FIX: Internal Notes & Messaging Persistence
-- ============================================================================

BEGIN;

-- 1. FIX INTERNAL NOTES PERMISSIONS (Re-applying the comprehensive fix)

-- Convert 'university' roles to 'partner'
UPDATE public.profiles
SET role = 'partner'
WHERE role::TEXT = 'university';

-- Ensure robust get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  raw_role TEXT;
  mapped_role public.app_role;
BEGIN
  IF user_id IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

  SELECT role::TEXT INTO raw_role
  FROM public.profiles
  WHERE id = user_id;

  IF raw_role IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

  raw_role := LOWER(TRIM(raw_role));

  CASE raw_role
    WHEN 'university' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_admin' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'university_staff' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'student' THEN mapped_role := 'student'::public.app_role;
    WHEN 'agent' THEN mapped_role := 'agent'::public.app_role;
    WHEN 'staff' THEN mapped_role := 'staff'::public.app_role;
    WHEN 'admin' THEN mapped_role := 'admin'::public.app_role;
    WHEN 'counselor' THEN mapped_role := 'counselor'::public.app_role;
    WHEN 'verifier' THEN mapped_role := 'verifier'::public.app_role;
    WHEN 'finance' THEN mapped_role := 'finance'::public.app_role;
    WHEN 'school_rep' THEN mapped_role := 'school_rep'::public.app_role;
    ELSE mapped_role := 'student'::public.app_role;
  END CASE;

  RETURN mapped_role;
END;
$$;

-- Ensure is_university_partner function
CREATE OR REPLACE FUNCTION public.is_university_partner(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  v_role := public.get_user_role(user_id);
  RETURN v_role IN ('partner'::public.app_role, 'school_rep'::public.app_role);
END;
$$;

-- Ensure get_user_tenant function
CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = user_id);
END;
$$;

-- Ensure is_admin_or_staff function
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN public.get_user_role(user_id) IN ('admin'::public.app_role, 'staff'::public.app_role);
END;
$$;

-- Recreate update_application_review RPC
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
  v_app_tenant UUID;
  v_app_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  v_user_role := public.get_user_role(v_user_id);

  IF NOT (
    v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    OR public.is_admin_or_staff(v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized. Role: %', v_user_role USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.applications WHERE applications.id = p_application_id) INTO v_app_exists;
  IF NOT v_app_exists THEN
    RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_admin_or_staff(v_user_id) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);
    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'User tenant is NULL' USING ERRCODE = '42501';
    END IF;

    SELECT u.tenant_id INTO v_app_tenant
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.id = p_application_id;

    IF v_app_tenant IS NULL OR v_app_tenant != v_user_tenant THEN
      RAISE EXCEPTION 'Tenant mismatch or not configured' USING ERRCODE = '42501';
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

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO anon;

-- 2. FIX MESSAGING PERSISTENCE

-- Ensure conversation participants RLS is correct
DROP POLICY IF EXISTS "View participants in own conversations" ON public.conversation_participants;
CREATE POLICY "View participants in own conversations"
ON public.conversation_participants
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Ensure conversation messages RLS is correct
DROP POLICY IF EXISTS "View messages in own conversations" ON public.conversation_messages;
CREATE POLICY "View messages in own conversations"
ON public.conversation_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Improve get_or_create_conversation to be more robust finding existing conversations
-- regardless of tenant_id mismatch if participants match exactly
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
  v_conversation_id UUID;
BEGIN
  -- First try to find ANY existing direct conversation between these two users
  -- We prioritize the requested tenant, but if one exists in another tenant (shared), we might want to return it?
  -- For now, we stick to the requested tenant but make sure we find it if it exists.
  
  SELECT c.id INTO v_conversation_id
    FROM public.conversations c
   WHERE c.tenant_id = p_tenant_id
     AND c.is_group = FALSE
     AND EXISTS (
       SELECT 1 FROM public.conversation_participants cp1
        WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user_id
     )
     AND EXISTS (
       SELECT 1 FROM public.conversation_participants cp2
        WHERE cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id
     )
   ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
   LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    -- Ensure both are still participants (just in case)
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_user_id, 'owner'),
      (v_conversation_id, p_other_user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET joined_at = now();
    
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (tenant_id, created_by, is_group, type)
  VALUES (p_tenant_id, p_user_id, FALSE, 'direct')
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES
    (v_conversation_id, p_user_id, 'owner'),
    (v_conversation_id, p_other_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

-- 3. DEBUG FUNCTION FOR MESSAGING
CREATE OR REPLACE FUNCTION public.debug_conversation_access(p_user_id UUID, p_other_user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  tenant_id UUID,
  participant_count BIGINT,
  is_participant BOOLEAN,
  message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.tenant_id,
    (SELECT count(*) FROM public.conversation_participants cp WHERE cp.conversation_id = c.id),
    EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = p_user_id),
    (SELECT count(*) FROM public.conversation_messages cm WHERE cm.conversation_id = c.id)
  FROM public.conversations c
  WHERE 
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = p_user_id)
    AND
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = p_other_user_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
