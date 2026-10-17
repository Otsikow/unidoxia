-- Run as database owner in an isolated Supabase test project after migration.
-- Uses fictional fixtures and rolls back all data and session settings.
-- Plain PostgreSQL: run whatsapp_local_stub.sql, then the migration twice, then this file.
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
-- Explicitly reject both student and staff access to live link codes and raw Zoe context.
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_policies WHERE schemaname='public' AND tablename IN ('whatsapp_link_codes','zoe_handoffs')) THEN RAISE EXCEPTION 'Private helper policy exists'; END IF;
 IF has_function_privilege('anon','public.whatsapp_create_zoe_handoff(text)','EXECUTE') OR has_function_privilege('authenticated','public.whatsapp_create_zoe_handoff(text)','EXECUTE') THEN RAISE EXCEPTION 'Old handoff RPC exposed'; END IF;
END $$;

INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004');
INSERT INTO public.profiles(id,role) VALUES ('00000000-0000-0000-0000-000000000001','student'),('00000000-0000-0000-0000-000000000002','staff'),('00000000-0000-0000-0000-000000000003','admin'),('00000000-0000-0000-0000-000000000004','agent');
INSERT INTO public.students(id,profile_id,whatsapp_number,date_of_birth) VALUES ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','+44 7700 900111','2000-01-01');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
SET LOCAL ROLE authenticated;
SELECT public.whatsapp_set_preferences('+44 7700 900111',false);
RESET ROLE;
DO $$ BEGIN
 IF EXISTS (SELECT FROM public.students WHERE id='00000000-0000-0000-0000-000000000011' AND whatsapp_opt_out_at IS NOT NULL) THEN RAISE EXCEPTION 'Unticked save recorded opt-out'; END IF;
END $$;
-- The real trigger must reject staff/admin/agent writes even though staff can manage students.
SET LOCAL ROLE authenticated;
DO $$ DECLARE uid text; BEGIN
 FOREACH uid IN ARRAY ARRAY['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'] LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('role','authenticated','sub',uid)::text,true);
  BEGIN
   UPDATE public.students SET whatsapp_opt_in=true WHERE id='00000000-0000-0000-0000-000000000011';
   RAISE EXCEPTION 'Staff/admin consent change allowed';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Only the student can change WhatsApp consent' THEN RAISE; END IF;
  END;
 END LOOP;
END $$;
RESET ROLE;
-- Run agent against the trigger as owner too, independent of existing student RLS visibility.
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000004"}',true);
DO $$ BEGIN
 BEGIN
  UPDATE public.students SET whatsapp_opt_in=true WHERE id='00000000-0000-0000-0000-000000000011';
  RAISE EXCEPTION 'Agent consent change allowed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Only the student can change WhatsApp consent' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
SELECT public.whatsapp_set_preferences('+44 7700 900111',true);
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $$ DECLARE c uuid; snapshot jsonb; second jsonb; code text; BEGIN
 PERFORM public.whatsapp_ingest('447700900111','Fictional student','qc-in-1','hi',now());
 SELECT id INTO c FROM public.whatsapp_contacts WHERE wa_id='447700900111';
 IF (SELECT opted_out_at IS NOT NULL FROM public.whatsapp_contacts WHERE id=c) THEN RAISE EXCEPTION 'Profile save blocked hi'; END IF;
 -- STOP by a never-linked saved number withdraws student consent; START never re-enables it.
 PERFORM public.whatsapp_apply_consent(c,false);
 IF (SELECT whatsapp_opt_in OR whatsapp_opt_out_at IS NULL FROM public.students WHERE id='00000000-0000-0000-0000-000000000011') THEN RAISE EXCEPTION 'STOP did not withdraw by number'; END IF;
 IF (SELECT linked_user_id IS NOT NULL FROM public.whatsapp_contacts WHERE id=c) THEN RAISE EXCEPTION 'STOP did not unlink'; END IF;
 PERFORM public.whatsapp_apply_consent(c,true);
 IF (SELECT whatsapp_opt_in FROM public.students WHERE id='00000000-0000-0000-0000-000000000011') THEN RAISE EXCEPTION 'START granted updates'; END IF;
 -- Two messages already ingested, then a second claimant while first is in progress.
 PERFORM public.whatsapp_ingest('447700900111',NULL,'qc-in-2','nursing',now());
 snapshot := public.whatsapp_claim_next('447700900111');
 IF snapshot->'message'->>'body' <> 'hi' THEN RAISE EXCEPTION 'Queue order incorrect'; END IF;
 IF public.whatsapp_claim_next('447700900111') IS NOT NULL THEN RAISE EXCEPTION 'Overlapping flow allowed'; END IF;
 UPDATE public.whatsapp_conversations SET flow_state='{"step":"subject","introduced":true}' WHERE contact_id=c;
 PERFORM public.whatsapp_finish_claim('447700900111',(snapshot->>'token')::uuid,false);
 second := public.whatsapp_claim_next('447700900111');
 IF second->'message'->>'body' <> 'nursing' OR second->'conversation'->'flow_state'->>'step' <> 'subject' THEN RAISE EXCEPTION 'Queue lost fresh snapshot'; END IF;
 IF second->'conversation'->>'mode' <> 'assistant' THEN RAISE EXCEPTION 'Quick messages caused handover'; END IF;
 PERFORM public.whatsapp_finish_claim('447700900111',(second->>'token')::uuid,false);
 IF public.whatsapp_claim_next('447700900111') IS NOT NULL THEN RAISE EXCEPTION 'Processed message replayed'; END IF;
 -- Only three consecutive state losses hand over.
 FOR i IN 1..3 LOOP
  PERFORM public.whatsapp_ingest('447700900111',NULL,'qc-loss-'||i,'hi',now());
  snapshot := public.whatsapp_claim_next('447700900111');
  PERFORM public.whatsapp_finish_claim('447700900111',(snapshot->>'token')::uuid,true);
  IF (SELECT mode FROM public.whatsapp_conversations WHERE contact_id=c) <> (CASE WHEN i=3 THEN 'human' ELSE 'assistant' END) THEN RAISE EXCEPTION 'Loss threshold incorrect'; END IF;
 END LOOP;
