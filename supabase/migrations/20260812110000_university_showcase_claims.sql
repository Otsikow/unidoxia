-- University Showcase and Claim System: additive, reversible foundations.

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS listing_status TEXT NOT NULL DEFAULT 'listed',
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS partnership_tier TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'official_public_source',
  ADD COLUMN IF NOT EXISTS last_source_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS fee_year TEXT,
  ADD COLUMN IF NOT EXISTS outreach_status TEXT NOT NULL DEFAULT 'not_contacted';

WITH generated AS (
  SELECT id,
    trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS base_slug,
    row_number() OVER (
      PARTITION BY trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
      ORDER BY created_at NULLS LAST, id
    ) AS duplicate_number
  FROM public.universities
  WHERE slug IS NULL
)
UPDATE public.universities AS university
SET slug = CASE WHEN generated.duplicate_number = 1 THEN generated.base_slug
  ELSE generated.base_slug || '-' || generated.duplicate_number::text END
FROM generated WHERE university.id = generated.id;

ALTER TABLE public.universities
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS universities_slug_unique
  ON public.universities(slug);

CREATE OR REPLACE FUNCTION public.set_university_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := trim(both '-' from regexp_replace(lower(NEW.name), '[^a-z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_university_slug_before_write ON public.universities;
CREATE TRIGGER set_university_slug_before_write BEFORE INSERT OR UPDATE OF name, slug ON public.universities
FOR EACH ROW EXECUTE FUNCTION public.set_university_slug();

ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_listing_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_listing_status_check
  CHECK (listing_status IN ('listed', 'claimed', 'suspended', 'archived'));
ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_verification_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_verification_status_check
  CHECK (verification_status IN ('unverified', 'email_verified', 'admin_verified', 'rejected', 'suspended'));
ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_partnership_tier_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_partnership_tier_check
  CHECK (partnership_tier IN ('none', 'discussion', 'partner', 'paused', 'terminated'));
ALTER TABLE public.universities DROP CONSTRAINT IF EXISTS universities_outreach_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_outreach_status_check
  CHECK (outreach_status IN ('not_contacted','profile_ready','outreach_sent','follow_up_required','responded','profile_claimed','partnership_discussion','partner','not_interested','revisit_later'));

CREATE TABLE IF NOT EXISTS public.university_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  claimant_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  institutional_email TEXT NOT NULL,
  phone TEXT,
  verification_token_hash TEXT,
  verification_expires_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'awaiting_email_verification',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT university_claims_status_check CHECK (status IN ('awaiting_email_verification','awaiting_admin_review','approved','rejected','more_information_required','withdrawn','suspended'))
);

CREATE UNIQUE INDEX IF NOT EXISTS university_claims_one_open_per_email
  ON public.university_claims(university_id, lower(institutional_email))
  WHERE status IN ('awaiting_email_verification','awaiting_admin_review','more_information_required','approved');
CREATE INDEX IF NOT EXISTS university_claims_status_created_idx
  ON public.university_claims(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.university_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, profile_id),
  CONSTRAINT university_memberships_role_check CHECK (role IN ('owner','administrator','admissions','editor','viewer'))
);

