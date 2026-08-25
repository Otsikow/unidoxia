#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const input = new URL("../../data/catalogues/recommended-uk-universities-reviewed.json", import.meta.url);
const output = new URL("../../supabase/migrations/20260824170000_recommended_uk_universities.sql", import.meta.url);
const data = JSON.parse(await readFile(input, "utf8"));
const q = (v) => v == null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`;
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const uuid = (key, prefix) => {
  const h = createHash("sha256").update(`${prefix}:${key}`).digest("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
};
const lines = ["-- Three recommended UK university profiles and representative, source-verified programmes.", "-- Generated from data/catalogues/recommended-uk-universities-reviewed.json; reruns are idempotent.", "",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_fee_amount NUMERIC(12,2);",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_fee_currency TEXT;",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_fee_waived BOOLEAN;",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS initial_tuition_deposit_amount NUMERIC(12,2);",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS initial_tuition_deposit_currency TEXT;",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS initial_tuition_deposit_percentage NUMERIC(5,2) CHECK (initial_tuition_deposit_percentage BETWEEN 0 AND 100);",
  "ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS financial_terms_last_verified_at TIMESTAMPTZ;",
  ""];

for (const u of data.universities) {
  const tenantId = uuid(u.slug, "tenant");
  const universityId = uuid(u.slug, "university");
  const config = {
    tagline: u.tagline, highlights: u.highlights, internationalStudents: u.internationalStudents,
    tuition: u.tuition, deposit: u.deposit, applicationFee: u.applicationFee,
    scholarships: u.scholarships, entryRequirements: u.entryRequirements,
    englishRequirements: u.englishRequirements, accommodation: u.accommodation,
    studyLevels: u.studyLevels, applicationRouting: "guidance_only", locations: u.locations,
    sources: u.sources.map(([url,label]) => ({url,label,checkedAt:data.checkedAt.slice(0,10)})),
    contacts: {}, social: {website:u.website}, media: {}
  };
  const aliases = {
    "university-of-chester": ["university of chester", "chester university"],
    "wrexham-university": ["wrexham university", "wrexham glyndwr university", "wrexham glyndŵr university", "glyndwr university", "glyndŵr university"],
    "york-st-john-university": ["york st john university", "york st. john university"]
  }[u.slug];
  lines.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.universities WHERE regexp_replace(lower(name),'[^a-z0-9]+','','g') = ANY (ARRAY[${aliases.map(a=>q(a.replace(/[^a-z0-9]+/g,""))).join(",")}]) AND slug <> ${q(u.slug)}) THEN RAISE EXCEPTION 'Potential duplicate institution found before inserting ${u.name}'; END IF; END $$;`);
  lines.push(`INSERT INTO public.tenants (id, name, slug, email_from) VALUES (${q(tenantId)}, ${q(u.name)}, ${q(u.slug)}, 'info@unidoxia.com') ON CONFLICT (slug) DO NOTHING;`);
  lines.push(`INSERT INTO public.universities (
  id, tenant_id, name, slug, city, country, website, description, active,
  listing_status, verification_status, partnership_tier, source_url, source_type,
  last_source_checked_at, academic_year, fee_year, outreach_status,
  catalogue_status, catalogue_discovered_count, catalogue_processed_count,
  catalogue_verified_count, catalogue_unresolved_count, profile_readiness_status,
  featured, featured_priority, featured_summary, featured_highlight,
  application_fee_amount, application_fee_currency, application_fee_waived,
  initial_tuition_deposit_amount, initial_tuition_deposit_currency,
  initial_tuition_deposit_percentage, financial_terms_last_verified_at,
  submission_config_json
) VALUES (
  ${q(universityId)}, (SELECT id FROM public.tenants WHERE slug=${q(u.slug)}), ${q(u.name)}, ${q(u.slug)}, ${q(u.city)}, ${q(u.country)}, ${q(u.website)}, ${q(u.description)}, true,
  'listed', 'unverified', 'none', ${q(u.internationalUrl)}, 'official_public_source', ${q(data.checkedAt)}, ${q(data.academicYear)}, ${q(data.academicYear)}, 'profile_incomplete',
  'needs_review', ${u.programmes.length}, ${u.programmes.length}, ${u.programmes.length}, ${u.programmes.filter(p=>p.fee==null).length}, 'needs_review',
  true, ${10 + data.universities.indexOf(u)}, ${q(u.description)}, 'Official information checked ${data.checkedAt.slice(0,10)}; confirm programme-specific conditions before applying',
  ${u.finance.applicationFeeAmount ?? "NULL"}, 'GBP', ${u.finance.applicationFeeWaived == null ? "NULL" : u.finance.applicationFeeWaived},
  ${u.finance.depositAmount ?? "NULL"}, 'GBP', ${u.finance.depositPercentage ?? "NULL"}, ${q(data.checkedAt)}, ${j(config)}
) ON CONFLICT (slug) DO UPDATE SET city=EXCLUDED.city, country=EXCLUDED.country, website=EXCLUDED.website, description=EXCLUDED.description, active=true, source_url=EXCLUDED.source_url, source_type=EXCLUDED.source_type, last_source_checked_at=EXCLUDED.last_source_checked_at, academic_year=EXCLUDED.academic_year, fee_year=EXCLUDED.fee_year, catalogue_status=EXCLUDED.catalogue_status, catalogue_discovered_count=EXCLUDED.catalogue_discovered_count, catalogue_processed_count=EXCLUDED.catalogue_processed_count, catalogue_verified_count=EXCLUDED.catalogue_verified_count, catalogue_unresolved_count=EXCLUDED.catalogue_unresolved_count, profile_readiness_status=EXCLUDED.profile_readiness_status, featured=true, featured_priority=EXCLUDED.featured_priority, featured_summary=EXCLUDED.featured_summary, featured_highlight=EXCLUDED.featured_highlight, application_fee_amount=EXCLUDED.application_fee_amount, application_fee_currency=EXCLUDED.application_fee_currency, application_fee_waived=EXCLUDED.application_fee_waived, initial_tuition_deposit_amount=EXCLUDED.initial_tuition_deposit_amount, initial_tuition_deposit_currency=EXCLUDED.initial_tuition_deposit_currency, initial_tuition_deposit_percentage=EXCLUDED.initial_tuition_deposit_percentage, financial_terms_last_verified_at=EXCLUDED.financial_terms_last_verified_at, submission_config_json=EXCLUDED.submission_config_json, updated_at=now();`);

  if (u.scholarship) {
    lines.push(`INSERT INTO public.scholarships (tenant_id, university_id, name, title, slug, description, amount_cents, currency, coverage_type, eligibility_criteria, renewable, active, academic_year, country, institution_name, scholarship_value, admission_required_first, separate_application_required, official_source_url, canonical_url, summary, important_conditions, status, verification_status, last_verified_at, published_at)
SELECT tenant_id,id,${q(u.scholarship.name)},${q(u.scholarship.name)},${q(`${u.slug}-${u.scholarship.name}`.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))},${q(u.scholarships)},${u.scholarship.amountCents ?? "NULL"},'GBP','partial',${j({programmeAndApplicantConditionsApply:true})},false,true,${q(data.academicYear)},${q(u.country)},${q(u.name)},${q(u.scholarship.value)},true,false,${q(u.scholarship.source)},${q(u.scholarship.source)},${q(u.scholarships)},'Eligibility and award value must be confirmed against the current official terms and the applicant offer.', 'Published','Fully Verified',${q(data.checkedAt)},now() FROM public.universities WHERE slug=${q(u.slug)}
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET description=EXCLUDED.description, scholarship_value=EXCLUDED.scholarship_value, official_source_url=EXCLUDED.official_source_url, important_conditions=EXCLUDED.important_conditions, last_verified_at=EXCLUDED.last_verified_at, active=true, updated_at=now();`);
  }

  for (const p of u.programmes) {
    const pid = uuid(p.officialUrl, "programme");
    const months = [...new Set(p.intakes.map(x=>x[1]))];
    const feeStatus = p.fee == null ? "unresolved" : "verified";
    const dataStatus = p.fee == null ? "verified_fee_pending" : "verified";
    const english = {ieltsAcademic:p.ielts, sourceUrl:u.sources.find(x=>x[1].toLowerCase().includes("english"))?.[0] || u.internationalUrl, programmeExceptionsApply:true};
    lines.push(`INSERT INTO public.programs (id,tenant_id,university_id,name,slug,level,discipline,duration_months,tuition_currency,tuition_amount,intake_months,entry_requirements,ielts_overall,description,active,requirements_json,qualification,study_mode,attendance,campus,delivery_type,placement_available,official_url,academic_year,fee_year,fee_basis,international_fee_verified,catalogue_status,verification_state,data_status,source_last_checked_at,last_imported_at,source_fingerprint,overview,modules,application_details,english_requirements)
VALUES (${q(pid)},(SELECT tenant_id FROM public.universities WHERE slug=${q(u.slug)}),(SELECT id FROM public.universities WHERE slug=${q(u.slug)}),${q(p.title)},${q(p.slug)},${q(p.level)},${q(p.discipline)},${p.durationMonths},'GBP',${p.fee ?? "NULL"},${q(`{${months.join(",")}}`)}::integer[],${j(p.requirements)},${p.ielts ?? "NULL"},${q(p.overview)},true,${j(p.requirements)},${q(p.qualification)},'Full-time','On campus',${q(p.campus)},'In person',false,${q(p.officialUrl)},${q(data.academicYear)},${q(data.academicYear)},'annual',${p.fee != null},'active','official_source_verified',${q(dataStatus)},${q(data.checkedAt)},now(),${q(createHash("sha256").update(JSON.stringify(p)).digest("hex"))},${q(p.overview)},'[]'::jsonb,${j({routing:"guidance_only",internationalAvailabilityMustBeConfirmed:true})},${j(english)})
ON CONFLICT (university_id,official_url) WHERE official_url IS NOT NULL DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,level=EXCLUDED.level,discipline=EXCLUDED.discipline,duration_months=EXCLUDED.duration_months,tuition_currency=EXCLUDED.tuition_currency,tuition_amount=EXCLUDED.tuition_amount,intake_months=EXCLUDED.intake_months,entry_requirements=EXCLUDED.entry_requirements,ielts_overall=EXCLUDED.ielts_overall,description=EXCLUDED.description,active=true,requirements_json=EXCLUDED.requirements_json,qualification=EXCLUDED.qualification,campus=EXCLUDED.campus,official_url=EXCLUDED.official_url,academic_year=EXCLUDED.academic_year,fee_year=EXCLUDED.fee_year,fee_basis=EXCLUDED.fee_basis,international_fee_verified=EXCLUDED.international_fee_verified,catalogue_status='active',verification_state='official_source_verified',data_status=EXCLUDED.data_status,source_last_checked_at=EXCLUDED.source_last_checked_at,last_imported_at=now(),source_fingerprint=EXCLUDED.source_fingerprint,overview=EXCLUDED.overview,application_details=EXCLUDED.application_details,english_requirements=EXCLUDED.english_requirements,updated_at=now();`);
    for (const [year,month] of p.intakes) lines.push(`INSERT INTO public.program_intakes (program_id,intake_year,intake_month,status,application_deadline,source_url,last_checked_at) SELECT id,${year},${month},'provisional',NULL,${q(p.officialUrl)},${q(data.checkedAt)} FROM public.programs WHERE university_id=(SELECT id FROM public.universities WHERE slug=${q(u.slug)}) AND official_url=${q(p.officialUrl)} ON CONFLICT (program_id,intake_year,intake_month) DO UPDATE SET status=EXCLUDED.status,application_deadline=EXCLUDED.application_deadline,source_url=EXCLUDED.source_url,last_checked_at=EXCLUDED.last_checked_at;`);
    lines.push(`INSERT INTO public.program_fees (program_id,applicant_type,amount,currency,fee_year,fee_basis,mandatory_charges,resolution_status,source_url,last_checked_at) SELECT id,'international',${p.fee ?? "NULL"},'GBP',${q(data.academicYear)},'annual','[]'::jsonb,${q(feeStatus)},${q(p.officialUrl)},${q(data.checkedAt)} FROM public.programs WHERE university_id=(SELECT id FROM public.universities WHERE slug=${q(u.slug)}) AND official_url=${q(p.officialUrl)} ON CONFLICT (program_id,applicant_type,fee_year,fee_basis) DO UPDATE SET amount=EXCLUDED.amount,currency=EXCLUDED.currency,mandatory_charges=EXCLUDED.mandatory_charges,resolution_status=EXCLUDED.resolution_status,source_url=EXCLUDED.source_url,last_checked_at=EXCLUDED.last_checked_at;`);
    for (const [kind,url] of [["programme",p.officialUrl],["english_requirements",english.sourceUrl]]) lines.push(`INSERT INTO public.catalogue_sources (university_id,program_id,source_url,source_kind,source_priority,last_checked_at,last_success_at) SELECT university_id,id,${q(url)},${q(kind)},1,${q(data.checkedAt)},${q(data.checkedAt)} FROM public.programs WHERE university_id=(SELECT id FROM public.universities WHERE slug=${q(u.slug)}) AND official_url=${q(p.officialUrl)} ON CONFLICT (university_id,program_id,source_url,source_kind) DO UPDATE SET source_priority=EXCLUDED.source_priority,last_checked_at=EXCLUDED.last_checked_at,last_success_at=EXCLUDED.last_success_at;`);
  }
  lines.push(`UPDATE public.universities SET catalogue_fee_verified_count=${u.programmes.filter(p=>p.fee!=null).length},catalogue_intake_verified_count=${u.programmes.length},catalogue_requirements_verified_count=${u.programmes.length},catalogue_last_completed_at=now(),last_catalogue_checked_at=${q(data.checkedAt)},profile_readiness_status='needs_review',outreach_status='profile_incomplete',updated_at=now() WHERE slug=${q(u.slug)};`, "");
}

while (lines.at(-1) === "") lines.pop();
await writeFile(output, `${lines.join("\n\n")}\n`);
console.log(`Wrote ${output.pathname} with ${data.universities.reduce((n,u)=>n+u.programmes.length,0)} programmes.`);
