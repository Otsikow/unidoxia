-- Full university catalogue foundations.
-- Additive structures for source-conscious imports, explicit unresolved values,
-- university-approved precedence, catalogue history and outreach readiness.

ALTER TABLE public.programs
  ALTER COLUMN duration_months DROP NOT NULL,
  ALTER COLUMN tuition_amount DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS faculty TEXT,
  ADD COLUMN IF NOT EXISTS course_code TEXT,
  ADD COLUMN IF NOT EXISTS study_mode TEXT,
  ADD COLUMN IF NOT EXISTS attendance TEXT,
  ADD COLUMN IF NOT EXISTS campus TEXT,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT,
  ADD COLUMN IF NOT EXISTS placement_available BOOLEAN,
  ADD COLUMN IF NOT EXISTS official_url TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS fee_year TEXT,
  ADD COLUMN IF NOT EXISTS fee_basis TEXT,
  ADD COLUMN IF NOT EXISTS international_fee_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalogue_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS verification_state TEXT NOT NULL DEFAULT 'imported_unverified',
  ADD COLUMN IF NOT EXISTS data_status TEXT NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS source_last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_university_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS university_locked_fields TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS overview TEXT,
  ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS career_outcomes TEXT,
  ADD COLUMN IF NOT EXISTS accreditation TEXT,
  ADD COLUMN IF NOT EXISTS application_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS english_requirements JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.programs
SET tuition_amount = NULL,
    international_fee_verified = false,
    data_status = 'needs_fee_review'
WHERE tuition_amount = 0;

ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_catalogue_status_check;
ALTER TABLE public.programs ADD CONSTRAINT programs_catalogue_status_check
  CHECK (catalogue_status IN ('active','intake_closed','temporarily_unavailable','archived','discontinued'));
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_verification_state_check;
ALTER TABLE public.programs ADD CONSTRAINT programs_verification_state_check
  CHECK (verification_state IN ('imported_unverified','official_source_verified','manually_reviewed','university_edited','university_verified'));
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_fee_basis_check;
ALTER TABLE public.programs ADD CONSTRAINT programs_fee_basis_check
  CHECK (fee_basis IS NULL OR fee_basis IN ('annual','total','per_credit','per_module','placement_year'));

WITH generated AS (
  SELECT id,
    trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS base_slug,
    row_number() OVER (
      PARTITION BY university_id, trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
      ORDER BY created_at NULLS LAST, id
    ) AS duplicate_number
  FROM public.programs WHERE slug IS NULL
)
UPDATE public.programs AS program
SET slug = generated.base_slug || CASE WHEN generated.duplicate_number = 1 THEN '' ELSE '-' || generated.duplicate_number::text END
FROM generated WHERE program.id = generated.id;

CREATE UNIQUE INDEX IF NOT EXISTS programs_university_slug_unique
  ON public.programs(university_id, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS programs_official_url_unique
  ON public.programs(university_id, official_url) WHERE official_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS programs_public_catalogue_idx
  ON public.programs(catalogue_status, active, university_id, level);
CREATE INDEX IF NOT EXISTS programs_source_fingerprint_idx
  ON public.programs(university_id, source_fingerprint) WHERE source_fingerprint IS NOT NULL;

-- University users archive programmes through the catalogue workflow. Removing
-- the legacy hard-delete policy preserves application foreign keys and history.
DROP POLICY IF EXISTS "Partners can delete programs" ON public.programs;
DROP POLICY IF EXISTS "Anyone can view all active programs" ON public.programs;
CREATE POLICY "Anyone can view active catalogue programs" ON public.programs FOR SELECT
USING (
  active = true AND catalogue_status = 'active'
  AND EXISTS (SELECT 1 FROM public.universities u WHERE u.id = programs.university_id AND u.active)
);

CREATE TABLE IF NOT EXISTS public.program_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  intake_year INTEGER NOT NULL,
  intake_month INTEGER NOT NULL CHECK (intake_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','recruitable','closed','historical','provisional','unknown')),
  application_deadline DATE,
  source_url TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL,
  verification_state TEXT NOT NULL DEFAULT 'official_source_verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, intake_year, intake_month)
);

CREATE TABLE IF NOT EXISTS public.program_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  applicant_type TEXT NOT NULL DEFAULT 'international' CHECK (applicant_type IN ('international','home','eu','other')),
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  fee_year TEXT NOT NULL,
  fee_basis TEXT CHECK (fee_basis IN ('annual','total','per_credit','per_module','placement_year')),
  placement_year_amount NUMERIC(12,2),
  mandatory_charges JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_status TEXT NOT NULL DEFAULT 'verified' CHECK (resolution_status IN ('verified','unresolved','stale','not_published')),
  source_url TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, applicant_type, fee_year, fee_basis)
);

