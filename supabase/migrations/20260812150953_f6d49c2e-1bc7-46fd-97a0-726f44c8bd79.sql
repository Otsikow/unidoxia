-- Temporary operator role for the reviewed catalogue import.
-- Scope: catalogue tables only. Removed in a follow-up cleanup migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catalogue_importer') THEN
    CREATE ROLE catalogue_importer NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO catalogue_importer;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.programs,
  public.program_fees,
  public.program_intakes,
  public.catalogue_sources,
  public.catalogue_import_runs,
  public.catalogue_import_items
TO catalogue_importer;
GRANT SELECT, UPDATE ON public.universities TO catalogue_importer;
GRANT SELECT ON public.university_search_aliases TO catalogue_importer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catalogue_importer;

GRANT catalogue_importer TO sandbox_exec;
