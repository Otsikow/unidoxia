-- Prevent infinite recursion via user_roles RLS by making role helper functions bypass row security

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_role
  );
$$;

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 'Returns whether a user has a given role. SECURITY DEFINER with row_security=off to avoid RLS recursion when used inside policies.';

CREATE OR REPLACE FUNCTION public.get_primary_role(p_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE((
    SELECT ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    ORDER BY
      CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'staff' THEN 2
        WHEN 'partner' THEN 3
        WHEN 'agent' THEN 4
        WHEN 'counselor' THEN 5
        WHEN 'verifier' THEN 6
        WHEN 'finance' THEN 7
        WHEN 'school_rep' THEN 8
        ELSE 9
      END
    LIMIT 1
  ), 'student'::app_role);
$$;

COMMENT ON FUNCTION public.get_primary_role(uuid) IS 'Returns the highest-priority role for a user. SECURITY DEFINER with row_security=off to avoid RLS recursion.';
