-- Global, programme-first comparison data. University defaults provide reusable
-- fallbacks; programme records override them without duplicating universities.
CREATE TABLE IF NOT EXISTS public.university_comparison_defaults (
  university_id UUID PRIMARY KEY REFERENCES public.universities(id) ON DELETE CASCADE,
  currency TEXT,
  initial_deposit NUMERIC(12,2),
  application_fee NUMERIC(12,2),
  application_fee_waived BOOLEAN,
  payment_plan_summary TEXT,
  english_summary TEXT,
  ielts_alternatives_accepted BOOLEAN,
  no_ielts_pathway BOOLEAN,
  academic_summary TEXT,
  visa_document_type TEXT,
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  academic_year TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('verified','needs_review','outdated','unverified')),
  review_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_comparison_profiles (
  program_id UUID PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  tuition_amount NUMERIC(12,2),
  tuition_per_year NUMERIC(12,2),
  currency TEXT,
  initial_deposit NUMERIC(12,2),
  application_fee NUMERIC(12,2),
  application_fee_waived BOOLEAN,
  estimated_first_year_cost NUMERIC(12,2),
  scholarship_available BOOLEAN,
  scholarship_minimum NUMERIC(12,2),
  scholarship_maximum NUMERIC(12,2),
  payment_plan_summary TEXT,
  english_summary TEXT,
  ielts_score NUMERIC(3,1),
  ielts_alternatives_accepted BOOLEAN,
  no_ielts_pathway BOOLEAN,
  academic_summary TEXT,
  minimum_gpa NUMERIC(4,2),
  international_student_eligible BOOLEAN,
  visa_document_type TEXT,
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  academic_year TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('verified','needs_review','outdated','unverified')),
  review_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_change_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  proposed_changes JSONB NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','superseded')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS program_comparison_filter_idx ON public.program_comparison_profiles
  (verification_status, tuition_per_year, initial_deposit, scholarship_available, review_due_at);
CREATE INDEX IF NOT EXISTS comparison_proposals_review_idx ON public.catalogue_change_proposals
  (status, detected_at DESC);

ALTER TABLE public.university_comparison_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_comparison_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_change_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads current university comparison defaults" ON public.university_comparison_defaults;
CREATE POLICY "public reads current university comparison defaults" ON public.university_comparison_defaults FOR SELECT
USING (verification_status = 'verified' AND source_url IS NOT NULL AND last_verified_at IS NOT NULL);
DROP POLICY IF EXISTS "public reads current programme comparisons" ON public.program_comparison_profiles;
CREATE POLICY "public reads current programme comparisons" ON public.program_comparison_profiles FOR SELECT
USING (verification_status = 'verified' AND source_url IS NOT NULL AND last_verified_at IS NOT NULL);

GRANT SELECT ON public.university_comparison_defaults, public.program_comparison_profiles TO anon, authenticated;
GRANT ALL ON public.university_comparison_defaults, public.program_comparison_profiles, public.catalogue_change_proposals TO service_role;

-- Mark records for review after six months. This is idempotent and can be run
-- by a scheduled task before each intake or academic-year review cycle.
CREATE OR REPLACE FUNCTION public.flag_stale_comparison_data()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected INTEGER := 0; current_count INTEGER := 0;
BEGIN
  UPDATE public.program_comparison_profiles
  SET verification_status = 'outdated', updated_at = now()
  WHERE verification_status = 'verified'
    AND coalesce(review_due_at, last_verified_at + interval '6 months') <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.university_comparison_defaults
  SET verification_status = 'outdated', updated_at = now()
  WHERE verification_status = 'verified'
    AND coalesce(review_due_at, last_verified_at + interval '6 months') <= now();
  GET DIAGNOSTICS current_count = ROW_COUNT;
  RETURN affected + current_count;
END;
$$;
REVOKE ALL ON FUNCTION public.flag_stale_comparison_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flag_stale_comparison_data() TO service_role;

CREATE OR REPLACE VIEW public.public_program_comparisons AS
SELECT p.id AS program_id, p.name AS program_name, p.level, p.discipline,
  u.id AS university_id, u.name AS university_name, u.country, u.city,
  coalesce(pc.tuition_per_year, pc.tuition_amount, pf.amount, p.tuition_amount) AS tuition_amount,
  coalesce(pc.currency, pf.currency, p.tuition_currency, ud.currency) AS currency,
  coalesce(pc.initial_deposit, ud.initial_deposit) AS initial_deposit,
  coalesce(pc.application_fee, ud.application_fee) AS application_fee,
  coalesce(pc.application_fee_waived, ud.application_fee_waived) AS application_fee_waived,
  pc.estimated_first_year_cost, pc.scholarship_available, pc.scholarship_maximum,
  coalesce(pc.english_summary, ud.english_summary) AS english_summary,
  coalesce(pc.ielts_alternatives_accepted, ud.ielts_alternatives_accepted) AS ielts_alternatives_accepted,
  coalesce(pc.no_ielts_pathway, ud.no_ielts_pathway) AS no_ielts_pathway,
  coalesce(pc.academic_summary, ud.academic_summary) AS academic_summary,
  ni.intake_date AS next_intake, ni.application_deadline,
  coalesce(pc.source_url, ud.source_url) AS source_url,
  coalesce(pc.last_verified_at, ud.last_verified_at) AS last_verified_at,
  coalesce(pc.academic_year, ud.academic_year) AS academic_year,
  coalesce(pc.verification_status, ud.verification_status, 'unverified') AS verification_status
FROM public.programs p
JOIN public.universities u ON u.id = p.university_id
LEFT JOIN public.program_comparison_profiles pc ON pc.program_id = p.id
  AND pc.verification_status = 'verified' AND pc.source_url IS NOT NULL AND pc.last_verified_at IS NOT NULL
LEFT JOIN public.university_comparison_defaults ud ON ud.university_id = u.id
  AND ud.verification_status = 'verified' AND ud.source_url IS NOT NULL AND ud.last_verified_at IS NOT NULL
LEFT JOIN LATERAL (
  SELECT amount, currency FROM public.program_fees
  WHERE program_id = p.id AND applicant_type = 'international' AND resolution_status = 'verified'
  ORDER BY last_checked_at DESC LIMIT 1
) pf ON true
LEFT JOIN LATERAL (
  SELECT make_date(intake_year, intake_month, 1) AS intake_date, application_deadline
  FROM public.program_intakes WHERE program_id = p.id AND status IN ('available','recruitable')
    AND make_date(intake_year, intake_month, 1) >= date_trunc('month', current_date)
  ORDER BY intake_year, intake_month LIMIT 1
) ni ON true
WHERE p.active AND p.catalogue_status = 'active' AND u.active;

GRANT SELECT ON public.public_program_comparisons TO anon, authenticated;
