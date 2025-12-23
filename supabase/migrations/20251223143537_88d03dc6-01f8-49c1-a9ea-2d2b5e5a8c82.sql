-- Allow users to view profiles of other conversation participants
-- This is needed for messaging to work across tenants (e.g., university partners messaging students)

CREATE POLICY "Profiles: conversation participants can view" 
ON public.profiles 
FOR SELECT 
USING (
  -- User can see profiles of people they share a conversation with
  EXISTS (
    SELECT 1 
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = profiles.id
  )
);