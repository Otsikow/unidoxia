DROP POLICY IF EXISTS "Anyone can view active programs in their tenant" ON public.programs;
CREATE POLICY "Anyone can view active programs in their tenant" ON public.programs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()) AND active = true);

DROP POLICY IF EXISTS "Partners can view all programs in their tenant" ON public.programs;
CREATE POLICY "Partners can view all programs in their tenant" ON public.programs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner'::app_role));

DROP POLICY IF EXISTS "Partners can insert programs" ON public.programs;
CREATE POLICY "Partners can insert programs" ON public.programs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner'::app_role));

DROP POLICY IF EXISTS "Partners can update programs" ON public.programs;
CREATE POLICY "Partners can update programs" ON public.programs
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner'::app_role))
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner'::app_role));

DROP POLICY IF EXISTS "Partners can delete programs" ON public.programs;
CREATE POLICY "Partners can delete programs" ON public.programs
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner'::app_role));

DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
CREATE POLICY "Admins can manage programs" ON public.programs
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view all active programs" ON public.programs;
CREATE POLICY "Anyone can view all active programs" ON public.programs
  FOR SELECT
  USING (active = true OR active IS NULL);