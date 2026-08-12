DROP POLICY IF EXISTS "Admins can manage scholarships" ON public.scholarships;
CREATE POLICY "Admins can manage scholarships"
ON public.scholarships
FOR ALL
TO authenticated
USING (public.is_admin_or_staff(auth.uid()))
WITH CHECK (public.is_admin_or_staff(auth.uid()));