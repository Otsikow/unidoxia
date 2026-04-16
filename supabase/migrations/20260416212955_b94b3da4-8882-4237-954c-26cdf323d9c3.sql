-- Allow students to insert their own attribution record during signup completion
CREATE POLICY "Students can insert their own attribution"
ON public.attributions
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);

-- Also allow students to view their own attributions (so the UI can verify)
CREATE POLICY "Students can view their own attributions"
ON public.attributions
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);