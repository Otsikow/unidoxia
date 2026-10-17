BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_signup_consent_checked_at timestamptz;
-- Existing phone numbers are deliberately not treated as consent.
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wa_id text NOT NULL UNIQUE,
  profile_name text, linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at timestamptz, service_resumed_at timestamptz, marketing_consent_at timestamptz, opted_out_at timestamptz,
  auto_reply_times timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[],
  link_attempts integer NOT NULL DEFAULT 0, link_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'assistant' CHECK (mode IN ('assistant','human','closed')),
  flow_state jsonb NOT NULL DEFAULT '{}', handover_reason text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_inbound_at timestamptz, last_outbound_at timestamptz, unread_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'direct', zoe_context jsonb, retain_until timestamptz, retain_reason text CHECK (retain_reason IN ('active_application','complaint')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender text NOT NULL CHECK (sender IN ('student','assistant','staff')), body text NOT NULL,
  meta_message_id text UNIQUE,
  status text NOT NULL CHECK (status IN ('received','queued','sent','delivered','read','failed','skipped')),
  error text, sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_messages_thread ON public.whatsapp_messages(conversation_id, created_at);
CREATE TABLE IF NOT EXISTS public.whatsapp_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.zoe_handoffs (
  id text PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''),1,20),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, summary text NOT NULL CHECK (length(summary) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(), used_at timestamptz
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_contacts','whatsapp_conversations','whatsapp_messages','whatsapp_link_codes','zoe_handoffs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS whatsapp_staff_read ON public.%I', t);
    EXECUTE format('CREATE POLICY whatsapp_staff_read ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_staff(auth.uid()))', t);
    EXECUTE format('DROP POLICY IF EXISTS whatsapp_staff_update ON public.%I', t);
  END LOOP;
END $$;

GRANT UPDATE (unread_count) ON public.whatsapp_conversations TO authenticated;
CREATE POLICY whatsapp_staff_update ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff(auth.uid())) WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- No new student policies: existing own-record SELECT/UPDATE policies remain in force.
-- Agents who can edit other profile fields cannot change the new consent fields.
CREATE OR REPLACE FUNCTION public.whatsapp_student_consent_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Signup consent is captured once after sign-in by the dedicated RPC.
    NEW.whatsapp_opt_in := false;
    NEW.whatsapp_opt_in_at := NULL;
  ELSE
    IF (NEW.whatsapp_opt_in, NEW.whatsapp_opt_in_at, NEW.whatsapp_opt_out_at) IS DISTINCT FROM
       (OLD.whatsapp_opt_in, OLD.whatsapp_opt_in_at, OLD.whatsapp_opt_out_at) THEN
      IF auth.role() IS DISTINCT FROM 'service_role' AND
        (auth.uid() IS NULL OR (auth.uid() <> OLD.profile_id AND NOT public.is_admin_or_staff(auth.uid()))) THEN
        RAISE EXCEPTION 'Only the student or admissions team can change WhatsApp consent';
      END IF;
      IF NEW.whatsapp_opt_in IS DISTINCT FROM OLD.whatsapp_opt_in THEN
        NEW.whatsapp_opt_in_at := CASE WHEN NEW.whatsapp_opt_in THEN now() ELSE OLD.whatsapp_opt_in_at END;
        NEW.whatsapp_opt_out_at := CASE WHEN NEW.whatsapp_opt_in THEN NULL ELSE now() END;
      END IF;
    END IF;
    IF NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number THEN
      -- Consent is specific to the saved number; a change requires fresh consent.
      NEW.whatsapp_opt_in := false;
      NEW.whatsapp_opt_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS whatsapp_student_consent_guard ON public.students;
CREATE TRIGGER whatsapp_student_consent_guard BEFORE INSERT OR UPDATE OF whatsapp_number, whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_out_at ON public.students
FOR EACH ROW EXECUTE FUNCTION public.whatsapp_student_consent_guard();

