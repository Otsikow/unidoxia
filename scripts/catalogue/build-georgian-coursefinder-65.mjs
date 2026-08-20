#!/usr/bin/env node
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const checkedAt = "2026-08-20T00:00:00Z";
const feeYear = "2027";
const coursefinderUrl = "https://app.coursefinder.ai/search-program";
const officialCatalogueUrl = "https://cat.georgiancollege.ca/programs/";
const feeInfoUrl = "https://www.georgiancollege.ca/international/finance-and-fees/";
const specs = [
["Diploma in Practical Nursing","Sep,Jan",30,15238,"PNRS"],
["Diploma in Social Service Worker","Sep,May,Jan",24,15238,"SSWK"],
["Diploma in Early Childhood Education","Sep,May,Jan",24,15238,"ECED"],
["Certificate in Personal Support Worker","Sep,May,Jan",12,15238,"PSWR"],
["Diploma in Occupational Therapist Assistant and Physiotherapist Assistant","Sep,Jan",24,15238,"OPTA"],
["Graduate Certificate in Project Management - Information Technology + Graduate Certificate in Artificial Intelligence Leadership and Management (Bundle program)","Jan",24,16640,"PMIT+LIAI"],
["Honours Bachelor of Science in Nursing","Sep",48,18468,"HBSN"],
["Graduate Certificate in Food and Nutrition Management","Sep,Jan",12,16640,"FDNM"],
["Diploma in Computer Programming (Co-op)","Sep,Jan,May",24,15238,"CMPG"],
["Diploma in Electrical Engineering Technician","Sep,Jan",24,15238,"EETN"],
["Diploma in Electromechanical Engineering Technician - Mechatronics","Sep,Jan",24,15238,"METT"],
["Graduate Certificate in Big Data Analytics","Sep",12,16640,"BDAT"],
["Certificate in Medical Laboratory Assistant","Sep",12,15238,"MLBA"],
["Diploma in Business - Agriculture","Sep",24,15238,"AGRI"],
["Diploma in Heating, Refrigeration and Air Conditioning Technician","Sep",24,15238,"HRAC"],
["Diploma in Pharmacy Technician","Sep,Jan",24,15238,"PHRM"],
["Graduate Certificate in Addictions and Mental Health (Formerly known as Addictions: Treatment and Prevention)","Sep",12,16640,"ADMH"],
["Graduate Certificate in Artificial Intelligence- Architecture, Design, and Implementation","Sep,Jan,May",12,16640,"AIDI"],
["Graduate Certificate in Big Data Analytics + Graduate Certificate in Project Management - Information Technology (Bundled Program)","Sep",24,16640,"BDAT+PMIT"],
["Graduate Certificate in Cybersecurity (Co-op)","Jan",12,16640,"CYBE"],
["Graduate Certificate in Project Management - Information Technology","May,Jan,Sep",12,16640,"PMIT"],
["Graduate Certificate in Therapeutic Recreation","Sep",12,24960,"TREC"],
["Advanced Diploma in Aviation Management (Co-op)","Sep",36,15238,"AVIA"],
["Advanced Diploma in Civil Engineering Technology (Co-op)","Sep",36,15238,"CVTY"],
["Advanced Diploma in Electrical Engineering Technology (Co-op)","Sep,Jan",36,15238,"EETY"],
["Advanced Diploma in Medical Laboratory Technology","Sep",36,15238,"MLBT"],
["Certificate in Carpentry and Renovation Techniques","Sep",12,15238,"CRNT"],
["Certificate in Pre-health Sciences Pathway to Advanced Diplomas and Degrees + Certificate in Personal Support Worker (Bundled program)","Sep,Jan",12,15238,"PHPA+PSWR"],
["Diploma in Biotechnology-Health","Sep,May",24,15238,"BTEC"],
["Diploma in Civil Engineering Technician (Co-op)","Sep",24,15238,"CVET"],
["Diploma in Developmental Services Worker","Sep",24,15238,"DSWR"],
["Diploma in Golf Industry Management","Sep",24,15238,"GLFI"],
["Graduate Certificate in Artificial Intelligence Leadership and Management","Sep",12,16640,"LIAI"],
["Graduate Certificate in Artificial Intelligence Leadership and Management + Graduate Certificate in Project Management - Information Technology (Bundle program)","Sep",24,16640,"LIAI+PMIT"],
["Graduate Certificate in Project Management - Information Technology + Graduate Certificate in Big Data Analytics (Bundle program)","Sep,Jan",24,16640,"PMIT+BDAT"],
["Honours Bachelor of Interior Design","Sep",48,18468,"BAID"],
["Advanced Diploma in Child and Youth Care","Sep",24,15238,"CYCA"],
["Advanced Diploma in Computer Programming and Analysis (Co-op)","Sep,Jan,May",36,15238,"CMPA"],
["Advanced Diploma in Electromechanical Engineering Technology - Mechatronics","Sep,Jan",36,15238,"METR"],
["Advanced Diploma in Environmental Technology (Co-op)","Sep",36,15238,"ENVR"],
["Advanced Diploma in Game - Development","Sep",36,15238,"GAMD"],
["Advanced Diploma in Graphic Design","Sep",36,15238,"GRDE"],
["Advanced Diploma in Massage Therapy","Sep,Jan",24,15238,"MASG"],
["Advanced Diploma in Mechanical Engineering Technology","Sep",36,15238,"METY"],
["Certificate in Mechanical Techniques - Marine Engine Mechanic","Sep",12,15238,"MTME"],
["Certificate in Construction Techniques","Sep,Jan",12,15238,"COTE"],
["Certificate in Culinary Skills","Sep",12,15238,"CULI"],
["Certificate in Electrical Techniques","Sep",12,15238,"ELTQ"],
["Certificate in Gas Technician","Sep",12,22857,"GAST"],
["Certificate in Plumbing Techniques","Sep",12,15238,"PLTQ"],
["Certificate in Pre-health Sciences Pathway to Advanced Diplomas and Degrees","Sep,Jan",12,15238,"PHPA"],
["Certificate in Veterinary Assistant","Jan",12,15238,"VETA"],
["Certificate in Welding Techniques","Sep",12,15238,"WETC"],
["Diploma in Computer Systems Technician - Networking","Sep,Jan",24,15238,"CSTC"],
["Diploma in Environmental Technician","Sep",24,15238,"ENTN"],
["Diploma in Fitness and Health Promotion","Sep",24,15238,"FHPR"],
["Diploma in Game - Design and Simulation","Sep",24,15238,"GAME"],
["Diploma in Graphic Design Production","Sep",24,15238,"GRDP"],
["Diploma in Mechanical Technician - Precision Skills","Sep,May",24,15238,"MTPT"],
["Graduate Certificate in Artificial Intelligence - Architecture, Design, and Implementation + Graduate Certificate in Artificial Intelligence Leadership and Management (Bundled program)","May,Sep,Jan",12,16640,"AIDI+LIAI"],
["Graduate Certificate in Communicative Disorders Assistant","Sep",12,24960,"CODA"],
["Graduate Certificate in Community Crisis and Suicide Response","Sep",12,15238,"CCSR"],
["Graduate Certificate in Digital Content Creation and Strategy","Sep",12,16640,"GCCS"],
["Honours Bachelor of Business Administration (Automotive Management) (Co-op)","Sep",48,18468,"BBAA"],
["Honours Bachelor of Counselling Psychology","Sep",48,18468,"HBCP"],
];

