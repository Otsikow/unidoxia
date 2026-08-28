-- Reconcile repository source with the least-privilege grants already applied in production.
-- Idempotent: these grants already exist; re-issuing them changes nothing.
GRANT SELECT ON public.university_claims TO authenticated;
GRANT SELECT ON public.university_memberships TO authenticated;
GRANT ALL ON public.university_claims TO service_role;
GRANT ALL ON public.university_memberships TO service_role;
-- Deliberately no anon grants: claims and memberships are never publicly readable.
-- RLS remains enabled with existing policies untouched.