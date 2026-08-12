-- Release fix: realtime.messages RLS fell through to `ELSE true` for any topic
-- that was not a conversation topic, allowing any authenticated user to
-- subscribe to arbitrary private realtime topics. Replace the permissive
-- fallback with explicit deny-by-default while preserving the existing
-- conversation authorisation rules exactly.

DROP POLICY IF EXISTS "Realtime: conversation participants only" ON realtime.messages;

CREATE POLICY "Realtime: conversation participants only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN topic LIKE 'conversation:%' THEN
      public.is_conversation_participant(
        NULLIF(split_part(topic, ':', 2), '')::uuid, auth.uid())
    WHEN topic LIKE 'conversation_messages:%' THEN
      public.is_conversation_participant(
        NULLIF(split_part(topic, ':', 2), '')::uuid, auth.uid())
    ELSE false
  END
);