-- Create properly scoped policies using role checks (partner role covers university partners)
CREATE POLICY "Partners and staff can upload university media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'university-media' AND
  (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'school_rep') OR public.is_admin_or_staff(auth.uid()))
);

CREATE POLICY "Partners and staff can update university media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'university-media' AND
  (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'school_rep') OR public.is_admin_or_staff(auth.uid()))
);

CREATE POLICY "Partners and staff can delete university media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'university-media' AND
  (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'school_rep') OR public.is_admin_or_staff(auth.uid()))
);