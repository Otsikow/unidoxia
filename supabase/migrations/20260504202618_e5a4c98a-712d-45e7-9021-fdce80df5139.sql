-- Ensure students and staff can permanently remove student document records.
-- This fixes cases where the UI hid a document locally but the database row was not actually removed.

DROP POLICY IF EXISTS "Students can manage their own documents" ON public.student_documents;
CREATE POLICY "Students can manage their own documents"
ON public.student_documents
FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT s.id
    FROM public.students s
    WHERE s.profile_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT s.id
    FROM public.students s
    WHERE s.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage all student documents" ON public.student_documents;
CREATE POLICY "Admins manage all student documents"
ON public.student_documents
FOR ALL
TO authenticated
USING (public.is_admin_or_staff(auth.uid()))
WITH CHECK (public.is_admin_or_staff(auth.uid()));