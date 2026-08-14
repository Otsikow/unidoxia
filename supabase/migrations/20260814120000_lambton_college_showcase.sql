-- Complimentary official-public-source listing for Lambton College.
-- This is deliberately listed/unclaimed and does not establish a partnership.

ALTER TABLE public.program_intakes DROP CONSTRAINT IF EXISTS program_intakes_status_check;
ALTER TABLE public.program_intakes ADD CONSTRAINT program_intakes_status_check
  CHECK (status IN ('available','recruitable','waitlisting','closed','unavailable','historical','provisional','unknown'));

INSERT INTO public.tenants (id, name, slug, email_from)
VALUES ('10000000-0000-4000-8000-000000000005', 'Lambton College', 'lambton-college', 'info@unidoxia.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.universities (
  id, tenant_id, name, slug, city, country, website, description, active,
  listing_status, verification_status, partnership_tier, source_url, source_type,
  last_source_checked_at, academic_year, fee_year, outreach_status,
  submission_config_json
)
VALUES (
  '20000000-0000-4000-8000-000000000005',
  (SELECT id FROM public.tenants WHERE slug = 'lambton-college'),
  'Lambton College', 'lambton-college', 'Sarnia', 'Canada',
  'https://www.lambtoncollege.ca/',
  'Lambton College of Applied Arts and Technology is a public Ontario college based in Sarnia. This listing covers current international programme information published for the public Sarnia Main Campus and Ottawa Saint Paul University Campus.',
  true, 'listed', 'unverified', 'discussion',
  'https://www.lambtoncollege.ca/programs/international',
  'official_public_source', '2026-08-14T00:00:00Z', '2026/27', '2026/27', 'responded',
  jsonb_build_object(
    'tagline', 'Career-focused international study in Sarnia and Ottawa, Ontario',
    'highlights', jsonb_build_array(
      'Public Sarnia Main Campus and Ottawa Saint Paul University Campus',
      'Designated Learning Institution O19305293332',
      'Programme-level Fall 2026, Winter 2027 and Spring 2027 availability'
    ),
    'internationalStudents', 'The current official international catalogue publishes programme options for Sarnia and Ottawa. Admissions are competitive and programme availability can change by intake. Historic private-partnership delivery locations are not included in this active catalogue.',
    'tuition', 'International programme pages publish estimated term-by-term costs and, where available, a total programme cost in Canadian dollars. UniDoxia preserves published term structure and keeps unpublished totals unresolved rather than showing zero or free tuition.',
    'scholarships', 'For 2026/27, Lambton College publishes selected international entrance scholarships for qualifying Sarnia or Ottawa programmes, plus an academic scholarship for Software Engineering Technician - Artificial Intelligence. Values and conditions vary; meeting the stated criteria does not guarantee selection.',
    'entryRequirements', 'Academic admission requirements are programme-specific and competitive. Applicants must confirm the current requirements on each official programme page.',
    'englishRequirements', 'Diploma and certificate programmes currently publish IELTS Academic 6.0 with no band below 6.0, PTE Academic 60 with no band below 60, TOEFL iBT 78 with no band below 18, CAEL 60 with no band below 50, CELPIP 7, ELLT 6, or Lambton Institute of English 70. Graduate certificates currently publish IELTS Academic 6.5 with no band below 6.0, TOEFL iBT 88 with no band below 18, CAEL 70 with no band below 60, CELPIP 8, ELLT 7, PTE Academic 60 with no band below 60, or Lambton Institute of English 70. Applicants from certain countries may qualify for an exemption, subject to Lambton College assessment; the College may still request proof.',
    'accommodation', 'Sarnia students can consider on-campus residence, shared housing, homestay and private rentals. Official 2026/27 residence fees vary by occupancy and term; availability, inclusions, instalments and current charges must be confirmed directly.',
    'studyLevels', jsonb_build_array('Certificate', 'Diploma', 'Graduate Certificate'),
    'applicationRouting', 'guidance_only',
    'locations', jsonb_build_array(
      jsonb_build_object('city','Sarnia','campus','Main Campus','dli','O19305293332','type','public'),
      jsonb_build_object('city','Ottawa','campus','Saint Paul University Campus','dli','O19305293332','type','public')
    ),
    'englishExemptionCountries', jsonb_build_array('Botswana','Cameroon','Gambia','Ghana','Kenya','Liberia','Namibia','Nigeria','Sierra Leone','South Africa','Tanzania','Uganda','Zambia','Zimbabwe'),
    'sources', jsonb_build_array(
      jsonb_build_object('url','https://www.lambtoncollege.ca/programs/international','label','Official international programmes, intakes and PGWP/CIP information','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://www.lambtoncollege.ca/international/international-education/language-requirements-esl','label','Official English-language requirements and possible country exemptions','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://www.lambtoncollege.ca/international/international-education/scholarships','label','Official 2026/27 international scholarships','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://www.lambtoncollege.ca/international/sarnia/important-dates','label','Official 2026/27 international academic dates','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://www.lambtoncollege.ca/international/sarnia/housing','label','Official international housing guidance','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://www.lambtoncollege.ca/future-students/residence/fees','label','Official 2026/27 residence fees','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html','label','IRCC designated learning institution locations','checkedAt','2026-08-14')
    ),
    'contacts', '{}'::jsonb,
    'social', jsonb_build_object('website','https://www.lambtoncollege.ca/'),
    'media', '{}'::jsonb
  )
)
ON CONFLICT (slug) DO UPDATE SET
  city = EXCLUDED.city, country = EXCLUDED.country, website = EXCLUDED.website,
  description = EXCLUDED.description, active = EXCLUDED.active,
  source_url = EXCLUDED.source_url, source_type = EXCLUDED.source_type,
  last_source_checked_at = EXCLUDED.last_source_checked_at,
  academic_year = EXCLUDED.academic_year, fee_year = EXCLUDED.fee_year,
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
  u.tenant_id, u.id, award.name, award.name, award.slug, award.description,
  award.amount_cents, 'CAD', 'partial', award.eligibility, false, true, '2026/27',
  'Canada', 'Lambton College', award.scholarship_value,
  'The current published English-score condition depends on credential level and the accepted test submitted.',
  true, false, 'https://www.lambtoncollege.ca/international/international-education/scholarships',
  'https://www.lambtoncollege.ca/international/international-education/scholarships',
  award.description,
  'Selection is discretionary and is not guaranteed by meeting the published criteria. The award is applied to tuition under Lambton College conditions.',
  'Published', 'Fully Verified', '2026-08-14T00:00:00Z', now()
