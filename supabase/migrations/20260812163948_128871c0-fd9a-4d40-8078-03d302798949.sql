CREATE OR REPLACE FUNCTION public.user_claimed_university_ids(_user_id uuid)
RETURNS TABLE (university_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.university_id
  FROM public.university_claims c
  WHERE c.claimant_user_id = _user_id
    AND c.status IN ('approved', 'verified')
$$;

REVOKE ALL ON FUNCTION public.user_claimed_university_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_claimed_university_ids(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Partners can update their university" ON public.universities;
CREATE POLICY "Partners can update their university"
ON public.universities
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role)
  AND tenant_id = get_user_tenant(auth.uid())
  AND id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role)
  AND tenant_id = get_user_tenant(auth.uid())
  AND id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Partners can manage document requests in their tenant" ON public.document_requests;
CREATE POLICY "Partners can manage their document requests"
ON public.document_requests
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role)
  AND tenant_id = get_user_tenant(auth.uid())
  AND (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.programs pr ON pr.id = a.program_id
      WHERE a.student_id = document_requests.student_id
        AND pr.university_id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role)
  AND tenant_id = get_user_tenant(auth.uid())
  AND (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.programs pr ON pr.id = a.program_id
      WHERE a.student_id = document_requests.student_id
        AND pr.university_id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
    )
  )
);