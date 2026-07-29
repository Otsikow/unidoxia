
-- Broadcast Centre backing tables (previously missing)

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  created_by UUID,
  recipient_type TEXT NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT,
  headline TEXT,
  message_body TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  send_email BOOLEAN NOT NULL DEFAULT true,
  send_whatsapp BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID,
  user_type TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
  email_status TEXT NOT NULL DEFAULT 'pending',
  whatsapp_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broadcast_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID,
  phone TEXT,
  template_name TEXT,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broadcast_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant_created ON public.broadcasts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status_schedule ON public.broadcasts(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_tenant_created ON public.broadcast_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_tenant_created ON public.whatsapp_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_tenant ON public.broadcast_templates(tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_recipients TO authenticated;
GRANT SELECT, INSERT ON public.broadcast_logs TO authenticated;
GRANT SELECT ON public.whatsapp_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_templates TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
GRANT ALL ON public.broadcast_recipients TO service_role;
GRANT ALL ON public.broadcast_logs TO service_role;
GRANT ALL ON public.whatsapp_logs TO service_role;
GRANT ALL ON public.broadcast_templates TO service_role;

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_broadcast_manager(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id = _tenant_id
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  )
$$;

REVOKE ALL ON FUNCTION public.is_broadcast_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_broadcast_manager(uuid) TO authenticated, service_role;

CREATE POLICY "Admins manage broadcasts" ON public.broadcasts
  FOR ALL TO authenticated
  USING (public.is_broadcast_manager(tenant_id))
  WITH CHECK (public.is_broadcast_manager(tenant_id));

CREATE POLICY "Admins manage broadcast recipients" ON public.broadcast_recipients
  FOR ALL TO authenticated
  USING (public.is_broadcast_manager(tenant_id))
  WITH CHECK (public.is_broadcast_manager(tenant_id));

CREATE POLICY "Admins read broadcast logs" ON public.broadcast_logs
  FOR SELECT TO authenticated
  USING (public.is_broadcast_manager(tenant_id));

CREATE POLICY "Admins insert broadcast logs" ON public.broadcast_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_broadcast_manager(tenant_id));

CREATE POLICY "Admins read whatsapp logs" ON public.whatsapp_logs
  FOR SELECT TO authenticated
  USING (public.is_broadcast_manager(tenant_id));

CREATE POLICY "Admins manage broadcast templates" ON public.broadcast_templates
  FOR ALL TO authenticated
  USING (public.is_broadcast_manager(tenant_id))
  WITH CHECK (public.is_broadcast_manager(tenant_id));

CREATE OR REPLACE FUNCTION public.claim_due_broadcasts(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.broadcasts b
  SET status = 'processing', updated_at = now()
  WHERE b.id IN (
    SELECT b2.id FROM public.broadcasts b2
    WHERE b2.status = 'scheduled'
      AND b2.scheduled_for IS NOT NULL
      AND b2.scheduled_for <= now()
    ORDER BY b2.scheduled_for ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING b.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_broadcasts(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_broadcasts(integer) TO service_role;

CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_broadcast_recipients_updated_at BEFORE UPDATE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_broadcast_templates_updated_at BEFORE UPDATE ON public.broadcast_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
