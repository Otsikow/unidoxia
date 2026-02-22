-- Create get_my_profile RPC to allow users to fetch their own profile bypassing RLS
-- This is the critical fallback used by the auth flow when standard SELECT fails
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;