END $$;
-- Profile opt-in cannot undo STOP; number change unlinks without changing contact opt-out.
SELECT public.whatsapp_apply_consent((SELECT id FROM public.whatsapp_contacts WHERE wa_id='447700900111'),false);
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
SELECT public.whatsapp_set_preferences('+44 7700 900111',true);
DO $$ BEGIN
 IF (SELECT opted_out_at IS NULL FROM public.whatsapp_contacts WHERE wa_id='447700900111') THEN RAISE EXCEPTION 'Profile bypassed STOP'; END IF;
END $$;
SELECT public.whatsapp_set_preferences('+44 7700 900112',false);
DO $$ BEGIN
 IF (SELECT opted_out_at IS NULL FROM public.whatsapp_contacts WHERE wa_id='447700900111') THEN RAISE EXCEPTION 'Number change bypassed STOP'; END IF;
END $$;
-- Hash-only, number-bound codes and STOP unlinking.
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
DO $$ DECLARE code text; c uuid; BEGIN
 code := public.whatsapp_create_link_code();
 IF EXISTS(SELECT FROM public.whatsapp_link_codes lc WHERE lc.code !~ '^[a-f0-9]{64}$') THEN RAISE EXCEPTION 'Plaintext code stored'; END IF;
 PERFORM public.whatsapp_ingest('447700900112',NULL,'qc-link','3',now());
 SELECT id INTO c FROM public.whatsapp_contacts WHERE wa_id='447700900112';
 IF NOT public.whatsapp_consume_link(c,code) THEN RAISE EXCEPTION 'Hashed code cannot link'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 PERFORM public.whatsapp_apply_consent(c,false);
 IF (SELECT linked_user_id IS NOT NULL OR linked_at IS NOT NULL FROM public.whatsapp_contacts WHERE id=c) THEN RAISE EXCEPTION 'STOP left link'; END IF;
END $$;
-- Expired links are unlinked before the flow snapshot; number changes never opt contacts out.
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
UPDATE public.whatsapp_contacts SET linked_user_id='00000000-0000-0000-0000-000000000001', linked_at=now()-interval '181 days' WHERE wa_id='447700900112';
DO $$ DECLARE claim jsonb; BEGIN
 claim := public.whatsapp_claim_next('447700900112');
 IF claim->'contact'->>'linked_user_id' IS NOT NULL THEN RAISE EXCEPTION 'Expired link in claim'; END IF;
 PERFORM public.whatsapp_finish_claim('447700900112',(claim->>'token')::uuid,false);
END $$;
SELECT public.whatsapp_apply_consent((SELECT id FROM public.whatsapp_contacts WHERE wa_id='447700900112'),true);
UPDATE public.whatsapp_contacts SET linked_user_id='00000000-0000-0000-0000-000000000001', linked_at=now() WHERE wa_id='447700900112';
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
SELECT public.whatsapp_set_preferences('+44 7700 900115',false);
DO $$ BEGIN
 IF (SELECT linked_user_id IS NOT NULL OR opted_out_at IS NOT NULL FROM public.whatsapp_contacts WHERE wa_id='447700900112') THEN RAISE EXCEPTION 'Number change opted out or failed to unlink'; END IF;
