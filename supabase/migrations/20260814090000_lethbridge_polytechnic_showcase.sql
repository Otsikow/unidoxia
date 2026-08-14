-- Complimentary official-public-source listing for Lethbridge Polytechnic.
-- This is deliberately listed/unclaimed and does not establish a partnership.

ALTER TABLE public.program_intakes DROP CONSTRAINT IF EXISTS program_intakes_status_check;
ALTER TABLE public.program_intakes ADD CONSTRAINT program_intakes_status_check
  CHECK (status IN ('available','recruitable','waitlisting','closed','historical','provisional','unknown'));

INSERT INTO public.tenants (id, name, slug, email_from)
VALUES ('10000000-0000-4000-8000-000000000004', 'Lethbridge Polytechnic', 'lethbridge-polytechnic', 'info@unidoxia.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.universities (
  id, tenant_id, name, slug, city, country, website, description, active,
  listing_status, verification_status, partnership_tier, source_url, source_type,
  last_source_checked_at, academic_year, fee_year, outreach_status,
  submission_config_json
)
VALUES (
  '20000000-0000-4000-8000-000000000004',
  (SELECT id FROM public.tenants WHERE slug = 'lethbridge-polytechnic'),
  'Lethbridge Polytechnic', 'lethbridge-polytechnic', 'Lethbridge', 'Canada',
  'https://lethpolytech.ca/',
  'Lethbridge Polytechnic is a public polytechnic in Lethbridge, Alberta. Its official international admissions information highlights career-focused learning, student support and work-integrated learning opportunities.',
  true, 'listed', 'unverified', 'discussion',
  'https://lethpolytech.ca/departments/international-services/international-admissions',
  'official_public_source', '2026-08-14T00:00:00Z', '2026/27', '2026/27', 'responded',
  jsonb_build_object(
    'tagline', 'Career-focused international study in Lethbridge, Alberta',
    'highlights', jsonb_build_array(
      'Designated Learning Institution O19391056756',
      'Official international programme availability includes programme-level intake and PGWP information',
      'The institution reports work-integrated learning opportunities in 95% of its programmes'
    ),
    'internationalStudents', 'International applications are evaluated competitively using grades, English-language proficiency and other published admissions considerations. Lethbridge Polytechnic provides international admissions and immigration support through its International Services team.',
    'tuition', 'The official 2026/27 programme cost-estimate document is the authoritative fee source. Tuition, mandatory fees, books and supplies vary by programme and are kept unresolved on UniDoxia until each amount has been extracted and verified.',
    'scholarships', 'International students need a Lethbridge Polytechnic student number before applying for applicable awards. The official FAQ states that awards available to international students range from CAD 500 to CAD 2,500; individual eligibility must be checked.',
    'entryRequirements', 'Academic requirements are programme- and country-specific. The official document table recognises: Cameroon - Baccalaureat de l''Enseignement Secondaire or GCE Advanced Level; Ghana - WAEC Senior Secondary School Certificate; Kenya - KCSE; Nigeria - WAEC Senior Secondary School Certificate or NECO Certificate; South Africa - National Senior Certificate; Tanzania - Certificate of Secondary Education and Advanced Certificate; Uganda - UACE; Zambia - Zambian School Certificate Examination; Zimbabwe - Zimbabwe Certificate of Secondary Education and GCE. The current official table does not list Botswana, Liberia, Malawi, Rwanda or Sierra Leone, so UniDoxia does not infer equivalents for them.',
    'englishRequirements', 'For 2026/27, most programmes require IELTS Academic 6.0 with no band below 6.0, TOEFL iBT 80, PTE Academic 54, or CAEL 60 with the published component minimums. Practical Nursing has higher component requirements. Applicants educated in recognised English contexts may qualify through the institution''s published criteria; this is not an unconditional no-IELTS policy.',
    'accommodation', 'Official 2026/27 residence rates range from CAD 3,000 to CAD 4,400 per term for listed single-student options, plus published deposit, insurance and residence-life charges. Availability and single-term supplements must be confirmed directly.',
    'studyLevels', jsonb_build_array('Certificate', 'Diploma', 'Undergraduate'),
    'applicationRouting', 'guidance_only',
    'sources', jsonb_build_array(
      jsonb_build_object('url','https://lethpolytech.ca/programs-and-courses/international-programs','label','Official international programmes, intakes and PGWP/CIP information','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://lethpolytech.ca/departments/international-services/international-admissions','label','Official international admissions information','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://lethpolytech.ca/departments/admissions/entrance-requirements/international-document-assessment','label','Official country-specific document requirements','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://lethpolytech.ca/departments/admissions/entrance-requirements/english-language','label','Official 2026/27 English-language requirements','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://lethpolytech.ca/departments/admissions/how-to-apply?no_redirect=true','label','Official application deadlines','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://lethpolytech.ca/document-centre/program-cost-estimates','label','Official 2026/27 programme cost estimates','checkedAt','2026-08-14'),
      jsonb_build_object('url','https://lethpolytech.ca/departments/residence-life/apply-for-residence','label','Official 2026/27 residence rates','checkedAt','2026-08-14')
    ),
    'contacts', '{}'::jsonb,
    'social', jsonb_build_object('website','https://lethpolytech.ca/'),
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

-- Do not overwrite claim, verification or partnership fields on rerun.
COMMENT ON COLUMN public.universities.submission_config_json IS
  'Public profile presentation and routing configuration. Private processing-provider metadata must never be stored here.';
