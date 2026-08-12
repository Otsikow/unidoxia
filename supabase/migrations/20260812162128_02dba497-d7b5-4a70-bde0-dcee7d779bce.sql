DROP POLICY IF EXISTS "Anyone can view active scholarships in their tenant" ON public.scholarships;
CREATE POLICY "Tenant members can view active scholarships"
ON public.scholarships
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) AND active = true);