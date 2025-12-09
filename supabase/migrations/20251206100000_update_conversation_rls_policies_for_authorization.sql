-- ============================================================
-- SECURE CONVERSATION CREATION AND ACCESS POLICIES
-- ============================================================
--
-- This migration enforces proper authorization for conversation access:
--
-- SECURITY MODEL:
-- 1. Users can ONLY create conversations where they are the creator (created_by = auth.uid())
-- 2. Users can ONLY join conversations they are explicitly invited to by the creator or an admin
-- 3. Users cannot arbitrarily add themselves to any conversation
-- 4. The get_or_create_conversation() SECURITY DEFINER function handles legitimate
--    conversation creation and properly adds both participants with appropriate checks
--
-- IMPORTANT: This fixes the security vulnerability where the previous policy
-- "Join conversations when invited" had an overly permissive clause:
--   OR conversation_participants.user_id = auth.uid()
-- which allowed ANY user to add themselves to ANY conversation.
--
-- ============================================================

BEGIN;

-- ============================================================
-- DROP ALL EXISTING CONVERSATION POLICIES (comprehensive cleanup)
-- ============================================================

-- Drop all SELECT policies on conversations
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users view conversations they belong to" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;

-- Drop all INSERT policies on conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation creators" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;

-- Drop all UPDATE policies on conversations
DROP POLICY IF EXISTS "Conversation owners update" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Group admins can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;

-- Drop all DELETE policies on conversations
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
DROP POLICY IF EXISTS "Conversation owners delete" ON public.conversations;

-- Drop all SELECT policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "View participants in own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON public.conversation_participants;

-- Drop all INSERT policies on conversation_participants (CRITICAL - removing insecure policies)
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Join conversations when invited" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_authorized" ON public.conversation_participants;

-- Drop all UPDATE policies on conversation_participants
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Update own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON public.conversation_participants;

-- Drop all DELETE policies on conversation_participants
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Leave conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON public.conversation_participants;

-- ============================================================
-- CONVERSATIONS TABLE POLICIES
-- ============================================================

-- SELECT: Users can only view conversations they are participants of
-- This ensures users cannot see other users' private conversations
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
-- NOTE: The get_or_create_conversation() SECURITY DEFINER function is the
-- recommended way to create conversations as it handles all authorization
-- checks and properly adds both participants
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

-- UPDATE: Users can only update conversations they created or where they have owner role
-- This prevents unauthorized modification of conversation metadata
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

-- DELETE: Only conversation creators can delete conversations
-- This is a soft-delete in most cases, but we need a policy for completeness
CREATE POLICY "conversations_delete_own"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);

-- ============================================================
-- CONVERSATION_PARTICIPANTS TABLE POLICIES
-- ============================================================

-- SELECT: Users can view participants of conversations they are part of
-- This allows users to see who else is in their conversations
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

-- INSERT: Users can ONLY add participants if they have explicit authority
-- SECURITY FIX: This policy removes the dangerous "OR user_id = auth.uid()"
-- clause that allowed any user to add themselves to any conversation
--
-- Authorized actions:
-- 1. Conversation creator can add participants
-- 2. Existing owners/admins of the conversation can add participants
--
-- NOTE: SECURITY DEFINER functions (like get_or_create_conversation) bypass RLS
-- and can add participants directly. This is the intended way for system-initiated
-- conversation creation (e.g., when starting a chat with another user).
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
-- This is used for updating last_read_at timestamps and similar user-specific data
-- Users cannot modify other participants' records
CREATE POLICY "conversation_participants_update_own"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only remove themselves from conversations (leave)
-- Users cannot kick other participants - only owners/admins can do that
-- via a SECURITY DEFINER function if needed
CREATE POLICY "conversation_participants_delete_own"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- GRANT EXECUTE ON SECURITY DEFINER FUNCTIONS
-- ============================================================
-- Ensure the get_or_create_conversation function can be called by authenticated users
-- This function handles the secure creation of conversations with proper authorization
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO authenticated;

COMMIT;