const monthNumber = { Jan: 1, May: 5, Sep: 9 };
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanTitle = (title) => title
  .replace(/^(Advanced Diploma|Diploma|Certificate|Graduate Certificate) in /i, "")
  .replace(/^Honours Bachelor of Science in /i, "Honours Bachelor of Science - ")
  .replace(/\s*\(Co-?op\)/ig, "")
  .trim();
const qualification = (title) => title.startsWith("Graduate Certificate") ? "Ontario College Graduate Certificate"
  : title.startsWith("Advanced Diploma") ? "Ontario College Advanced Diploma"
  : title.startsWith("Diploma") ? "Ontario College Diploma"
  : title.startsWith("Certificate") ? "Ontario College Certificate"
  : "Honours Bachelor's Degree";
const level = (title) => title.startsWith("Graduate Certificate") ? "Graduate Certificate" : "Undergraduate";
const discipline = (title) => /Nurs|Health|Medical|Pharmacy|Therapeutic|Massage|Fitness|Disorders/i.test(title) ? "Health and Medicine"
  : /Computer|Artificial|Big Data|Cyber|Game|Digital Content/i.test(title) ? "Computing and Information Technology"
  : /Engineering|Electrical|Mechanical|Civil|Biotechnology|Environmental|Gas|Plumbing|Welding|Construction|Carpentry|Heating/i.test(title) ? "Engineering and Technology"
  : /Business|Management|Project|Agriculture|Golf/i.test(title) ? "Business and Management"
  : /Child|Social|Developmental|Counselling|Crisis/i.test(title) ? "Social Sciences"
  : "Applied Arts and Services";
