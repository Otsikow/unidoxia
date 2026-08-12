-- Keep Data API privileges for university claim tables aligned with production.
-- Row-level security remains the authorization boundary for authenticated reads.

REVOKE ALL ON TABLE public.university_claims FROM anon;
REVOKE ALL ON TABLE public.university_memberships FROM anon;

REVOKE ALL ON TABLE public.university_claims FROM authenticated;
REVOKE ALL ON TABLE public.university_memberships FROM authenticated;
GRANT SELECT ON TABLE public.university_claims TO authenticated;
GRANT SELECT ON TABLE public.university_memberships TO authenticated;

GRANT ALL ON TABLE public.university_claims TO service_role;
GRANT ALL ON TABLE public.university_memberships TO service_role;
