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
    IF t NOT IN ('whatsapp_link_codes','zoe_handoffs') THEN
    EXECUTE format('CREATE POLICY whatsapp_staff_read ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_staff(auth.uid()))', t);
    END IF;
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
        (auth.uid() IS NULL OR auth.uid() <> OLD.profile_id) THEN
        RAISE EXCEPTION 'Only the student can change WhatsApp consent';
      END IF;
      IF NEW.whatsapp_opt_in IS DISTINCT FROM OLD.whatsapp_opt_in THEN
        NEW.whatsapp_opt_in_at := CASE WHEN NEW.whatsapp_opt_in THEN now() ELSE OLD.whatsapp_opt_in_at END;
        NEW.whatsapp_opt_out_at := CASE WHEN NEW.whatsapp_opt_in THEN NULL ELSE now() END;
      END IF;
    END IF;
    IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth AND NEW.whatsapp_opt_in AND
       (NEW.date_of_birth IS NULL OR NEW.date_of_birth > (current_date - interval '18 years')::date) THEN
      NEW.whatsapp_opt_in := false;
      NEW.whatsapp_opt_out_at := now();
    END IF;
    IF NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number THEN
      -- Consent is specific to the saved number; a change requires fresh consent.
      NEW.whatsapp_opt_in := false;
      NEW.whatsapp_opt_out_at := CASE WHEN OLD.whatsapp_opt_in THEN now() ELSE OLD.whatsapp_opt_out_at END;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS whatsapp_student_consent_guard ON public.students;
CREATE TRIGGER whatsapp_student_consent_guard BEFORE INSERT OR UPDATE OF date_of_birth, whatsapp_number, whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_out_at ON public.students
FOR EACH ROW EXECUTE FUNCTION public.whatsapp_student_consent_guard();

