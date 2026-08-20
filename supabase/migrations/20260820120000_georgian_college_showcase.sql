-- Complimentary official-public-source listing for Georgian College.
-- This is deliberately listed/unclaimed and does not establish a partnership.

INSERT INTO public.tenants (id, name, slug, email_from)
VALUES ('10000000-0000-4000-8000-000000000006', 'Georgian College', 'georgian-college', 'info@unidoxia.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.universities (
  id, tenant_id, name, slug, city, country, website, description, active,
  listing_status, verification_status, partnership_tier, source_url, source_type,
  last_source_checked_at, academic_year, fee_year, outreach_status,
  catalogue_status, catalogue_discovered_count, catalogue_processed_count,
  catalogue_verified_count, catalogue_unresolved_count, profile_readiness_status,
  submission_config_json
)
VALUES (
  '20000000-0000-4000-8000-000000000006',
  (SELECT id FROM public.tenants WHERE slug = 'georgian-college'),
  'Georgian College', 'georgian-college', 'Barrie', 'Canada',
  'https://www.georgiancollege.ca/',
  'Georgian College is a publicly funded Ontario college founded in 1967. Its official international information highlights career-focused education, work-integrated learning, student support and study options across certificates, diplomas, graduate certificates and degrees.',
  true, 'listed', 'unverified', 'discussion',
  'https://www.georgiancollege.ca/international/',
  'official_public_source', '2026-08-20T00:00:00Z', '2026/27', '2026/27', 'not_contacted',
  'needs_full_catalogue', 0, 0, 0, 0, 'needs_work',
  jsonb_build_object(
    'tagline', 'Career-focused study and work-integrated learning in Ontario',
    'highlights', jsonb_build_array(
      'Publicly funded Ontario college established in 1967',
      'Designated Learning Institution O19395677361',
      'Official 2026/27 catalogue publishes more than 130 full-time programmes',
      'The College reports 6,200 employer partners supporting student work experiences'
    ),
    'internationalStudents', 'Georgian College welcomes international learners to programmes at its Ontario campuses. Its official international page reports a community representing 86 countries and more than 52 languages. Programme availability, campus, delivery method, intake and study-permit implications must be checked for the applicant''s chosen programme before applying.',
    'tuition', 'For international students, Georgian College currently publishes approximate annual tuition and fees of CAD 17,170 to 18,170 for certificates, CAD 16,990 to 29,200 for diplomas, CAD 17,900 to 19,280 for graduate certificates, and CAD 20,360 to 20,450 for degrees. The international application fee is CAD 100. These are indicative ranges, may include ancillary charges, and do not replace the current programme-specific fee schedule.',
    'scholarships', 'The official 2026 International Entrance Scholarship publishes CAD 3,000 for eligible two- or three-year diploma and advanced diploma programmes, CAD 4,000 for eligible degree or two-year graduate certificate programmes, and CAD 250 for eligible one-year graduate certificate programmes. Awards are limited to selected programmes and require an offer of admission, international tuition status, fulfilment of admission and English conditions, full tuition payment and registration by the published deadline. Eligibility does not guarantee an award.',
    'entryRequirements', 'Requirements are programme-specific. Diploma and degree applicants generally provide secondary-school transcripts showing graduation, subjects and grades; Grade 12 English and mathematics are required for the relevant programmes. Graduate-certificate applicants generally provide college or university transcripts with proof of graduation, subjects and grades. Competitive programmes and individual courses may require higher grades, portfolios, prerequisite subjects or additional evidence.',
    'englishRequirements', 'Current general minimums vary by credential: diploma and certificate programmes publish IELTS Academic 6.0, TOEFL iBT 79, Duolingo 110, PTE 58 or CAEL 60; degree and graduate-certificate programmes generally publish IELTS Academic 6.5, TOEFL iBT 89 with specified writing and speaking bands, Duolingo 120 or 130 respectively, PTE 61 or CAEL 60 with specified bands. Nursing, Pharmacy Technician and other programmes publish different or higher requirements. Test results must be current, and applicants should use the official admissions table for their programme.',
    'accommodation', 'Barrie Campus has on-campus residence. The official Fall 2026/Winter 2027 residence page publishes a CAD 8,250 single-payment option, with instalment options totalling more. Residence availability, deposits, meal arrangements, cancellation terms and other campus housing options must be confirmed directly before committing funds.',
    'studyLevels', jsonb_build_array('Certificate', 'Diploma', 'Advanced Diploma', 'Graduate Certificate', 'Undergraduate Degree'),
    'applicationRouting', 'guidance_only',
    'locations', jsonb_build_array(
      jsonb_build_object('city','Barrie','campus','Barrie Campus','province','Ontario','type','public'),
      jsonb_build_object('city','Midland','campus','Midland Campus','province','Ontario','type','public'),
      jsonb_build_object('city','Orangeville','campus','Orangeville Campus','province','Ontario','type','public'),
      jsonb_build_object('city','Owen Sound','campus','Owen Sound Campus','province','Ontario','type','public'),
      jsonb_build_object('city','South Georgian Bay','campus','South Georgian Bay Campus','province','Ontario','type','public')
    ),
    'sources', jsonb_build_array(
      jsonb_build_object('url','https://www.georgiancollege.ca/international/','label','Official international student overview','checkedAt','2026-08-20'),
      jsonb_build_object('url','https://cat.georgiancollege.ca/programs/','label','Official 2026/27 academic programme catalogue','checkedAt','2026-08-20'),
      jsonb_build_object('url','https://www.georgiancollege.ca/international/admissions/','label','Official international admission and English-language requirements','checkedAt','2026-08-20'),
      jsonb_build_object('url','https://www.georgiancollege.ca/international/finance-and-fees/','label','Official international tuition, application fee and 2026 scholarship information','checkedAt','2026-08-20'),
      jsonb_build_object('url','https://www.georgiancollege.ca/international/student-permit-policy-update/','label','Official programme-level PGWP guidance, updated March 2026','checkedAt','2026-08-20'),
      jsonb_build_object('url','https://www.georgiancollege.ca/student-life/campus-services/residence-housing/on-campus-residence/barrie-residence/','label','Official 2026/27 Barrie residence information','checkedAt','2026-08-20'),
      jsonb_build_object('url','https://cat.georgiancollege.ca/academic-regulations/overview/','label','Official DLI reference','checkedAt','2026-08-20')
    ),
    'contacts', '{}'::jsonb,
    'social', jsonb_build_object('website','https://www.georgiancollege.ca/'),
    'media', '{}'::jsonb
  )
)
ON CONFLICT (slug) DO UPDATE SET
  city = EXCLUDED.city, country = EXCLUDED.country, website = EXCLUDED.website,
  description = EXCLUDED.description, active = EXCLUDED.active,
  source_url = EXCLUDED.source_url, source_type = EXCLUDED.source_type,
  last_source_checked_at = EXCLUDED.last_source_checked_at,
  academic_year = EXCLUDED.academic_year, fee_year = EXCLUDED.fee_year,
  catalogue_status = EXCLUDED.catalogue_status,
  catalogue_discovered_count = EXCLUDED.catalogue_discovered_count,
  catalogue_processed_count = EXCLUDED.catalogue_processed_count,
  catalogue_verified_count = EXCLUDED.catalogue_verified_count,
  catalogue_unresolved_count = EXCLUDED.catalogue_unresolved_count,
  profile_readiness_status = EXCLUDED.profile_readiness_status,
  submission_config_json = EXCLUDED.submission_config_json,
  updated_at = now();

