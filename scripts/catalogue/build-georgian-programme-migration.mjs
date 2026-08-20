#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { sourceFingerprint } from "./importer-core.mjs";

const datasetPath = new URL("../../data/catalogues/georgian-college-reviewed.json", import.meta.url);
const outputPath = new URL("../../supabase/migrations/20260820143000_georgian_college_programmes.sql", import.meta.url);
const dataset = JSON.parse(await readFile(datasetPath, "utf8"));

const quote = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value ?? null))}::jsonb`;
const bool = (value) => value == null ? "NULL" : value ? "true" : "false";
const uuid = (key) => {
  const hash = createHash("sha256").update(`georgian-college:${key}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

const lines = [
  "-- Materialise the reviewed Georgian College catalogue in the managed database.",
  "-- Generated from data/catalogues/georgian-college-reviewed.json; reruns are idempotent.",
  "",
];

for (const programme of dataset.programmes) {
  const programId = uuid(programme.officialUrl);
  lines.push(`INSERT INTO public.programs (
  id, tenant_id, university_id, name, slug, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, entry_requirements, ielts_overall,
  description, active, requirements_json, qualification, faculty, course_code, study_mode,
  attendance, campus, delivery_type, placement_available, official_url, academic_year,
  fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state,
  data_status, source_last_checked_at, last_imported_at, source_fingerprint, overview,
  modules, career_outcomes, accreditation, application_details, english_requirements
) VALUES (
  ${quote(programId)},
  (SELECT tenant_id FROM public.universities WHERE slug = 'georgian-college'),
  (SELECT id FROM public.universities WHERE slug = 'georgian-college'),
  ${quote(programme.title)}, ${quote(programme.slug)}, ${quote(programme.level)}, ${quote(programme.discipline)}, ${programme.durationMonths ?? "NULL"},
  'CAD', NULL, ${quote(`{${programme.intakes.map((intake) => intake.month).join(",")}}`)}::integer[],
  ${json(programme.requirements)}, NULL, ${quote(programme.overview)}, true, ${json(programme.requirements)},
  ${quote(programme.qualification)}, NULL, ${quote(programme.courseCode)}, ${quote(programme.studyMode)}, ${quote(programme.attendance)},
  ${quote(programme.campus)}, ${quote(programme.deliveryType)}, ${bool(programme.placementAvailable)}, ${quote(programme.officialUrl)}, ${quote(dataset.academicYear)},
  ${quote(programme.tuition.feeYear)}, ${quote(programme.tuition.feeBasis)}, false, 'active',
  'official_source_verified', 'verified_fee_pending', ${quote(dataset.checkedAt)}, now(), ${quote(sourceFingerprint(programme))},
  ${quote(programme.overview)}, '[]'::jsonb, NULL, NULL, ${json(programme.applicationDetails)}, ${json(programme.englishRequirements)}
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
`);

  for (const intake of programme.intakes) {
    lines.push(`INSERT INTO public.program_intakes (program_id, intake_year, intake_month, status, application_deadline, source_url, last_checked_at)
SELECT id, ${intake.year}, ${intake.month}, ${quote(intake.status)}, ${quote(intake.applicationDeadline)}, ${quote(intake.sourceUrl)}, ${quote(dataset.checkedAt)}
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = ${quote(programme.officialUrl)}
ON CONFLICT (program_id, intake_year, intake_month) DO UPDATE SET status = EXCLUDED.status, application_deadline = EXCLUDED.application_deadline, source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;`);
  }

  lines.push(`INSERT INTO public.program_fees (program_id, applicant_type, amount, currency, fee_year, fee_basis, mandatory_charges, resolution_status, source_url, last_checked_at)
SELECT id, 'international', NULL, 'CAD', ${quote(programme.tuition.feeYear)}, ${quote(programme.tuition.feeBasis)}, '[]'::jsonb, 'unresolved', ${quote(programme.tuition.sourceUrl)}, ${quote(dataset.checkedAt)}
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = ${quote(programme.officialUrl)}
ON CONFLICT (program_id, applicant_type, fee_year, fee_basis) DO UPDATE SET amount = NULL, currency = EXCLUDED.currency, mandatory_charges = EXCLUDED.mandatory_charges, resolution_status = 'unresolved', source_url = EXCLUDED.source_url, last_checked_at = EXCLUDED.last_checked_at;`);

  for (const source of programme.sources) {
    lines.push(`INSERT INTO public.catalogue_sources (university_id, program_id, source_url, source_kind, source_priority, last_checked_at, last_success_at)
SELECT university_id, id, ${quote(source.url)}, ${quote(source.kind)}, ${source.priority ?? 1}, ${quote(dataset.checkedAt)}, ${quote(dataset.checkedAt)}
FROM public.programs WHERE university_id = (SELECT id FROM public.universities WHERE slug = 'georgian-college') AND official_url = ${quote(programme.officialUrl)}
ON CONFLICT (university_id, program_id, source_url, source_kind) DO UPDATE SET source_priority = EXCLUDED.source_priority, last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at;`);
  }
  lines.push("");
}

lines.push(`UPDATE public.universities SET
  catalogue_status = 'needs_review',
  catalogue_discovered_count = ${dataset.programmes.length},
  catalogue_processed_count = ${dataset.programmes.length},
  catalogue_verified_count = ${dataset.programmes.length},
  catalogue_unresolved_count = ${dataset.programmes.length},
  catalogue_fee_verified_count = 0,
  catalogue_intake_verified_count = ${dataset.programmes.length},
  catalogue_requirements_verified_count = ${dataset.programmes.length},
  catalogue_last_completed_at = now(),
  last_catalogue_checked_at = ${quote(dataset.checkedAt)},
  profile_readiness_status = 'needs_review',
  outreach_status = 'profile_incomplete',
  updated_at = now()
WHERE slug = 'georgian-college';
`);

await writeFile(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${outputPath.pathname} with ${dataset.programmes.length} programmes.`);
