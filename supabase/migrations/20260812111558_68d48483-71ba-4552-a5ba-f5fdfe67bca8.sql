REVOKE ALL ON public.university_claims FROM anon;
REVOKE ALL ON public.university_memberships FROM anon;
REVOKE ALL ON public.university_claims FROM authenticated;
REVOKE ALL ON public.university_memberships FROM authenticated;
GRANT SELECT ON public.university_claims TO authenticated;
GRANT SELECT ON public.university_memberships TO authenticated;
GRANT ALL ON public.university_claims TO service_role;
GRANT ALL ON public.university_memberships TO service_role;