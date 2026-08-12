#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { planImport } from "./importer-core.mjs";

const args = new Set(process.argv.slice(2));
const datasetPath = process.argv.slice(2).find((value) => !value.startsWith("--"));
const apply = args.has("--apply");
const argumentValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const environment = argumentValue("--environment");
if (!datasetPath) {
  console.error("Usage: node scripts/catalogue/import-catalogue.mjs <dataset.json> [--environment staging|production] [--apply] [--confirm-production]");
  process.exit(2);
}

const dataset = JSON.parse(await readFile(datasetPath, "utf8"));
const endpoint = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if ((endpoint || serviceKey) && !environment) throw new Error("Remote dry-runs and applies require --environment staging|production");
if (environment && !["staging", "production"].includes(environment)) throw new Error("--environment must be staging or production");
if (apply && environment === "production" && !args.has("--confirm-production")) {
  throw new Error("Production apply requires --confirm-production after reviewing a production dry-run");
}

async function api(path, options = {}) {
  const response = await fetch(`${endpoint}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json",
      Prefer: options.prefer ?? "return=representation", ...options.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

let university = null;
let existing = [];
if (endpoint && serviceKey) {
  [university] = await api(`universities?slug=eq.${encodeURIComponent(dataset.university.slug)}&select=id,tenant_id,slug`);
  if (!university) throw new Error(`University not found: ${dataset.university.slug}`);
  existing = await api(`programs?university_id=eq.${university.id}&select=*`);
} else if (apply) {
  throw new Error("--apply requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const plan = planImport(dataset, existing);
console.log(JSON.stringify({ mode: apply ? "apply" : "dry_run", environment: environment || "local_plan", university: dataset.university.slug,
  summary: plan.summary, coverage: plan.coverage, duplicates: plan.duplicates.length }, null, 2));

if (!apply) {
  if (plan.items.some((item) => item.action === "error")) process.exitCode = 1;
  process.exit();
}

const [run] = await api("catalogue_import_runs", { method: "POST", body: JSON.stringify({
  university_id: university.id, mode: "apply", source_url: dataset.source.url,
  discovered_count: dataset.programmes.length,
}) });

let failed = 0;
for (const item of plan.items) {
  try {
    if (item.action === "create" || item.action === "update") {
      const p = item.programme;
      const imported = {
        tenant_id: university.tenant_id, university_id: university.id, name: p.name, level: p.level,
        discipline: p.discipline, duration_months: p.durationMonths ?? null, tuition_amount: p.tuition?.amount ?? null,
        tuition_currency: p.tuition?.currency ?? "GBP", qualification: p.qualification, faculty: p.faculty ?? null,
        course_code: p.courseCode, study_mode: p.studyMode, attendance: p.attendance, campus: p.campus,
        delivery_type: p.deliveryType ?? null, placement_available: p.placementAvailable ?? null,
        official_url: p.officialUrl, academic_year: dataset.academicYear ?? null, fee_year: p.tuition?.feeYear ?? null,
        fee_basis: p.tuition?.feeBasis ?? null, international_fee_verified: Boolean(p.tuition?.amount != null),
        catalogue_status: p.catalogueStatus, verification_state: "official_source_verified",
        data_status: p.classification || (p.tuition?.amount == null ? "verified_fee_pending" : "verified_current"),
        source_last_checked_at: dataset.checkedAt, last_imported_at: new Date().toISOString(),
        source_fingerprint: item.fingerprint, overview: p.overview ?? null, modules: p.modules ?? [],
        career_outcomes: p.careerOutcomes ?? null, accreditation: p.accreditation ?? null,
        application_details: p.applicationDetails ?? {}, english_requirements: p.englishRequirements ?? {},
        entry_requirements: p.requirements ?? null, active: p.catalogueStatus === "active",
      };
      const locked = new Set(item.existing?.university_locked_fields ?? []);
      const record = item.action === "update"
        ? Object.fromEntries(Object.entries(imported).filter(([key]) => !locked.has(key)))
        : imported;
      const path = item.action === "update" ? `programs?id=eq.${item.existing.id}` : "programs";
      const [saved] = await api(path, { method: item.action === "update" ? "PATCH" : "POST", body: JSON.stringify(record) });
      item.programId = saved.id;
      if (p.intakes.length) {
        await api("program_intakes?on_conflict=program_id,intake_year,intake_month", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify(p.intakes.map((intake) => ({
          program_id: saved.id, intake_year: intake.year, intake_month: intake.month,
          status: intake.status ?? "available", application_deadline: intake.applicationDeadline ?? null,
          source_url: intake.sourceUrl, last_checked_at: dataset.checkedAt,
        }))) });
      }
      if (p.tuition) {
        await api(`program_fees?program_id=eq.${saved.id}&applicant_type=eq.international&fee_year=eq.${encodeURIComponent(p.tuition.feeYear)}`, { method: "DELETE", prefer: "return=minimal" });
        await api("program_fees", { method: "POST", prefer: "return=minimal", body: JSON.stringify({
          program_id: saved.id, applicant_type: "international", amount: p.tuition.amount,
          currency: p.tuition.currency ?? "GBP", fee_year: p.tuition.feeYear,
          fee_basis: p.tuition.feeBasis ?? "annual", placement_year_amount: p.tuition.placementYearAmount ?? null,
          mandatory_charges: p.tuition.mandatoryCharges ?? [], resolution_status: p.tuition.amount == null ? "unresolved" : "verified",
          source_url: p.tuition.sourceUrl, last_checked_at: dataset.checkedAt,
        }) });
      }
      const sources = p.sources.length ? p.sources : [{ kind: "programme", url: p.officialUrl }];
      await api("catalogue_sources?on_conflict=university_id,program_id,source_url,source_kind", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify(sources.map((source) => ({
        university_id: university.id, program_id: saved.id, source_url: source.url,
        source_kind: source.kind, source_priority: source.priority ?? 1,
        last_checked_at: dataset.checkedAt, last_success_at: dataset.checkedAt,
      }))) });
    }
  } catch (error) {
    failed += 1;
    item.action = "error";
    item.errors = [error.message];
  }
  await api("catalogue_import_items", { method: "POST", prefer: "return=minimal", body: JSON.stringify({
    import_run_id: run.id, program_id: item.programId ?? item.existing?.id ?? null,
    source_url: item.programme?.officialUrl ?? item.existing?.official_url ?? dataset.source.url,
    source_key: item.sourceKey, action: item.action, warnings: item.warnings ?? [],
    error_message: item.errors?.join("; ") || null, payload: item.programme ?? {},
  }) });
}

await api(`catalogue_import_runs?id=eq.${run.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({
  status: failed ? "completed_with_errors" : "completed", completed_at: new Date().toISOString(),
  created_count: plan.summary.create ?? 0, updated_count: plan.summary.update ?? 0,
  unchanged_count: plan.summary.unchanged ?? 0, archived_candidate_count: plan.summary.archive_candidate ?? 0,
  failed_count: failed + (plan.summary.error ?? 0), summary: plan.summary,
}) });

await api(`universities?id=eq.${university.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({
  catalogue_status: (plan.coverage.classified === plan.coverage.discovered && plan.coverage.manualReview === 0 && plan.coverage.sourceUnavailable === 0) ? "needs_review" : "processing",
  catalogue_discovered_count: plan.coverage.discovered, catalogue_processed_count: plan.coverage.classified,
  catalogue_verified_count: plan.coverage.productionReady,
  catalogue_unresolved_count: plan.coverage.manualReview + plan.coverage.sourceUnavailable,
  catalogue_fee_verified_count: plan.coverage.feeVerified,
  catalogue_intake_verified_count: plan.coverage.intakeVerified,
  catalogue_requirements_verified_count: plan.coverage.requirementsVerified,
  catalogue_last_completed_at: new Date().toISOString(), last_catalogue_checked_at: dataset.checkedAt,
  profile_readiness_status: "needs_review", outreach_status: "profile_incomplete",
}) });

if (failed || plan.summary.error) process.exitCode = 1;
