
-- 1) Tighten overly permissive INSERT policies (replace WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.user_feedback;
CREATE POLICY "Anyone can submit feedback"
ON public.user_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  message IS NOT NULL AND length(btrim(message)) BETWEEN 1 AND 5000
  AND feedback_type IS NOT NULL
  AND category IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can submit partnership applications" ON public.partnership_applications;
CREATE POLICY "Anyone can submit partnership applications"
ON public.partnership_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  university_name IS NOT NULL AND length(btrim(university_name)) > 0
  AND primary_contact_email IS NOT NULL AND primary_contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND primary_contact_name IS NOT NULL AND length(btrim(primary_contact_name)) > 0
  AND terms_accepted = true
  AND status = 'pending'
);

-- 2) Lock down SECURITY DEFINER function execution
-- Revoke EXECUTE from PUBLIC and anon on all SECURITY DEFINER functions in public schema,
-- then grant back to authenticated and service_role. Whitelist a few that must be callable by anon.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE to anon ONLY for functions intentionally callable pre-auth
GRANT EXECUTE ON FUNCTION public.check_signup_availability(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_featured_universities() TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon;
