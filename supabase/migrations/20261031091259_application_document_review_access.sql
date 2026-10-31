-- Add the missing read path for university reviewers. Pending files remain
-- invisible to partners; staff must explicitly verify application documents.
-- No existing policies, user roles, assignments or document flags are changed.
BEGIN;
DROP POLICY IF EXISTS "University reviewers can read verified application documents"
  ON public.application_documents;
CREATE POLICY "University reviewers can read verified application documents"
  ON public.application_documents
  FOR SELECT TO authenticated
  USING (
    verified IS TRUE
    AND public.can_manage_university_application(auth.uid(), application_id)
  );
COMMIT;
