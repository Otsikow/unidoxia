-- Agent onboarding and private certificates. Activate only after live schema review
-- and migration-specific approval. Does not change any existing agent row.
BEGIN;

-- Older signup triggers omit username/team_invite_code despite NOT NULL columns.
-- Fill only missing values, with the stored profile as the source of identity.
CREATE OR REPLACE FUNCTION public.prepare_agent_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p public.profiles; payload jsonb := to_jsonb(NEW);
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = NEW.profile_id;
  IF payload ? 'username' AND (nullif(payload->>'username', '') IS NULL OR current_user IN ('anon','authenticated')) THEN
    payload := jsonb_set(payload, '{username}', to_jsonb(coalesce(nullif(to_jsonb(p)->>'username', ''), 'agent_' || replace(NEW.profile_id::text, '-', ''))));
  END IF;
  IF payload ? 'team_invite_code' AND nullif(payload->>'team_invite_code', '') IS NULL THEN
    payload := jsonb_set(payload, '{team_invite_code}', to_jsonb(replace(gen_random_uuid()::text, '-', '')));
  END IF;
  NEW := jsonb_populate_record(NEW, payload);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_agent_identity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS a_prepare_agent_identity ON public.agents;
CREATE TRIGGER a_prepare_agent_identity BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.prepare_agent_identity();

-- Restrict the existing broad owner UPDATE policy to onboarding fields. The
-- invoker sees the actual API caller; no SECURITY DEFINER permission bypass.
CREATE OR REPLACE FUNCTION public.guard_agent_onboarding_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p public.profiles;
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  IF public.is_admin_or_staff(auth.uid()) THEN RETURN NEW; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL OR p.role::text <> 'agent' OR p.active IS NOT TRUE
     OR NEW.profile_id IS DISTINCT FROM p.id OR NEW.tenant_id IS DISTINCT FROM p.tenant_id THEN
    RAISE EXCEPTION 'An active agent account is required' USING ERRCODE = '42501';
  END IF;
  IF NEW.verification_document_url IS NOT NULL AND NEW.verification_document_url <> ''
     AND NEW.verification_document_url !~ '^https://[^[:space:]]+$'
     AND NEW.verification_document_url !~ ('^agent-documents/' || p.id::text || '/[A-Za-z0-9_-][A-Za-z0-9_.-]*$') THEN
    RAISE EXCEPTION 'Certificate must be an HTTPS link or your own private upload' USING ERRCODE = '22023';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status IS DISTINCT FROM 'pending' OR NEW.active IS DISTINCT FROM true
       OR NEW.payout_account IS NOT NULL OR NEW.parent_agent_id IS NOT NULL
       OR NEW.commission_rate_l1 IS DISTINCT FROM 15.00 OR NEW.commission_rate_l2 IS DISTINCT FROM 10.00 THEN
      RAISE EXCEPTION 'Agent onboarding cannot set approval or commercial terms' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF (to_jsonb(NEW) - ARRAY['company_name','verification_document_url','team_invite_code','updated_at'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['company_name','verification_document_url','team_invite_code','updated_at']) THEN
      RAISE EXCEPTION 'Only agency details and certificates can be changed here' USING ERRCODE = '42501';
    END IF;
    IF NEW.verification_document_url IS DISTINCT FROM OLD.verification_document_url THEN
      NEW.verification_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_agent_onboarding_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS b_guard_agent_onboarding_fields ON public.agents;
CREATE TRIGGER b_guard_agent_onboarding_fields BEFORE INSERT OR UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.guard_agent_onboarding_fields();

DROP POLICY IF EXISTS "Agents can update their own agent record" ON public.agents;
CREATE POLICY "Agents can update their own agent record" ON public.agents FOR UPDATE TO authenticated
USING (profile_id = auth.uid() AND tenant_id = public.get_user_tenant(auth.uid()))
WITH CHECK (profile_id = auth.uid() AND tenant_id = public.get_user_tenant(auth.uid()));
DROP POLICY IF EXISTS "Agents can create their missing onboarding record" ON public.agents;
CREATE POLICY "Agents can create their missing onboarding record" ON public.agents FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'agent'
    AND p.active IS TRUE AND p.tenant_id = agents.tenant_id
));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-documents','agent-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Files are stored as <profile UUID>/<unique file>; no overwrite/upsert policy.
DROP POLICY IF EXISTS "Agent certificates owner upload" ON storage.objects;
CREATE POLICY "Agent certificates owner upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text
 AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'agent' AND p.active IS TRUE));
DROP POLICY IF EXISTS "Agent certificates private read" ON storage.objects;
CREATE POLICY "Agent certificates private read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agent-documents' AND (
  ((storage.foldername(name))[1] = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'agent' AND p.active IS TRUE))
  OR (public.is_admin_or_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.agents a WHERE a.profile_id::text = (storage.foldername(name))[1]
      AND a.tenant_id = public.get_user_tenant(auth.uid())))
));
DROP POLICY IF EXISTS "Agent certificates owner cleanup" ON storage.objects;
CREATE POLICY "Agent certificates owner cleanup" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text
 AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'agent' AND p.active IS TRUE)
 AND NOT EXISTS (SELECT 1 FROM public.agents a WHERE a.verification_document_url = 'agent-documents/' || name));
-- Restrictive boundaries keep unrelated broad permissive Storage policies from
-- granting access to this new bucket. Other buckets retain their existing rules.
DROP POLICY IF EXISTS "Agent certificate authenticated boundary" ON storage.objects;
CREATE POLICY "Agent certificate authenticated boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id <> 'agent-documents' OR (
  ((storage.foldername(name))[1] = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'agent' AND p.active IS TRUE))
  OR (public.is_admin_or_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.agents a WHERE a.profile_id::text = (storage.foldername(name))[1]
      AND a.tenant_id = public.get_user_tenant(auth.uid())))
))
WITH CHECK (bucket_id <> 'agent-documents' OR (
  (storage.foldername(name))[1] = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'agent' AND p.active IS TRUE)
));
DROP POLICY IF EXISTS "Agent certificate no overwrite" ON storage.objects;
CREATE POLICY "Agent certificate no overwrite" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id <> 'agent-documents') WITH CHECK (bucket_id <> 'agent-documents');
DROP POLICY IF EXISTS "Agent certificate linked file protection" ON storage.objects;
CREATE POLICY "Agent certificate linked file protection" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'agent-documents' OR (
  (storage.foldername(name))[1] = auth.uid()::text AND NOT EXISTS (
    SELECT 1 FROM public.agents a WHERE a.verification_document_url = 'agent-documents/' || name)
));
DROP POLICY IF EXISTS "Agent certificate anonymous boundary" ON storage.objects;
CREATE POLICY "Agent certificate anonymous boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO anon
USING (bucket_id <> 'agent-documents') WITH CHECK (bucket_id <> 'agent-documents');
COMMIT;
