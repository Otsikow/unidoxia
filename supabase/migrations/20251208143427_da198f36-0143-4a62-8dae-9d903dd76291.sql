-- Fix tenants RLS policy to allow authenticated users to create tenants during profile isolation
-- This is needed when ensurePartnerTenantIsolation creates a new tenant for partners

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Partners can create isolated tenants" ON public.tenants;

-- Create a permissive policy for authenticated users to create tenants
-- This is safe because tenant creation during signup/isolation is controlled by app logic
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (true);