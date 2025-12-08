-- Allow authenticated users (partners) to insert tenants during isolation
-- This is needed for the ensurePartnerTenantIsolation function to work
CREATE POLICY "Partners can create isolated tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow partners to read their own tenant
CREATE POLICY "Users can read their assigned tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));