DROP POLICY IF EXISTS "Allow students creation during signup" ON public.students;
CREATE POLICY "Allow students creation during signup"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid() AND tenant_id IS NOT DISTINCT FROM public.get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "Allow agents creation during signup" ON public.agents;
CREATE POLICY "Allow agents creation during signup"
ON public.agents
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid() AND tenant_id IS NOT DISTINCT FROM public.get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "Participants insertable for self" ON public.conversation_participants;
CREATE POLICY "Participants insertable for self"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);