
-- Sequence for lead reference codes
CREATE SEQUENCE IF NOT EXISTS public.website_lead_reference_seq START 1000;

CREATE TABLE IF NOT EXISTS public.website_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_code TEXT UNIQUE,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  preferred_contact TEXT,

  citizenship TEXT,
  current_country TEXT,

  preferred_destinations TEXT[] NOT NULL DEFAULT '{}',
  program_level TEXT,
  study_area TEXT,
  field_of_study TEXT,
  study_mode TEXT,

  intake_season TEXT,
  intake_year TEXT,

  budget_range TEXT,

  highest_education TEXT,
  school_name TEXT,
  graduation_year TEXT,
  gpa_scale TEXT,
  grade_average TEXT,

  english_proficiency TEXT,
  english_test TEXT,
  english_test_score TEXT,

  passport_ready BOOLEAN,
  proof_of_funds_ready BOOLEAN,
  sponsor_ready BOOLEAN,

  support_services TEXT[] NOT NULL DEFAULT '{}',
  housing_preference TEXT,
  scholarship_interest BOOLEAN,

  notes TEXT,

  consent_granted BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMPTZ,

  source TEXT,
  medium TEXT,
  campaign TEXT,
  landing_page TEXT,
  referrer TEXT,
  utm_term TEXT,
  utm_content TEXT,

  lead_score INTEGER NOT NULL DEFAULT 0,
  lead_temperature TEXT NOT NULL DEFAULT 'warm' CHECK (lead_temperature IN ('hot','warm','cold')),
  stage TEXT NOT NULL DEFAULT 'New Lead',
  owner_id UUID,
  assignee_id UUID,
  next_follow_up_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_DATE + interval '0 day'),

  is_test BOOLEAN NOT NULL DEFAULT false,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants: no anon access; auth users get read/update (RLS restricts further); service_role for edge functions
GRANT SELECT, UPDATE ON public.website_leads TO authenticated;
GRANT ALL ON public.website_leads TO service_role;
GRANT USAGE ON SEQUENCE public.website_lead_reference_seq TO service_role;

ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

-- Read: admin/staff/counselor within same tenant
CREATE POLICY "Staff can view leads in their tenant"
  ON public.website_leads FOR SELECT
  TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'counselor'::app_role)
    )
    AND tenant_id = public.get_user_tenant(auth.uid())
  );

-- Update: same staff roles within tenant
CREATE POLICY "Staff can update leads in their tenant"
  ON public.website_leads FOR UPDATE
  TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'counselor'::app_role)
    )
    AND tenant_id = public.get_user_tenant(auth.uid())
  )
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
      OR public.has_role(auth.uid(), 'counselor'::app_role)
    )
    AND tenant_id = public.get_user_tenant(auth.uid())
  );

-- No INSERT/DELETE policies for authenticated -> effectively denied. Service role bypasses RLS.

-- Reference code trigger
CREATE OR REPLACE FUNCTION public.assign_website_lead_reference_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code := 'LEAD-' || lpad(nextval('public.website_lead_reference_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_website_leads_reference ON public.website_leads;
CREATE TRIGGER trg_website_leads_reference
  BEFORE INSERT ON public.website_leads
  FOR EACH ROW EXECUTE FUNCTION public.assign_website_lead_reference_code();

DROP TRIGGER IF EXISTS trg_website_leads_updated_at ON public.website_leads;
CREATE TRIGGER trg_website_leads_updated_at
  BEFORE UPDATE ON public.website_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_website_leads_tenant_created ON public.website_leads (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_leads_stage ON public.website_leads (stage);
CREATE INDEX IF NOT EXISTS idx_website_leads_temperature ON public.website_leads (lead_temperature);
CREATE INDEX IF NOT EXISTS idx_website_leads_next_follow_up ON public.website_leads (next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_website_leads_email ON public.website_leads (lower(email));
