
-- 1. Fix user_feedback: anonymous feedback should not be visible to all authenticated users
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
CREATE POLICY "Users can view their own feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Fix user_roles privilege escalation: signup self-insert must be limited to 'student'
DROP POLICY IF EXISTS "Allow user_roles creation during signup" ON public.user_roles;
CREATE POLICY "Allow user_roles creation during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'student'::app_role
);

-- 3. Fix intakes: restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view active intakes" ON public.intakes;
CREATE POLICY "Authenticated users can view active intakes"
ON public.intakes
FOR SELECT
TO authenticated
USING (true);

-- 4. Fix message-attachments storage: make private and require conversation participation
UPDATE storage.buckets SET public = false WHERE id = 'message-attachments';

DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
CREATE POLICY "Conversation participants can view message attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    public.is_conversation_participant(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);
