-- Tighten grants on the CourseFinder database functions and log tables.
--
-- Why: the CourseFinder objects were first created in the live database from a
-- looser copy of 20261103000000_coursefinder_mandatory_registration_fields.sql
-- (drizzle/migrations/0004_coursefinder_mandatory_registration_fields.sql).
-- That copy left some functions callable by people who do not need them.
--
-- This migration only changes who may EXECUTE functions and which privileges
-- exist on two log tables. It changes no data, no table, no policy, no trigger
-- and no function body. It is idempotent and safe if an object is missing.
--
-- Not applied automatically. Apply only with the owner's approval.
--
-- Deliberately NOT revoked:
--   * get_university_id_for_user(uuid) keeps EXECUTE for authenticated and
--     service_role. The "applications_select_unified" and
--     "applications_update_unified" row level security policies (both
--     TO authenticated, from 20260121000000) call it directly, and policy
--     functions run with the signed-in user's own privileges, so removing it
--     would stop university users seeing or updating applications.

DO $$
DECLARE
  fn regprocedure;
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_auth boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  has_service boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role');
  tbl text;
  closed_roles text;
BEGIN
  -- Role lists, limited to the roles that exist in this database.
  -- (PUBLIC always exists.)

  -- 1. has_sharing_authorisation(uuid): internal only. It is called from
  --    SECURITY DEFINER functions (application_profile_gate_status and the
  --    enforce_application_profile_gate trigger), which run as their owner,
  --    so no signed-in user needs to call it directly.
  fn := to_regprocedure('public.has_sharing_authorisation(uuid)');
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); END IF;
    IF has_auth THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn); END IF;
    IF has_service THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn); END IF;
  END IF;

  -- 2. get_university_id_for_user(uuid): no anonymous access. authenticated
  --    and service_role keep EXECUTE (see the note at the top of this file).
  fn := to_regprocedure('public.get_university_id_for_user(uuid)');
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); END IF;
    IF has_auth THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn); END IF;
    IF has_service THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn); END IF;
  END IF;

  -- 3a. Trigger-only functions (any signature): nobody calls them directly.
  --     Triggers keep working, because Postgres does not check EXECUTE when
  --     a trigger fires.
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('enforce_coursefinder_required_fields', 'enforce_coursefinder_education_record')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); END IF;
    IF has_auth THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn); END IF;
  END LOOP;

  -- 3b. Student-facing functions: signed-in users and the service role only.
  --     (record_sharing_authorisation and withdraw_sharing_authorisation check
  --     the caller inside the function.)
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('record_sharing_authorisation', 'withdraw_sharing_authorisation')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); END IF;
    IF has_auth THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn); END IF;
    IF has_service THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn); END IF;
  END LOOP;

  -- 4. Log tables: remove TRUNCATE, REFERENCES and TRIGGER from everyone.
  closed_roles := concat_ws(', ', 'PUBLIC',
    CASE WHEN has_anon THEN 'anon' END,
    CASE WHEN has_auth THEN 'authenticated' END,
    CASE WHEN has_service THEN 'service_role' END);
  FOREACH tbl IN ARRAY ARRAY['application_sharing_authorisations', 'application_profile_gate_overrides']
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM %s', tbl, closed_roles);
    END IF;
  END LOOP;
END
$$;