FROM public.universities u
CROSS JOIN (VALUES
  ('Agribusiness Management International Entrance Scholarship','lambton-agbs-entrance-2026-27','For qualifying Agribusiness Management applicants.',400000,'CAD 4,000',jsonb_build_object('programmeCode','AGBS','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Artificial Intelligence & Machine Learning International Entrance Scholarship','lambton-aims-entrance-2026-27','For qualifying Artificial Intelligence & Machine Learning applicants.',380000,'CAD 3,800',jsonb_build_object('programmeCode','AIMS','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Business Analytics International Entrance Scholarship','lambton-bans-entrance-2026-27','For qualifying Business Analytics applicants.',400000,'CAD 4,000',jsonb_build_object('programmeCode','BANS','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Business - Sustainable Agriculture International Entrance Scholarship','lambton-bsas-entrance-2026-27','For qualifying Business - Sustainable Agriculture applicants.',100000,'CAD 1,000',jsonb_build_object('programmeCode','BSAS','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Computer Programmer International Entrance Scholarship','lambton-cpro-entrance-2026-27','For qualifying Computer Programmer applicants.',100000,'CAD 1,000',jsonb_build_object('programmeCode','CPRO','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Environmental Technician - Water Treatment Operations International Entrance Scholarship','lambton-ewso-entrance-2026-27','For qualifying Environmental Technician - Water Treatment Operations applicants.',300000,'CAD 3,000',jsonb_build_object('programmeCode','EWSO','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Heating, Refrigeration & Air Conditioning Technician International Entrance Scholarship','lambton-hvac-entrance-2026-27','For qualifying Heating, Refrigeration & Air Conditioning Technician applicants.',100000,'CAD 1,000',jsonb_build_object('programmeCode','HVAC','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Millwright Mechanical Technician International Entrance Scholarship','lambton-mtim-entrance-2026-27','For qualifying Millwright Mechanical Technician applicants.',100000,'CAD 1,000',jsonb_build_object('programmeCode','MTIM','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Occupational Health & Safety Management International Entrance Scholarship','lambton-ohss-entrance-2026-27','For qualifying Occupational Health & Safety Management applicants.',400000,'CAD 4,000',jsonb_build_object('programmeCode','OHSS','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Electrical Engineering Technician - Power Distribution & Control International Entrance Scholarship','lambton-pdct-entrance-2026-27','For qualifying Electrical Engineering Technician - Power Distribution & Control applicants.',100000,'CAD 1,000',jsonb_build_object('programmeCode','PDCT','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Supply Chain Management International Entrance Scholarship','lambton-scms-entrance-2026-27','For qualifying Supply Chain Management applicants.',400000,'CAD 4,000',jsonb_build_object('programmeCode','SCMS','intakes',jsonb_build_array('Fall 2026','Winter 2027','Spring 2027'))),
  ('Software Engineering Technician - Artificial Intelligence Academic Scholarship','lambton-aits-academic-2026-27','For qualifying Software Engineering Technician - Artificial Intelligence students who meet the published GPA condition.',200000,'CAD 2,000',jsonb_build_object('programmeCode','AITS','minimumGpa','2.8 after the first two semesters'))
) AS award(name,slug,description,amount_cents,scholarship_value,eligibility)
WHERE u.slug = 'lambton-college'
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
