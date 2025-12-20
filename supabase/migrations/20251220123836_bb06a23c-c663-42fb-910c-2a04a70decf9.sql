-- Fix infinite recursion in profiles RLS by ensuring helper functions read profiles without triggering RLS

CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = user_id;
$$;

COMMENT ON FUNCTION public.get_user_tenant(uuid) IS 'Returns a user''s tenant_id from profiles. Runs as SECURITY DEFINER with row_security=off to avoid RLS recursion when used inside policies.';
