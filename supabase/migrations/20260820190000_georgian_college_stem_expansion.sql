-- Materialise the reviewed Georgian College STEM and hands-on catalogue expansion.
-- Generated from data/catalogues/georgian-college-stem-expansion.json; reruns are idempotent.

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'b4479656-a4c6-434f-8bcf-c6effd75120e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Biotechnology', 'biotechnology-btec', 'Undergraduate', 'Natural and Applied Sciences', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Laboratory-based biotechnology training using current scientific equipment across microbiology, molecular biology, chemistry and pharmaceutical biotechnology.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma', NULL, 'BTEC', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/btec/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '965f3f92e47309b57a6504fb5179bc08f78f84f439a55f859f08411f91d755b4',
  'Laboratory-based biotechnology training using current scientific equipment across microbiology, molecular biology, chemistry and pharmaceutical biotechnology.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/btec/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/btec/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/btec/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/btec/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/btec/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/btec/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '13c48d68-fcec-4c0c-814f-fd5524dc7998',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Civil Engineering Technician', 'civil-engineering-technician-cvet', 'Undergraduate', 'Engineering and Technology', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Applied civil-engineering training in construction, surveying, materials, municipal services and infrastructure, with a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'CVET', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/cvet/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '61aad235396183ba9fe619164adf55d5b5871b10a71cddb3bd13923640688f48',
  'Applied civil-engineering training in construction, surveying, materials, municipal services and infrastructure, with a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cvet/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvet/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvet/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cvet/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvet/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvet/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '7bed4819-2d7c-4087-84ad-7b91b5b2f407',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Civil Engineering Technology', 'civil-engineering-technology-cvty', 'Undergraduate', 'Engineering and Technology', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced applied learning in civil infrastructure, design, surveying, construction and project work, supported by two co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'CVTY', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/cvty/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'bdb4823af033aef794137cb40cb3c63e527cea3be5e020a28e19ae86b04548da',
  'Advanced applied learning in civil infrastructure, design, surveying, construction and project work, supported by two co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cvty/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvty/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvty/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cvty/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvty/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cvty/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'adae1a52-67ac-4fd1-8928-2102858250ec',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Computer Programming', 'computer-programming-cmpg', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Hands-on software-development training covering programming, databases, web technologies and application development, with a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'CMPG', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/cmpg/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '3aa62f0cc7620ecb0c4f41c07dd7792cc7aec8d9d8d54505eefe5bf3248dc246',
  'Hands-on software-development training covering programming, databases, web technologies and application development, with a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cmpg/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpg/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cmpg/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpg/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpg/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cmpg/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpg/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpg/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'f19d5052-f9fd-4d3b-8ec4-c0cdfe55233e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Computer Programming and Analysis', 'computer-programming-and-analysis-cmpa', 'Undergraduate', 'Computing and Information Technology', 36,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced software analysis and development training with practical projects and two co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'CMPA', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/cmpa/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '4b67ae022b54e6f26210a7c8e4baf103d1147261c09ad8f13ecf733f32d7e565',
  'Advanced software analysis and development training with practical projects and two co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cmpa/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpa/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cmpa/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpa/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpa/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cmpa/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpa/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cmpa/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'ba57fe0f-7889-4a81-8229-2dcaf1d2dafe',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Computer Systems Technician - Cloud Technologies', 'computer-systems-technician-cloud-technologies-cstc', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Practical training in computer systems, networking, cloud platforms, security and technical support, with a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'CSTC', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/cstc/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'ca58e317e4fab9b26f46d9ab1b2cebc98b53411a889c1fec7b999b344fc74848',
  'Practical training in computer systems, networking, cloud platforms, security and technical support, with a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cstc/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cstc/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cstc/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cstc/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cstc/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cstc/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cstc/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cstc/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '126b4c12-bfc2-4781-8743-48e26389d89a',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Cybersecurity Technician', 'cybersecurity-technician-cyte', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Applied cybersecurity training in systems, networks, threat analysis, defensive operations and secure computing environments.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma', NULL, 'CYTE', 'Full-time', 'On campus',
  'Barrie Downtown', 'In person', false, 'https://cat.georgiancollege.ca/programs/cyte/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'b47bd71f7009814340297ef905d75245208e01b5dd217a4c4d89aca83743eee7',
  'Applied cybersecurity training in systems, networks, threat analysis, defensive operations and secure computing environments.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cyte/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyte/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyte/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cyte/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyte/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyte/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'f4268a3f-80d7-4e7c-8767-852b6fa08625',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Electrical Engineering Technician', 'electrical-engineering-technician-eetn', 'Undergraduate', 'Engineering and Technology', 24,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Hands-on electrical engineering training in circuits, controls, power systems, instrumentation and troubleshooting, with a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'EETN', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/eetn/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'a193383fb269d90373855da75ce91cf0d5757b5d17867628ed89a13300c8dada',
  'Hands-on electrical engineering training in circuits, controls, power systems, instrumentation and troubleshooting, with a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eetn/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eetn/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eetn/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eetn/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eetn/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/eetn/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eetn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eetn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'eda10f65-2e4c-4bde-8de4-d437c22789f4',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Electrical Engineering Technology', 'electrical-engineering-technology-eety', 'Undergraduate', 'Engineering and Technology', 36,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced electrical engineering technology training in automation, power, controls and industrial systems, with three co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'EETY', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/eety/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '602f16b41cbaa8dac8a76b1b467599ef9cce1cc2ba4da131688960b997d92988',
  'Advanced electrical engineering technology training in automation, power, controls and industrial systems, with three co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eety/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eety/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eety/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eety/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eety/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/eety/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eety/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eety/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '557b79bb-2029-43f5-8a12-0f87aafcb0b9',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Electromechanical Engineering Technician - Mechatronics', 'electromechanical-engineering-technician-mechatronics-mett', 'Undergraduate', 'Engineering and Technology', 24,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Integrated mechanical, electrical, automation and robotics training with practical laboratory work and a co-op term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'METT', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/mett/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '18ca296af3740f47027f0be1df88e827aa310a21951f18b0c6cad3de898d3119',
  'Integrated mechanical, electrical, automation and robotics training with practical laboratory work and a co-op term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/mett/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mett/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/mett/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mett/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mett/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/mett/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mett/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mett/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'f0d0e92b-fe1b-482c-8013-3eb08a4c6e2e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Electromechanical Engineering Technology - Mechatronics', 'electromechanical-engineering-technology-mechatronics-metr', 'Undergraduate', 'Engineering and Technology', 36,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced mechatronics training across robotics, automation, controls and integrated manufacturing systems, with three co-op terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'METR', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/metr/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '98a5e548e344a12b05a2a7bcb0aa3702e8134c2c1054ef5a289a6ea847ba1487',
  'Advanced mechatronics training across robotics, automation, controls and integrated manufacturing systems, with three co-op terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/metr/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/metr/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2028, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/metr/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/metr/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/metr/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/metr/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/metr/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/metr/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'cb8092f8-e1a7-4ada-8c05-c0ba5dcf3864',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Environmental Technician', 'environmental-technician-entn', 'Undergraduate', 'Environmental Sciences', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Field- and laboratory-based environmental training in sampling, monitoring, assessment and regulatory practice, with a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'ENTN', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/entn/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'dc9ecf022c6447211545db0f069f2220c68da0f48fe66e1af6e17ad6de35edc1',
  'Field- and laboratory-based environmental training in sampling, monitoring, assessment and regulatory practice, with a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/entn/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/entn/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/entn/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/entn/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/entn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/entn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'fca2e2e9-24b1-419b-80b9-b742f75632e4',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Environmental Technology', 'environmental-technology-envr', 'Undergraduate', 'Environmental Sciences', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced environmental field and laboratory training in assessment, monitoring, remediation and compliance, with three co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'ENVR', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/envr/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '6c470d1a879153f46490f930a05c0413fd8ad7e5716d86a10a8d991c96a92437',
  'Advanced environmental field and laboratory training in assessment, monitoring, remediation and compliance, with three co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/envr/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/envr/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/envr/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/envr/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/envr/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/envr/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'c0033f52-aee2-4782-8e8d-a693ad8ea1e9',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Heating, Refrigeration and Air Conditioning Technician', 'heating-refrigeration-and-air-conditioning-technician-hrac', 'Undergraduate', 'Skilled Trades', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Hands-on HVAC training in installation, service, controls, refrigeration and heating systems, with a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'HRAC', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/hrac/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '23861cefcefeea2cd6602127902272f644c6b73d2eeaefdda6005b952ef1a2ef',
  'Hands-on HVAC training in installation, service, controls, refrigeration and heating systems, with a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/hrac/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/hrac/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/hrac/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/hrac/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/hrac/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/hrac/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '1ed832b8-d9e1-4137-8f3b-2900164ec5c9',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Mechanical Technician - Precision Tooling, Machining, and CNC', 'mechanical-technician-precision-tooling-machining-and-cnc-mtpt', 'Undergraduate', 'Skilled Trades', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Shop-based precision machining, tooling and CNC training using industry equipment, supported by a co-op work term.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'MTPT', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/mtpt/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'f71dd6e280503f268ce13971ff873868623dff355ee4fcd2205ca85bbbea11e5',
  'Shop-based precision machining, tooling and CNC training using industry equipment, supported by a co-op work term.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/mtpt/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtpt/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtpt/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/mtpt/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtpt/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtpt/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'd0ab794d-ae51-4856-8c3a-037cbd95e5cf',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Mechanical Engineering Technology', 'mechanical-engineering-technology-mety', 'Undergraduate', 'Engineering and Technology', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced applied mechanical design, manufacturing, automation and engineering analysis, with three co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'METY', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/mety/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '9f3b899bea64d7511117533f47ede7301837553ed7b17737f7f2f62b88e7def3',
  'Advanced applied mechanical design, manufacturing, automation and engineering analysis, with three co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/mety/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mety/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mety/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/mety/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mety/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mety/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'bc6e7db2-24e4-4491-8cdf-aedd0d502efc',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Architectural Technician', 'architectural-technician-artc', 'Undergraduate', 'Architecture and Construction', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Applied architectural design, building technology, drafting and digital-modelling training with two co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma, Co-op', NULL, 'ARTC', 'Full-time', 'On campus',
  'Barrie Downtown', 'In person', true, 'https://cat.georgiancollege.ca/programs/artc/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '00a764beb9515cf3c0754053b2ae1dd35ad790f3f281c8278b45b596978f3a29',
  'Applied architectural design, building technology, drafting and digital-modelling training with two co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/artc/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/artc/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/artc/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/artc/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/artc/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/artc/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'd0e78a5c-04b3-4706-8961-8b5ac9e9e260',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Architectural Technology', 'architectural-technology-arte', 'Undergraduate', 'Architecture and Construction', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Advanced architectural technology training in design development, building systems, codes and project documentation, with two co-op terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'ARTE', 'Full-time', 'On campus',
  'Barrie Downtown', 'In person', true, 'https://cat.georgiancollege.ca/programs/arte/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'a636eb2e329a709728ac38ef8df991e9d0928157b8c6b3731e1f4e7aca6c0493',
  'Advanced architectural technology training in design development, building systems, codes and project documentation, with two co-op terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/arte/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/arte/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/arte/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/arte/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/arte/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/arte/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'c5e58e22-cbd5-4457-847e-294f247884d2',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Marine Engineering Technology', 'marine-engineering-technology-mtcy', 'Undergraduate', 'Marine and Transportation', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Marine engineering training in vessel machinery, propulsion, electrical systems and shipboard operations, including two co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'MTCY', 'Full-time', 'On campus',
  'Owen Sound', 'In person', true, 'https://cat.georgiancollege.ca/programs/mtcy/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'b6936f9bd32877fb1afa25982c7b634d3542f76c9cd4019f0cc26f2af83df915',
  'Marine engineering training in vessel machinery, propulsion, electrical systems and shipboard operations, including two co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/mtcy/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtcy/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtcy/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/mtcy/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtcy/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mtcy/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'ba0981f6-6ef8-43f0-8631-ba4dc7c7294e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Marine Technology - Navigation', 'marine-technology-navigation-mnav', 'Undergraduate', 'Marine and Transportation', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Practical navigation, seamanship, safety and vessel-operations training with three marine co-op work terms.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'MNAV', 'Full-time', 'On campus',
  'Owen Sound', 'In person', true, 'https://cat.georgiancollege.ca/programs/mnav/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '2a6634cadb256f776a61d271cacbb5a1d4f9bf3cfddc7604e14103d44c4ac90e',
  'Practical navigation, seamanship, safety and vessel-operations training with three marine co-op work terms.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/mnav/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mnav/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mnav/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/mnav/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mnav/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/mnav/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '1b1e87a8-f61c-43d3-8e75-b56d281d99b9',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Power Engineering Technology', 'power-engineering-technology-pety', 'Undergraduate', 'Engineering and Technology', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb, NULL, 'Applied training in power generation, plant systems, operations and maintenance, with a co-op term and field placement.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]'::jsonb,
  'Ontario College Advanced Diploma, Co-op', NULL, 'PETY', 'Full-time', 'On campus',
  'Owen Sound', 'In person', true, 'https://cat.georgiancollege.ca/programs/pety/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '61920021d1322471784c9063bd14591bc90d9b76be32b9f009e1356c14dec353',
  'Applied training in power generation, plant systems, operations and maintenance, with a co-op term and field placement.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/pety/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pety/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pety/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/pety/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pety/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pety/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '14b18d24-2eeb-4b25-8192-9af8e6f040d7',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Veterinary Technician', 'veterinary-technician-vetn', 'Undergraduate', 'Health and Veterinary Sciences', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Hands-on animal-health training in clinical procedures, laboratory work, nursing care and diagnostics, including two field placements.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Diploma', NULL, 'VETN', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/vetn/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'a16fa60fc85f73d85bc77b4c3ba960742e156d1b1ec58f60fb703558c3c3fe7a',
  'Hands-on animal-health training in clinical procedures, laboratory work, nursing care and diagnostics, including two field placements.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/vetn/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/vetn/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/vetn/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/vetn/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/vetn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/vetn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '678652ae-335a-4eec-827e-2d266dfe6f0a',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Welding Techniques', 'welding-techniques-wetc', 'Undergraduate', 'Skilled Trades', 12,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Shop-based training in welding processes, fabrication, safety, blueprint reading and practical metalworking techniques.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Certificate', NULL, 'WETC', 'Full-time', 'On campus',
  'Midland or Owen Sound', 'In person', false, 'https://cat.georgiancollege.ca/programs/wetc/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'c7ab3cfaa7106c3de279afcc339751a4662c14a6f3d68ccb2e745c8884218e4d',
  'Shop-based training in welding processes, fabrication, safety, blueprint reading and practical metalworking techniques.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/wetc/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/wetc/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/wetc/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/wetc/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/wetc/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/wetc/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'c93d5800-27b0-43b7-82f0-87a4563b8580',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Plumbing Techniques', 'plumbing-techniques-pltq', 'Undergraduate', 'Skilled Trades', 12,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb, NULL, 'Hands-on plumbing training in tools, piping systems, installation practices, codes and workplace safety.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]'::jsonb,
  'Ontario College Certificate', NULL, 'PLTQ', 'Full-time', 'On campus',
  'Midland', 'In person', false, 'https://cat.georgiancollege.ca/programs/pltq/', '2027/28',
  '2027/28', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '8606b33b7ffd862cccee4de49d95e6a1e1dc6b2f2fc01ff27682d6b5cd9fbe84',
  'Hands-on plumbing training in tools, piping systems, installation practices, codes and workplace safety.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true,"internationalAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma or certificate minimum","toeflIbt":"79 general diploma or certificate minimum","pteAcademic":"58 general diploma or certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, level = EXCLUDED.level, discipline = EXCLUDED.discipline,
  duration_months = EXCLUDED.duration_months, intake_months = EXCLUDED.intake_months,
  entry_requirements = EXCLUDED.entry_requirements, description = EXCLUDED.description,
  active = true, requirements_json = EXCLUDED.requirements_json, qualification = EXCLUDED.qualification,
  course_code = EXCLUDED.course_code, study_mode = EXCLUDED.study_mode, attendance = EXCLUDED.attendance,
  campus = EXCLUDED.campus, delivery_type = EXCLUDED.delivery_type,
  placement_available = EXCLUDED.placement_available, academic_year = EXCLUDED.academic_year,
  fee_year = EXCLUDED.fee_year, fee_basis = EXCLUDED.fee_basis,
  international_fee_verified = false, catalogue_status = 'active',
  verification_state = 'official_source_verified', data_status = 'verified_fee_pending',
  source_last_checked_at = EXCLUDED.source_last_checked_at, last_imported_at = now(),
  source_fingerprint = EXCLUDED.source_fingerprint, overview = EXCLUDED.overview,
  application_details = EXCLUDED.application_details, english_requirements = EXCLUDED.english_requirements,
  updated_at = now();

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/pltq/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pltq/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2027/28', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pltq/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/pltq/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pltq/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/pltq/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

UPDATE public.universities SET
  catalogue_status = 'needs_review',
  catalogue_discovered_count = 30,
  catalogue_processed_count = 30,
  catalogue_verified_count = 30,
  catalogue_unresolved_count = 30,
  catalogue_fee_verified_count = 0,
  catalogue_intake_verified_count = 0,
  catalogue_requirements_verified_count = 30,
  catalogue_last_completed_at = now(),
  last_catalogue_checked_at = '2026-08-20T00:00:00Z',
  academic_year = '2027/28',
  profile_readiness_status = 'needs_review',
  outreach_status = 'profile_incomplete',
  updated_at = now()
WHERE slug = 'georgian-college';