CREATE OR REPLACE FUNCTION public.whatsapp_sync_consent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number THEN
    UPDATE public.whatsapp_contacts SET linked_user_id = NULL, linked_at = NULL, opted_out_at = now(), updated_at = now() WHERE linked_user_id = OLD.profile_id;
  END IF;
  IF (NEW.whatsapp_opt_in, NEW.whatsapp_opt_in_at, NEW.whatsapp_opt_out_at) IS DISTINCT FROM (OLD.whatsapp_opt_in, OLD.whatsapp_opt_in_at, OLD.whatsapp_opt_out_at) THEN
    UPDATE public.whatsapp_contacts SET
      opted_out_at = CASE WHEN NEW.whatsapp_opt_in THEN NULL ELSE now() END,
      updated_at = now()
    WHERE linked_user_id = NEW.profile_id OR (NOT NEW.whatsapp_opt_in AND wa_id = regexp_replace(COALESCE(NEW.whatsapp_number,''), '[^0-9]', '', 'g'));
    -- A saved but unverified number can withdraw consent, never re-enable another contact.
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS whatsapp_sync_consent ON public.students;
CREATE TRIGGER whatsapp_sync_consent AFTER UPDATE OF whatsapp_number, whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_out_at ON public.students FOR EACH ROW EXECUTE FUNCTION public.whatsapp_sync_consent();

