-- Cleanup: remove the temporary catalogue import operator role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catalogue_importer') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM catalogue_importer;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM catalogue_importer;
    REVOKE USAGE ON SCHEMA public FROM catalogue_importer;
    REVOKE catalogue_importer FROM sandbox_exec;
    DROP ROLE catalogue_importer;
  END IF;
END $$;