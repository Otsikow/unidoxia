-- Materialise the reviewed Lambton College catalogue in the managed database.
-- Generated from data/catalogues/lambton-college-reviewed.json; reruns are idempotent.

INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  'f443918e-a2cd-490b-8cb8-e362340e03ba',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Advanced Project Management - Information Technology', 'advanced-project-management-information-technology-pmio', 'Graduate Certificate', 'Business and Management', 24,
  'CAD', 27890.97, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'PMIO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/PMIO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '7d2afe7e71a1fad6091527d5063cdeeb79e7bb00bef259778a33cd43b0dd5506', NULL, '["EPM-1113 — Project Management: Overview & Context","EPM-1123 — Initiating a Project","EPM-1133 — Identifying Project Requirements: Scope & Quality","EPM-1143 — Project Planning Resource Management","EPI-1173 — MS Project & Data Analysis","ADD ITP-1053 — ITIL Foundations","JSS-1001 — Job Search and Success","EPM-1163 — Managing Project Uncertainty: Risk & Procurement Management","EPM-2173 — Executing the Project","EPI-4453 — DevSecOps","EPM-2113 — Project Closures Introduction to Agile Methodologies","EPM-5003 — GenAI Overview for PMs Certificate","FOUR MONTHS — SDLC Methodology","EPM-2133 — Agile: Scrum & Other Methodologies","EPM-2193 — Monitoring and Controlling Project Requirements","EPM-2273 — Advanced Data Analytics","EPM-1023 — Project Health & Change Management","EPM-4483 — Capstone Project","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Career positions may include, but are not limited to: administrative officer administrative services co-ordinator co-ordinator, office services forms management officer liaison officer office manager planning officer surplus assets officer office administrator', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9567.01,"currency":"CAD"},{"label":"Term 2","amount":8776.98,"currency":"CAD"},{"label":"Term 3","amount":9546.98,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.1005","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27890.97, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9567.01,"currency":"CAD"},{"label":"Term 2","amount":8776.98,"currency":"CAD"},{"label":"Term 3","amount":9546.98,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/PMIO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PMIO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PMIO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMIO'
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
  'a538ca8f-cd19-4b8b-8465-233aed7baa1b',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Advanced Project Management & Strategic Leadership', 'advanced-project-management-and-strategic-leadership-pmlo', 'Graduate Certificate', 'Business and Management', NULL,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'PMLO', 'Full-time', 'On campus',
  'Ottawa', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/PMLO', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '2d9dd9b122c5d18b773094b32c16891ada6c24f0bc1dc6d0c91ec6ff4a4a6e64', NULL, '[]'::jsonb,
  NULL, NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"ineligible","cipCode":null,"sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/PMLO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PMLO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PMLO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PMLO'
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
  'fb87c772-4d02-4663-8afe-1c707102a357',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Agri-Business Management', 'agri-business-management-agbs', 'Graduate Certificate', 'Business and Management', 24,
  'CAD', 27890.96, '{9,1,5}'::integer[],
  '"University degree in agri-business, economics, science, environmental, or other agriculturally related field of study"'::jsonb, NULL, NULL, true, '"University degree in agri-business, economics, science, environmental, or other agriculturally related field of study"'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'AGBS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/AGBS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '5e0a2e6210e132f9e04896aaef9c5f1d882a347d426fad4af73aa91fbb81e9a1', NULL, '["MKT-1143 — Marketing Fundamentals","AGO-1003 — Canadian Agri-Business Fundamentals","OHS-1402 — Canadian Workplace Health & Safety","BUS-1203 — Workplace Communication Applications & Analysis","ACC-1123 — Agricultural Accounting & Finance","JSS-1001 — Job Search & Success","AGO-2002 — Agricultural Machinery & Farm Safety","AGO-2012 — Introduction to Canadian Agricultural Law","AGO-2033 — Introduction to Canadian Field Crops","FSQ-1013 — Food Processing in Canada","AGO-3013 — Introduction to Canadian Livestock Operations","BMR-1103 — Digital Media & Analytics for Business","FOUR MONTHS — Selling","AGO-3003 — Canadian Greenhouse Production","AGO-3033 — Introductory Pest & Weed Control Management","AGO-3022 — Farm Biosecurity in Canada","AGO-3053 — Canadian Vegetable & Fruit Production Management","BUS-1603 — Entrepreneurial Mindset","CPL-1049 — Co-op Work Term","CPL-5559 — WIL Project"]'::jsonb,
  'Career positions may include, but are not limited to: agricultural consultant agricultural extension supervisor agricultural livestock specialist agriculturist agrologist agronomist crop specialist farm management consultant', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"1.0101","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27890.96, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/AGBS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AGBS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AGBS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AGBS'
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
  '50829f3f-acb4-4e26-8359-872f80ff90d0',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Artificial Intelligence (AI) - Software Engineering Technician', 'artificial-intelligence-ai-software-engineering-technician-aits', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', 29303.43, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'AITS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/AITS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '65804a42f9dacd711d9c2fa3dedf4b23eae9dd8293452ec9530b74f54ce9475e', NULL, '["ITP-1123 — PC Repair and Troubleshooting","CSD-1133 — Problem Solving/Program Logic","CIS-1103 — Networking Basics","CSD-2303 — Relational Database Design & SQL","CSD-1103 — Front End Web Development I","CIS-1003 — Foundational Cloud Administration","GED-XXX3 — General Education Elective","MTH-1163 — General Mathematics I","AML-1413 — Introduction to Artificial Intelligence","ISN-1003 — Principles of Information Security","CSD-1233 — Python Programming","CIS-4103 — Project Management","COM-1113 — Workplace Communications","SUS-1003 — Introduction to Sustainable Development","JSS-1001 — Job Search and Success","AML-1113 — Data Science and Machine Learning","CSD-2103 — Front-End Development II","AML-2303 — Natural Language Processing","AML-2503 — SQL and NoSQL Database Design","AML-3203 — Social Media Analytics","CBD-3343 — CI/CD & Configuration Management","GED-XXX3 — General Education Elective","AML-2103 — Visualization for AI and ML","AML-2203 — Advanced Python &#x2013; AI and ML Tools","CBD-3333 — Data Mining and Analysis","AML-3103 — Neural Networks and Deep Learning","CBD-2213 — Big Data Fundamentals &#x2013; Data Storage and Networking","AML-3603 — Ethical Practices in AI and Data Science","AML-3703 — Capstone Project: Software Engineering with AI"]'::jsonb,
  'Graduates will have the in-demand skills to operate at entry and intermediate roles on an AI and ML project in a variety of industries and occupational areas, including but not limited to technology implementation, business transformation, management and consulting. Career positions may include, but are not limited to: Business Intelligence Designer Business Intelligence Designer Robotics Process Analyst AI Interaction Designer Artificial Intelligence Technologist Machine Learning Analyst Machine Learning Technologist AI System Developer Business Transformation Consultant', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.1204","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 29303.43, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/AITS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AITS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AITS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AITS'
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
  'a185961d-8bfa-4c09-8df4-4c8d6e44492a',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Artificial Intelligence & Machine Learning', 'artificial-intelligence-and-machine-learning-aimo', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 27628.46, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'AIMO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/AIMO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'c290ea7e3ad7cb2e715c5f56c65b73512abad7e6a1a298b6d9656c166e85e1db', NULL, '["AML-1113 — Data Science & Machine Learning","AML-1213 — Python Programming","CBD-2213 — Big Data Fundamental Data Storage Networking","AML-1613 — Mathematics of Data Science","AML-1413 — Introduction to Artificial Intelligence","CSD-3423 — Introduction to Project Management","JSS-1001 — Job Search & Success","AML-2103 — Visualization for AI and ML","AML-2203 — Advance Python - AI & ML Tools","CBD-3333 — Data Mining & Analysis","AML-2303 — Natural Language Processing","AML-2403 — AI & ML Lab","AML-2503 — SQL & NoSQL Database Design","FOUR MONTHS — Neural Networks & Deep Learning","AML-3203 — Social Media Analytics","AML-3303 — Software Tools & Emerging Technologies for AI & ML","AML-3403 — AI & ML Capstone Project","AML-3503 — Cloud Computing & Big Data & AI","AML-3603 — Ethical Practices in AL & Data Sciences","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Graduates will have the in-demand skills to operate at entry and intermediate roles on an AI and ML project in a variety of industries and occupational areas, including but not limited to technology implementation, business transformation, management and consulting. Career positions may include, but are not limited to: Business Intelligence Designer Business Intelligence Designer Robotics Process Analyst AI Interaction Designer Artificial Intelligence Technologist Machine Learning Analyst Machine Learning Technologist AI System Developer Business Transformation Consultant', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9502.84,"currency":"CAD"},{"label":"Term 2","amount":8712.81,"currency":"CAD"},{"label":"Term3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.0102","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27628.46, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9502.84,"currency":"CAD"},{"label":"Term 2","amount":8712.81,"currency":"CAD"},{"label":"Term3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/AIMO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AIMO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AIMO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMO'
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
  '2d19f0b4-80d5-47ee-81f5-07eaf2a2a3ec',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Artificial Intelligence & Machine Learning', 'artificial-intelligence-and-machine-learning-aims', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 28428.36, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'AIMS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/AIMS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'a84ceb75640ffc8993ed50d234e363e760f08aa2eeda2b21cc14574c802b0fda', NULL, '["AML-1113 — Data Science & Machine Learning","AML-1213 — Python Programming","CBD-2213 — Big Data Fundamental Data Storage Networking","AML-1613 — Mathematics of Data Science","AML-1413 — Introduction to Artificial Intelligence","CSD-3423 — Introduction to Project Management","JSS-1001 — Job Search & Success","AML-2603 — Human AI Interactions","AML-2203 — Advance Python - AI & ML Tools","CBD-3333 — Data Mining & Analysis","AML-2303 — Natural Language Processing","AML-2403 — AI & ML Lab","AML-2503 — SQL & NoSQL Database Design","FOUR MONTHS — Neural Networks & Deep Learning","AML-3203 — Social Media Analytics","AML-3303 — Software Tools & Emerging Technologies for AI & ML","AML-3403 — AI & ML Capstone Project","AML-3503 — Cloud Computing & Big Data & AI","AML-3603 — Ethical Practices in AL & Data Sciences","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Graduates will have the in-demand skills to operate at entry and intermediate roles on an AI and ML project in a variety of industries and occupational areas, including but not limited to technology implementation, business transformation, management and consulting. Career positions may include, but are not limited to: Business Intelligence Designer Business Intelligence Designer Robotics Process Analyst AI Interaction Designer Artificial Intelligence Technologist Machine Learning Analyst Machine Learning Technologist AI System Developer Business Transformation Consultant', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9781.68,"currency":"CAD"},{"label":"Term 2","amount":8970.66,"currency":"CAD"},{"label":"Term 3","amount":9676.02,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.0102","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 28428.36, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9781.68,"currency":"CAD"},{"label":"Term 2","amount":8970.66,"currency":"CAD"},{"label":"Term 3","amount":9676.02,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/AIMS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AIMS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/AIMS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/AIMS'
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
  'ecd09149-a5ae-461b-8a34-34f669c101a2',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Business - Sustainable Agriculture', 'business-sustainable-agriculture-bsas', 'Undergraduate', 'Business and Management', 24,
  'CAD', 30343.83, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'BSAS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/BSAS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'c62b43d759eeafa193cb86e49e6d37fe5850620fca1dfe3e47b6a75b9beb6fc5', NULL, '["ACC-1123 — Agricultural Accounting & Finance","MTH-1223 — Business Mathematics I","COM-1013 — Critical Thinking & Writing","MKT-1143 — Marketing Fundamentals","JSS-1001 — Job Search & Success","MAN-1103 — Human Resource Management","ECO-1123 — Microeconomics","BUS-1203 — Workplace Communications Applications and Analysis","COM-2013 — Communications for Business","ACC-3083 — Introduction to Managerial Accounting","GED-XXX3 — General Education Elective","BUS-2903 — Sustainable Business Leadership","ECO-1113 — Macroeconomics","AGO-1003 — Canadian Agri-Business Fundamentals","CPL-1049 — Work Term (Full-Time - optional)","GED-XXX3 — General Education Elective","AGT-1013 — Introduction to Plant Science","BSA-4023 — Canadian Agricultural Supply Management","AGO-3013 — Canadian Livestock Operations","AGO-2002 — Agriculture Machinery and Farm Safety","AGO-2012 — Canadian Agri-law","AGO-2033 — Canadian Field Crops","BSA-4033 — Precision Agriculture and Technology","AGT-4003 — Sustainable Agriculture","GED-XXX3 — General Education Elective","AGO-3033 — Pest and Weed Control Management","AGO-3053 — Canadian Vegetable and Fruit Production Management","AGO-3022 — Farm Biosecurity in Canada","AGO-3003 — Canadian Greenhouse Production","MKT-3403 — Selling"]'::jsonb,
  'Graduates may seek employment in a variety of farming positions or as entrepreneurs. Graduates may also seek employment with organizations that provide services in the agricultural sector, such as feed and supplies, banking, lending, insurance, farm management and equipment sales and service.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7213.45,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"},{"label":"Term 4","amount":7913.45,"currency":"CAD"},{"label":"Term 5","amount":7213.45,"currency":"CAD"}],"additionalFees":"Additional Fees Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"1.0308","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 30343.83, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7213.45,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"},{"label":"Term 4","amount":7913.45,"currency":"CAD"},{"label":"Term 5","amount":7213.45,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/BSAS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/BSAS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/BSAS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BSAS'
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
  '3fcab853-3e65-4f6e-8674-6eee64bc98f3',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Business Analytics', 'business-analytics-bans', 'Graduate Certificate', 'Business and Management', 24,
  'CAD', 28057.83, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'BANS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/BANS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'aaddd7d4bbfcaa057fa0dd40dd4806a8fef56880580c6760a07959e65fb3ae98', NULL, '["BAM-1023 — Introduction to Statistical Analytics","BAM-1013 — Project Management Fundamentals for Canadian Business","BAM-1053 — Managing Requirements & Engagement for the Canadian Workforce","BAM-1043 — Big Data Fundamentals","BAM-1063 — Management Information Systems","BAM-1073 — Introduction to Canadian Business Analytics","JSS-1001 — Job Search & Success","BAM-2003 — SQL & Data Analysis","BAM-2014 — Canadian Business Process Modelling & Improvement","BAM-2024 — Business Intelligence Tools","BAM-3023 — Project Management Analytics","BAM-2053 — Data Visualization","FOUR MONTHS — Business Case Development in Canada","BAM-3014 — Basics of Software Testing","BAM-3034 — Sentiment Analysis & Text Mining","BAM-3062 — Privacy & Ethics for Canadian Business Analytics","BAM-3135 — Capstone Project","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Program graduates are currently in high demand in Canada. These graduates may find employment in roles such as Business Analyst, Data Analyst, Analytics Specialist, Business Management Consultant, Management Analyst, Project Managers and other related fields. Career positions may include, but are not limited to: Business Methods Analyst Records Management Specialist Management Analyst Organizational Analyst Business Management Consultant Consultant, Organizational Analysis ISO Consultant', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9675.34,"currency":"CAD"},{"label":"Term 2","amount":8882.18,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"52.1301","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 28057.83, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9675.34,"currency":"CAD"},{"label":"Term 2","amount":8882.18,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/BANS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/BANS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/BANS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BANS'
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
  'd5c910e4-b038-4650-8607-f209ba1c065c',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Business Analytics', 'business-analytics-bamo', 'Graduate Certificate', 'Business and Management', 24,
  'CAD', 27794.2, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'BAMO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/BAMO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '7f88cccb4a720bde021e6074ab14897728177333bf8a4c3eb7f1571066fe31c8', NULL, '["BAM-1023 — Introduction to Statistical Analytics","BAM-1013 — Project Management Fundamentals for Canadian Business","BAM-1053 — Managing Requirements & Engagement for the Canadian Workforce","BAM-1043 — Big Data Fundamentals","BAM-1063 — Management Information Systems","BAM-1073 — Introduction to Canadian Business Analytics","JSS-1001 — Job Search & Success","BAM-2003 — SQL & Data Analysis","BAM-2014 — Canadian Business Process Modelling & Improvement","BAM-2024 — Business Intelligence Tools","BAM-3023 — Project Management Analytics","BAM-2053 — Data Visualization","FOUR MONTHS — Business Case Development in Canada","BAM-3014 — Basics of Software Testing","BAM-3034 — Sentiment Analysis & Text Mining","BAM-3062 — Privacy & Ethics for Canadian Business Analytics","BAM-3135 — Capstone Project","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Program graduates are currently in high demand in Canada. These graduates may find employment in roles such as Business Analyst, Data Analyst, Analytics Specialist, Business Management Consultant, Management Analyst, Project Managers and other related fields. Career positions may include, but are not limited to: Business Methods Analyst Records Management Specialist Management Analyst Organizational Analyst Business Management Consultant Consultant, Organizational Analysis ISO Consultant', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9587.84,"currency":"CAD"},{"label":"Term 2","amount":8793.55,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"52.1301","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27794.2, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9587.84,"currency":"CAD"},{"label":"Term 2","amount":8793.55,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/BAMO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/BAMO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/BAMO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/BAMO'
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
  '543f81a2-f7a1-4c97-8b8c-24610eb8eaff',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Cloud Infrastructure & Administration', 'cloud-infrastructure-and-administration-cias', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 27536.35, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'CIAS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/CIAS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'e4e11174bc0abf001d592cb2bc767f02e04e22e2d0addd12347f1b6c3a1b959a', NULL, '["ITP-1123 — PC Repair Fundamentals","CIS-1103 — Networking Basics","ITP-1143 — Operating Systems Foundations","CIS-1003 — Foundational Cloud Administration","CIS-1132 — Introduction to Security","CIS-1243 — Canadian IT Consulting & Business Tools I","COM-3013 — Professional Communications","JSS-1001 — Job Search & Success","CIS-1203 — Routing & Switching","CIS-2003 — Server on the Network","CIS-2013 — Server on the Cloud","CIS-1213 — Wireless Networking Fundamentals","CIS-1202 — Canadian Technical Support Services","CIS-4103 — Canadian Project Management","CIS-1232 — Python","FOUR MONTHS — Cloud Infrastructure","ITP-3243 — Network Scripting for Administrators","CIS-2103 — Infrastructure Security","ITP-1052 — ITIL Foundations","CIS-2313 — Canadian IT Consulting & Business Tools II","CIS-2113 — Business Technologies - A Canadian Perspective","SCU-3603 — Introduction to Canadian Culture","CPL-1049 — Co-op Work Term","CPL-5559 — WIL Project"]'::jsonb,
  'Students graduate with the skills required to enter the computer support field as a network administrator, network technician, security administrator, desktop support technician, computer technician or help desk technician.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9410.48,"currency":"CAD"},{"label":"Term 2","amount":8625.56,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.0902","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27536.35, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9410.48,"currency":"CAD"},{"label":"Term 2","amount":8625.56,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/CIAS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CIAS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CIAS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CIAS'
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
  '9861c9e2-9065-4eac-8eef-46c71e367bb0',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Communicative Disorders Assistant', 'communicative-disorders-assistant-cdas', 'Graduate Certificate', 'Social and Community Services', 12,
  'CAD', NULL, '{9,1,5}'::integer[],
  '"Applicants must have completed, at minimum, a post-secondary diploma or degree with emphasis on speech and language development, communication disorders, linguistics, human anatomy, physiology, social sciences, or health and community services. Applicants are required to submit a transcript of their post-secondary diploma or degree."'::jsonb, NULL, NULL, true, '"Applicants must have completed, at minimum, a post-secondary diploma or degree with emphasis on speech and language development, communication disorders, linguistics, human anatomy, physiology, social sciences, or health and community services. Applicants are required to submit a transcript of their post-secondary diploma or degree."'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'CDAS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/CDAS', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), 'b207bafb256bed3a3201fbd072ed9de0a7c7a2b7baa40789d88f6f5d98a4d4f2', NULL, '["CDA-1003 — Anatomy & Physiology of Speech Mechanism","CDA-1053 — Child Language Acquistion & Related Disorders I","CDA-1042 — Introduction to Communication Disorders in Adults I","CDA-1012 — Clinical & Professional Issues I","CDA-1033 — Introduction to Audiology","CDA-1023 — Articulation & Phonology","CDA-1062 — Principles of Therapy Programming","CDA-2073 — Diverse Populations","CDA-2053 — Child Language Acquisition & Related Disorders II","CDA-2042 — Introduction to Communication Disorders in Adults II","CDA-2083 — Introduction to Augmentative Communication & Technology","CDAF-2005 — Field Practicum (7 Weeks)","CDAF-3005 — Field Practicum II (7 weeks)","CDA-3103 — Fluency & Voice Disorders","CDA-2013 — Clinical & Professional Issues II","CDA-3114 — Amplification Systems & Aural Rehabilitation"]'::jsonb,
  'Our graduates support individuals of all ages with a variety of communication disorders as communicative disorders assistants, therapy and speech assistants, audiometric technicians, and hearing screeners. Possible employers could be school boards, children''s treatments centres, EarlyON Centres, hospitals, public health units, home and community care support services, or private speech or audiology clinics. Graduates can work nationwide.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"51.0201","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/CDAS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CDAS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CDAS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CDAS'
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
  'b70483ef-b9e1-414f-82ef-e96ee62ac86b',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Computer Programmer', 'computer-programmer-cpro', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'CPRO', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/CPRO', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '645958fc6234cd15027523c0d74d4b975126368587db793b6bb12a8d8ebd828b', NULL, '["CSD-1103 — Front-End Web Development I","CSD-1133 — Problem Solving & Program Logic","CSD-2303 — Relational Database Design & SQL","CSD-3423 — Introduction to Project Management","BUS-1203 — Workplace Communication Applications & Analysis","ITP-1053 — ITIL Foundations","CSD-2353 — Programming C# .NET","CSD-3463 — Programming Java SE","CSD-3203 — Relational Database & SQL","CSD-1233 — Python Programming","MTH-1163 — General Mathematics I","COM-1113 — Workplace Communications","JSS-1001 — Job Search & Success","GED-XXX3 — General Education Elective","CSD-3353 — Web Applications using C#.NET","CSD-4463 — Programming Java EE","CSD-4503 — DevOps Tools & Practices","CSD-4203 — Database Programming","EPM-2133 — Agile - Scrum & Other Methodologies","JSS-1001 — Job Search & Success","CSD-2103 — Front End Web Development II","GED-XXX3 — General Education Elective","CSD-4523 — Advanced Python","CSD-4553 — Cloud Computing","CSD-4573 — Data Structure & Algorithms","CSD-1343 — Networking Fundamentals","GED-XXX3 — General Education Elective","GED-XXX3 — General Education Elective","CSD-3103 — Full Stack JavaScript","CPL-1049 — Work Term - Full-Time (optional)"]'::jsonb,
  'A wide variety of rewarding career opportunities that are dynamic and challenging, offering a competitive rate of compensation are available to graduates. Courses prepare graduates for careers as computer programmers, software developers, web developers, programmer analysts, application developers, systems analyst, information system specialist, client/server applications developers, systems programmers, and application support analysts. Graduates acquire sufficient foundation to allow them to advance in a variety of career paths appropriate to their interests and abilities.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"11.0201","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/CPRO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CPRO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CPRO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPRO'
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
  '106b48f3-23ec-4021-8f73-122538ac964c',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Computer Systems Technician', 'computer-systems-technician-ctns', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'CTNS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/CTNS', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), 'ba6f4f761e1af9d44f960c5a2a2c205595b8480dc24666153ccc3f36edd433da', NULL, '["ITP-1123 — PC Repair Fundamentals","CSD-1133 — Problem Solving/Program Logic","CIS-1103 — Network Basics","CSD-2303 — Relational Database Design & SQL","CSD-1103 — Front End Web Development I","CIS-1003 — Foundational Cloud Administration","GED-XXX3 — General Education Elective","MTH-1163 — General Mathematics I","AML-1413 — Artificial Intelligence (AI)","ITP-1053 — ITIL Foundations","CSD-1233 — Python Programming","CIS-4103 — Project Management","COM-1113 — Workplace Communications","SUS-1003 — Introduction to Sustainable Development","JSS-1001 — Job Search & Success","CIS-2013 — Servers in the Cloud","ISN-2413 — CompTIA Security&#x2B;","CIS-2003 — Servers on the Network","CIS-2113 — Business Technologies","CIS-2123 — Linux 1","GED-XXX3 — General Education Elective","CIS-1213 — Wireless Networking Fundamentals","CIS-1203 — Routing & Switching","CIS-1202 — Technical Support Services","ITP-3243 — Network Scripting for Administrators","ITP-3233 — Cloud Infrastructure","CTN-4013 — WIL-Based Capstone Project"]'::jsonb,
  'The demand for professionals with a deep understanding of servers, operating systems, databases, local and cloud networks and cyber security operating systems, networks and security continues to grow. Graduates of the program may work throughout the public and private sectors in careers such as desktop support technician, IT support desk, IT support, server technician, network technician, cybersecurity technician, or data centre technician.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"15.1202","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/CTNS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CTNS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CTNS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CTNS'
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
  '65508e96-739b-4293-8287-34cc25472c7e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Construction Carpentry Techniques', 'construction-carpentry-techniques-cact', 'Undergraduate', 'Technology and Skilled Trades', 12,
  'CAD', 14696.73, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Certificate', NULL, 'CACT', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/CACT', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '668133c195823faf5ea4520bd907b38782e95afcf945caf309ff4b443bdb7096', NULL, '["CCT-1066 — Safety, Tools & Materials","CCT-1012 — Construction Plans, Specifications & Codes","CCT-1124 — Introduction to Surveying","JSS-1001 — Job Search & Success","MTH-1303 — Estimating & Calculating I","RCT-1135 — Foundations Systems","BUS-1003 — Introduction to Business","CCT-2042 — Energy Efficiencies & Sustainable Construction","CCT-2133 — Introduction to Interior Finishing","CCT-2143 — Introduction to Exterior Finishing","COM-1113 — Workplace Communications","RCT-1102 — Construction Safety","CCT-2126 — Introduction to Framing"]'::jsonb,
  'Our graduates can pursue opportunities in the General Carpenter apprenticeship program, and have found work in the areas of: residential construction, renovations, commercial construction, and maintenance departments. The construction sector still shows significant demand and growth resulting in multiple opportunities for employment in a construction-related field where graduates can apply the skills acquired in this program in the workplace.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Construction Hard Hat $20.00 Nail pouch and belt $30.00 Hammer - 20 oz $25.00 Tape Measure - 25 ft metric/imperial $10.00 Speed Square $20.00 Safety Glasses $10.00 Utility Knife $10.00 Nail Sets $10.00 #2 Robertson Bit Set for Cordless Drill $15.00 Stair Square Guides (Term 2) $10.00 CSA Approved Safety Boots - Green Stamp $100.00 Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"46.0201","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 14696.73, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/CACT', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CACT', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CACT', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CACT'
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
  '1f1b3c0c-5988-4f89-8a4b-ddb65cf731c7',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Construction Project Management', 'construction-project-management-cpms', 'Graduate Certificate', 'Technology and Skilled Trades', 24,
  'CAD', 27890.96, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'CPMS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/CPMS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '8037e3264e6a281edd84d09563214a3e372ca5cbd4e3beb7b1a28f7f27ff38b3', NULL, '["CON-1003 — Construction Methods, Materials & Codes","CON-1013 — Construction Job Site Management I","CON-1123 — Initiation, Stakeholders & Communication","CON-1023 — Basic BLueprint Reading & Drafting","EPM-1113 — Project Management: Overview & Context","CON-1102 — Construction Safety","JSS-1001 — Job Search & Success","CON-2013 — Construction Job Site Management II","CON-2023 — Advanced Blueprint Reading & Drafting","CON-1133 — Project Scope & Quality Management","CON-2042 — Introduction to Structural Systems","CON-1053 — Construction Estimation","CON-1173 — MS Project & Excel","FOUR MONTHS — Computer Applicationss & Estimating","CON-2033 — Construction Contracts & Laws","CON-2063 — Construction Economics & Financial Analysis","CON-1163 — Project Risks & Procurement Management","CON-1143 — Resource, Schedule & Cost","CON-2183 — Executing & Monitoring","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Construction Project Managers specifically may find employment as: General Contractor Construction Project Manager Construction Manager Industrial Construction Manager Residential Construction Manager Self-Employed Contractor', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees Construction Hard Hat $20.00 CSA Approved Safety Boots $150.00 Field Trip Expenses $200.00 WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"52.2002","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27890.96, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/CPMS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CPMS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CPMS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CPMS'
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
  '1cbb250f-35f3-4597-821c-5c2c9c3d36cf',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Cyber Security - Computer Systems Technician', 'cyber-security-computer-systems-technician-cybs', 'Undergraduate', 'Computing and Information Technology', 24,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'CYBS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/CYBS', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '0b9f7edb5983ede63fa657159526fb120618ea9b10f128eec2ad977df346c9d5', NULL, '["ITP-1123 — PC Repair Fundamentals","CSD-1233 — Python Programming","CIS-1103 — Networking Basics","CSD-2203 — Relational Database Design","CSD-1103 — Front End Web Development I","CIS-1003 — Foundational Cloud Administration","GED-XXX3 — General Education Elective","MTH-1163 — General Mathematics I","AML-1413 — Introduction to Artificial Intelligence","ITP-1053 — ITIL Foundations","ISN-1003 — Principles of Information Security","CIS-4103 — Project Management","COM-1113 — Workplace Communications","SUS-1003 — Introduction to Sustainable Development","JSS-1001 — Job Search & Success","ISN-1403 — Legal & Ethical Issues in IT Society","ISN-1103 — Security Policies","ISN-3333 — Security & Risk Management","ISN-2413 — CompTIA Security&#x2B;","ISN-2313 — Ethical Hacking and Countermeasures","ISN-2513 — DevOpsSec Automation","GED-XXX3 — General Education Elective","ISN-1173 — Cloud Computing for Cyber Security","ISN-1603 — Hacker Techniques and Tools and Incident Handling","ISN-2003 — Network Security Testing","ISN-4443 — Identity Access Management","ISN-1803 — Computer Forensics and Investigation","ISN-2613 — Cyber Security Capstone - Part I","ISN-2623 — Cyber Security Capstone - Part II"]'::jsonb,
  'The demand for professionals with a deep understanding of servers, operating systems, databases, local and cloud networks and cyber security operating systems, networks and security continues to grow. Graduates of the program may work throughout the public and private sectors in careers such as desktop support technician, IT support desk, IT support, server technician, network technician, cybersecurity technician, or data centre technician.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"11.1003","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/CYBS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CYBS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CYBS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CYBS'
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
  '04817092-eb23-464f-8129-0e7be6bea549',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Cyber Security & Computer Forensics', 'cyber-security-and-computer-forensics-csfo', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 27628.46, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'CSFO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/CSFO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '4824a010df99f5efbedd3df850a7bf24ccd8aff93f8a82bb72d9f216fe4530d6', NULL, '["ISN-1003 — Principles of Information Security","ISN-1103 — Security Policies","ISN-1403 — Legal & Ethical Issues in IT Security","CIS-1103 — Networking Basics","ITP-1053 — ITIL Foundations","ISN-3333 — Security & Risk Management","JSS-1001 — Job Search and Success","ISN-1303 — Ethical Hacking & Network Defense","ISN-1603 — Hacker Techniques, Tools & Incident Handling","ISN-1173 — Cloud Computing for Cyber Security","ISN-1803 — Computer Forensics & Investigation","ISN-2003 — Network Security & Penetration Testing","ISN-2103 — Capstone Information Security Project","ISN-4443 — Identity Access Management","FOUR MONTHS — Ethical Hacking & Countermeasures","ISN-2413 — CompTIA Security&#x2B;","ISN-2513 — DevOpsSec Automation","ISN-2613 — Cyber Security Capstone - Part I","ISN-2623 — Cyber Security Capstone - Part II","AML-1413 — Introduction to Artificial Intelligence","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'In the information security field, there are several roles an information network security administration graduate could hold including: network administrator, systems security analyst, network security analyst, computer security consultant, computer support specialist, systems administrator, computer scientist, database administrator, computer specialist, network systems and data communication analyst and digital forensics investigator. Graduates who gain several years of specialized work experience may also hold positions as information security managers or network security supervisors.', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9502.84,"currency":"CAD"},{"label":"Term 2","amount":8712.81,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,480 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.1003","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27628.46, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9502.84,"currency":"CAD"},{"label":"Term 2","amount":8712.81,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/CSFO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CSFO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/CSFO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/CSFO'
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
  'e7cb201e-776c-42e3-8650-0faf77e5f26b',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Developmental Services Worker', 'developmental-services-worker-dswp', 'Undergraduate', 'Social and Community Services', 24,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'DSWP', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/DSWP', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '0895863a50b5f33049589abfc28ac31f7394cc0424b69e516b9da086d7c6242f', NULL, '["DSW-1233 — Supporting People with Developmental Disabilities","DSW-1253 — Developmental Disabilities","HGD-1013 — Human Growth & Development","DSW-1213 — Health & Wellness 1","DSW-1282 — Augmentative Communication","GED-XXX3 — General Education Elective","DSW-2033 — Developing Skills of a Helping Professional","DSW-2013 — Health & Wellness 2","DSW-2063 — Ethics & Professionalism","DSW-2073 — Dual Diagnosis","DSW-2043 — Teaching Strategies","COM-1113 — Workplace Communications","GED-XXX3 — General Education Elective","DSW-3042 — Field Preparation & Seminar 1","DSW-3053 — Pharmacology","DSW-3063 — Aging & Grief","DSW-3073 — Positive Behaviour Interventions","DSWF-3034 — Field Placement 1","GED-XXX3 — General Education Elective","DSW-4042 — Abuse & Neglect","DSW-4012 — Person-Centred Planning","DSW-4023 — Small Group Counselling","DSW-4031 — Field Seminar 2","DSWF-4038 — Field Placement 2"]'::jsonb,
  'Graduates have diverse and meaningful career opportunities in community agencies, schools, and residential settings. Common roles include developmental services worker, educational assistant, community support worker, and life skills instructor, where graduates help individuals with developmental disabilities build independence, communication, and social inclusion. Many also pursue specialized paths such as vocational coaching, respite care, or dual diagnosis programs, with opportunities to advance into supervisory or advocacy roles over time. Some graduates continue their studies in fields like social work, psychology, or counselling.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"19.0710","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/DSWP', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/DSWP', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/DSWP', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/DSWP'
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
  '4ce280ad-2613-44b9-8e13-c3c021848dc0',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Early Childhood Education', 'early-childhood-education-ecep', 'Undergraduate', 'Social and Community Services', 24,
  'CAD', 29303.43, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'ECEP', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/ECEP', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '65f4130041d34ed123f5fe696f569f00b3bab6d6a7e2ddf3f80d1d57784eb4de', NULL, '["ECE-1164 — Play Based Learning I - Creative Arts and Movement","ECE-1184 — Child Development - The Early Years","ECE-1174 — Health, Safety & Nutrition","COM-1013 — Critical Thinking & Writing","ECE-1103 — Foundations of ECE","GED-XXX3 — General Education Elective","ECE-1243 — Infant & Toddler Curriculum","ECE-1153 — Observation & Documentation","ECE-2433 — School Age Curriculum","ECE-1223 — Play Based Learning 2 Storytelling & Literacy","ECE 2069 — Field & Seminar I","ECE-2493 — Diversity","ECE-2323 — Play Based Learning III - STEM","GED-XXX3 — General Education Elective (Select 2)","GED-XXX3 — General Education Elective (Select 2)","ECE-2363 — Pedagogy & Curriculum Models","ECE-3069 — Field & Seminar II","ECE-2463 — Professionalism & Group Dynamics","ECE-2413 — Current Practices","ECE-2483 — Working with Families","ECE-2473 — Children with Diverse Abilities","ECE-4069 — Field & Seminar III"]'::jsonb,
  'Our graduates have a diverse and dynamic set of skills for the evolving profession of Early Childhood Education. Our graduates have found rewarding employment opportunities in a variety of settings including child care centres, before and after school programs, with the school boards as teaching partners in the Kindergarten Program and early learning and family centres. With additional education, graduates can also work as resource teachers and educational assistants.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Costs Associated with Placement Students are responsible for providing the following documents or training at their own expense: Police Records Check with Vulnerable Sector Standard First Aid and CPR (Level C) Health Clearance There may be additional fees incurred for classroom assignments and field placement. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"19.0709","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 29303.43, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/ECEP', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/ECEP', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/ECEP', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ECEP'
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
  '17b17fde-1380-4ee1-80f3-27c3592f62c5',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Elearning Design & Training Development', 'elearning-design-and-training-development-etis', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 9500.31, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'ETIS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/ETIS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '71349df4da869da435169512a68b571c92adab068d3a5912609eef383b658df6', NULL, '["ELD-1013 — Instructional Design","ELD-1022 — Assessing Performance Needs","ELD-1063 — Intellectual Property, Copywright & Ethics in Online Research","ELD-2023 — Evaluating Learning","ELD-3013 — Facilitating Online Learning: Synchronous & Asynchronous","JSS-1001 — Job Search & Success","ELD-1113 — What it takes to be a Professional ID","ELD-1053 — Elearning Quality Assurance","ELD-2013 — Facilitating Training","ELD-2073 — Learning Management Systems & Web Conferencing Applications","ELD-2044 — Rapid Elearning with Articulate Storyline","ELD-3053 — Design Principles for Elearning","MAY - AUG — Capstone Project","ELD-3063 — Adobe Photoshop & Illustrator","ELD-2064 — Tech Tools Lab: LMS, Web Conferencing, Web Authoring","ELD-3044 — Rapid Elearning with Articulate Storyline II","MAN-2103 — Project Management","ELD-3073 — Training, Development & Storyboarding","CPL-1049 — Co-op Work Term","CPL-5559 — WIL Project"]'::jsonb,
  'Career positions may include, but are not limited to: Corporate Training, eLearning Specialist, Training Officer, Curriculum Developer, Instructional Designer, Education Consultant.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Year 1","amount":9500.31,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"ineligible","cipCode":null,"sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 9500.31, 'CAD', '2026/27', 'total', '[{"label":"Year 1","amount":9500.31,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/ETIS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/ETIS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/ETIS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ETIS'
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
  '845c206c-234c-4bec-893b-d661aa3b17f0',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Electrical Engineering Technician - Power Distribution & Control', 'electrical-engineering-technician-power-distribution-and-control-pdct', 'Undergraduate', 'Technology and Skilled Trades', 24,
  'CAD', 30343.83, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'PDCT', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/PDCT', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '470ea6e5818aed46b552dcb7fcedf140c68fb955c1d30f656cbe4591991039b7', NULL, '["ELC-1274 — Basic Electrical Installations I","ELC-1726 — Electrical Theory","ELC-1732 — Safety & Electrical Code I","COM-1113 — Workplace Communications","ICS-1302 — Fundamentals of Instrumentation I","MTH-1084 — Mathematics for Electrical Circuits","ELC-2155 — Electrical Systems Applications","ELC-2505 — Electronic Devices & Applications","ELC-2764 — Industrial Installation Practices","ELC-2013 — Code & Prints","GED-XXX3 — General Education Elective","ICS-6715 — Control Systems Architecture & Data Communications & Control","PDC-1224 — Introduction to Transmission & Distribution of Electric Power","PDC-1233 — Introduction to Industrial Control & Protection","MTH-1904 — Mathematics for Technology I","JSS-1001 — Job Search & Success","GED-XXX3 — General Education Elective","ICS-5354 — Programmable Logic Control","MAN-2103 — Project Management","PDC-1115 — Introduction to Protection and Control","PDC-4003 — Electrical Metering","PDC-4013 — Application of Power Electronics","GED-XXX3 — General Education Elective","CPL-1049 — Co-op Work Term (optional)"]'::jsonb,
  'Job opportunities in the Electrical Engineering Technician - Power Distribution & Control field have been steadily increasing. To survive in today''s global market economy, industry must draw from a pool of technically competent engineers, technologists, technicians, and skilled trades people. Graduates of this program have the skills to compete in a wide variety of industries including power generation, distribution and utilization, industrial telecommunications, electrical maintenance and installation, and control systems.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7213.45,"currency":"CAD"},{"label":"Term 3","amount":7913.45,"currency":"CAD"},{"label":"Term 4","amount":7213.45,"currency":"CAD"}],"additionalFees":"Additional Fees Safety Shoes $150.00 Safety Glasses $20.00 Calculator $50.00 TagOut Lock $20.00 Tool Kit * $275.00 *Tool Kit Includes Linesmen Pliers - High leverage 9\" side cutting pliers Side Cutters Needle Nose Pliers Tongue and Groove Pliers Slot Screwdriver Terminating Slot Screwdriver - 2.5 mm - 3 mm width Philips Screwdriver - #2 Two Robertson Screwdrivers - sizes red and green Measuring Tape Wire Strippers Knife - no utility knives allowed Torpedo Level - short 9\" or so Claw Hammer Safety Lock Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0303","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 30343.83, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7213.45,"currency":"CAD"},{"label":"Term 3","amount":7913.45,"currency":"CAD"},{"label":"Term 4","amount":7213.45,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/PDCT', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PDCT', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PDCT', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PDCT'
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
  'b1c20021-a9b9-4512-8171-39628b3dc15d',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Electrical Techniques', 'electrical-techniques-eltc', 'Undergraduate', 'Technology and Skilled Trades', 12,
  'CAD', 14696.73, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Certificate', NULL, 'ELTC', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/ELTC', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '61f28c21eadf87a09374ecfa290773a59ff22bc2b8d13eb91af889f2e954e09d', NULL, '["ELC-1274 — Basic Electrical Installations I","ELC-1726 — Electrical Theory","ELC-1732 — Safety & Electrical Code I","COM-1113 — Workplace Communications","ICS-1302 — Fundamentals of Instrumentation I","MTH-1084 — Mathematics for Electrical Circuits","ELC-2155 — Electrical Systems Applications","ELC-2505 — Electronic Devices & Applications","ELC-2764 — Industrial Installation Practices","ELC-2012 — Basic Programmable Logic Controllers","ELC-2013 — Code & Prints","GED-XXX3 — General Education Elective"]'::jsonb,
  'Our graduates have the skills to work in a variety of residential construction settings including renovation projects. They will also have the required skills to work in a warehouse or wholesale business in the electrical field. Job titles include: general labourer, construction and maintenance electrician apprentice, industrial electrician apprentice, trade contractor assistant, electrical technician, network cabling, fire alarm technician, related mechanical trades, independent contractor, service technician and warehouse and wholesale sales.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Safety Shoes $250.00 Safety Glasses $20.00 Calculator $50.00 Tagout Lock $20.00 Tool Kit* $325.00 *Tool Kit Includes Linesmen Pliers - High leverage 9\" side cutting pliers Side Cutters Needle Nose Pliers Tongue and Groove Pliers Slot Screwdriver Terminating Slot Screwdriver - 2.5 mm - 3 mm width Philips Screwdriver - #2 Two Robertson Screwdrivers - sizes red and green Measuring Tape Wire Strippers Knife - no utility knives allowed Torpedo Level - short 9\" or so Claw Hammer Safety Lock Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"46.0302","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 14696.73, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/ELTC', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/ELTC', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/ELTC', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/ELTC'
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
  '6b3c682e-1bb9-4a9e-8b55-6ecfbf5425fc',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Environmental Technician - Water Treatment Operations', 'environmental-technician-water-treatment-operations-ewso', 'Undergraduate', 'Engineering and Sciences', 24,
  'CAD', 26270.26, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'EWSO', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/EWSO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'f4747dab6f039da12c82896948a26f18fad5370bd434e76ad7761444989ae89e', NULL, '["COM-1013 — Critical Thinking and Writing","MTH-1063 — Introduction to Mathematics I","BUS-1203 — Workplace Communications Applications & Analysis","JSS-1001 — Job Search and Success","INL-4163 — Introduction to GIS","EVL-1114 — Chemistry and Physics","WML-1204 — Water Monitoring and Sampling","WML-1023 — Introduction to Wastewater Collection and Treatment","EVL-2012 — Soil and Air Monitoring and Sampling","GED-XXX3 — General Education Elective","COM-2043 — Communications for Technology","EVL-4016 — Water Treatment Plant Instrumentation and Controls","EVL-3124 — Pumps and Motors","EVL-2012 — Plant Operations","WML-4002 — Waste Characteristics","EVL-4002 — Disinfection Methods","EVL-1000 — Independent Study for ELC","EVL-3005 — Certification Exam Prep (OIT and ELC Classroom Portion)","EVL-2003 — Problem Solving in Water and Wastewater Treatment","CPL-1049 — Co-op Work Term (optional)","CPL-2049 — Co-op Work Term (optional)","EVL-4022 — Laboratory Procedures","WML-3011 — Wastewater Digester Operation and Nutrient Removal","OES-4304 — Mechanical Practices for Operating Engineers","WML-3002 — Hydrogeology","WML-4003 — Environmental Regulations and Legislation","OHS-2012 — Health and Safety for Industrial Processes","GED-XXX3 — General Education Elective (take 2)","CPL-3049 — Co-op Work Term (optional)"]'::jsonb,
  'Our graduates pursue a broad range of exciting employment opportunities. They find employment in Ontario''s municipal and indigenous water and wastewater facilities, environmental departments in mines and other industries, solid waste management facilities and in government. A wide variety of career opportunities that are dynamic and challenging that also offer a competitive rate of compensation are available to graduates. Career positions may include, but are not limited to: environmental systems operator - water treatment, water purification, sewage, waste treatment, wastewater and water treatment plant operators; and liquid waste process operator.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9696.78,"currency":"CAD"},{"label":"Term 2","amount":8286.74,"currency":"CAD"},{"label":"Term 3","amount":8286.74,"currency":"CAD"}],"additionalFees":"Additional Fees Operator in Training Exam & Certificate $210.00 Lab Coat $40.00 Calculator $40.00 Safety Shoes $150.00 Safety Glasses $20.00 World Water Operator Training Company Manuals (Required Fee is per term) $350.00 Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0507","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 26270.26, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9696.78,"currency":"CAD"},{"label":"Term 2","amount":8286.74,"currency":"CAD"},{"label":"Term 3","amount":8286.74,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/EWSO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/EWSO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/EWSO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/EWSO'
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
  '0d215102-46eb-4f50-85be-41e5ad7746ee',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Facilities & Property Management', 'facilities-and-property-management-fpms', 'Graduate Certificate', 'Business and Management', 24,
  'CAD', 27820.97, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'FPMS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/FPMS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '4c2d6f13360e74ed1dbb1cf50dd831510ad59efd3b480e8cdc0f1916ded7116e', NULL, '["ACC-3083 — Managerial Accounting","BUS-1203 — Computer Applications","CND-3603 — Introduction to Canadian Culture","MAN-1103 — Human Resource Management","OHS-1023 — Occupational Health and Safety","MKT-1143 — Marketing Fundamentals","JSS-1001 — Job Search and Success","BUS-1003 — Business Fundamentals","MAN-6043 — Leadership in Change Management","QEM-3104 — Six Sigma Process Improvement and Techniques","MKT-1103 — Social Media Marketing","FIN-1013 — Financial Analysis and Budgeting","CCT-2042 — Energy Efficiencies in Canadian Constructions","RCT-3233 — Electrical and Plumbing Techniques for Renovations","RCT-3233 — Electrical and Plumbing Techniques for Renovations","IHM-3053 — Tenancy Law in Canada","IHM-3013 — Building Maintenance for Property Managers","IHM-3043 — Property and Building Administration","MAN-2103 — Project Management","SUS-3003 — Sustainable Infrastructure: A Canadian Context","CPL-1049 — Co-op Work Term","CPL-5559 — WIL Project"]'::jsonb,
  'Discover endless career opportunities with our Facilities and Property Management program! Whether you''re aiming to become a property administrator, leasing coordinator, housing project manager, or facility operations manager, our specialized courses provide the skills and knowledge you need to excel. From managing bustling recreation facilities to overseeing property rentals, this program opens doors to a variety of rewarding careers.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9567.01,"currency":"CAD"},{"label":"Term 2","amount":8776.98,"currency":"CAD"},{"label":"Term 3","amount":9476.98,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"46.0401","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27820.97, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9567.01,"currency":"CAD"},{"label":"Term 2","amount":8776.98,"currency":"CAD"},{"label":"Term 3","amount":9476.98,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/FPMS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FPMS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FPMS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FPMS'
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
  '23bf1641-5d80-4462-8115-1b0c1d1fd93e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Food & Nutrition Management', 'food-and-nutrition-management-fnms', 'Graduate Certificate', 'General Studies', 24,
  'CAD', 35557.95, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'FNMS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/FNMS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '6e720d354fa1358acc800204bfe67a89380abeb09f3192a0abc116f4bf2c1c69', NULL, '["COM-3013 — Professional Communications","FNM-2053 — Menu Planning & Modification","FNM-1023 — Nutrition I - Nutrition through the Lifecycle","FNM-1033 — Canadian Food Services Management I - The System","FNM-1043 — Canadian Food Services Legislation, Standards & Compliance","SCU-3603 — Introduction to Canadian Culture","FNM-1501 — Industry Certifications (WHMIS, Food Handlers, First Aid)","FNM-2013 — Nutrition II - Physiology & Therapeutic Nutrition","FNM-2023 — Nutrition II - Nutrition & Health Promotion","FNM-2033 — Therapeutic Modification Lab I","FNM-2043 — Canadian Food Services Management II - Risk Management","FNM-1013 — Food Preparation & Culinary Skills","MAN-1103 — Human Resources Management","JSS-1001 — Job Search & Success","FOUR MONTHS — Nutrition Counselling for Wellness","FNM-3023 — Canadian Food Services Management III - Project Management","FNM-3033 — Therapeutic Modification Lab II","FNM-3043 — Fiscal Management & Compliance in Food Services","FNM-3053 — Canadian Food Service Management IV - Quality Management","FNM-3063 — Multicultural Foods Lab","CPL-5559 — WIL Project (7 weeks)","FNM-4009 — Field Placement (7 weeks)"]'::jsonb,
  'Upon successful completion of the program, graduates are equipped to manage various facets of nutritional care, food preparation, and food service operations. They are prepared for diverse work environments and career opportunities in sectors such as healthcare, retirement homes, long-term care facilities, fitness and wellness establishments, educational institutions, camps, daycare facilities, and various community or commercial settings.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9307.01,"currency":"CAD"},{"label":"Term 2","amount":8516.98,"currency":"CAD"},{"label":"Term 3","amount":9216.98,"currency":"CAD"},{"label":"Term 4","amount":8516.98,"currency":"CAD"}],"additionalFees":"Additional Fees Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"19.0505","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 35557.95, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9307.01,"currency":"CAD"},{"label":"Term 2","amount":8516.98,"currency":"CAD"},{"label":"Term 3","amount":9216.98,"currency":"CAD"},{"label":"Term 4","amount":8516.98,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/FNMS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FNMS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FNMS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FNMS'
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
  '95413201-4151-4766-8062-d4d0068a581b',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Food Safety & Quality Assurance Management', 'food-safety-and-quality-assurance-management-fsqs', 'Graduate Certificate', 'Health Care and Safety', 24,
  'CAD', 28173.46, '{9,1,5}'::integer[],
  '"University degree in science, chemistry, biology, microbiology, environmental, pharmacy, engineering, instrumentation, mathematics, or a related field."'::jsonb, NULL, NULL, true, '"University degree in science, chemistry, biology, microbiology, environmental, pharmacy, engineering, instrumentation, mathematics, or a related field."'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'FSQS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/FSQS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'f7f52e561efc122ae906b620e721148db6a8100cf7dac7ec1b1c7bfc0eb0d4bb', NULL, '["FSQ-1003 — Canadian & International Food Safety Regulations","FSQ-1102 — Principles of Food Sciences","OHS-1402 — Canadian Workplace Health & Safety","FSQ-1013 — Food Processing in Canada","FSQ-1203 — Technical Reporting for the Canadian Food Industry","CHM-1014 — Analytical Chemistry","JSS-1001 — Job Search & Success","FSQ-2003 — Principles of Food Safety & Quality Asurance","FSQ-2104 — Food Microbiology","FSQ-2204 — Food Chemistry","FSQ-2303 — Risk Assessment & Control Plans","FSQ-2403 — Sanitation in Food Processing","FOUR MONTHS — Current Food Safety Issues","FSQ-3104 — Quality Management Systems","FSQ-3203 — Product Development & Packaging","FSQ-3304 — Food Analysis","FSQ-3403 — Food Safety Engineering","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Employment can include the following positions - food safety and quality assurance technician, HACCP coordinator, lab technician, regulatory coordinator, sanitation supervisor, product developer/food scientist, auditor, and industry consultant. Explore Careers by visiting the Food Processing Skills Canada website', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":9082.81,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"1.0401","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 28173.46, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":9082.81,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/FSQS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FSQS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FSQS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSQS'
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
  'd0f002cf-8871-4ac2-89af-a32c16ad91fd',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Full Stack Software Development', 'full-stack-software-development-fsds', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 27890.96, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'FSDS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/FSDS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '11039022a3e181518bbe22d0bcacd35b76db4a56fd91f9bcc9944b58a2d21f4e', NULL, '["CSD-1103 — Front-End Web Development I","CSD-1133 — Problem Solving & Problem Logic","CSD-1233 — Python Programming","CSD-2203 — Relational Database Design","CSD-3423 — Introduction to Project Management","CSD-1343 — Networking Fundamentals","JSS-1001 — Job Search & Success","CSD-2103 — Front-End Web Development II","CSD-2353 — Programming C# .NET","CSD-3463 — Programming Java SE","CSD-3203 — Relational Database & SQL","CSD-4523 — Python II","CSD-4573 — Data Structure & Algorithms","FOUR MONTHS — Full Stack JavaScript","CSD-3353 — Web Applications Using C# .NET","CSD-4463 — Programming Java EE","CSD-4503 — DevOps: Tools & Practices","CSD-4553 — Cloud Computing","CSD-4203 — Database Programming","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Graduates may expect a wide variety of rewarding career opportunities that are dynamic and challenging while offering a competitive rate of compensation. A wide variety of rewarding career opportunities that are dynamic and challenging, offering a competitive rate of compensation are available to graduates. Courses prepare graduates for careers as computer programmers, software developers, web developers, programmer analysts, application developers, systems analyst, information system specialist, client/server applications developers, systems programmers, and application support analysts. Graduates acquire sufficient foundation to allow them to advance in a variety of career paths appropriate to their interests and abilities.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.0201","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27890.96, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/FSDS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FSDS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FSDS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDS'
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
  '07324d19-af02-451f-8783-43a06055e5f7',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Full Stack Software Development', 'full-stack-software-development-fsdo', 'Graduate Certificate', 'Computing and Information Technology', 24,
  'CAD', 27810.9, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'FSDO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/FSDO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '649a21b078c815311d0248f3f627b9639482fa238914a0b9340d9c603d03d17f', NULL, '["CSD-1103 — Front-End Web Development I","CSD-1133 — Problem Solving & Problem Logic","CSD-1233 — Python Programming","CSD-2203 — Relational Database Design","CSD-3423 — Introduction to Project Management","CSD-1343 — Networking Fundamentals","JSS-1001 — Job Search & Success","CSD-2103 — Front-End Development II","CSD-2353 — Programming C# .NET","CSD-3463 — Programming Java SE","CSD-3203 — Relational Database & SQL","CSD-4523 — Python II","CSD-4573 — Data Structure & Algorithms","FOUR MONTHS — Full Stack JavaScript","CSD-3353 — Web Applications Using C# .NET","CSD-4463 — Programming Java EE","CSD-4503 — DevOps: Tools & Practices","CSD-4553 — Cloud Computing","CSD-4203 — Database Programming","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Graduates may expect a wide variety of rewarding career opportunities that are dynamic and challenging while offering a competitive rate of compensation. A wide variety of rewarding career opportunities that are dynamic and challenging, offering a competitive rate of compensation are available to graduates. Courses prepare graduates for careers as computer programmers, software developers, web developers, programmer analysts, application developers, systems analyst, information system specialist, client/server applications developers, systems programmers, and application support analysts. Graduates acquire sufficient foundation to allow them to advance in a variety of career paths appropriate to their interests and abilities.', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9553.69,"currency":"CAD"},{"label":"Term 2","amount":8763.66,"currency":"CAD"},{"label":"Term 3","amount":9493.55,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Textbooks The anticipated cost for textbooks in this program is approximately $500 - $700 per term. This amount accounts for both mandatory textbook costs (included in tuition fees) as well as textbook fees not included in your tuition fee amount. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"11.0201","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27810.9, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9553.69,"currency":"CAD"},{"label":"Term 2","amount":8763.66,"currency":"CAD"},{"label":"Term 3","amount":9493.55,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/FSDO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FSDO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/FSDO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/FSDO'
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
  '97858567-ccea-425d-8123-947b677fd963',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Heating, Refrigeration & Air Conditioning Technician', 'heating-refrigeration-and-air-conditioning-technician-hvac', 'Undergraduate', 'Technology and Skilled Trades', 24,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'HVAC', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/HVAC', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '7408fc3ab9ceb3d53accc0db594b8d073a989ee7a04630ab30a91faec19cdd91', NULL, '["HVA-1504 — Fundamentals of Refrigeration","HVA-1716 — Gas Technician 3 - Codes & Work Practices","HVA-2157 — Gas Technician 3 - Electrical, Piping & Venting Systems","OHS-2012 — Health & Safety","MTH-1504 — Applied Mathematics","JSS-1001 — Job Search & Success","HVA-2504 — Fundamental of Refrigeration II","HVA-3031 — Safety & Material Handling","HVA-3214 — Gas Technician 2 - Advanced Piping, Building Systems & Appliances","HVA-3229 — Gas Technician 2 - Electricity & Controls","GED-XXX3 — General Education Elective","CPL-1049 — Co-op Work Term (optional)","HVA-3504 — Fundamentals of Refrigeration III","HVA-3233 — Gas Technician 2 - Gas Pressure Controls & Gas-Fired Refrigeration","HVA-4243 — Gas Technician 2 - Conversion Burners, Water Heaters & Combination Systems","HVA-4254 — Gas Technician 2 - Forced Air Systems","COM-1113 — Workplace Communications","GED-XXX3 — General Education Elective","HVA-4162 — HVAC Building Automation","HVA-4266 — Gas Technician 2 - Hydronic Systems & Venting II","HVA-4276 — Gas Technician 2 - Air Handling, Space Heaters & Appliances","GED-XXX3 — General Education Elective"]'::jsonb,
  'Apprenticeship possibilities and job prospects are excellent, with above average wages and steady employment. Graduates find work in heating, air conditioning, sheet metal, electrical and refrigeration contracting firms. Other opportunities include petrochemical, building and facilities services, wholesale, distribution, parts and equipment manufacturing companies. Career positions may include, but are not limited to: central air conditioning mechanic, commercial air conditioning mechanic, heating and cooling mechanic, commercial air conditioning mechanic, heating and cooling mechanic, heating, ventilation and air conditioning (HVAC) mechanic, refrigeration and air conditioning mechanic apprentice.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"47.0201","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/HVAC', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/HVAC', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/HVAC', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/HVAC'
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
  '7a2f0e88-7b20-496f-800d-76ab0e19e590',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Industrial Automation Network Infrastructure', 'industrial-automation-network-infrastructure-ians', 'Graduate Certificate', 'Computing and Information Technology', 12,
  'CAD', 17847.22, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'IANS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/IANS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '29d58ca66733b3e0869e1853d08d7474929558bcb1eb58d4855af22cd31d581c', NULL, '["IAN-1003 — Systems Automation","CIS-1103 — Networking Basics","IAN-1023 — Network Scripting for Administrators","IAN-1004 — Programmable Logic Control","IAN-1043 — Foundational Cloud Infrastructure","AML-1413 — Introduction to Artificial Intelligence","IAN-2043 — Servers on the Network","ESE-3013 — Embedded Systems Communication Protocols and Security","IAN-1033 — Applied Project &#x2013; Foundation","CIS-1203 — Routing & Switching","IAN-2005 — Control System Architecture and Data Communication","IAN-2033 — Applied Project - Application"]'::jsonb,
  'Students graduate with skills required to enter the field as: Analyst, systems technical support Development technologist Hardware installation technician Computer communications technician Control systems tester Hardware technical support analyst Technical support analyst - systems Line distribution technologist Computer inspector - tester', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9330.24,"currency":"CAD"},{"label":"Term 2","amount":8516.98,"currency":"CAD"}],"additionalFees":"Additional Fees Professional Certifications Our program includes hands-on learning and work-integrated experiences that help prepare graduates for a variety of professional certifications, such as CompTIA Network+. Additional fees apply for these certification exams Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0403","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 17847.22, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9330.24,"currency":"CAD"},{"label":"Term 2","amount":8516.98,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/IANS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/IANS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/IANS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/IANS'
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
  '9fae04d5-318f-4831-8afa-73dbf5912eb7',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Industrial Management', 'industrial-management-inds', 'Graduate Certificate', 'Computing and Information Technology', 12,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'INDS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/INDS', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '65851884becb0e7aead7378d6d661cfec80b6b9b57db143db2a74b680b712013', NULL, '["MAN-1103 — Human Resource Management","EPM-1173 — MS Project and Data Analytics","PHL-1253 — Ethical Leadership & Critical Decision Making","QEM-2604 — Implementation of Integrated Management Systems","QEM-3004 — Quality Systems Auditing","MAN-1033 — Operations Management","JSS-1001 — Job Search and Success","SUP-3053 — Managing Operational Excellence in the Organization","MAN-1163 — Organizational Behaviour","OHS-3063 — Introduction to Process Safety","QEM-3513 — Effective Communication for Quality Engineers","QEM-3604 — Problem Solving and Decision-Making Techniques","QEM-3704 — Directed Study Capstone"]'::jsonb,
  'Career positions may include, but are not limited to: Engineering Manager Industrial Production Manager Operations Manager Manufacturing Manager Plant Manager Facilities Manager Project Manager (Engineering/Manufacturing) Logistics Manager Quality Assurance Manager Industrial Engineer Manufacturing Engineer Production Planner Lean Manufacturing Specialist Six Sigma Analyst', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"15.1501","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/INDS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/INDS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/INDS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/INDS'
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
  '42a5e819-e199-4410-869b-b76844958f03',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Mechanical Design & Advanced Manufacturing', 'mechanical-design-and-advanced-manufacturing-mdas', 'Graduate Certificate', 'Engineering and Sciences', 12,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'MDAS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/MDAS', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '15e103a5875b1751411c5cb658c35c5d851ee69b6d73146c2631aab15e672d53', NULL, '["QEM-2523 — Engineering Drawing and Introduction to CAD","QEM-2404 — Geometric Dimensioning and Tolerance","QEM-1014 — Advanced Statistics for Process Control","AMM-1003 — Engineering Design for a Circular Economy &#x2013; A Canadian Management Perspective","QEM-3104 — Six Sigma Process Improvement Techniques","JSS-1001 — Job Search and Success","OHS-1402 — Canadian Workplace Health and Safety","QEM-3304 — Reliability","QEM-1304 — Materials and Testing","QEM-3513 — Effective Communication for Quality Engineers","QEM-3803 — AIAG Quality Core Tools","AMM-3024 — Additive Manufacturing and Printing","QEM-3704 — Directed Study Capstone"]'::jsonb,
  'Career positions may include, but are not limited to: Aeronautical technologist Heating designer Heating, ventilation and air conditioning (HVAC) technologist Machine designer Marine engineering technologist Mechanical engineering technician Mechanical engineering technologist Mechanical technologist Mould designer Thermal station technician Tool and die designer Tool designer', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0805","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/MDAS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/MDAS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/MDAS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MDAS'
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
  '649bfba3-7da5-44d9-8aad-ea6bc69990cc',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Millwright Mechanical Technician', 'millwright-mechanical-technician-mtim', 'Undergraduate', 'Technology and Skilled Trades', 24,
  'CAD', 30343.83, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'MTIM', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/MTIM', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '258ba07870c890883abc025bf14fbfa42b1c093502464bc3e050300d0c37510f', NULL, '["IMT-1107 — Maintenance Tools & Techniques","IMT-1112 — Basic Engineering Drawings","IMT-1132 — Rigging & Hoisting","COM-1113 — Workplace Communications","JSS-1001 — Job Search & Success","MTH-1253 — Mechanical Mathematics I","WEL-1123 — Safety & Welding Basics","IMT-1233 — Introduction to Pumps, Machines & Piping","IMT-2205 — Maintenance Machine Shop","IMT-2223 — Advanced Engineering Drawings","IMT-2245 — Power Transmission, Bearings & Lubrication","MTH-2153 — Mechanical Mathematics II","WEL-2225 — Advanced Welding & Fabrications","IMT-2602 — Schematics & Cataloguing","CPL-1049 — Co-op Work Term (optional)","IMT-2525 — Pneumatics & Hydraulics","IMT-2364 — Basic Science & Mechanical Theory","ELE-1044 — Electrical Fundamentals","IMT-4414 — Advanced Compressors & Pumps","GED-XXX3 — General Education Elective (Select 2)","IMT-1413 — Industrial Materials & Metallurgy","IMT-3444 — Preventive & Predictive Maintenance","IMT-4234 — Industrial Automation","IMT-4622 — Shutdown Lean Manufacturing","IMT-3543 — Turbines & Prime Movers","GED-XXX3 — General Education Elective"]'::jsonb,
  'As one of the largest trades and a vital component in most organizations, millwrights have a wide range of potential employment opportunities. Graduates of this program have found careers in industries such as, but not limited to, refineries, nuclear power, manufacturing, and energy, automotive and food processing sectors.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7213.45,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"},{"label":"Term 4","amount":7913.45,"currency":"CAD"},{"label":"Term 5","amount":7213.45,"currency":"CAD"}],"additionalFees":"Additional Fees Calculator $24.00 Safety Shoes $150.00 Safety Glasses $20.00 Welding Clothing Students will be expected to purchase the following from Acklands-Grainger: Welding Gloves Helmet Jacket These items are purchased in-class and cost will be determined at the time of purchase. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"47.0303","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 30343.83, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7213.45,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"},{"label":"Term 4","amount":7913.45,"currency":"CAD"},{"label":"Term 5","amount":7213.45,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/MTIM', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/MTIM', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/MTIM', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/MTIM'
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
  'f1c0ef1e-00f2-4122-8993-994dfa47e829',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Occupational Health & Safety Management', 'occupational-health-and-safety-management-ohss', 'Graduate Certificate', 'General Studies', 24,
  'CAD', 27890.96, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'OHSS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/OHSS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'aef07f1d56c79be4e587c792c484a14dc1d985ddaa3f7b3edd9ca0bd743e98c7', NULL, '["OHS-2023 — Risk Management","BUS-1883 — Business Analysis","OHS-1023 — Occupational Health & Safety","OHS-3053 — Operational Safety","MAN-1163 — Organizational Behaviour","JSS-1001 — Job Search & Success","OHS-4106 — Industrial Hygiene & Toxicology","OHS-2053 — Disability Management","OHS-2113 — Ergonomics","OHS-4443 — OHS & Environmental Management Systems","OHS-5553 — Environmental Legislation","FOUR MONTHS — Program Design, Development & Implementation","OHS-2043 — Accident Prevention & Theory Investigation","OHS-3013 — Emergency Planning & Management","OHS-3043 — Health & Wellness","OHS-3063 — Introduction to Process Safety","OHS-5014 — Workshop Series & Capstone","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Program graduates can work in a wide range of roles in safety inspection, auditing, risk management, emergency management, environmental management and human resources management. Industry sectors include mining, construction, petroleum, forestry, health care, electrical and communications utilities, transportation, federal, provincial and municipal governments, retail and wholesale operations, warehousing and distribution networks, consulting, engineering and education.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees Safety Boots (with Grade 1 protective toe) $150.00 First Aid & CRP $165.00 WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0701","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27890.96, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9590.34,"currency":"CAD"},{"label":"Term 2","amount":8800.31,"currency":"CAD"},{"label":"Term 3","amount":9500.31,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/OHSS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/OHSS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/OHSS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSS'
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
  'bf5417a8-732e-4bb4-82d3-5563c32f303f',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Occupational Health & Safety Management', 'occupational-health-and-safety-management-ohso', 'Graduate Certificate', 'General Studies', 24,
  'CAD', 27628.46, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'OHSO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/OHSO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '85e9d23d3804d85d5f8bb9cde9e27be2f7c02458eea2c93f91aa3afeaa3e234d', NULL, '["BUS-1883 — Business Analysis","COM-3013 — Professional Communications","OHS-2023 — Risk Management","MAN-1163 — Organizational Behaviour","OHS-1023 — Occupational Health & Safety","OHS-3073 — Operational Safety","JSS-1001 — Job Search & Success","OHS-2113 — Ergonomics","OHS-4443 — OHS & Environmental Management Systems","OHS-5553 — Environmental Legislation","OHS-2053 — Disability Management","OHS-3003 — Industrial Hygiene & Toxicology","OHS-4003 — Industrial Hygiene & Toxicology Lab","FOUR MONTHS — Emergency Planning & Management","OHS-3043 — Health & Wellness","HRM-5003 — Program Design, Development & Implementation","OHS-2043 — Accident Prevention & Theory Investigation","OHS-3063 — Introduction to Process Safety","OHS-5014 — Workshop Series & Capstone","CPL-1049 — Co-op Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Program graduates can work in a wide range of roles in safety inspection, auditing, risk management, emergency management, environmental management and human resources management. Industry sectors include mining, construction, petroleum, forestry, health care, electrical and communications utilities, transportation, federal, provincial and municipal governments, retail and wholesale operations, warehousing and distribution networks, consulting, engineering and education.', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9502.84,"currency":"CAD"},{"label":"Term 2","amount":8712.81,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees Safety Boots (with Grade 1 protective toe) $150.00 First Aid & CRP $165.00 WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0701","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27628.46, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9502.84,"currency":"CAD"},{"label":"Term 2","amount":8712.81,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/OHSO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/OHSO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/OHSO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OHSO'
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
  '861e6690-db79-44bd-8a68-08129db13be0',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Occupational Therapist Assistant & Physiotherapist Assistant', 'occupational-therapist-assistant-and-physiotherapist-assistant-opta', 'Undergraduate', 'Health Care and Safety', 24,
  'CAD', 29303.43, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'OPTA', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/OPTA', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '0b49490ec9f2edcc4e69a41a0488427dc325b81fb2c38938ff3e250098321a57', NULL, '["OPA-1183 — Human Anatomy & Physiology I","OPA-1003 — Human Movement & Functions","OPA-1012 — Introduction to Rehabilitation","OPA-2013 — Clinical Conditions in Rehabilitation","COM-1013 — Critical Thinking & Writing","HGD-1013 — Human Growth & Development","GED-XXX3 — General Education Elective","OPA-2183 — Human Anatomy & Physiology II","OPA-2003 — OTA Skills - Occupation","COM-2033 — Communications for Health Sciences","PSY-1003 — Psychology","OPA-2023 — OTA/PTA Skills - Foundations of Therapeutic Exercise","GED-XXX3 — General Education Elective (Select 2)","OPA-3001 — Field Experience Prep","OPA-3023 — OTA/PTA Skills - Transfers, Gait & Mobility","OPA-3033 — OTA/PTA Clinical Skills - Electrophysical Modalities & Cardiopulmonary Rehabilitiation","OPA-3043 — OTA Clinical Skills - Person & the Environment","OPA-3053 — Enhanced Therapeutic Skills","OPAF-3018 — Field Experience I","OPA-4003 — Clinical Case Studies - Consolidation","OPA-4013 — Rehabilitation - Broader Perspectives & Current Trends","OPA-4023 — Professional Practice","OPAF-4018 — Field Experience II"]'::jsonb,
  'Upon graduation, students are prepared to work as an occupational therapist and physiotherapist assistant under the supervision of a registered occupational therapist or physiotherapist. Employment opportunities with competitive salaries are readily available in a variety of settings such as, hospitals, long term care homes, community agencies, private clinics, schools, and children''s treatment centres.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Textbooks (per year) $1,000.00 Passport to Placement $40.00 Name Tag $15.00 Police Records Check $40.00 Travel Expenses Students are responsible for independently arranging and funding their transportation to and from all clinical placements (e.g., fuel, parking, transit, accommodation, if required). Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"51.0817","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 29303.43, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/OPTA', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/OPTA', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/OPTA', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/OPTA'
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
  '3b226c10-0c15-48cb-8efb-c2d94a51cd84',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Paramedic', 'paramedic-para', 'Undergraduate', 'General Studies', 24,
  'CAD', 29303.43, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'PARA', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/PARA', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '678d372b8ef7e426223aaa912b0d5768b8e35c479de38212b6734334997dc2d6', NULL, '["COM-1013 — Critical Thinking & Writing","PARA-1004 — Patient Care Theory I","PARA-1014 — Patient Care Procedures I","PARA-1022 — Medical-Legal Aspects","PARA-1033 — Anatomy & Physiology I","PARA-1043 — Human Behaviour & Crisis Intervention I","PED-1043 — Fitness for the Paramedic I","GED-XXX3 — General Education Elective","COM-2073 — Communications for Paramedics","PARA-2004 — Patient Care Theory II","PARA-2015 — Patient Care Procedures II","PARA-2024 — Pathophysiology - Emergency Medical Care","PARA-2033 — Anatomy & Physiology II","PARA-2103 — Clinical Experience I","PED-2043 — Fitness for the Paramedic II","PARA-3004 — Patient Care Theory III","PARA-3015 — Patient Care Procedures III - Lab","PARA-3033 — Operations & Professional Issues","PARA-3084 — Advanced Skills Theory","PARA-3106 — Clinical Experience II","PED-3043 — Fitness for the Paramedic III","GED-XXX3 — General Education Elective","PARA-4106 — Clinical Experience III - Consolidation","PARA-4122 — Paramedic Comprehensive Review","GED-XXX3 — General Education Elective"]'::jsonb,
  'Our graduates are employed in emergency medical services. Graduate employment opportunities are city and county led and the application process generally begins in Term 4. Some graduates further their education to the Advanced Care Paramedic level. A Class F driver’s license is required for employment.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Lab Kit $165.00 Stethescope $100.00 Uniform $600.00 Steel Toed Boots $150.00 First Aid & CPR $200.00 N95 Fit Test $40.00 Criminal Record Check (per year) $40.00 Health Clearance $40.00 Year 2 Additional Fees Lab Kit $105.00 First Aid & CPR $30.00 Comptracker Software $80.00 Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"51.0904","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 29303.43, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/PARA', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PARA', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PARA', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PARA'
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
  '106743ac-1b85-4277-87a2-0773427d7012',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Personal Support Worker', 'personal-support-worker-pswk', 'Undergraduate', 'Health Care and Safety', 12,
  'CAD', 14696.73, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Certificate', NULL, 'PSWK', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/PSWK', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'ee5eb8623c54091d0115821aeff8d6da0cd39169ec1dff8583e3aba61a393b7e', NULL, '["COM-1113 — Workplace Communications","PSW-1003 — Client Care Issues","PSW-1023 — Ongoing Health Conditions I","PSW-1043 — Anatomy & Physiology","PSW-1013 — Clinical Skills Theory","PSWC-1014 — Clinical Skills Lab","PSW-2003 — Palliative Care","PSW-2023 — Ongoing Health Conditions II","PSW-2032 — Career Development","PSW-2053 — Health & Development Across the Lifespan","PSWC-2006 — Clinical Practice","PSWC-3006 — Pre-Graduate Clinical (5 weeks)"]'::jsonb,
  'Begin a rewarding career as a personal support worker in community health care, long-term care homes, retirement homes and hospitals in less than a year. As the industry continues to grow and the demand for personal support workers increases, you can feel confident about your job opportunities post-graduation. At this time, there is a high demand for personal support workers and opportunities for local jobs.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Textbook $110.00 CPR & First Aid $150.00 Mask Fit Testing $40.00 Name Tag $15.00 Uniforms (2) $180.00 Duty Shoes $100.00 Watch - with second hand $40.00 Uniform Iron Badge (2) $10.00 CompTracker - program for clinical $55.00 GPA Training $75.00 Lab Kit $35.00 Police Records Check, Vulnerable Persons Check - biannual fee $40.00 Crisis Prevention Training $75.00 Synergy $60.00 Travel to Clinical Students are responsible for all costs associated with traveling to clinical placements. While not required, it is beneficial for students to have a valid G license and access to a personal vehicle for the clinical portion of the program. Passport to Placement Students are responsible for all costs associated with passport to placement. Please see Field & Clinical Requirements on mylambton.ca . Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"51.2602","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 14696.73, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/PSWK', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PSWK', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PSWK', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PSWK'
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
  '2993504f-21c0-4f2c-88ff-2b2b706bfe4d',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Plumbing - Mechanical Techniques', 'plumbing-mechanical-techniques-plum', 'Undergraduate', 'Technology and Skilled Trades', 12,
  'CAD', NULL, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Certificate', NULL, 'PLUM', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/PLUM', '2026/27',
  '2026/27', 'total', false, 'active',
  'official_source_verified', 'verified_fee_pending',
  '2026-08-14T07:16:13.922Z', now(), '0cfaaa4da5acf62353f8e8ba4f70cdfc9d2a12b25546144e2c4abfd9b3e9861e', NULL, '["PLU-1002 — Plumbing Code & Prints I","PLU-1013 — Plumbing Theory I","PLU-1023 — Applied Plumbing Techniques I","PLU-1033 — Workplace Safety for Plumbing","PLU-1043 — Solder, Brazing & Oxy Fuel Techniques","MTH-1303 — Estimating & Calculating I","BUS-1203 — Workplace Communication Applications and Analysis","PLU-2003 — Plumbing Code & Prints II","PLU-2013 — Plumbing Theory II","PLU-2024 — Applied Plumbing Techniques II","PLU-2043 — Metal Cutting & Welding","COM-1113 — Workplace Communications","JSS-1001 — Job Search & Success","GED-XXX3 — General Education Elective"]'::jsonb,
  'Graduates from this program will have the capabilities to work in a variety of residential, commercial, and industrial construction settings including renovation projects. They will also have the required skills to work in a warehouse or wholesale business in the plumbing field.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[],"additionalFees":null,"estimated":true},"pgwp":{"status":"eligible","cipCode":"46.0503","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', '2026/27', 'total', '[]'::jsonb, 'unresolved', 'https://www.lambtoncollege.ca/programs/international/PLUM', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PLUM', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/PLUM', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/PLUM'
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
  'fb50ce76-2c72-4927-8678-6ab49db2b208',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Recreation Therapy', 'recreation-therapy-trec', 'Undergraduate', 'Health Care and Safety', 24,
  'CAD', 29303.43, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'TREC', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/TREC', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '65f9f03ef5d3207e66c237c41dcc8e7237c3f9df9a498d8effe8b8902508915e', NULL, '["COM-1013 — Critical Thinking & Writing","PHR-1093 — Anatomy & Physiology","TRE-1203 — Ethics & Values for the Recreation Therapist","GED-XXX3 — General Education Elective","TRE-1033 — Foundations of Therapeutic Recreation","TRE-1003 — TR Support Networks and Community Resources","COM-2033 — Communications for Health","TRE-2003 — Leisure Education and Counselling in Therapeutic Recreation","TRE-2013 — Therapeutic Recreation Assessment","TRE-2023 — Adapted Recreation and Program Planning in Therapeutic Recreation","TRE-2113 — Current Concepts in Health and Wellness","TRE-2033 — Therapeutic Recreation Leadership","TRE-3303 — Leisure & Aging","HGD-1053 — Introduction to Community Mental Health","TRE-2043 — Research in Therapeutic Recreation","FPP-3001 — Field placement Seminar","GED-XXX3 — General Education Elective","TRE-3013 — Diverse Abilities in Therapeutic Recreation","GED-XXX3 — General Education Elective","TRE-2053 — Therapeutic Recreation Practice and Professional Portfolio","FPP-4008 — Field Placement I","FPP-4018 — Field Placement II"]'::jsonb,
  'Employment may be found in the areas of pediatrics, mental health, hospitals, community settings, long-term care, rehabilitation, and corrections.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Name Tag $15.00 Passport to Placement Fee $40.00 CPR/First Aid $145.00 Costs Associated with Placement Students are responsible for all costs associated with travelling to and from placement. A police records check will also be required to be eligible for placement. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"51.2309","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 29303.43, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/TREC', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/TREC', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/TREC', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/TREC'
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
  '47c7188f-ed84-4204-88f0-71ab1601f143',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Social Service Worker', 'social-service-worker-sswk', 'Undergraduate', 'Social and Community Services', 24,
  'CAD', 29303.43, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'SSWK', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/SSWK', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '2e2a8af77ec762732f747aabfeb26b0031aa3a261445ce9f49eb729c79dec5b7', NULL, '["COM-1013 — Critical Thinking & Writing","SSW-1003 — Helping Skills","SSW-1023 — Social Service Systems I","SSW-1034 — Field Work Preparation","HGD-1053 — Introduction to Community Mental Health","GED-XXX3 — General Education Elective","COM-2053 — Communications for Community Services","SSW-2003 — Interview & Assessment Skills","SSW-2013 — Social Service Systems II","SSW-2083 — Ethics & Report Writing","SSW-1013 — Social Group Work","SSWF-2086 — Field Work I","SSW-2053 — Social Justice Advocacy","PSY-2003 — Psychology II","SSW-3003 — Case Work Relationships","SSW-3083 — Professional Integrity","SSWF-3084 — Field Work II","SSW-4053 — Family Process","GED-XXX3 — General Education Elective","SSW-3073 — Community Organization","SSW-1043 — Community Participation","SSW-4003 — Case Management","SSW-4063 — Overview of Addictions","SSW-4083 — Social Issues & Problems","SSWF-4085 — Field Work III"]'::jsonb,
  'Graduates of the Social Service Worker program are successful in finding employment working with a variety of populations and in a number of different social service and government organizations. These opportunities include employment at Lambton County Social Services (Ontario Works), associations for the developmentally disabled, homeless shelters, poverty reduction and food stability organizations, women’s shelters, sexual assault centres, long-term care homes and senior''s facilities, job training/employment services, school boards, distress line call responders, hospice and services supporting children and youth.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"44.0000","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 29303.43, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"},{"label":"Term 3","amount":7653.35,"currency":"CAD"},{"label":"Term 4","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/SSWK', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SSWK', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SSWK', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SSWK'
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
  'df592720-9c7b-4c44-8d9e-60b87ea707bd',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Supply Chain Management - One-Year', 'supply-chain-management-one-year-scgs', 'Graduate Certificate', 'Business and Management', 12,
  'CAD', 18281.87, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'SCGS', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/SCGS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'b26b06f4acc12f0abeb1e5672c5c58d705fa18de44c715272e6b93d98b36632e', NULL, '["SUP-1013 — Transportation Systems & Global Trade","SUP-1113 — Supply Chain Practice","MAN-1033 — Operations Management","SUP-3063 — Purchasing","SUP-2083 — Logistics (Warehousing and Distribution)","SUP-1883 — Supply Chain Analytics","JSS-1001 — Job Search and Success","SUP-2203 — Global Freight Forwarding Management","SUP-2103 — Project Management","ACC-3153 — Finance & Accounting","SUP-3043 — Supply Chain Operations Management","SUP-3053 — Managing Operational Excellence in the Organization","MAN-1163 — Organizational Behaviour","BUS-5003 — Integrated Business Solutions: Capstone"]'::jsonb,
  'Career positions may include, but are not limited to: Logistics Coordinator Supply Chain Coordinator Transportation Planner Materials Planner Logistics Supervisor Inventory Control Supervisor Dispatch Supervisor Inventory Analyst Purchasing Coordinator Materials Control Analyst', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9516.38,"currency":"CAD"},{"label":"Term 2","amount":8765.49,"currency":"CAD"}],"additionalFees":"Additional Fees Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"52.0203","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 18281.87, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9516.38,"currency":"CAD"},{"label":"Term 2","amount":8765.49,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/SCGS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SCGS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SCGS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCGS'
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
  'a3bea9f9-af55-4e12-83dc-c99bb7d4ff7e',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Supply Chain Management - Two-Year', 'supply-chain-management-two-year-scms', 'Graduate Certificate', 'General Studies', 24,
  'CAD', 28181.42, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'SCMS', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/SCMS', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'd8514a4954b1be38838dea084944d95feb9aefaa0ec0337f8604d05ac9e79c59', NULL, '["SUP-1013 — Transportation Systems & Global Trade","SUP-1113 — Supply Chain Practice","SUP-2083 — Logistics (Warehousing & Distribution)","SUP-3063 — Purchasing","MAN-1033 — Operations Management","JSS-1001 — Job Search and Success","SUP-1883 — Supply Chain Analytics","BUS-6103 — Ecommerce","SUP-2103 — Project Management","SUP-2053 — Supply Chain Technology","JSS-1001 — Job Search & Success","SUP-2203 — Global Freight Forwarding Management","ACC-3153 — Accounting & Finance","SUP-3043 — Supply Chain Operations Management","FOUR MONTHS — Organizational Behaviour","SUP-2213 — Essential Skills for Supply Chain Managers","SUP-3083 — Supply Chain Case Studies","SUP-3033 — Network Design & Planning","SUP-3053 — Managing Operational Excellence in the Organization","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Program graduates can work in a wide range of domestic and international supply chain roles in sales, finance, procurement, information technology, inventory planning, warehousing and transportation. Industry sectors include manufacturing and retailing, mining and oil, public service, not-for-profit and consulting. In addition, specialist organizations include logistics and transportation providers, freight forwarders, customs and freight brokers, couriers and rail and airline companies could also be potential employers in Canada, the USA and overseas.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9659.78,"currency":"CAD"},{"label":"Term 2","amount":8937.55,"currency":"CAD"},{"label":"Term 3","amount":9584.09,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,480 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"52.0203","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'available', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 28181.42, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9659.78,"currency":"CAD"},{"label":"Term 2","amount":8937.55,"currency":"CAD"},{"label":"Term 3","amount":9584.09,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/SCMS', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SCMS', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SCMS', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMS'
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
  '309a6b80-3b51-4346-8a29-05a2a7e10ec1',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Supply Chain Management - Two-Year', 'supply-chain-management-two-year-scmo', 'Graduate Certificate', 'General Studies', 24,
  'CAD', 27835.14, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Graduate Certificate', NULL, 'SCMO', 'Full-time', 'On campus',
  'Ottawa', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/SCMO', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), '12033e15a17b040834a2344c4740b4503f4934903319b6450a0837c74317ba96', NULL, '["CFF-2013 — International Transportation & Trade (ITT)","SUP-1113 — Supply Chain Practice","SUP-2083 — Logistics (Warehousing & Distribution","SUP-3063 — Purchasing","MAN-1033 — Operations Management","JSS-1001 — Job Search & Success","SUP-1883 — Supply Chain Analytics","BUS-6103 — Ecommerce","SUP-2103 — Project Management","SUP-2053 — Supply Chain Technology","CFF-3023 — Essentials of Freight Forwarding (EFF)","ACC-3153 — Accounting & Finance","SUP-3043 — Supply Chain Operations Management","FOUR MONTHS — Organizational Behaviour","SUP-2213 — Essential Skills for Supply Chain Managers","SUP-3083 — Supply Chain Case Studies","SUP-3033 — Network Design & Planning","SUP-3053 — Managing Operational Excellence in the Organization","CPL-1049 — Work Term (Full-Time)","CPL-5559 — WIL Project"]'::jsonb,
  'Program graduates can work in a wide range of domestic and international supply chain roles in sales, finance, procurement, information technology, inventory planning, warehousing and transportation. Industry sectors include manufacturing and retailing, mining and oil, public service, not-for-profit and consulting. In addition, specialist organizations include logistics and transportation providers, freight forwarders, customs and freight brokers, couriers and rail and airline companies could also be potential employers in Canada, the USA and overseas.', NULL, '{"routing":"guidance_only","locationType":"public_saint_paul_university_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":9572.28,"currency":"CAD"},{"label":"Term 2","amount":8850.05,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}],"additionalFees":"Additional Fees WIL Project Fees Students who are not successful in securing a co-op or fail to meet the co-op requirements will need to register in CPL-5559 WIL Project. There is an additional fee of $2,100 for each student enrolled in the WIL Project course. Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"52.0203","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.5 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"88 overall, with no band below 18","cael":"70 overall, with no band below 60","celpip":"8","ellt":"7","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 27835.14, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":9572.28,"currency":"CAD"},{"label":"Term 2","amount":8850.05,"currency":"CAD"},{"label":"Term 3","amount":9412.81,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/SCMO', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SCMO', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/SCMO', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/SCMO'
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
  'd3fe30e8-3562-440d-8d91-313b7118586f',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Welding Techniques', 'welding-techniques-weld', 'Undergraduate', 'Technology and Skilled Trades', 12,
  'CAD', 14696.73, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Certificate', NULL, 'WELD', 'Full-time', 'On campus',
  'Sarnia', 'In person', false, 'https://www.lambtoncollege.ca/programs/international/WELD', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'a4d445966258ba1380730a9a59f799dc186e8513b84ffeee8d8379e05785fd2f', NULL, '["WEL-1016 — Manual Welding Processes I","WEL-1026 — Fitting & Layout","WEL-1134 — Semi-Automatic Welding Processes I","MEC-1713 — Metallurgy","COM-1113 — Workplace Communications","WEL-2026 — Manual Welding Processes II","WEL-2405 — Advanced Welding Processes","WEL-2114 — Gas Tungsten Arc Welding Processes","BPR-1513 — Blueprint Interpretation & Drawing","GED-XXX3 — General Education Elective"]'::jsonb,
  'Successful students have the opportunity to branch out into many different career paths in the welding industry after completion of the program including union and non-union placements like: Welder, Welder-Fitter, Boilermaker, Pressure System Welder, Iron worker, Industrial Mechanic/Millwright, Pipe fitter, Steamfitter, Sheet Metal Worker, Fabricator, Maintenance Welder, Steel Artist, Robotic Welder Operator, Welding Inspector, Self-Employed Welder, and more. Some of these positions fall under different responsibilities within construction, service, and maintenance. Please Note: Availability of jobs will depend upon the local economy.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":false,"feeBreakdown":{"terms":[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}],"additionalFees":"Additional Fees Welding Kit $500.00 Steel Toed CSA 8\" Boots $150.00 Boot Cut Jeans $30.00 Welding Tests (CWB, TSSA) $200.00 per process and position *Welding Kit Includes The campus shop sells a kit that includes the following items: Duffel Bag Notebook and pen Fire Resistant Welding Jacket with Leather Sleeves Flip up Helmet with Auto Darkening Lenses Welding Gloves (2 pair - light and heavy) CSA Safety Glasses Welding Cap Reusable Ear Plugs LED Flashlight Reflective Heat Pad Extra Clear Lenses Voucher for Discounted Safety Boots - purchased offsite Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"48.0508","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 14696.73, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":7743.38,"currency":"CAD"},{"label":"Term 2","amount":6953.35,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/WELD', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/WELD', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/WELD', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WELD'
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
  '90101499-fd3e-4726-88e1-16cedcb57b83',
  (SELECT tenant_id FROM public.universities WHERE slug = 'lambton-college'),
  (SELECT id FROM public.universities WHERE slug = 'lambton-college'),
  'Workplace Safety & Prevention', 'workplace-safety-and-prevention-wspp', 'Undergraduate', 'Technology and Skilled Trades', 24,
  'CAD', 30253.83, '{9,1,5}'::integer[],
  'null'::jsonb, NULL, NULL, true, 'null'::jsonb,
  'Ontario College Diploma', NULL, 'WSPP', 'Full-time', 'On campus',
  'Sarnia', 'In person', true, 'https://www.lambtoncollege.ca/programs/international/WSPP', '2026/27',
  '2026/27', 'total', true, 'active',
  'official_source_verified', 'verified_current',
  '2026-08-14T07:16:13.922Z', now(), 'e4f7059bb6a39c52b3b8c13d926013cc752320acca78cb0860003aeecbbf5992', NULL, '["OHS-1023 — Occupational Health & Safety","COM-1013 — Critical Thinking & Writing","BUS-1203 — Workplace Communications Applications & Analysis","CHM-1005 — Basic Chemistry I","HRM-5003 — Program Design, Development & Implementation","GED-XXX3 — General Education Elective","OHS-2033 — OHS Management Systems","OHS-3043 — Health & Wellness","BIO-1055 — Introduction to Biology","HIN-3303 — Human Interaction","PHL-1253 — Ethical Leadership & Critical Decision Making","JSS-1001 — Job Search & Success","GED-XXX3 — General Education Elective","CPL-1049 — Co-op Work Term","OHS-2023 — Risk Management","OHS-2043 — Accident Prevention & Investigation","OHS-2053 — Disability Management","OHS-2113 — Ergonomics","HRM-3103 — Employment Law","GED-XXX3 — General Education Elective","OHS-3013 — Emergency Planning & Management","OHS-3003 — Industrial Hygiene & Toxicology","OHS-3053 — Operational Safety","OHS-3063 — Introduction to Process Safety","ENV-6114 — Environmental Management","MAN-1163 — Organizational Behaviour"]'::jsonb,
  'Graduates will be able to conduct risk assessments and hygiene tests to prevent hazards and harm to workers, property, the environment, and the general public. These graduates may find employment in a variety of industry sectors such as, safety inspection, auditing, risk management, emergency management, environmental management, and human resources management roles.', NULL, '{"routing":"guidance_only","locationType":"public_main_campus","dli":"O19305293332","coOp":true,"feeBreakdown":{"terms":[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7123.45,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"},{"label":"Term 4","amount":7913.45,"currency":"CAD"},{"label":"Term 5","amount":7213.45,"currency":"CAD"}],"additionalFees":"Additional Fees Lab Coat $40.00 Safety Shoes $150.00 Safety Glasses $10.00 Important Dates, Deadline & Late Fees For additional information on registration dates, deadlines and late fees please refer to Registration Dates and Deadlines. Student Fees A student services fee is included in your tuition. Health Insurance Coverage Emergency medical insurance is mandatory for all international students at Lambton College. This includes students who are full-time and part-time and who are on a co-op. This insurance is provided by GuardMe - a third party insurance provider.","estimated":true},"pgwp":{"status":"eligible","cipCode":"15.0701","sourceUrl":"https://www.lambtoncollege.ca/programs/international","checkedAt":"2026-08-14T07:16:13.922Z"}}'::jsonb, '{"academicYear":"2026/27","ieltsAcademic":"6.0 overall, with no band below 6.0","pteAcademic":"60 overall, with no band below 60","toeflIbt":"78 overall, with no band below 18","cael":"60 overall, with no band below 50","celpip":"7","ellt":"6","lambtonInstituteOfEnglish":"70 overall","sourceUrl":"https://www.lambtoncollege.ca/international/international-education/language-requirements-esl","programmeExceptionsApply":true}'::jsonb
)
ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO NOTHING;

INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2026, 9, 'closed', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 1, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, 2027, 5, 'unavailable', NULL, 'https://www.lambtoncollege.ca/programs/international', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', 30253.83, 'CAD', '2026/27', 'total', '[{"label":"Term 1","amount":8003.48,"currency":"CAD"},{"label":"Term 2","amount":7123.45,"currency":"CAD"},{"label":"Co-op Term","amount":0,"currency":"CAD"},{"label":"Term 4","amount":7913.45,"currency":"CAD"},{"label":"Term 5","amount":7213.45,"currency":"CAD"}]'::jsonb, 'verified', 'https://www.lambtoncollege.ca/programs/international/WSPP', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = EXCLUDED.resolution_status, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/WSPP', 'programme', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international', 'intakes', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/programs/international/WSPP', 'fees', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;
INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, 'https://www.lambtoncollege.ca/international/international-education/language-requirements-esl', 'english_requirements', 1, '2026-08-14T07:16:13.922Z', '2026-08-14T07:16:13.922Z'
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'lambton-college') AND official_url = 'https://www.lambtoncollege.ca/programs/international/WSPP'
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;

UPDATE public.universities SET
  catalogue_status = 'needs_review',
  catalogue_discovered_count = 46,
  catalogue_processed_count = 46,
  catalogue_verified_count = 46,
  catalogue_unresolved_count = 43,
  catalogue_fee_verified_count = 36,
  catalogue_intake_verified_count = 46,
  catalogue_requirements_verified_count = 3,
  catalogue_last_completed_at = now(),
  last_catalogue_checked_at = '2026-08-14T07:16:13.922Z',
  profile_readiness_status = 'needs_review',
  outreach_status = 'profile_incomplete',
  updated_at = now()
WHERE slug = 'lambton-college';

