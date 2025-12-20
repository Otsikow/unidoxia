-- ============================================================================
-- FIX PROFILE NOT FOUND ISSUE
-- ============================================================================
--
-- This migration adds a robust `get_my_profile` RPC that allows authenticated
-- users to retrieve their own profile bypassing Row Level Security (RLS) policies
-- on the profiles table.
--
-- This is a "safety net" function to ensure users can always log in even if
-- complex RLS policies (like tenant isolation) are misconfigured or lagging.
--
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return the profile for the currently authenticated user
  -- SECURITY DEFINER allows this to bypass table-level RLS
  RETURN QUERY
  SELECT *
  FROM public.profiles
  WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.get_my_profile() IS
  'Securely retrieves the profile for the authenticated user, bypassing RLS to prevent "Profile not found" errors.';

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
