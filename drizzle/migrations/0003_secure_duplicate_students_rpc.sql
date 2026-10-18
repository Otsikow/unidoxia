-- Supply the missing admin duplicate-review RPC without changing signup validation.
CREATE OR REPLACE FUNCTION public.find_duplicate_students(p_limit integer DEFAULT 100)
RETURNS TABLE (
  student_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  created_at timestamptz,
  duplicate_type text,
  duplicate_match_ids uuid[],
  match_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Admin or staff access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT s.id, s.profile_id, p.full_name, p.email, p.phone, s.created_at,
      lower(btrim(p.email)) AS raw_email,
      regexp_replace(split_part(lower(p.email), '@', 1), '[.+].*', '', 'g')
        || substring(lower(p.email) from position('@' in lower(p.email))) AS normalized_email,
      regexp_replace(coalesce(p.phone, ''), '[^0-9+]', '', 'g') AS normalized_phone
    FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.archived_at IS NULL
      AND s.tenant_id = public.get_user_tenant(auth.uid())
      AND p.tenant_id = s.tenant_id
  ), matches AS (
    SELECT a.id, b.id AS match_id, 'email'::text AS kind
    FROM candidates a JOIN candidates b ON a.id <> b.id
    WHERE a.email IS NOT NULL AND b.email IS NOT NULL
      AND (a.raw_email = b.raw_email OR a.normalized_email = b.normalized_email)
    UNION ALL
    SELECT a.id, b.id AS match_id, 'phone'::text AS kind
    FROM candidates a JOIN candidates b ON a.id <> b.id
    WHERE length(a.normalized_phone) >= 7
      AND a.normalized_phone = b.normalized_phone
  ), grouped AS (
    SELECT m.id, m.kind, array_agg(DISTINCT m.match_id) AS match_ids,
      count(DISTINCT m.match_id)::integer AS total
    FROM matches m
    GROUP BY m.id, m.kind
  )
  SELECT DISTINCT ON (c.id)
    c.id, c.profile_id, c.full_name, c.email, c.phone, c.created_at,
    g.kind, g.match_ids, g.total
  FROM candidates c JOIN grouped g ON g.id = c.id
  ORDER BY c.id, g.total DESC, g.kind
  LIMIT greatest(1, least(coalesce(p_limit, 100), 1000));
END;
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_students(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_duplicate_students(integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.find_duplicate_students(integer) IS 'Tenant-scoped duplicate student review restricted to authenticated admin and staff roles.';
NOTIFY pgrst, 'reload schema';
