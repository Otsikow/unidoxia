-- Update conversations and conversation_participants RLS policies
-- to require proper authorization instead of permissive WITH CHECK (true)
-- This migration ensures:
-- 1. Users can only create conversations they own (created_by = auth.uid())
-- 2. Users can only join conversations they're invited to (by creator/admin)
-- 3. Removes overly permissive policies that allowed arbitrary access

BEGIN;

-- ============================================================
-- DROP ALL EXISTING CONVERSATION POLICIES
-- ============================================================

-- Drop all INSERT policies on conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation creators" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;

-- Drop all UPDATE policies on conversations
DROP POLICY IF EXISTS "Conversation owners update" ON public.conversations;
DROP POLICY IF EXISTS "Group admins can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;

-- Drop all SELECT policies on conversations (we'll recreate the correct one)
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON public.conversations;
DROP POLICY IF EXISTS "Users view conversations they belong to" ON public.conversations;

-- Drop all INSERT policies on conversation_participants  
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Join conversations when invited" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_policy" ON public.conversation_participants;

-- Drop SELECT policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "View participants in own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_policy" ON public.conversation_participants;

-- Drop UPDATE/DELETE policies on conversation_participants
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "Update own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Leave conversations" ON public.conversation_participants;

-- ============================================================
-- CONVERSATIONS TABLE POLICIES
-- ============================================================

-- SELECT: Users can only view conversations they are participants of
CREATE POLICY "conversations_select_own"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

-- INSERT: Users can only create conversations where they are the creator
-- and the tenant matches their profile's tenant
CREATE POLICY "conversations_insert_own"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be the creator
  created_by = auth.uid()
  -- Tenant must match user's profile tenant
  AND tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- UPDATE: Users can only update conversations they created or own
CREATE POLICY "conversations_update_own"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  -- Can see/select for update if creator
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.role = 'owner'
  )
)
WITH CHECK (
  -- Updated row must still satisfy: user is creator or owner
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.role = 'owner'
  )
);

-- ============================================================
-- CONVERSATION_PARTICIPANTS TABLE POLICIES
-- ============================================================

-- SELECT: Users can view participants of conversations they are part of
CREATE POLICY "conversation_participants_select_own"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- INSERT: Users can add participants only if they have authority:
-- 1. They are the conversation creator, OR
-- 2. They are an owner/admin of the conversation
-- Note: SECURITY DEFINER functions (like get_or_create_conversation) bypass RLS
-- and can add participants directly, which is the intended way for system-initiated
-- conversation creation (e.g., when starting a chat with another user)
CREATE POLICY "conversation_participants_insert_authorized"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- The conversation creator can add participants
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
  OR
  -- Existing owners/admins of the conversation can add participants
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role IN ('owner', 'admin')
  )
);

-- UPDATE: Users can only update their own participant record
-- (e.g., updating last_read_at)
CREATE POLICY "conversation_participants_update_own"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only remove themselves from conversations (leave)
CREATE POLICY "conversation_participants_delete_own"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

COMMIT;
