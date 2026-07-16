
-- Source directory
CREATE TABLE public.scholarship_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organisation TEXT,
  website_url TEXT NOT NULL,
  country TEXT,
  trust_level TEXT NOT NULL DEFAULT 'unverified',
  notes TEXT,
  last_checked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scholarship_sources_country ON public.scholarship_sources(country);
CREATE INDEX idx_scholarship_sources_trust ON public.scholarship_sources(trust_level);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_sources TO authenticated;
GRANT ALL ON public.scholarship_sources TO service_role;

ALTER TABLE public.scholarship_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and staff can manage sources"
ON public.scholarship_sources FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER update_scholarship_sources_updated_at
BEFORE UPDATE ON public.scholarship_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verification log
CREATE TABLE public.scholarship_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  notes TEXT,
  verified_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scholarship_verification_logs_scholarship ON public.scholarship_verification_logs(scholarship_id);
CREATE INDEX idx_scholarship_verification_logs_created ON public.scholarship_verification_logs(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_verification_logs TO authenticated;
GRANT ALL ON public.scholarship_verification_logs TO service_role;

ALTER TABLE public.scholarship_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and staff can manage verification logs"
ON public.scholarship_verification_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
