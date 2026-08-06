CREATE TABLE public.agent_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agreement_version text NOT NULL DEFAULT 'v1.0-2026',
  full_legal_name text NOT NULL,
  business_name text,
  company_registration_number text,
  country_of_operation text NOT NULL,
  business_address text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  identification_number text,
  representative_name text,
  position_title text,
  electronic_signature text NOT NULL,
  confirmed_read boolean NOT NULL DEFAULT false,
  confirmed_authority boolean NOT NULL DEFAULT false,
  consented_verification boolean NOT NULL DEFAULT false,
  signed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  user_agent text,
  pdf_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_agreements_profile_version_idx
  ON public.agent_agreements (profile_id, agreement_version);

GRANT SELECT, INSERT ON public.agent_agreements TO authenticated;
GRANT ALL ON public.agent_agreements TO service_role;

ALTER TABLE public.agent_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own agreement"
  ON public.agent_agreements FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Agents can sign their own agreement"
  ON public.agent_agreements FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins manage agreements"
  ON public.agent_agreements FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE TRIGGER update_agent_agreements_updated_at
  BEFORE UPDATE ON public.agent_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();