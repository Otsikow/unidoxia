DROP POLICY IF EXISTS "Anyone can view universities in their tenant" ON public.universities;
CREATE POLICY "Anyone can view universities in their tenant" ON public.universities
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "Partners can update their university" ON public.universities;
CREATE POLICY "Partners can update their university" ON public.universities
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.has_role(auth.uid(), 'partner'::app_role));

DROP POLICY IF EXISTS "Admins can manage universities" ON public.universities;
CREATE POLICY "Admins can manage universities" ON public.universities
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active universities" ON public.universities;
CREATE POLICY "Anyone can view active universities" ON public.universities
  FOR SELECT
  USING (active = true OR active IS NULL);