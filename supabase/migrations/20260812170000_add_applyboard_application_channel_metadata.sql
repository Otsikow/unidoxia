-- Store recruitment-platform routing outside public catalogue rows.
-- These tables are staff-only: students, agents, anonymous users and public
-- catalogue APIs must never receive their contents.

CREATE TABLE IF NOT EXISTS public.internal_university_routing (
  university_id UUID PRIMARY KEY REFERENCES public.universities(id) ON DELETE CASCADE,
  application_channel TEXT NOT NULL DEFAULT 'unassigned',
  direct_contract BOOLEAN NOT NULL DEFAULT false,
  applyboard_available BOOLEAN NOT NULL DEFAULT false,
  applyboard_verified_at TIMESTAMPTZ,
  applyboard_reference TEXT,
  commission_verification_status TEXT NOT NULL DEFAULT 'not_checked',
  routing_last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT internal_university_routing_channel_check
    CHECK (application_channel IN ('unassigned','applyboard','direct_university_partnership','other_education_partner')),
  CONSTRAINT internal_university_routing_commission_check
    CHECK (commission_verification_status IN ('not_checked','partner_account_check_required','verified_commissionable','not_commissionable')),
  CONSTRAINT internal_university_routing_applyboard_evidence_check
    CHECK (
      application_channel <> 'applyboard'
      OR (
        direct_contract = false
        AND applyboard_available = true
        AND applyboard_verified_at IS NOT NULL
        AND applyboard_reference IS NOT NULL
        AND routing_last_verified_at IS NOT NULL
      )
    ),
  CONSTRAINT internal_university_routing_direct_contract_check
    CHECK (application_channel <> 'direct_university_partnership' OR direct_contract = true)
);

CREATE TABLE IF NOT EXISTS public.internal_program_routing (
  program_id UUID PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  applyboard_program_reference TEXT,
  applyboard_program_verified_at TIMESTAMPTZ,
  applyboard_program_status TEXT NOT NULL DEFAULT 'not_checked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT internal_program_routing_status_check
    CHECK (applyboard_program_status IN ('not_checked','institution_verified_programme_check_required','verified_available','temporarily_unavailable','not_available')),
  CONSTRAINT internal_program_routing_evidence_check
    CHECK (
      applyboard_program_status <> 'verified_available'
      OR (applyboard_program_reference IS NOT NULL AND applyboard_program_verified_at IS NOT NULL)
    )
);

-- Student-facing facts remain on the programme record; they contain no
-- recruitment-platform identity or operational routing information.
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS application_fee_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS application_fee_currency TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_currency TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_details JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_application_fee_currency_check;
ALTER TABLE public.programs ADD CONSTRAINT programs_application_fee_currency_check
  CHECK (application_fee_amount IS NULL OR application_fee_currency IS NOT NULL);

ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_deposit_currency_check;
ALTER TABLE public.programs ADD CONSTRAINT programs_deposit_currency_check
  CHECK (deposit_amount IS NULL OR deposit_currency IS NOT NULL);

CREATE INDEX IF NOT EXISTS internal_university_routing_channel_idx
  ON public.internal_university_routing(application_channel, applyboard_available, direct_contract);
CREATE INDEX IF NOT EXISTS internal_program_routing_status_idx
  ON public.internal_program_routing(applyboard_program_status);

ALTER TABLE public.internal_university_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_program_routing ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.internal_university_routing FROM anon, authenticated;
REVOKE ALL ON TABLE public.internal_program_routing FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.internal_university_routing TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.internal_program_routing TO authenticated;

DROP POLICY IF EXISTS "Staff only university routing" ON public.internal_university_routing;
CREATE POLICY "Staff only university routing"
  ON public.internal_university_routing
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff only program routing" ON public.internal_program_routing;
CREATE POLICY "Staff only program routing"
  ON public.internal_program_routing
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

COMMENT ON TABLE public.internal_university_routing IS
  'Staff-only recruitment-platform routing. Never expose through public or student/agent APIs.';
COMMENT ON TABLE public.internal_program_routing IS
  'Staff-only programme routing evidence. Never expose through public or student/agent APIs.';

