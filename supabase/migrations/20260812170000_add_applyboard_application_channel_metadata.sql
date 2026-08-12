-- Recruitment-platform routing is internal operational data.
-- It must never be exposed through the public Supabase schema, PostgREST,
-- student/agent clients, page payloads, or public catalogue APIs.

CREATE SCHEMA IF NOT EXISTS private_catalogue;
REVOKE ALL ON SCHEMA private_catalogue FROM PUBLIC;
REVOKE ALL ON SCHEMA private_catalogue FROM anon;
REVOKE ALL ON SCHEMA private_catalogue FROM authenticated;

CREATE TABLE IF NOT EXISTS private_catalogue.application_routing (
  university_id UUID PRIMARY KEY REFERENCES public.universities(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'unassigned',
  direct_contract BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  commission_status TEXT NOT NULL DEFAULT 'verify_before_submission',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT private_application_routing_channel_check
    CHECK (channel IN ('unassigned','applyboard','direct_university_partnership','other_education_partner')),
  CONSTRAINT private_application_routing_direct_contract_check
    CHECK (channel <> 'direct_university_partnership' OR direct_contract = true)
);

CREATE TABLE IF NOT EXISTS private_catalogue.program_routing (
  program_id UUID PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'unassigned',
  direct_contract BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  internal_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT private_program_routing_channel_check
    CHECK (channel IN ('unassigned','applyboard','direct_university_partnership','other_education_partner')),
  CONSTRAINT private_program_routing_direct_contract_check
    CHECK (channel <> 'direct_university_partnership' OR direct_contract = true)
);

REVOKE ALL ON TABLE private_catalogue.application_routing FROM PUBLIC;
REVOKE ALL ON TABLE private_catalogue.application_routing FROM anon;
REVOKE ALL ON TABLE private_catalogue.application_routing FROM authenticated;
REVOKE ALL ON TABLE private_catalogue.program_routing FROM PUBLIC;
REVOKE ALL ON TABLE private_catalogue.program_routing FROM anon;
REVOKE ALL ON TABLE private_catalogue.program_routing FROM authenticated;

-- Student-facing facts may remain in public.programs because they contain no
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

-- If an earlier development migration created routing tables in the exposed
-- public schema, remove them. Production must use only private_catalogue.*.
DROP TABLE IF EXISTS public.internal_program_routing CASCADE;
DROP TABLE IF EXISTS public.internal_university_routing CASCADE;

COMMENT ON SCHEMA private_catalogue IS
  'Internal UniDoxia operational data. Not exposed to anonymous, student, agent, or browser clients.';
COMMENT ON TABLE private_catalogue.application_routing IS
  'Internal institution application-routing metadata. Never expose through public APIs.';
COMMENT ON TABLE private_catalogue.program_routing IS
  'Internal programme application-routing metadata. Never expose through public APIs.';