CREATE TABLE IF NOT EXISTS public.catalogue_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('catalogue','programme','fees','intakes','entry_requirements','english_requirements','scholarships','application','institution')),
  source_priority INTEGER NOT NULL DEFAULT 1 CHECK (source_priority BETWEEN 1 AND 9),
  http_status INTEGER,
  content_fingerprint TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL,
  last_success_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(university_id, program_id, source_url, source_kind)
);

CREATE TABLE IF NOT EXISTS public.catalogue_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('dry_run','apply')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','completed_with_errors','failed','cancelled')),
  source_url TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  discovered_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  archived_candidate_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.catalogue_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES public.catalogue_import_runs(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  source_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','unchanged','skip','archive_candidate','error')),
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS catalogue_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS catalogue_discovered_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_processed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_verified_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_unresolved_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_fee_verified_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_intake_verified_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_requirements_verified_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalogue_last_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_completeness_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_catalogue_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_readiness_status TEXT NOT NULL DEFAULT 'needs_work';
ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_catalogue_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_catalogue_status_check
  CHECK (catalogue_status IN ('not_started','discovering','importing','processing','needs_review','substantially_complete','complete','stale','blocked'));
ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_profile_readiness_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_profile_readiness_status_check
  CHECK (profile_readiness_status IN ('needs_work','needs_review','ready_for_outreach','data_stale'));
ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_outreach_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_outreach_status_check CHECK (outreach_status IN (
  'not_contacted','researching','profile_incomplete','profile_ready','contact_identified','outreach_sent',
  'first_follow_up','second_follow_up','follow_up_required','responded','profile_claimed','meeting_requested',
  'partnership_discussion','partner','not_interested','revisit_later'
));

CREATE OR REPLACE FUNCTION public.university_is_outreach_ready(p_university_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.universities u
    WHERE u.id = p_university_id
      AND u.profile_completeness_percent >= 80
      AND u.profile_readiness_status = 'ready_for_outreach'
      AND u.catalogue_status IN ('substantially_complete','complete')
      AND u.catalogue_discovered_count > 0
      AND u.catalogue_processed_count >= u.catalogue_discovered_count
      AND u.catalogue_verified_count > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.university_id = u.id AND p.catalogue_status = 'active'
          AND (p.official_url IS NULL OR p.source_last_checked_at IS NULL)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_unready_university_outreach()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.outreach_status IN ('profile_ready','contact_identified','outreach_sent','first_follow_up','second_follow_up','follow_up_required')
     AND OLD.outreach_status IS DISTINCT FROM NEW.outreach_status
     AND NOT public.university_is_outreach_ready(NEW.id) THEN
    RAISE EXCEPTION 'University cannot be marked profile_ready until catalogue and profile readiness checks pass';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_unready_university_outreach ON public.universities;
CREATE TRIGGER prevent_unready_university_outreach
BEFORE UPDATE OF outreach_status ON public.universities
FOR EACH ROW EXECUTE FUNCTION public.prevent_unready_university_outreach();

ALTER TABLE public.program_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_import_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.program_intakes, public.program_fees, public.catalogue_sources TO anon, authenticated;
GRANT ALL ON public.program_intakes, public.program_fees, public.catalogue_sources,
  public.catalogue_import_runs, public.catalogue_import_items TO service_role;

DROP POLICY IF EXISTS "public reads active programme intakes" ON public.program_intakes;
CREATE POLICY "public reads active programme intakes" ON public.program_intakes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.programs p JOIN public.universities u ON u.id = p.university_id
  WHERE p.id = program_id AND p.active AND p.catalogue_status = 'active' AND u.active
));
DROP POLICY IF EXISTS "public reads active programme fees" ON public.program_fees;
CREATE POLICY "public reads active programme fees" ON public.program_fees FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.programs p JOIN public.universities u ON u.id = p.university_id
  WHERE p.id = program_id AND p.active AND p.catalogue_status = 'active' AND u.active
));
DROP POLICY IF EXISTS "public reads catalogue provenance" ON public.catalogue_sources;
CREATE POLICY "public reads catalogue provenance" ON public.catalogue_sources FOR SELECT USING (true);

