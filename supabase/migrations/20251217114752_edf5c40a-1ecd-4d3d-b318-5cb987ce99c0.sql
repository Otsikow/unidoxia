-- Allow university partners to view student documents for applications to their university
CREATE POLICY "Partners can view student documents for their applications"
ON public.student_documents
FOR SELECT
USING (
  -- University partners can view student documents if the student has an application to their university
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN programs p ON a.program_id = p.id
    JOIN universities u ON p.university_id = u.id
    WHERE a.student_id = student_documents.student_id
      AND u.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND has_role(auth.uid(), 'partner')
  )
  OR is_admin_or_staff(auth.uid())
);