-- Run as database owner in an isolated Supabase test project after migration.
-- Rolls back all session settings. No student or message fixtures are created.
BEGIN;
DO $$
DECLARE t text; col record;
BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_contacts','whatsapp_conversations','whatsapp_messages','whatsapp_link_codes','zoe_handoffs'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || t)::regclass) THEN
      RAISE EXCEPTION 'RLS disabled: %',t;
    END IF;
    IF has_table_privilege('anon','public.' || t,'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'Anonymous table access: %',t;
    END IF;
    IF NOT has_table_privilege('authenticated','public.' || t,'SELECT') OR
       has_table_privilege('authenticated','public.' || t,'INSERT,DELETE,UPDATE') THEN
      RAISE EXCEPTION 'Unexpected authenticated table privileges: %',t;
    END IF;
    FOR col IN SELECT attname FROM pg_attribute WHERE attrelid = ('public.' || t)::regclass AND attnum > 0 AND NOT attisdropped LOOP
      IF has_column_privilege('authenticated','public.' || t,col.attname,'UPDATE') IS DISTINCT FROM
         (t = 'whatsapp_conversations' AND col.attname = 'unread_count') THEN
        RAISE EXCEPTION 'Unexpected UPDATE grant: %.%',t,col.attname;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      AND cmd IN ('INSERT','DELETE','ALL')) THEN RAISE EXCEPTION 'Unexpected write policy: %',t; END IF;
    IF t <> 'whatsapp_conversations' AND EXISTS
      (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND cmd = 'UPDATE') THEN
      RAISE EXCEPTION 'Unexpected update policy: %',t;
    END IF;
  END LOOP;
  IF has_function_privilege('anon','public.whatsapp_purge_expired()','EXECUTE') OR
     has_function_privilege('authenticated','public.whatsapp_purge_expired()','EXECUTE') OR
     NOT has_function_privilege('service_role','public.whatsapp_purge_expired()','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected purge privileges';
  END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.whatsapp_contacts;
    RAISE EXCEPTION 'Anonymous read was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
DO $$ DECLARE t text; n bigint; BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_contacts','whatsapp_conversations','whatsapp_messages','whatsapp_link_codes','zoe_handoffs'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
    IF n <> 0 THEN RAISE EXCEPTION 'Rows visible without staff identity: %',t; END IF;
  END LOOP;
  BEGIN
    UPDATE public.whatsapp_conversations SET mode = 'human';
    RAISE EXCEPTION 'Mode update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
