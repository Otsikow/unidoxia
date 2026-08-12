DROP POLICY IF EXISTS "Partners can insert programs" ON public.programs;
CREATE POLICY "Partners can insert programs"
ON public.programs
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
  AND has_role(auth.uid(), 'partner'::app_role)
  AND university_id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Partners can update programs" ON public.programs;
CREATE POLICY "Partners can update programs"
ON public.programs
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant(auth.uid())
  AND has_role(auth.uid(), 'partner'::app_role)
  AND university_id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
)
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
  AND has_role(auth.uid(), 'partner'::app_role)
  AND university_id IN (SELECT university_id FROM public.user_claimed_university_ids(auth.uid()))
);