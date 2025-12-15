-- ==========================================================================
-- Fix: Application status updates (PGRST116) + partner RLS alignment
-- ==========================================================================
-- Why:
-- - The UI may fall back to direct table updates when the RPC is unavailable.
-- - Those direct updates must succeed under RLS for university partners.
-- - Older policies were partner-only and/or relied on programs.tenant_id,
--   which can block updates in multi-tenant setups.
--
-- What:
-- - Ensures RLS is enabled on public.applications
-- - Recreates partner update/select policies to include partner + school_rep
-- - Validates tenant ownership via programs -> universities.tenant_id
-- ==========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'applications'
  ) THEN
    RAISE NOTICE 'Skipping: public.applications does not exist in this environment';
    RETURN;
  END IF;

  -- Ensure RLS is on
  EXECUTE 'ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY';

  -- Drop legacy/duplicate partner policies (safe if missing)
  EXECUTE 'DROP POLICY IF EXISTS "applications_partner_select" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "applications_partner_update" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "university_partner_applications_select" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "university_partner_applications_update" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "Partners can view applications to their programs" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "Partners can update applications to their programs" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "Partners can view applications to their university" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "Partners can view applications to their university programs" ON public.applications';
  EXECUTE 'DROP POLICY IF EXISTS "Partners can update applications to their university programs" ON public.applications';

  -- SELECT: University partner roles can see applications to their programs
  EXECUTE $policy$
    CREATE POLICY "applications_partner_select"
      ON public.applications FOR SELECT
      TO authenticated
      USING (
        public.is_admin_or_staff(auth.uid())
        OR (
          public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
          AND EXISTS (
            SELECT 1
            FROM public.programs p
            JOIN public.universities u ON u.id = p.university_id
            WHERE p.id = program_id
              AND u.tenant_id = public.get_user_tenant(auth.uid())
          )
        )
      )
  $policy$;

  -- UPDATE: University partner roles can update applications to their programs
  EXECUTE $policy$
    CREATE POLICY "applications_partner_update"
      ON public.applications FOR UPDATE
      TO authenticated
      USING (
        public.is_admin_or_staff(auth.uid())
        OR (
          public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
          AND EXISTS (
            SELECT 1
            FROM public.programs p
            JOIN public.universities u ON u.id = p.university_id
            WHERE p.id = program_id
              AND u.tenant_id = public.get_user_tenant(auth.uid())
          )
        )
      )
      WITH CHECK (
        public.is_admin_or_staff(auth.uid())
        OR (
          public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
          AND EXISTS (
            SELECT 1
            FROM public.programs p
            JOIN public.universities u ON u.id = p.university_id
            WHERE p.id = program_id
              AND u.tenant_id = public.get_user_tenant(auth.uid())
          )
        )
      )
  $policy$;
END$$;

-- Ensure the RPC remains visible to PostgREST (execute privilege affects discoverability)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'update_application_review'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB)
      TO authenticated, anon;
    NOTIFY pgrst, 'reload config';
  END IF;
END$$;
