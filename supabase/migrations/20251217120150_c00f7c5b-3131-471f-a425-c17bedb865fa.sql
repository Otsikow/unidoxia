-- ============================================================
-- FIX MESSAGING (Infinite recursion) AND DOCUMENT ACCESS
-- ============================================================

-- 1. Create the SECURITY DEFINER helper function to check conversation membership
-- This function bypasses RLS to avoid infinite recursion
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

-- 2. Drop the problematic recursive policy on conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- 3. Create proper non-recursive policy using the SECURITY DEFINER helper function
CREATE POLICY "conversation_participants_view_safe"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  -- User can see their own participant records (no recursion)
  user_id = auth.uid()
  OR
  -- User can see other participants in conversations they belong to (via helper function)
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- 4. Add storage policy for partners to view student documents for their applications
-- Note: storage.objects.name refers to the file path in the bucket
CREATE POLICY "Partners can view student documents for applications"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (
    -- Partners can view documents for students with applications to their university
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.applications a ON a.student_id = s.id
      JOIN public.programs p ON a.program_id = p.id
      JOIN public.universities u ON p.university_id = u.id
      WHERE s.id::text = (storage.foldername(storage.objects.name))[1]
        AND u.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND public.has_role(auth.uid(), 'partner')
    )
  )
);