-- Existing pilot rows are foundations only, not outreach-ready catalogues.
UPDATE public.universities
SET outreach_status = 'not_contacted', catalogue_status = 'not_started',
    catalogue_discovered_count = 0, catalogue_processed_count = 0,
    catalogue_verified_count = 0, catalogue_unresolved_count = 0
WHERE slug IN ('teesside-university','university-of-sunderland','northumbria-university')
  AND outreach_status = 'profile_ready';

UPDATE public.universities
SET profile_readiness_status = 'needs_work'
WHERE slug IN ('teesside-university','university-of-sunderland','northumbria-university');

-- Database-side catalogue search. The extension and indexes keep typo-tolerant
-- matching scalable while the RPC prevents browsers from loading whole catalogues.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.university_search_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(university_id, normalized_alias)
);

INSERT INTO public.university_search_aliases(university_id, alias, normalized_alias)
SELECT u.id, aliases.alias, aliases.normalized
FROM public.universities u
JOIN (VALUES
  ('teesside-university','Teesside','teesside'), ('teesside-university','T-side','teesside'),
  ('teesside-university','T side','teesside'), ('teesside-university','Tees','teesside'),
  ('teesside-university','Teeside','teesside'),
  ('university-of-sunderland','Sunderland University','sunderland'),
  ('university-of-sunderland','Uni of Sunderland','sunderland'),
  ('northumbria-university','Northumbria Uni','northumbria'),
  ('northumbria-university','Northumbia','northumbria')
) AS aliases(slug, alias, normalized) ON aliases.slug = u.slug
ON CONFLICT (university_id, normalized_alias) DO NOTHING;

