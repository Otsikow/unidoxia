-- Fix messaging/login blocker: allow authenticated users to SELECT profiles within their tenant
-- This restores recipient profile resolution for messaging while keeping data tenant-scoped.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any previous tenant-wide select policy if it exists (safe no-op)
DROP POLICY IF EXISTS "Profiles: tenant members can view" ON public.profiles;

-- Authenticated users can view profiles in their own tenant
CREATE POLICY "Profiles: tenant members can view"
ON public.profiles
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));