const programmes = specs.map(([sourceTitle, months, durationMonths, amount, code], index) => {
  const title = cleanTitle(sourceTitle);
  const primaryCode = code.split("+")[0];
  const bundle = code.includes("+");
  const officialUrl = `${officialCatalogueUrl}${primaryCode.toLowerCase()}/${bundle ? `#bundle-${index + 1}` : ""}`;
  return {
    title, sourceTitle, slug: `${slugify(title)}-${slugify(code)}`, qualification: qualification(sourceTitle),
    level: level(sourceTitle), discipline: discipline(sourceTitle), courseCode: code,
    officialUrl, durationMonths, studyMode: "Full-time", attendance: "On campus", campus: "Georgian College campus",
    deliveryType: "In person", placementAvailable: /Co-?op|Placement|Nurs|Assistant|Therapy|Education|Worker/i.test(sourceTitle),
    overview: `${title} is listed in Georgian College's current programme catalogue. Confirm programme-specific admission, campus and availability details before applying.`,
    requirements: ["Programme-specific admission requirements apply", "International applicants must confirm current eligibility and English-language requirements"],
    intakes: months.split(",").map((month) => ({ year: 2027, month: monthNumber[month], status: "provisional", applicationDeadline: null, sourceUrl: coursefinderUrl })),
    tuition: { applicantType: "international", amount, currency: "CAD", feeYear, feeBasis: "annual", sourceUrl: coursefinderUrl, officiallyVerified: false },
    applicationDetails: { routing: "guidance_only", dli: "O19395677361", intakeAvailabilityMustBeConfirmed: true, feeConfirmationRequired: true, sourceRecord: "Coursefinder authenticated catalogue snapshot" },
    catalogueStatus: "active", classification: "third_party_fee_pending_official_confirmation",
    sources: [{ kind: "programme", url: officialUrl, priority: 1 }, { kind: "fees", url: coursefinderUrl, priority: 2 }, { kind: "fees", url: feeInfoUrl, priority: 1 }],
  };
});

const dataset = { university: { name: "Georgian College", slug: "georgian-college", city: "Barrie", country: "Canada", website: "https://www.georgiancollege.ca/" }, source: { officialCatalogueUrl, coursefinderUrl }, academicYear: "2026/27", checkedAt, discovered: 65, classified: 65, programmes };
await writeFile(new URL("../../data/catalogues/georgian-college-coursefinder-65.json", import.meta.url), `${JSON.stringify(dataset, null, 2)}\n`);

