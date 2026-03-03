-- Broadcast Centre foundation tables
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT,
  headline TEXT,
  message_body TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  send_email BOOLEAN NOT NULL DEFAULT TRUE,
  send_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT broadcasts_status_check CHECK (status IN ('draft', 'scheduled', 'sent', 'processing', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant_created_at ON public.broadcasts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_schedule_status ON public.broadcasts(status, scheduled_for);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  email_status TEXT NOT NULL DEFAULT 'pending',
  whatsapp_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_recipients_user_type_check CHECK (user_type IN ('agent', 'student'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcast_recipients_unique
  ON public.broadcast_recipients(broadcast_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);

CREATE TABLE IF NOT EXISTS public.broadcast_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_templates_tenant_created_at
  ON public.broadcast_templates(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_logs_channel_check CHECK (channel IN ('email', 'whatsapp'))
);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_broadcast ON public.broadcast_logs(broadcast_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_status ON public.broadcast_logs(status, channel);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT,
  template_name TEXT,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_broadcast ON public.whatsapp_logs(broadcast_id, created_at DESC);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin staff manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admin staff manage broadcasts"
ON public.broadcasts
FOR ALL
USING (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
)
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS "Admin staff manage broadcast recipients" ON public.broadcast_recipients;
CREATE POLICY "Admin staff manage broadcast recipients"
ON public.broadcast_recipients
FOR ALL
USING (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
)
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS "Admin staff manage broadcast templates" ON public.broadcast_templates;
CREATE POLICY "Admin staff manage broadcast templates"
ON public.broadcast_templates
FOR ALL
USING (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
)
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS "Admin staff read broadcast logs" ON public.broadcast_logs;
CREATE POLICY "Admin staff read broadcast logs"
ON public.broadcast_logs
FOR SELECT
USING (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS "Service role insert broadcast logs" ON public.broadcast_logs;
CREATE POLICY "Service role insert broadcast logs"
ON public.broadcast_logs
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin staff read whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admin staff read whatsapp logs"
ON public.whatsapp_logs
FOR SELECT
USING (
  public.is_admin_or_staff(auth.uid())
  AND tenant_id = public.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS "Service role insert whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Service role insert whatsapp logs"
ON public.whatsapp_logs
FOR INSERT
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_broadcast_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcasts_updated_at ON public.broadcasts;
CREATE TRIGGER trg_broadcasts_updated_at
BEFORE UPDATE ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_broadcast_updated_at();

DROP TRIGGER IF EXISTS trg_broadcast_recipients_updated_at ON public.broadcast_recipients;
CREATE TRIGGER trg_broadcast_recipients_updated_at
BEFORE UPDATE ON public.broadcast_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_broadcast_updated_at();

CREATE OR REPLACE FUNCTION public.claim_due_broadcasts(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.broadcasts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  v_tenant := public.get_user_tenant(auth.uid());

  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM public.broadcasts
    WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= now()
      AND tenant_id = v_tenant
    ORDER BY scheduled_for ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.broadcasts b
  SET status = 'processing', updated_at = now()
  FROM due
  WHERE b.id = due.id
  RETURNING b.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_due_broadcasts(INTEGER) TO authenticated, service_role;