CREATE OR REPLACE FUNCTION public.whatsapp_create_link_code() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.students WHERE profile_id = auth.uid() AND NULLIF(whatsapp_number,'') IS NOT NULL) THEN
    RAISE EXCEPTION 'Save your WhatsApp number in your student profile first';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
  SELECT code INTO result FROM public.whatsapp_link_codes WHERE user_id = auth.uid() AND used_at IS NULL
    AND expires_at > now() AND created_at > now() - interval '1 minute' LIMIT 1;
  IF result IS NOT NULL THEN RETURN result; END IF;
  UPDATE public.whatsapp_link_codes SET used_at = now() WHERE user_id = auth.uid() AND used_at IS NULL;
  LOOP
    result := lpad(((('x' || substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint % 1000000))::text,6,'0');
    BEGIN
      INSERT INTO public.whatsapp_link_codes(user_id, code, expires_at) VALUES (auth.uid(), result, now() + interval '15 minutes');
      RETURN result;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_create_link_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_create_link_code() TO authenticated;

-- Linking and consuming the code happen atomically and only in the service role.
CREATE OR REPLACE FUNCTION public.whatsapp_consume_link(p_contact uuid, p_code text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.whatsapp_contacts; l public.whatsapp_link_codes; s public.students;
BEGIN
  SELECT * INTO c FROM public.whatsapp_contacts WHERE id = p_contact FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF c.link_attempted_at > now() - interval '15 minutes' AND c.link_attempts >= 5 THEN RETURN false; END IF;
  UPDATE public.whatsapp_contacts SET link_attempts = CASE WHEN c.link_attempted_at > now() - interval '15 minutes' THEN c.link_attempts + 1 ELSE 1 END,
    link_attempted_at = CASE WHEN c.link_attempted_at > now() - interval '15 minutes' THEN c.link_attempted_at ELSE now() END WHERE id = p_contact;
  SELECT * INTO l FROM public.whatsapp_link_codes WHERE code = p_code AND used_at IS NULL AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO s FROM public.students WHERE profile_id = l.user_id
    AND regexp_replace(COALESCE(whatsapp_number,''), '[^0-9]', '', 'g') = c.wa_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.whatsapp_link_codes SET used_at = now() WHERE id = l.id;
  UPDATE public.whatsapp_contacts SET linked_user_id = l.user_id, linked_at = now(), updated_at = now() WHERE id = p_contact;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_consume_link(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_consume_link(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_create_zoe_handoff(p_summary text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text; clean_summary text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('zoe-handoff-rate-limit', 2));
  IF (SELECT count(*) FROM public.zoe_handoffs WHERE created_at > now() - interval '1 hour'
      AND (CASE WHEN auth.uid() IS NULL THEN user_id IS NULL ELSE user_id = auth.uid() END)) >= 5 THEN
    RAISE EXCEPTION 'Please try again later';
  END IF;
  clean_summary := left(trim(regexp_replace(COALESCE(p_summary,''), '[[:cntrl:]]', ' ', 'g')),2000);
  IF clean_summary = '' THEN RAISE EXCEPTION 'Invalid summary'; END IF;
  INSERT INTO public.zoe_handoffs(user_id,summary) VALUES(auth.uid(),clean_summary) RETURNING id INTO ref;
  RETURN ref;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_create_zoe_handoff(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_create_zoe_handoff(text) TO anon, authenticated;

-- Claim each inbound id and update contact, thread and counters in one transaction.
CREATE OR REPLACE FUNCTION public.whatsapp_ingest(p_wa_id text, p_name text, p_meta_id text, p_body text, p_received_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.whatsapp_contacts; v public.whatsapp_conversations;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_wa_id, 0));
  IF EXISTS (SELECT 1 FROM public.whatsapp_messages WHERE meta_message_id = p_meta_id) THEN RETURN jsonb_build_object('duplicate',true); END IF;
  INSERT INTO public.whatsapp_contacts(wa_id,profile_name) VALUES(p_wa_id,p_name)
    ON CONFLICT(wa_id) DO UPDATE SET profile_name = COALESCE(EXCLUDED.profile_name,whatsapp_contacts.profile_name), updated_at = now() RETURNING * INTO c;
  INSERT INTO public.whatsapp_conversations(contact_id,last_inbound_at,unread_count) VALUES(c.id,p_received_at,1)
    ON CONFLICT(contact_id) DO UPDATE SET last_inbound_at = greatest(whatsapp_conversations.last_inbound_at,p_received_at),
      unread_count = whatsapp_conversations.unread_count + 1, updated_at = now(),
      mode = CASE WHEN whatsapp_conversations.mode = 'closed' THEN 'assistant' ELSE whatsapp_conversations.mode END
    RETURNING * INTO v;
  INSERT INTO public.whatsapp_messages(conversation_id,direction,sender,body,meta_message_id,status)
    VALUES(v.id,'inbound','student',p_body,p_meta_id,'received');
  RETURN jsonb_build_object('duplicate',false,'contact',to_jsonb(c),'conversation',to_jsonb(v));
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_ingest(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_ingest(text,text,text,text,timestamptz) TO service_role;

-- Applications already have updated_at. The assistant labels it as last updated,
-- never as the time of a status change. No application triggers or RLS changes.
CREATE OR REPLACE FUNCTION public.whatsapp_set_preferences(p_number text, p_opt_in boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.students WHERE profile_id = auth.uid()) THEN RAISE EXCEPTION 'Student sign in required'; END IF;
  IF p_number IS NULL OR regexp_replace(p_number, '[^0-9]', '', 'g') !~ '^[1-9][0-9]{6,14}$' THEN RAISE EXCEPTION 'A WhatsApp number with country code is required'; END IF;
  UPDATE public.students SET whatsapp_number = p_number WHERE profile_id = auth.uid();
  UPDATE public.students SET whatsapp_opt_in = COALESCE(p_opt_in,false),
    whatsapp_opt_in_at = CASE WHEN p_opt_in THEN now() ELSE whatsapp_opt_in_at END,
    whatsapp_opt_out_at = CASE WHEN p_opt_in THEN NULL ELSE now() END WHERE profile_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_set_preferences(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_set_preferences(text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.whatsapp_apply_consent(p_contact uuid, p_opt_in boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.whatsapp_contacts;
BEGIN
  SELECT * INTO c FROM public.whatsapp_contacts WHERE id = p_contact FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT p_opt_in AND c.opted_out_at IS NOT NULL THEN RETURN false; END IF;
  UPDATE public.whatsapp_contacts SET opted_out_at = CASE WHEN p_opt_in THEN NULL ELSE now() END,
    service_resumed_at = CASE WHEN p_opt_in THEN now() ELSE service_resumed_at END, updated_at = now() WHERE id = c.id;
  IF NOT p_opt_in AND c.linked_user_id IS NOT NULL THEN
    UPDATE public.students SET whatsapp_opt_in = false,
      whatsapp_opt_out_at = now() WHERE profile_id = c.linked_user_id;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_apply_consent(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_apply_consent(uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_notify_handover(p_conversation uuid, p_reason text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  -- Lock and transition atomically. Repeated handovers in human mode are silent.
  UPDATE public.whatsapp_conversations SET mode = 'human', handover_reason = left(p_reason,200), updated_at = now()
    WHERE id = p_conversation AND mode = 'assistant';
  IF NOT FOUND THEN RETURN false; END IF;
  FOR p IN SELECT id, tenant_id FROM public.profiles WHERE public.is_admin_or_staff(id) LOOP
    PERFORM public.create_notification(p.tenant_id, p.id, 'message', 'WhatsApp handover',
      'A WhatsApp conversation needs the admissions team: ' || p_reason || '.',
      jsonb_build_object('whatsapp_conversation_id',p_conversation), '/admin/whatsapp');
  END LOOP;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_notify_handover(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_notify_handover(uuid,text) TO service_role;
-- Reserve automatic reply capacity atomically per contact, including concurrent webhooks.
CREATE OR REPLACE FUNCTION public.whatsapp_reserve_auto_reply(p_contact uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE times timestamptz[];
BEGIN
  SELECT auto_reply_times INTO times FROM public.whatsapp_contacts WHERE id = p_contact FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT COALESCE(array_agg(t),ARRAY[]::timestamptz[]) INTO times FROM unnest(times) t WHERE t > now() - interval '1 hour';
  IF cardinality(times) >= 10 THEN RETURN false; END IF;
  UPDATE public.whatsapp_contacts SET auto_reply_times = array_append(times,now()) WHERE id = p_contact;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_reserve_auto_reply(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_reserve_auto_reply(uuid) TO service_role;

-- Existing auth triggers are unchanged. Capture explicit signup metadata once after
-- the existing handle_new_user/profile creation has produced a student row.
CREATE OR REPLACE FUNCTION public.whatsapp_capture_signup_consent() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.students; meta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Student sign in required'; END IF;
  SELECT * INTO s FROM public.students WHERE profile_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR s.whatsapp_signup_consent_checked_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.students SET whatsapp_signup_consent_checked_at = now() WHERE id = s.id;
  IF s.whatsapp_opt_in_at IS NOT NULL OR s.whatsapp_opt_out_at IS NOT NULL THEN RETURN; END IF;
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = auth.uid();
  IF meta->>'whatsapp_opt_in' = 'true' AND meta->>'whatsapp_opt_in_at' IS NOT NULL THEN
    PERFORM public.whatsapp_set_preferences(meta->>'phone', true);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_capture_signup_consent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_capture_signup_consent() TO authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_purge_expired() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  DELETE FROM public.whatsapp_messages m USING public.whatsapp_conversations c
    WHERE m.conversation_id = c.id AND m.created_at < now() - interval '12 months'
      AND (c.retain_until IS NULL OR c.retain_until <= now());
  UPDATE public.whatsapp_conversations SET zoe_context = NULL WHERE updated_at < now() - interval '12 months'
    AND (retain_until IS NULL OR retain_until <= now());
  DELETE FROM public.whatsapp_conversations c WHERE NOT EXISTS
    (SELECT 1 FROM public.whatsapp_messages m WHERE m.conversation_id = c.id)
    AND (c.retain_until IS NULL OR c.retain_until <= now());
  DELETE FROM public.whatsapp_link_codes WHERE expires_at <= now();
  DELETE FROM public.zoe_handoffs WHERE created_at < now() - interval '30 days';
  -- Contacts, student opt-outs and numbers are deliberately retained to honour STOP.
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_purge_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_purge_expired() TO service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('whatsapp-purge-expired', '30 3 * * *', 'SELECT public.whatsapp_purge_expired()');
  ELSE
    RAISE NOTICE 'pg_cron unavailable. Schedule whatsapp_purge_expired daily at 03:30 before launch.';
  END IF;
END $$;
COMMIT;