ALTER TABLE public.university_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claimants read own university claims" ON public.university_claims;
CREATE POLICY "claimants read own university claims" ON public.university_claims
  FOR SELECT TO authenticated
  USING (claimant_user_id = auth.uid() OR public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "admins manage university claims" ON public.university_claims;
CREATE POLICY "admins manage university claims" ON public.university_claims
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "members read own memberships" ON public.university_memberships;
CREATE POLICY "members read own memberships" ON public.university_memberships
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "admins manage university memberships" ON public.university_memberships;
CREATE POLICY "admins manage university memberships" ON public.university_memberships
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.review_university_claim(
  p_claim_id UUID,
  p_decision TEXT,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_claim public.university_claims%ROWTYPE;
  v_profile_id UUID;
BEGIN
  IF NOT public.is_admin_or_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_decision NOT IN ('approved','rejected','more_information_required','suspended') THEN
    RAISE EXCEPTION 'Invalid claim decision';
  END IF;
  SELECT * INTO v_claim FROM public.university_claims WHERE id = p_claim_id FOR UPDATE;
  IF v_claim.id IS NULL OR v_claim.status <> 'awaiting_admin_review' THEN
    RAISE EXCEPTION 'Claim is not ready for review';
  END IF;
  IF p_decision = 'approved' AND v_claim.email_verified_at IS NULL THEN
    RAISE EXCEPTION 'Institutional email must be verified first';
  END IF;

  UPDATE public.university_claims
  SET status = p_decision, admin_notes = p_admin_notes, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_claim_id;

  IF p_decision = 'approved' THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE lower(email) = lower(v_claim.institutional_email) LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      INSERT INTO public.university_memberships(university_id, profile_id, role)
      VALUES (v_claim.university_id, v_profile_id, 'owner')
      ON CONFLICT (university_id, profile_id) DO UPDATE SET role = 'owner', active = true, updated_at = now();
      UPDATE public.university_claims SET claimant_user_id = v_profile_id WHERE id = p_claim_id;
    END IF;
    UPDATE public.universities
    SET listing_status = 'claimed', verification_status = 'admin_verified', claimed_at = now(), outreach_status = 'profile_claimed', updated_at = now()
    WHERE id = v_claim.university_id;
  END IF;
  RETURN v_claim.university_id;
END;
$$;
REVOKE ALL ON FUNCTION public.review_university_claim(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_university_claim(UUID, TEXT, TEXT) TO authenticated;

-- Three initial source-conscious listings. Upserts preserve existing tenant records.
INSERT INTO public.tenants(id, name, slug, email_from)
VALUES
 ('10000000-0000-4000-8000-000000000001','Teesside University','teesside-university','info@unidoxia.com'),
 ('10000000-0000-4000-8000-000000000002','University of Sunderland','university-of-sunderland','info@unidoxia.com'),
 ('10000000-0000-4000-8000-000000000003','Northumbria University','northumbria-university','info@unidoxia.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.universities(id, tenant_id, name, slug, city, country, website, description, active, listing_status, verification_status, partnership_tier, source_url, source_type, last_source_checked_at, academic_year, outreach_status, submission_config_json)
VALUES
 ('20000000-0000-4000-8000-000000000001',(SELECT id FROM public.tenants WHERE slug='teesside-university'),'Teesside University','teesside-university','Middlesbrough','United Kingdom','https://www.tees.ac.uk/','Teesside University is based in Middlesbrough in North East England and provides undergraduate and postgraduate study options for UK and international students.',true,'listed','unverified','none','https://www.tees.ac.uk/sections/international/','official_public_source',now(),'2026/27','profile_ready','{"tagline":"Study in the heart of the Tees Valley","highlights":["Middlesbrough campus","Undergraduate and postgraduate study"],"internationalStudents":"International applicants should confirm current country-specific entry and English-language requirements on the official university website.","tuition":"Fees vary by course and academic year. Check the official course page before applying.","scholarships":"Scholarship availability and eligibility vary by intake.","entryRequirements":"Entry requirements are course and country specific.","englishRequirements":"English-language requirements vary by course.","accommodation":"University and private accommodation options are available; confirm current availability and costs directly.","studyLevels":["Undergraduate","Postgraduate"],"sources":[{"url":"https://www.tees.ac.uk/sections/international/","label":"Official international students information","checkedAt":"2026-08-12"}],"contacts":{},"social":{"website":"https://www.tees.ac.uk/"},"media":{}}'::jsonb),
 ('20000000-0000-4000-8000-000000000002',(SELECT id FROM public.tenants WHERE slug='university-of-sunderland'),'University of Sunderland','university-of-sunderland','Sunderland','United Kingdom','https://www.sunderland.ac.uk/','The University of Sunderland provides undergraduate and postgraduate courses from its campuses in Sunderland, with information and support for international applicants.',true,'listed','unverified','none','https://www.sunderland.ac.uk/study/international/','official_public_source',now(),'2026/27','profile_ready','{"tagline":"International study in Sunderland","highlights":["Sunderland campuses","Undergraduate and postgraduate study"],"internationalStudents":"International applicants should use the official university guidance for country-specific entry and visa information.","tuition":"Fees vary by programme and academic year. Confirm the current fee on the official course page.","scholarships":"Awards have separate eligibility rules and deadlines.","entryRequirements":"Academic requirements vary by programme and applicant country.","englishRequirements":"English-language requirements vary by programme.","accommodation":"Confirm current university accommodation availability and pricing directly.","studyLevels":["Undergraduate","Postgraduate"],"sources":[{"url":"https://www.sunderland.ac.uk/study/international/","label":"Official international students information","checkedAt":"2026-08-12"}],"contacts":{},"social":{"website":"https://www.sunderland.ac.uk/"},"media":{}}'::jsonb),
 ('20000000-0000-4000-8000-000000000003',(SELECT id FROM public.tenants WHERE slug='northumbria-university'),'Northumbria University','northumbria-university','Newcastle upon Tyne','United Kingdom','https://www.northumbria.ac.uk/','Northumbria University is based in Newcastle upon Tyne and offers undergraduate and postgraduate programmes alongside dedicated information for international students.',true,'listed','unverified','none','https://www.northumbria.ac.uk/international/','official_public_source',now(),'2026/27','profile_ready','{"tagline":"Study in Newcastle upon Tyne","highlights":["Newcastle city campus","Undergraduate and postgraduate study"],"internationalStudents":"International applicants should confirm country-specific requirements and application guidance on the official website.","tuition":"Fees vary by course and academic year. Confirm the latest published fee before applying.","scholarships":"Scholarships and discounts have specific eligibility rules.","entryRequirements":"Academic entry requirements are programme and country specific.","englishRequirements":"English-language requirements vary by course.","accommodation":"University accommodation is subject to availability and published terms.","studyLevels":["Undergraduate","Postgraduate"],"sources":[{"url":"https://www.northumbria.ac.uk/international/","label":"Official international students information","checkedAt":"2026-08-12"}],"contacts":{},"social":{"website":"https://www.northumbria.ac.uk/"},"media":{}}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
 city=EXCLUDED.city, country=EXCLUDED.country, website=EXCLUDED.website, description=EXCLUDED.description,
 source_url=EXCLUDED.source_url, source_type=EXCLUDED.source_type, last_source_checked_at=EXCLUDED.last_source_checked_at,
 academic_year=EXCLUDED.academic_year, submission_config_json=EXCLUDED.submission_config_json, updated_at=now();

-- A small verified-name catalogue. Zero tuition means "check official fee", never a free-course claim.
INSERT INTO public.programs(id, tenant_id, university_id, name, level, discipline, duration_months, tuition_amount, tuition_currency, description, active, requirements_json)
VALUES
 ('30000000-0000-4000-8000-000000000001',(SELECT id FROM public.tenants WHERE slug='teesside-university'),'20000000-0000-4000-8000-000000000001','MSc Computer Science','Postgraduate','Computer Science',12,0,'GBP','Confirm current modules, duration, fees and entry requirements with Teesside University.',true,'{"sourceUrl":"https://www.tees.ac.uk/sections/coursesearch/","sourceType":"official_public_source","lastCheckedAt":"2026-08-12","dataStatus":"needs_fee_review"}'::jsonb),
 ('30000000-0000-4000-8000-000000000002',(SELECT id FROM public.tenants WHERE slug='teesside-university'),'20000000-0000-4000-8000-000000000001','MSc International Management','Postgraduate','Business and Management',12,0,'GBP','Confirm current modules, duration, fees and entry requirements with Teesside University.',true,'{"sourceUrl":"https://www.tees.ac.uk/sections/coursesearch/","sourceType":"official_public_source","lastCheckedAt":"2026-08-12","dataStatus":"needs_fee_review"}'::jsonb),
 ('30000000-0000-4000-8000-000000000003',(SELECT id FROM public.tenants WHERE slug='university-of-sunderland'),'20000000-0000-4000-8000-000000000002','MSc International Business Management','Postgraduate','Business and Management',12,0,'GBP','Confirm current modules, duration, fees and entry requirements with the University of Sunderland.',true,'{"sourceUrl":"https://www.sunderland.ac.uk/postgraduate/msc-international-business-management","sourceType":"official_public_source","lastCheckedAt":"2026-08-12","dataStatus":"needs_fee_review"}'::jsonb),
 ('30000000-0000-4000-8000-000000000004',(SELECT id FROM public.tenants WHERE slug='university-of-sunderland'),'20000000-0000-4000-8000-000000000002','BSc (Hons) Computer Science','Undergraduate','Computer Science',36,0,'GBP','Confirm current modules, duration, fees and entry requirements with the University of Sunderland.',true,'{"sourceUrl":"https://www.sunderland.ac.uk/undergraduate/bsc-hons-computer-science","sourceType":"official_public_source","lastCheckedAt":"2026-08-12","dataStatus":"needs_fee_review"}'::jsonb),
 ('30000000-0000-4000-8000-000000000005',(SELECT id FROM public.tenants WHERE slug='northumbria-university'),'20000000-0000-4000-8000-000000000003','MSc Computer Science','Postgraduate','Computer Science',12,0,'GBP','Confirm current modules, duration, fees and entry requirements with Northumbria University.',true,'{"sourceUrl":"https://www.northumbria.ac.uk/study-at-northumbria/courses/msc-computer-science-dtfcsd6/","sourceType":"official_public_source","lastCheckedAt":"2026-08-12","dataStatus":"needs_fee_review"}'::jsonb),
 ('30000000-0000-4000-8000-000000000006',(SELECT id FROM public.tenants WHERE slug='northumbria-university'),'20000000-0000-4000-8000-000000000003','International Business Management MSc','Postgraduate','Business and Management',12,0,'GBP','Confirm current modules, duration, fees and entry requirements with Northumbria University.',true,'{"sourceUrl":"https://www.northumbria.ac.uk/study-at-northumbria/courses/international-business-management-dtfinb6/","sourceType":"official_public_source","lastCheckedAt":"2026-08-12","dataStatus":"needs_fee_review"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, requirements_json=EXCLUDED.requirements_json, updated_at=now();