const q = (v) => v == null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`;
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const uuid = (key) => { const h=createHash("sha256").update(`georgian-college:${key}`).digest("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`; };
const sql = ["-- Materialise the reconciled 65-record Georgian College catalogue.", "-- Coursefinder fees and intake months are displayed as sourced, provisional data pending official confirmation.", ""];
for (const p of programmes) {
  const id=uuid(p.officialUrl);
  sql.push(`INSERT INTO public.programs (id, tenant_id, university_id, name, slug, level, discipline, duration_months, tuition_currency, tuition_amount, intake_months, entry_requirements, description, active, requirements_json, qualification, course_code, study_mode, attendance, campus, delivery_type, placement_available, official_url, academic_year, fee_year, fee_basis, international_fee_verified, catalogue_status, verification_state, data_status, source_last_checked_at, last_imported_at, overview, application_details) VALUES (${q(id)},(SELECT tenant_id FROM public.universities WHERE slug='georgian-college'),(SELECT id FROM public.universities WHERE slug='georgian-college'),${q(p.title)},${q(p.slug)},${q(p.level)},${q(p.discipline)},${p.durationMonths},'CAD',${p.tuition.amount},${q(`{${p.intakes.map(i=>i.month).join(",")}}`)}::integer[],${j(p.requirements)},${q(p.overview)},true,${j(p.requirements)},${q(p.qualification)},${q(p.courseCode)},'Full-time','On campus',${q(p.campus)},'In person',${p.placementAvailable},${q(p.officialUrl)},'2026/27','2027','annual',false,'active','official_program_third_party_fee','third_party_fee_pending_official_confirmation',${q(checkedAt)},now(),${q(p.overview)},${j(p.applicationDetails)}) ON CONFLICT (university_id, official_url) WHERE official_url IS NOT NULL DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,level=EXCLUDED.level,discipline=EXCLUDED.discipline,duration_months=EXCLUDED.duration_months,tuition_currency='CAD',tuition_amount=EXCLUDED.tuition_amount,intake_months=EXCLUDED.intake_months,entry_requirements=EXCLUDED.entry_requirements,description=EXCLUDED.description,active=true,requirements_json=EXCLUDED.requirements_json,qualification=EXCLUDED.qualification,course_code=EXCLUDED.course_code,official_url=EXCLUDED.official_url,fee_year='2027',fee_basis='annual',international_fee_verified=false,catalogue_status='active',verification_state='official_program_third_party_fee',data_status='third_party_fee_pending_official_confirmation',source_last_checked_at=EXCLUDED.source_last_checked_at,last_imported_at=now(),overview=EXCLUDED.overview,application_details=EXCLUDED.application_details,updated_at=now();`);
  for (const i of p.intakes) sql.push(`INSERT INTO public.program_intakes (program_id,intake_year,intake_month,status,application_deadline,source_url,last_checked_at) SELECT id,2027,${i.month},'provisional',NULL,${q(coursefinderUrl)},${q(checkedAt)} FROM public.programs WHERE university_id=(SELECT id FROM public.universities WHERE slug='georgian-college') AND official_url=${q(p.officialUrl)} ON CONFLICT (program_id,intake_year,intake_month) DO UPDATE SET status='provisional',source_url=EXCLUDED.source_url,last_checked_at=EXCLUDED.last_checked_at;`);
  sql.push(`INSERT INTO public.program_fees (program_id,applicant_type,amount,currency,fee_year,fee_basis,mandatory_charges,resolution_status,source_url,last_checked_at) SELECT id,'international',${p.tuition.amount},'CAD','2027','annual','[]'::jsonb,'unresolved',${q(coursefinderUrl)},${q(checkedAt)} FROM public.programs WHERE university_id=(SELECT id FROM public.universities WHERE slug='georgian-college') AND official_url=${q(p.officialUrl)} ON CONFLICT (program_id,applicant_type,fee_year,fee_basis) DO UPDATE SET amount=EXCLUDED.amount,currency='CAD',resolution_status='unresolved',source_url=EXCLUDED.source_url,last_checked_at=EXCLUDED.last_checked_at;`);
  for (const s of p.sources) sql.push(`INSERT INTO public.catalogue_sources (university_id,program_id,source_url,source_kind,source_priority,last_checked_at,last_success_at) SELECT university_id,id,${q(s.url)},${q(s.kind)},${s.priority},${q(checkedAt)},${q(checkedAt)} FROM public.programs WHERE university_id=(SELECT id FROM public.universities WHERE slug='georgian-college') AND official_url=${q(p.officialUrl)} ON CONFLICT (university_id,program_id,source_url,source_kind) DO UPDATE SET source_priority=EXCLUDED.source_priority,last_checked_at=EXCLUDED.last_checked_at,last_success_at=EXCLUDED.last_success_at;`);
}
sql.push(`UPDATE public.programs SET active=false,catalogue_status='inactive',updated_at=now() WHERE university_id=(SELECT id FROM public.universities WHERE slug='georgian-college') AND official_url IS NOT NULL AND official_url NOT IN (${programmes.map(p=>q(p.officialUrl)).join(",")});`);
sql.push(`UPDATE public.universities SET catalogue_status='needs_review',catalogue_discovered_count=65,catalogue_processed_count=65,catalogue_verified_count=65,catalogue_unresolved_count=65,catalogue_fee_verified_count=0,catalogue_intake_verified_count=0,last_catalogue_checked_at=${q(checkedAt)},profile_readiness_status='needs_review',outreach_status='profile_incomplete',updated_at=now() WHERE slug='georgian-college';`);
await writeFile(new URL("../../supabase/migrations/20260820220000_georgian_college_coursefinder_65.sql", import.meta.url), `${sql.join("\n\n")}\n`);
console.log(`Wrote 65 Georgian College programmes and migration.`);