CREATE OR REPLACE FUNCTION public.whatsapp_sync_consent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number THEN
    UPDATE public.whatsapp_contacts SET linked_user_id = NULL, linked_at = NULL, updated_at = now() WHERE linked_user_id = OLD.profile_id;
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
  IF EXISTS (SELECT 1 FROM public.whatsapp_link_codes WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute') THEN RAISE EXCEPTION 'Please wait a minute before getting a new code'; END IF;
  UPDATE public.whatsapp_link_codes SET used_at = now() WHERE user_id = auth.uid() AND used_at IS NULL;
  LOOP
    result := lpad(((('x' || substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint % 1000000))::text,6,'0');
    BEGIN
      INSERT INTO public.whatsapp_link_codes(user_id, code, expires_at) VALUES (auth.uid(), encode(sha256(convert_to(result,'UTF8')),'hex'), now() + interval '15 minutes');
      RETURN result;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_create_link_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_create_link_code() TO authenticated;

-- Hash any codes from an earlier application of this same migration.
UPDATE public.whatsapp_link_codes SET code = encode(sha256(convert_to(code,'UTF8')),'hex') WHERE code ~ '^[0-9]{6}$';

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
  SELECT * INTO l FROM public.whatsapp_link_codes WHERE code = encode(sha256(convert_to(p_code,'UTF8')),'hex') AND used_at IS NULL AND expires_at > now() FOR UPDATE;
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

-- The old browser RPC is disabled; creation requires the edge function's verified identity and salted IP hash.
CREATE OR REPLACE FUNCTION public.whatsapp_create_zoe_handoff(p_summary text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  RAISE EXCEPTION 'Use zoe-handoff';
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_create_zoe_handoff(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_create_zoe_handoff(text) TO service_role;
ALTER TABLE public.zoe_handoffs ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS summary_hash text;
CREATE INDEX IF NOT EXISTS zoe_handoff_limits ON public.zoe_handoffs(ip_hash,created_at);
CREATE TABLE IF NOT EXISTS public.zoe_handoff_breakers (hour timestamptz PRIMARY KEY);
ALTER TABLE public.zoe_handoff_breakers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zoe_handoff_breakers FROM anon, authenticated;
GRANT ALL ON public.zoe_handoff_breakers TO service_role;
CREATE OR REPLACE FUNCTION public.whatsapp_create_zoe_handoff_secure(p_summary text, p_ip_hash text, p_user uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text; clean_summary text; summary_digest text; hour_start timestamptz := date_trunc('hour',now()); p record;
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
  clean_summary := left(trim(regexp_replace(COALESCE(p_summary,''), '[[:cntrl:]]', ' ', 'g')),2000);
  IF clean_summary = '' THEN RETURN NULL; END IF;
  summary_digest := encode(sha256(convert_to(clean_summary,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash, 2));
  IF p_user IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 3)); END IF;
  SELECT id INTO ref FROM public.zoe_handoffs WHERE ip_hash = p_ip_hash AND summary_hash = summary_digest
    AND created_at > now() - interval '10 minutes' ORDER BY created_at DESC LIMIT 1;
  IF ref IS NOT NULL THEN RETURN ref; END IF;
  IF (p_user IS NULL AND ((SELECT count(*) FROM public.zoe_handoffs WHERE ip_hash = p_ip_hash AND created_at > now() - interval '1 hour') >= 3
    OR (SELECT count(*) FROM public.zoe_handoffs WHERE ip_hash = p_ip_hash AND created_at > now() - interval '1 day') >= 10))
    OR (p_user IS NOT NULL AND (SELECT count(*) FROM public.zoe_handoffs WHERE user_id = p_user AND created_at > now() - interval '1 hour') >= 5) THEN RETURN NULL; END IF;
  IF p_user IS NULL THEN
    -- A bounded counter row serialises only anonymous capacity accounting, never a global advisory lock.
    INSERT INTO public.zoe_handoff_capacity(hour,used) VALUES(hour_start,0) ON CONFLICT DO NOTHING;
    UPDATE public.zoe_handoff_capacity SET used = used + 1 WHERE hour = hour_start AND used < 300;
    IF NOT FOUND THEN
      INSERT INTO public.zoe_handoff_breakers(hour) VALUES(hour_start) ON CONFLICT DO NOTHING;
      IF FOUND THEN
        FOR p IN SELECT id,tenant_id FROM public.profiles WHERE public.is_admin_or_staff(id) LOOP
          PERFORM public.create_notification(p.tenant_id,p.id,'message','Zoe handoff limit',
            'The signed-out Zoe handoff circuit breaker has tripped. WhatsApp fallback remains available.', '{}'::jsonb,'/admin/whatsapp');
        END LOOP;
      END IF;
      RETURN NULL;
    END IF;
  END IF;
  INSERT INTO public.zoe_handoffs(user_id,summary,ip_hash,summary_hash) VALUES(p_user,clean_summary,p_ip_hash,summary_digest) RETURNING id INTO ref;
  RETURN ref;
END $$;
CREATE TABLE IF NOT EXISTS public.zoe_handoff_capacity (hour timestamptz PRIMARY KEY, used integer NOT NULL DEFAULT 0);
ALTER TABLE public.zoe_handoff_capacity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zoe_handoff_capacity FROM anon, authenticated;
GRANT ALL ON public.zoe_handoff_capacity TO service_role;
REVOKE ALL ON FUNCTION public.whatsapp_create_zoe_handoff_secure(text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_create_zoe_handoff_secure(text,text,uuid) TO service_role;

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
  IF p_opt_in AND EXISTS (SELECT 1 FROM public.students WHERE profile_id = auth.uid() AND (date_of_birth IS NULL OR date_of_birth > (current_date - interval '18 years')::date)) THEN RAISE EXCEPTION 'WhatsApp updates require a saved date of birth showing you are 18 or over'; END IF;
  UPDATE public.students SET whatsapp_number = p_number WHERE profile_id = auth.uid();
  UPDATE public.students SET whatsapp_opt_in = COALESCE(p_opt_in,false),
    whatsapp_opt_in_at = CASE WHEN p_opt_in THEN now() ELSE whatsapp_opt_in_at END,
    whatsapp_opt_out_at = CASE WHEN p_opt_in THEN NULL WHEN whatsapp_opt_in THEN now() ELSE whatsapp_opt_out_at END WHERE profile_id = auth.uid();
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
    linked_user_id = CASE WHEN p_opt_in THEN linked_user_id ELSE NULL END,
    linked_at = CASE WHEN p_opt_in THEN linked_at ELSE NULL END,
    service_resumed_at = CASE WHEN p_opt_in THEN now() ELSE service_resumed_at END, updated_at = now() WHERE id = c.id;
  IF NOT p_opt_in THEN
    UPDATE public.students SET whatsapp_opt_in = false,
      whatsapp_opt_out_at = now() WHERE profile_id = c.linked_user_id OR regexp_replace(COALESCE(whatsapp_number,''), '[^0-9]', '', 'g') = c.wa_id;
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

-- A durable per-contact claim spans edge requests. Advisory locks protect claim/finish transactions;
-- the claim token keeps later webhooks from running a second flow while the first is sending.
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS queue_order bigint GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS processing_message uuid,
  ADD COLUMN IF NOT EXISTS processing_token uuid, ADD COLUMN IF NOT EXISTS processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retain_set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS whatsapp_messages_pending ON public.whatsapp_messages(conversation_id,queue_order)
  WHERE direction = 'inbound' AND processed_at IS NULL;
CREATE OR REPLACE FUNCTION public.whatsapp_claim_next(p_wa_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.whatsapp_contacts; v public.whatsapp_conversations; m public.whatsapp_messages; token uuid := gen_random_uuid();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_wa_id,0));
  UPDATE public.whatsapp_contacts SET linked_user_id = NULL, linked_at = NULL WHERE wa_id = p_wa_id
    AND linked_user_id IS NOT NULL AND (linked_at IS NULL OR linked_at <= now() - interval '180 days');
  SELECT * INTO c FROM public.whatsapp_contacts WHERE wa_id = p_wa_id;
  SELECT * INTO v FROM public.whatsapp_conversations WHERE contact_id = c.id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v.processing_message IS NOT NULL THEN
    IF v.processing_at > now() - interval '5 minutes' THEN RETURN NULL; END IF;
    -- An abandoned claim is never replayed because delivery may be uncertain.
    UPDATE public.whatsapp_messages SET processed_at = now() WHERE id = v.processing_message;
    PERFORM public.whatsapp_notify_handover(v.id,'Assistant processing interrupted');
    SELECT * INTO v FROM public.whatsapp_conversations WHERE id = v.id;
  END IF;
  SELECT * INTO m FROM public.whatsapp_messages WHERE conversation_id = v.id AND direction = 'inbound' AND processed_at IS NULL
    ORDER BY queue_order LIMIT 1;
  IF NOT FOUND THEN
    UPDATE public.whatsapp_conversations SET processing_message = NULL, processing_token = NULL, processing_at = NULL WHERE id = v.id;
    RETURN NULL;
  END IF;
  UPDATE public.whatsapp_conversations SET processing_message = m.id, processing_token = token, processing_at = now() WHERE id = v.id;
  RETURN jsonb_build_object('contact',to_jsonb(c),'conversation',to_jsonb(v),'message',to_jsonb(m),'token',token);
END $$;
CREATE OR REPLACE FUNCTION public.whatsapp_finish_claim(p_wa_id text,p_token uuid,p_lost boolean) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.whatsapp_conversations; losses integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_wa_id,0));
  SELECT v1.* INTO v FROM public.whatsapp_conversations v1 JOIN public.whatsapp_contacts c ON c.id = v1.contact_id
    WHERE c.wa_id = p_wa_id AND v1.processing_token = p_token FOR UPDATE OF v1;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE public.whatsapp_messages SET processed_at = now() WHERE id = v.processing_message;
  losses := CASE WHEN p_lost THEN v.consecutive_losses + 1 ELSE 0 END;
  UPDATE public.whatsapp_conversations SET processing_message = NULL,processing_token = NULL,processing_at = NULL,consecutive_losses = losses WHERE id = v.id;
  IF losses >= 3 THEN PERFORM public.whatsapp_notify_handover(v.id,'Repeated concurrent activity'); END IF;
  RETURN losses;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_claim_next(text),public.whatsapp_finish_claim(text,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_claim_next(text),public.whatsapp_finish_claim(text,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_published_countries() RETURNS TABLE(country text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT country FROM public.universities WHERE active = true AND listing_status <> 'archived' AND country IS NOT NULL ORDER BY country;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_published_countries() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_published_countries() TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_retain(p_conversation uuid,p_until timestamptz,p_reason text,p_staff uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE last_message timestamptz;
BEGIN
  IF NOT public.is_admin_or_staff(p_staff) OR p_reason NOT IN ('active_application','complaint') OR p_reason IS NULL THEN RETURN false; END IF;
  PERFORM 1 FROM public.whatsapp_conversations WHERE id = p_conversation FOR UPDATE;
  SELECT max(created_at) INTO last_message FROM public.whatsapp_messages WHERE conversation_id = p_conversation;
  IF last_message IS NULL OR p_until IS NULL OR p_until <= now() OR p_until > last_message + interval '24 months' THEN RETURN false; END IF;
  UPDATE public.whatsapp_conversations SET retain_until = p_until,retain_reason = p_reason,retain_set_by = p_staff WHERE id = p_conversation;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_retain(uuid,timestamptz,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_retain(uuid,timestamptz,text,uuid) TO service_role;

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
  IF s.date_of_birth IS NULL OR s.date_of_birth > (current_date - interval '18 years')::date THEN RETURN; END IF;
  IF s.whatsapp_opt_in_at IS NOT NULL OR s.whatsapp_opt_out_at IS NOT NULL THEN RETURN; END IF;
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = auth.uid();
  IF meta->>'whatsapp_opt_in' = 'true' AND meta->>'whatsapp_opt_in_at' IS NOT NULL THEN
    PERFORM public.whatsapp_set_preferences(meta->>'phone', true);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_capture_signup_consent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_capture_signup_consent() TO authenticated;

ALTER TABLE public.whatsapp_contacts ALTER COLUMN created_at DROP NOT NULL, ALTER COLUMN updated_at DROP NOT NULL;
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
  DELETE FROM public.whatsapp_contacts c WHERE opted_out_at IS NULL AND NOT EXISTS
    (SELECT 1 FROM public.whatsapp_conversations v WHERE v.contact_id = c.id);
  UPDATE public.whatsapp_contacts c SET profile_name = NULL, linked_user_id = NULL, linked_at = NULL,
    service_resumed_at = NULL, marketing_consent_at = NULL, auto_reply_times = ARRAY[]::timestamptz[],
    link_attempts = 0, link_attempted_at = NULL, created_at = NULL, updated_at = NULL
    WHERE opted_out_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.whatsapp_conversations v WHERE v.contact_id = c.id);
  DELETE FROM public.zoe_handoff_capacity WHERE hour < now() - interval '1 day';
  DELETE FROM public.zoe_handoff_breakers WHERE hour < now() - interval '1 day';
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