END $$;
-- Retention cap and metadata, deletion of empty contacts and minimisation of opt-outs.
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $$ DECLARE v uuid; BEGIN
 SELECT id INTO v FROM public.whatsapp_conversations WHERE contact_id=(SELECT id FROM public.whatsapp_contacts WHERE wa_id='447700900111');
 IF public.whatsapp_retain(v,now()+interval '25 months','complaint','00000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Retention exceeded cap'; END IF;
 IF NOT public.whatsapp_retain(v,now()+interval '23 months','complaint','00000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Valid retention refused'; END IF;
 IF (SELECT retain_set_by IS NULL FROM public.whatsapp_conversations WHERE id=v) THEN RAISE EXCEPTION 'Retention actor missing'; END IF;
 INSERT INTO public.whatsapp_contacts(wa_id,profile_name) VALUES('447700900113','Delete me');
 INSERT INTO public.whatsapp_contacts(wa_id,profile_name,opted_out_at,linked_user_id,linked_at,auto_reply_times) VALUES('447700900114','Minimise me',now(),'00000000-0000-0000-0000-000000000001',now(),ARRAY[now()]);
 PERFORM public.whatsapp_purge_expired();
 IF EXISTS(SELECT FROM public.whatsapp_contacts WHERE wa_id='447700900113') THEN RAISE EXCEPTION 'Empty contact retained'; END IF;
 IF NOT EXISTS(SELECT FROM public.whatsapp_contacts WHERE wa_id='447700900114' AND opted_out_at IS NOT NULL AND profile_name IS NULL AND linked_user_id IS NULL AND linked_at IS NULL AND cardinality(auto_reply_times)=0 AND created_at IS NULL AND updated_at IS NULL) THEN RAISE EXCEPTION 'Opt-out not minimised'; END IF;
END $$;
-- Exercise actual PostgreSQL Zoe limits, dedupe, breaker and private helpers.
DO $$ DECLARE h text := repeat('a',64); ref text; n integer; BEGIN
 ref := public.whatsapp_create_zoe_handoff_secure('same',h,NULL);
 IF ref IS NULL OR public.whatsapp_create_zoe_handoff_secure('same',h,NULL) <> ref THEN RAISE EXCEPTION 'Handoff dedupe failed'; END IF;
 PERFORM public.whatsapp_create_zoe_handoff_secure('two',h,NULL);
 PERFORM public.whatsapp_create_zoe_handoff_secure('three',h,NULL);
 IF public.whatsapp_create_zoe_handoff_secure('four',h,NULL) IS NOT NULL THEN RAISE EXCEPTION 'IP hourly limit failed'; END IF;
 INSERT INTO public.zoe_handoffs(summary,ip_hash,created_at) SELECT 'daily '||i,repeat('b',64),now()-interval '2 hours' FROM generate_series(1,10) i;
 IF public.whatsapp_create_zoe_handoff_secure('eleven',repeat('b',64),NULL) IS NOT NULL THEN RAISE EXCEPTION 'IP daily limit failed'; END IF;
 FOR i IN 1..5 LOOP
  IF public.whatsapp_create_zoe_handoff_secure('user '||i,encode(sha256(convert_to('user-ip-'||i,'UTF8')),'hex'),'00000000-0000-0000-0000-000000000001') IS NULL THEN RAISE EXCEPTION 'Signed-in limit too early'; END IF;
 END LOOP;
 IF public.whatsapp_create_zoe_handoff_secure('six',repeat('c',64),'00000000-0000-0000-0000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'User hourly limit failed'; END IF;
 FOR i IN 1..297 LOOP
  IF public.whatsapp_create_zoe_handoff_secure('global '||i,encode(sha256(convert_to('global-ip-'||i,'UTF8')),'hex'),NULL) IS NULL THEN RAISE EXCEPTION 'Global limit tripped before 300'; END IF;
 END LOOP;
 IF (SELECT used FROM public.zoe_handoff_capacity WHERE hour=date_trunc('hour',now())) <> 300 THEN RAISE EXCEPTION 'Anonymous capacity accounting incorrect'; END IF;
 SELECT count(*) INTO n FROM public.notifications WHERE title='Zoe handoff limit';
 IF public.whatsapp_create_zoe_handoff_secure('breaker',repeat('d',64),NULL) IS NOT NULL THEN RAISE EXCEPTION 'Global breaker failed'; END IF;
 PERFORM public.whatsapp_create_zoe_handoff_secure('breaker again',repeat('e',64),NULL);
 IF (SELECT count(*) FROM public.zoe_handoff_breakers WHERE hour=date_trunc('hour',now())) <> 1 THEN RAISE EXCEPTION 'Duplicate breaker'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE title='Zoe handoff limit') <> n+(SELECT count(*) FROM public.profiles WHERE public.is_admin_or_staff(id)) THEN RAISE EXCEPTION 'Breaker notification not once per staff recipient'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT FROM public.whatsapp_link_codes) OR EXISTS(SELECT FROM public.zoe_handoffs) THEN RAISE EXCEPTION 'Staff can read private codes or handoffs'; END IF;
 IF NOT EXISTS(SELECT FROM public.whatsapp_conversations) THEN RAISE EXCEPTION 'Staff cannot read inbox'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
