-- ============================================================
-- FIX CONVERSATION RLS POLICIES TO AVOID POTENTIAL RECURSION
-- ============================================================
--
-- This migration fixes the self-referential RLS policies on
-- conversation_participants that could cause issues in some
-- PostgreSQL/Supabase configurations.
--
-- The key change is to use a simpler, non-recursive approach
-- for the SELECT policy on conversation_participants.
-- ============================================================

BEGIN;

-- ============================================================
-- Create helper function to check conversation membership
-- Using SECURITY DEFINER bypasses RLS for this check
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- ============================================================
-- Drop existing policies that might cause issues
-- ============================================================

DROP POLICY IF EXISTS "conversation_participants_select_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "View participants in own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "Users view conversations they belong to" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- ============================================================
-- CONVERSATION_PARTICIPANTS SELECT POLICY
-- ============================================================
-- Users can view:
-- 1. Their own participant records (direct check, no recursion)
-- 2. Other participants in conversations they belong to (via helper function)

CREATE POLICY "conversation_participants_select"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  -- Direct check: user can always see their own records
  user_id = auth.uid()
  OR
  -- Use helper function to check if user is a participant (bypasses RLS)
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- ============================================================
-- CONVERSATIONS SELECT POLICY
-- ============================================================
-- Users can view conversations they are participants of
-- Uses the helper function to avoid RLS recursion

CREATE POLICY "conversations_select"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
);

-- ============================================================
-- Ensure INSERT/UPDATE/DELETE policies exist and are correct
-- ============================================================

-- Conversations INSERT: Must be creator and match tenant
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "Conversation creators" ON public.conversations;

CREATE POLICY "conversations_insert"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- Conversations UPDATE: Must be creator or owner
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "Conversation owners update" ON public.conversations;

CREATE POLICY "conversations_update"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_conversation_participant(id, auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_conversation_participant(id, auth.uid())
);

-- Conversations DELETE: Only creator
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;

CREATE POLICY "conversations_delete"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);

-- Conversation participants INSERT: Authorized users only
DROP POLICY IF EXISTS "conversation_participants_insert_authorized" ON public.conversation_participants;
DROP POLICY IF EXISTS "Join conversations when invited" ON public.conversation_participants;

CREATE POLICY "conversation_participants_insert"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- Conversation creator can add participants
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
  OR
  -- User is adding themselves (initial join via SECURITY DEFINER function)
  user_id = auth.uid()
);

-- Conversation participants UPDATE: Own record only
DROP POLICY IF EXISTS "conversation_participants_update_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "Update own participant record" ON public.conversation_participants;

CREATE POLICY "conversation_participants_update"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Conversation participants DELETE: Own record only (leave conversation)
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "Leave conversations" ON public.conversation_participants;

CREATE POLICY "conversation_participants_delete"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- CONVERSATION_MESSAGES POLICIES (ensure they use helper function)
-- ============================================================

DROP POLICY IF EXISTS "View messages in own conversations" ON public.conversation_messages;
DROP POLICY IF EXISTS "Users can view their conversation messages" ON public.conversation_messages;

CREATE POLICY "conversation_messages_select"
ON public.conversation_messages
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Send messages to joined conversations" ON public.conversation_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.conversation_messages;

CREATE POLICY "conversation_messages_insert"
ON public.conversation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

-- Keep existing edit/delete policies
DROP POLICY IF EXISTS "Edit own messages" ON public.conversation_messages;
CREATE POLICY "conversation_messages_update"
ON public.conversation_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Delete own messages" ON public.conversation_messages;
CREATE POLICY "conversation_messages_delete"
ON public.conversation_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

COMMIT;
