-- Fix sign-in blocker: remove recursive/complex profiles RLS policy and replace with minimal non-recursive policies
-- NOTE: This is intentionally scoped to profiles RLS only.

-- Ensure RLS stays enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop the policies known to trigger recursion or excessive cross-table lookups
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Minimal, non-recursive access rules
-- 1) Every authenticated user can read their own profile (required for login)
CREATE POLICY "Profiles: users can view own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2) Staff/Admin can read any profile (for internal operations)
CREATE POLICY "Profiles: staff can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
);

-- 3) Users can update their own profile
CREATE POLICY "Profiles: users can update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4) Staff/Admin can insert/update/delete any profile
CREATE POLICY "Profiles: staff can insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
);

CREATE POLICY "Profiles: staff can update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
);

CREATE POLICY "Profiles: staff can delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
);
