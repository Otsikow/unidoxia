-- Materialise the reviewed Georgian College catalogue in the managed database.
-- Generated from data/catalogues/georgian-college-reviewed.json; reruns are idempotent.

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  '00efa964-6529-4b8e-8151-014b058a1837',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Early Childhood Education', 'early-childhood-education-eced', 'Undergraduate', 'Education', 24,
  'CAD', NULL, '{9,1,5}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific placement clearance requirements apply"]'::jsonb, NULL, 'Prepare to support children from birth to age 12 through play-based learning, inclusive practice and two field placements.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific placement clearance requirements apply"]'::jsonb,
  'Ontario College Diploma', NULL, 'ECED', 'Full-time', 'On campus',
  'Barrie, Owen Sound or Orangeville', 'In person', true, 'https://cat.georgiancollege.ca/programs/eced/', '2026/27',
  '2026/27', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'fbb757f417dbeed1b7a0ec9d953ce307a9b94c5f509dbc99c05242a9626cdca4',
  'Prepare to support children from birth to age 12 through play-based learning, inclusive practice and two field placements.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma minimum","toeflIbt":"79 general diploma minimum","pteAcademic":"58 general diploma minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
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
SELECT id, 2026, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eced/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eced/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eced/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eced/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/eced/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eced/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eced/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/eced/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eced/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/eced/'
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
  '48c30102-40f2-451d-841b-8763e43773b6',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Communicative Disorders Assistant', 'communicative-disorders-assistant-coda', 'Graduate Certificate', 'Health and Medicine', 12,
  'CAD', NULL, '{9}'::integer[],
  '["College diploma, advanced diploma, degree or equivalent","Placement health, screening and first-aid requirements apply"]'::jsonb, NULL, 'Develop practical skills to support speech-language pathologists and audiologists, including two field placements.', true, '["College diploma, advanced diploma, degree or equivalent","Placement health, screening and first-aid requirements apply"]'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'CODA', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/coda/', '2026/27',
  '2026/27', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'd201d29f5f4d87c14b218cba036ebe6a376feb6d3fd2b3477efdfe61a6f9737f',
  'Develop practical skills to support speech-language pathologists and audiologists, including two field placements.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.5 general graduate-certificate minimum","toeflIbt":"89 general graduate-certificate minimum, with published component requirements","pteAcademic":"61 general graduate-certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
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
SELECT id, 2026, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/coda/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/coda/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/coda/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/coda/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/coda/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/coda/'
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
  '9c0efbb6-5d46-4245-8662-983bf095a7f0',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Game - Development', 'game-development-gamd', 'Undergraduate', 'Computing and Information Technology', 36,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent"]'::jsonb, NULL, 'Build technical and creative game-development skills across programming, game engines, artificial intelligence, multiplayer networking and digital assets.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent"]'::jsonb,
  'Ontario College Advanced Diploma', NULL, 'GAMD', 'Full-time', 'On campus',
  'Barrie Downtown', 'In person', false, 'https://cat.georgiancollege.ca/programs/gamd/', '2026/27',
  '2026/27', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '826fc75f7a93802b7676af33cceaf10c221b8f46722b877d943fbe3d6b74af2f',
  'Build technical and creative game-development skills across programming, game engines, artificial intelligence, multiplayer networking and digital assets.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma minimum","toeflIbt":"79 general diploma minimum","pteAcademic":"58 general diploma minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
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
SELECT id, 2026, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/gamd/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/gamd/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/gamd/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/gamd/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/gamd/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/gamd/'
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
  '0bcaa0d6-1401-4f6b-8b80-efbfa63a4569',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Child and Youth Care', 'child-and-youth-care-cyca', 'Undergraduate', 'Social Sciences', 24,
  'CAD', NULL, '{9}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific placement clearance requirements apply"]'::jsonb, NULL, 'Prepare to support children, young people and families through evidence-informed therapeutic practice and three field placements.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Programme-specific placement clearance requirements apply"]'::jsonb,
  'Ontario College Advanced Diploma', NULL, 'CYCA', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/cyca/', '2026/27',
  '2026/27', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'f29a6a69f83b3d0534b5dc98480482c236bc23ade662203e7b9505e24747b550',
  'Prepare to support children, young people and families through evidence-informed therapeutic practice and three field placements.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma minimum","toeflIbt":"79 general diploma minimum","pteAcademic":"58 general diploma minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
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
SELECT id, 2026, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/cyca/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyca/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyca/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/cyca/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyca/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/cyca/'
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
  '56ca615c-3097-4346-8aa1-33590b2f2ce1',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Food and Nutrition Management', 'food-and-nutrition-management-fdnm', 'Graduate Certificate', 'Health and Medicine', 12,
  'CAD', NULL, '{9,1}'::integer[],
  '["College diploma, advanced diploma, degree or equivalent","Relevant experience may be considered under the published alternative route","Placement screening requirements apply"]'::jsonb, NULL, 'Develop food-service, nutrition and operational-management skills through applied learning and a field placement.', true, '["College diploma, advanced diploma, degree or equivalent","Relevant experience may be considered under the published alternative route","Placement screening requirements apply"]'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'FDNM', 'Full-time', 'On campus',
  'Barrie', 'In person', true, 'https://cat.georgiancollege.ca/programs/fdnm/', '2026/27',
  '2026/27', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), 'e78772b601d7f1b57f7945ffed6536c34b45d5055b513a8c4097fc02e588df59',
  'Develop food-service, nutrition and operational-management skills through applied learning and a field placement.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.5 general graduate-certificate minimum","toeflIbt":"89 general graduate-certificate minimum, with published component requirements","pteAcademic":"61 general graduate-certificate minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
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
SELECT id, 2026, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/fdnm/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/fdnm/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/fdnm/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/fdnm/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/fdnm/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/fdnm/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/fdnm/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/fdnm/'
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
  '9eccf52e-41f1-4360-82f5-040a96ccd9cd',
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  'Business', 'business-busn', 'Undergraduate', 'Business and Management', 24,
  'CAD', NULL, '{9,1}'::integer[],
  '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Grade 11 or 12 mathematics or equivalent, with the published minimum where applicable"]'::jsonb, NULL, 'Build foundational skills in management, economics, accounting, marketing, human resources and entrepreneurship.', true, '["Secondary-school graduation or equivalent","Grade 12 English or equivalent","Grade 11 or 12 mathematics or equivalent, with the published minimum where applicable"]'::jsonb,
  'Ontario College Diploma', NULL, 'BUSN', 'Full-time', 'On campus or online',
  'Barrie or Online', 'In person or online', false, 'https://cat.georgiancollege.ca/programs/busn/', '2026/27',
  '2026/27', 'annual', false, 'active',
  'official_source_verified', 'verified_fee_pending', '2026-08-20T00:00:00Z', now(), '5f75a4e19e0811dd32ef42e700e3e176045945bbd0ba192f06b0b66da0163eb7',
  'Build foundational skills in management, economics, accounting, marketing, human resources and entrepreneurship.', '[]'::jsonb, NULL, NULL, '{"routing":"guidance_only","dli":"O19395677361","intakeAvailabilityMustBeConfirmed":true}'::jsonb, '{"ieltsAcademic":"6.0 general diploma minimum","toeflIbt":"79 general diploma minimum","pteAcademic":"58 general diploma minimum","sourceUrl":"https://www.georgiancollege.ca/international/admissions/","programmeExceptionsApply":true}'::jsonb
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
SELECT id, 2026, 9, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/busn/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/busn/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'provisional', NULL, 'https://cat.georgiancollege.ca/programs/busn/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/busn/'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'annual', '[]'::jsonb, 'unresolved', 'https://www.georgiancollege.ca/international/finance-and-fees/', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/busn/'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://cat.georgiancollege.ca/programs/busn/', 'programme', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/busn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.georgiancollege.ca/international/admissions/', 'english_requirements', 1, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = 'https://cat.georgiancollege.ca/programs/busn/'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

UPDATE public.universities SET
  catalogue_status = 'needs_review',
  catalogue_discovered_count = 6,
  catalogue_processed_count = 6,
  catalogue_verified_count = 6,
  catalogue_unresolved_count = 6,
  catalogue_fee_verified_count = 0,
  catalogue_intake_verified_count = 6,
  catalogue_requirements_verified_count = 6,
  catalogue_last_completed_at = now(),
  last_catalogue_checked_at = '2026-08-20T00:00:00Z',
  profile_readiness_status = 'needs_review',
  outreach_status = 'profile_incomplete',
  updated_at = now()
WHERE slug = 'georgian-college';