CREATE INDEX IF NOT EXISTS programs_name_trgm_idx ON public.programs USING gin (lower(name) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS programs_discipline_trgm_idx ON public.programs USING gin (lower(discipline) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS universities_name_trgm_idx ON public.universities USING gin (lower(name) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS university_search_aliases_trgm_idx ON public.university_search_aliases USING gin (normalized_alias extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS program_intakes_recruitable_idx ON public.program_intakes(program_id, intake_year, intake_month, status);

GRANT SELECT ON public.university_search_aliases TO anon, authenticated;
GRANT ALL ON public.university_search_aliases TO service_role;
ALTER TABLE public.university_search_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public reads university aliases" ON public.university_search_aliases;
CREATE POLICY "public reads university aliases" ON public.university_search_aliases FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.normalize_catalogue_search(p_query TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v TEXT := lower(coalesce(p_query, ''));
BEGIN
  v := regexp_replace(v, '[^a-z0-9]+', ' ', 'g');
  v := regexp_replace(v, '\m(u k|uk)\M', 'united kingdom', 'g');
  v := regexp_replace(v, '\m(u s a|u s|usa|us)\M', 'united states', 'g');
  v := regexp_replace(v, '\m(t side|teesside|teeside|tees)\M', 'teesside', 'g');
  v := regexp_replace(v, '\mnorthumbia\M', 'northumbria', 'g');
  v := regexp_replace(v, '\meconomcis\M', 'economics', 'g');
  v := regexp_replace(v, '\mcomputr\M', 'computer', 'g');
  RETURN btrim(regexp_replace(v, '\s+', ' ', 'g'));
END;
$$;

CREATE OR REPLACE FUNCTION public.search_programmes(
  p_query TEXT DEFAULT '', p_country TEXT DEFAULT NULL, p_level TEXT DEFAULT NULL,
  p_intake_year INTEGER DEFAULT NULL, p_intake_month INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 24, p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID, university_id UUID, name TEXT, level TEXT, discipline TEXT, qualification TEXT,
  duration_months INTEGER, tuition_amount NUMERIC, tuition_currency TEXT,
  university_name TEXT, university_slug TEXT, university_city TEXT, university_country TEXT,
  university_logo_url TEXT, rank_score DOUBLE PRECISION, total_count BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
WITH query AS (SELECT public.normalize_catalogue_search(p_query) AS normalized),
tokens AS (SELECT token FROM query, regexp_split_to_table(normalized, '\s+') token WHERE token <> ''),
eligible AS (
  SELECT p.*, u.name AS university_name, u.slug AS university_slug, u.city AS university_city,
    u.country AS university_country, u.logo_url AS university_logo_url,
    public.normalize_catalogue_search(p.name) AS normalized_name,
    public.normalize_catalogue_search(p.discipline) AS normalized_discipline,
    public.normalize_catalogue_search(coalesce(p.qualification,'')) AS normalized_qualification,
    public.normalize_catalogue_search(u.name) AS normalized_university,
    public.normalize_catalogue_search(u.city) AS normalized_city,
    public.normalize_catalogue_search(u.country) AS normalized_country
  FROM public.programs p JOIN public.universities u ON u.id = p.university_id
  WHERE p.active AND p.catalogue_status = 'active' AND u.active
    AND (p_country IS NULL OR p_country = '' OR p_country = 'all' OR public.normalize_catalogue_search(u.country) = public.normalize_catalogue_search(p_country))
    AND (p_level IS NULL OR p_level = '' OR p_level = 'all' OR lower(p.level) = lower(p_level))
    AND (p_intake_year IS NULL OR EXISTS (SELECT 1 FROM public.program_intakes pi WHERE pi.program_id=p.id AND pi.intake_year=p_intake_year AND (p_intake_month IS NULL OR pi.intake_month=p_intake_month) AND pi.status IN ('available','recruitable')))
), ranked AS (
  SELECT e.*,
    CASE WHEN q.normalized = '' THEN 1.0
      WHEN e.normalized_name = q.normalized THEN 100.0
      WHEN e.normalized_name LIKE q.normalized || '%' THEN 90.0
      WHEN e.normalized_university = q.normalized THEN 85.0
      WHEN EXISTS (SELECT 1 FROM public.university_search_aliases a WHERE a.university_id=e.university_id AND a.normalized_alias=q.normalized) THEN 82.0
      ELSE 0.0 END
    + extensions.similarity(e.normalized_name, q.normalized) * 40
    + extensions.similarity(e.normalized_university, q.normalized) * 30
    + extensions.similarity(e.normalized_discipline, q.normalized) * 25 AS score
  FROM eligible e CROSS JOIN query q
  WHERE q.normalized = '' OR NOT EXISTS (
    SELECT 1 FROM tokens t WHERE NOT (
      e.normalized_name % t.token OR e.normalized_name LIKE '%'||t.token||'%'
      OR e.normalized_discipline % t.token OR e.normalized_discipline LIKE '%'||t.token||'%'
      OR e.normalized_qualification LIKE '%'||t.token||'%'
      OR e.normalized_university % t.token OR e.normalized_university LIKE '%'||t.token||'%'
      OR e.normalized_city LIKE '%'||t.token||'%' OR e.normalized_country LIKE '%'||t.token||'%'
      OR EXISTS (SELECT 1 FROM public.university_search_aliases a WHERE a.university_id=e.university_id AND (a.normalized_alias=t.token OR a.normalized_alias % t.token))
    )
  )
)
SELECT r.id, r.university_id, r.name, r.level, r.discipline, r.qualification,
  r.duration_months, r.tuition_amount, r.tuition_currency, r.university_name,
  r.university_slug, r.university_city, r.university_country, r.university_logo_url,
  r.score, count(*) OVER() AS total_count
FROM ranked r ORDER BY r.score DESC, r.name ASC LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0);
$$;
GRANT EXECUTE ON FUNCTION public.search_programmes(TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,INTEGER) TO anon, authenticated;