-- Do not overwrite claim, verification, partnership or outreach status on rerun.

INSERT INTO public.scholarships (
  tenant_id, university_id, name, title, slug, description, amount_cents, currency,
  coverage_type, eligibility_criteria, renewable, active, academic_year, country,
  institution_name, scholarship_value, english_requirements, admission_required_first,
  separate_application_required, official_source_url, canonical_url, summary,
  important_conditions, status, verification_status, last_verified_at, published_at
)
SELECT
  u.tenant_id, u.id, 'Georgian College International Entrance Scholarship 2026',
  'Georgian College International Entrance Scholarship 2026',
  'georgian-college-international-entrance-scholarship-2026',
  'Programme-dependent entrance funding for eligible newly admitted international students.',
  NULL, 'CAD', 'partial',
  jsonb_build_object(
    'amounts', jsonb_build_array(
      jsonb_build_object('programmeType','Eligible two- or three-year diploma or advanced diploma','amount','CAD 3,000'),
      jsonb_build_object('programmeType','Eligible degree or two-year graduate certificate','amount','CAD 4,000'),
      jsonb_build_object('programmeType','Eligible one-year graduate certificate','amount','CAD 250')
    ),
    'programmeEligibilityRequired', true
  ),
  false, true, '2026/27', 'Canada', 'Georgian College', 'CAD 250 to CAD 4,000, depending on the eligible programme',
  'Applicants must meet the admission and English-language requirements for the selected programme.',
  true, false,
  'https://www.georgiancollege.ca/international/finance-and-fees/',
  'https://www.georgiancollege.ca/international/finance-and-fees/',
  'The award value depends on the selected eligible programme and is credited after the published registration checkpoint.',
  'Not all programmes are eligible. An offer of admission and satisfaction of the published payment, registration and programme conditions are required; eligibility does not guarantee an award.',
  'Published', 'Fully Verified', '2026-08-20T00:00:00Z', now()
FROM public.universities u
WHERE u.slug = 'georgian-college'
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, title = EXCLUDED.title, description = EXCLUDED.description,
  amount_cents = EXCLUDED.amount_cents, scholarship_value = EXCLUDED.scholarship_value,
  eligibility_criteria = EXCLUDED.eligibility_criteria,
  official_source_url = EXCLUDED.official_source_url,
  important_conditions = EXCLUDED.important_conditions,
  verification_status = EXCLUDED.verification_status,
  last_verified_at = EXCLUDED.last_verified_at, active = true, updated_at = now();

COMMENT ON COLUMN public.universities.submission_config_json IS
  'Public profile presentation and routing configuration. Private processing-provider metadata must never be stored here.';
