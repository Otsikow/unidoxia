
-- 1. Extend scholarships with editorial fields
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS institution_logo TEXT,
  ADD COLUMN IF NOT EXISTS featured_image TEXT,
  ADD COLUMN IF NOT EXISTS study_level TEXT,
  ADD COLUMN IF NOT EXISTS subject_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS funding_type TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_value TEXT,
  ADD COLUMN IF NOT EXISTS tuition_coverage BOOLEAN,
  ADD COLUMN IF NOT EXISTS living_allowance BOOLEAN,
  ADD COLUMN IF NOT EXISTS travel_allowance BOOLEAN,
  ADD COLUMN IF NOT EXISTS visa_support BOOLEAN,
  ADD COLUMN IF NOT EXISTS insurance_support BOOLEAN,
  ADD COLUMN IF NOT EXISTS books_or_research_support BOOLEAN,
  ADD COLUMN IF NOT EXISTS eligible_nationalities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS african_students_eligible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS academic_requirements TEXT,
  ADD COLUMN IF NOT EXISTS english_requirements TEXT,
  ADD COLUMN IF NOT EXISTS work_experience_requirements TEXT,
  ADD COLUMN IF NOT EXISTS age_requirements TEXT,
  ADD COLUMN IF NOT EXISTS number_of_awards INTEGER,
  ADD COLUMN IF NOT EXISTS opening_date DATE,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS study_start_date DATE,
  ADD COLUMN IF NOT EXISTS admission_required_first BOOLEAN,
  ADD COLUMN IF NOT EXISTS separate_application_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS application_steps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS official_source_url TEXT,
  ADD COLUMN IF NOT EXISTS official_application_url TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS full_description TEXT,
  ADD COLUMN IF NOT EXISTS important_conditions TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'Unverified',
  ADD COLUMN IF NOT EXISTS verification_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Backfill title from name for legacy rows
UPDATE public.scholarships SET title = name WHERE title IS NULL;

-- Allow globally-published (tenant-less) editorial scholarships
ALTER TABLE public.scholarships ALTER COLUMN tenant_id DROP NOT NULL;

-- Constraints on status vocabularies
ALTER TABLE public.scholarships DROP CONSTRAINT IF EXISTS scholarships_status_check;
ALTER TABLE public.scholarships ADD CONSTRAINT scholarships_status_check
  CHECK (status IN ('Researching','Draft','Verified','Awaiting Approval','Published','Closing Soon','Upcoming','Closed','Archived'));

ALTER TABLE public.scholarships DROP CONSTRAINT IF EXISTS scholarships_verification_status_check;
ALTER TABLE public.scholarships ADD CONSTRAINT scholarships_verification_status_check
  CHECK (verification_status IN ('Unverified','Partially Verified','Fully Verified','Needs Rechecking'));

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_scholarships_slug ON public.scholarships(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scholarships_status ON public.scholarships(status);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON public.scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_country ON public.scholarships(country);
CREATE INDEX IF NOT EXISTS idx_scholarships_last_verified_at ON public.scholarships(last_verified_at);

-- Public read access for anyone (including anonymous) to live statuses
DROP POLICY IF EXISTS "Public can view live scholarships" ON public.scholarships;
CREATE POLICY "Public can view live scholarships"
  ON public.scholarships FOR SELECT
  USING (status IN ('Published','Closing Soon','Upcoming'));

GRANT SELECT ON public.scholarships TO anon;

-- Deadline-driven auto status trigger
CREATE OR REPLACE FUNCTION public.scholarships_apply_deadline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deadline IS NOT NULL AND NEW.status IN ('Published','Closing Soon','Upcoming') THEN
    IF NEW.deadline < CURRENT_DATE THEN
      NEW.status := 'Closed';
    ELSIF NEW.status = 'Published' AND NEW.deadline <= (CURRENT_DATE + INTERVAL '30 days')::date THEN
      NEW.status := 'Closing Soon';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scholarships_deadline_status ON public.scholarships;
CREATE TRIGGER trg_scholarships_deadline_status
  BEFORE INSERT OR UPDATE ON public.scholarships
  FOR EACH ROW EXECUTE FUNCTION public.scholarships_apply_deadline_status();

-- Duplicate detection RPC
CREATE OR REPLACE FUNCTION public.find_scholarship_duplicates(
  p_title TEXT,
  p_institution TEXT,
  p_sponsor TEXT,
  p_source_url TEXT,
  p_application_url TEXT,
  p_academic_year TEXT,
  p_exclude_id UUID DEFAULT NULL
) RETURNS TABLE(id UUID, title TEXT, institution_name TEXT, academic_year TEXT, status TEXT, match_reason TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.institution_name, s.academic_year, s.status,
    CASE
      WHEN p_source_url IS NOT NULL AND lower(coalesce(s.official_source_url,'')) = lower(p_source_url) THEN 'Same official source URL'
      WHEN p_application_url IS NOT NULL AND lower(coalesce(s.official_application_url,'')) = lower(p_application_url) THEN 'Same official application URL'
      WHEN lower(coalesce(s.title,'')) = lower(coalesce(p_title,'')) AND lower(coalesce(s.institution_name,'')) = lower(coalesce(p_institution,'')) THEN 'Same title and institution'
      ELSE 'Similar entry'
    END AS match_reason
  FROM public.scholarships s
  WHERE (p_exclude_id IS NULL OR s.id <> p_exclude_id)
    AND (
      (p_source_url IS NOT NULL AND lower(coalesce(s.official_source_url,'')) = lower(p_source_url))
      OR (p_application_url IS NOT NULL AND lower(coalesce(s.official_application_url,'')) = lower(p_application_url))
      OR (
        lower(coalesce(s.title,'')) = lower(coalesce(p_title,''))
        AND lower(coalesce(s.institution_name,'')) = lower(coalesce(p_institution,''))
        AND lower(coalesce(s.academic_year,'')) = lower(coalesce(p_academic_year,''))
      )
    )
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.find_scholarship_duplicates(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID) TO authenticated;

-- Nightly-style helper an admin can invoke to close expired records
CREATE OR REPLACE FUNCTION public.scholarships_apply_expiry_sweep()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin_or_staff(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.scholarships
  SET status = 'Closed', updated_at = now()
  WHERE status IN ('Published','Closing Soon','Upcoming')
    AND deadline IS NOT NULL
    AND deadline < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.scholarships
  SET status = 'Closing Soon', updated_at = now()
  WHERE status = 'Published'
    AND deadline IS NOT NULL
    AND deadline >= CURRENT_DATE
    AND deadline <= (CURRENT_DATE + INTERVAL '30 days')::date;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scholarships_apply_expiry_sweep() TO authenticated;
