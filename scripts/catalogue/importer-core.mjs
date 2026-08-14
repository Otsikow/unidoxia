import { createHash } from "node:crypto";

export const CATALOGUE_STATUSES = new Set([
  "active", "intake_closed", "temporarily_unavailable", "archived", "discontinued",
]);

// These six rows were committed as the original marketplace pilot before
// official_url existed. Explicit mappings preserve their stable IDs (and any
// application foreign keys) while upgrading them to their official variants.
export const LEGACY_SEED_MAPPINGS = {
  "teesside-university|MSc Computer Science": "Computer Science MSc",
  "teesside-university|MSc International Management": "International Business Management MSc",
  "university-of-sunderland|BSc (Hons) Computer Science": "BSc (Hons) Computer Science",
  "university-of-sunderland|MSc International Business Management": "MSc International Business Management",
  "northumbria-university|International Business Management MSc": "International Business Management MSc 1 Year Full-Time | September Start",
  "northumbria-university|MSc Computer Science": "Computer Science MSc 1 Year Full-Time | September Start",
};

const clean = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const normaliseUrl = (value) => {
  if (!value) return null;
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, "");
};

export function normaliseProgramme(input) {
  const programme = {
    ...input,
    name: clean(input.name ?? input.title),
    qualification: clean(input.qualification) || null,
    level: clean(input.level),
    discipline: clean(input.discipline ?? input.subject) || "Other",
    officialUrl: normaliseUrl(input.officialUrl),
    courseCode: clean(input.courseCode) || null,
    campus: clean(input.campus) || null,
    studyMode: clean(input.studyMode) || null,
    attendance: clean(input.attendance) || null,
    catalogueStatus: input.catalogueStatus || "active",
    tuition: input.tuition ?? null,
    intakes: Array.isArray(input.intakes) ? input.intakes : [],
    sources: Array.isArray(input.sources) ? input.sources : [],
  };
  return programme;
}

export function validateProgramme(input) {
  const programme = normaliseProgramme(input);
  const errors = [];
  const warnings = [];
  if (!programme.name) errors.push("name is required");
  if (!programme.level) errors.push("level is required");
  if (!programme.officialUrl) errors.push("officialUrl is required");
  if (programme.officialUrl && !/^https:\/\//.test(programme.officialUrl)) errors.push("officialUrl must use HTTPS");
  if (!CATALOGUE_STATUSES.has(programme.catalogueStatus)) errors.push("invalid catalogueStatus");
  if (programme.durationMonths != null && (!Number.isInteger(programme.durationMonths) || programme.durationMonths <= 0)) {
    errors.push("durationMonths must be a positive integer or null");
  }
  if (programme.tuition) {
    if (programme.tuition.applicantType !== "international") errors.push("only international tuition may populate the primary import");
    if (programme.tuition.amount != null && programme.tuition.amount < 0) errors.push("tuition amount cannot be negative");
    if (!programme.tuition.feeYear) errors.push("tuition feeYear is required");
    if (!programme.tuition.sourceUrl) errors.push("tuition sourceUrl is required");
  } else {
    warnings.push("international tuition unresolved");
  }
  for (const intake of programme.intakes) {
    if (!Number.isInteger(intake.year) || intake.year < 2020) errors.push("intake year is invalid");
    if (!Number.isInteger(intake.month) || intake.month < 1 || intake.month > 12) errors.push("intake month is invalid");
    if (!intake.sourceUrl) errors.push("intake sourceUrl is required");
  }
  if (!programme.sources.some((source) => source.kind === "programme" && source.url)) {
    warnings.push("programme provenance will be derived from officialUrl");
  }
  return { programme, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function programmeIdentity(input) {
  const p = normaliseProgramme(input);
  return [p.officialUrl, p.courseCode, p.name?.toLowerCase(), p.qualification?.toLowerCase(),
    p.durationMonths ?? "", p.campus?.toLowerCase() ?? "", p.studyMode?.toLowerCase() ?? ""]
    .join("|");
}

export function sourceFingerprint(input) {
  const p = normaliseProgramme(input);
  const stable = JSON.stringify({
    name: p.name, qualification: p.qualification, level: p.level, discipline: p.discipline,
    courseCode: p.courseCode, durationMonths: p.durationMonths ?? null, campus: p.campus,
    studyMode: p.studyMode, attendance: p.attendance, catalogueStatus: p.catalogueStatus,
    tuition: p.tuition, intakes: [...p.intakes].sort((a, b) => `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`)),
    requirements: p.requirements ?? null, englishRequirements: p.englishRequirements ?? null,
    applicationDetails: p.applicationDetails ?? null,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function deduplicateProgrammes(inputs) {
  const seen = new Map();
  const duplicates = [];
  for (const input of inputs) {
    const programme = normaliseProgramme(input);
    const key = programmeIdentity(programme);
    if (seen.has(key)) {
      duplicates.push({ kept: seen.get(key).officialUrl, skipped: programme.officialUrl, key });
      continue;
    }
    seen.set(key, programme);
  }
  return { programmes: [...seen.values()], duplicates };
}

export function mergeRespectingUniversityFields(existing, imported) {
  const locked = new Set(existing.university_locked_fields ?? []);
  const next = { ...existing };
  for (const [key, value] of Object.entries(imported)) {
    if (!locked.has(key) && value !== undefined) next[key] = value;
  }
  return next;
}

export function planImport(dataset, existing = []) {
  if (!dataset?.university?.slug) throw new Error("dataset university.slug is required");
  if (!Array.isArray(dataset.programmes)) throw new Error("dataset programmes must be an array");

  const { programmes, duplicates } = deduplicateProgrammes(dataset.programmes);
  const existingByUrl = new Map(existing.filter((p) => p.official_url).map((p) => [normaliseUrl(p.official_url), p]));
  const legacyExistingByOfficialTitle = new Map();
  for (const current of existing.filter((programme) => !programme.official_url)) {
    const mappedTitle = LEGACY_SEED_MAPPINGS[`${dataset.university.slug}|${current.name}`];
    if (mappedTitle) legacyExistingByOfficialTitle.set(mappedTitle.toLowerCase(), current);
  }
  const seenExistingIds = new Set();
  const items = [];

  for (const input of programmes) {
    const result = validateProgramme(input);
    if (result.errors.length) {
      items.push({ action: "error", sourceKey: programmeIdentity(result.programme), ...result });
      continue;
    }
    if (["needs_manual_review", "source_unavailable", "not_eligible", "duplicate"].includes(input.classification)) {
      items.push({ action: "skip", sourceKey: programmeIdentity(result.programme), ...result,
        warnings: [...result.warnings, `classification ${input.classification} is not production-importable`] });
      continue;
    }
    if (input.classification === "archived_or_discontinued") {
      items.push({ action: "skip", sourceKey: programmeIdentity(result.programme), ...result,
        warnings: [...result.warnings, "historical/discontinued discovery record is retained in the reviewed dataset only"] });
      continue;
    }
    const fingerprint = sourceFingerprint(result.programme);
    const current = existingByUrl.get(result.programme.officialUrl)
      || legacyExistingByOfficialTitle.get(result.programme.name.toLowerCase());
    if (!current) {
      items.push({ action: "create", sourceKey: programmeIdentity(result.programme), fingerprint, ...result });
      continue;
    }
    seenExistingIds.add(current.id);
    items.push({
      action: current.source_fingerprint === fingerprint ? "unchanged" : "update",
      sourceKey: programmeIdentity(result.programme), fingerprint, existing: current, ...result,
    });
  }

  for (const current of existing) {
    if (!seenExistingIds.has(current.id) && current.catalogue_status === "active") {
      items.push({ action: "archive_candidate", sourceKey: current.official_url || current.id, existing: current,
        warnings: ["programme was not found in this source traversal; manual review required"], errors: [] });
    }
  }

  const coverage = {
    discovered: dataset.discovered ?? dataset.programmes.length,
    classified: dataset.classified ?? dataset.programmes.filter((item) => item.classification).length,
    productionReady: items.filter((item) => ["create", "update", "unchanged"].includes(item.action)).length,
    feeVerified: dataset.programmes.filter((item) => item.tuition?.amount != null).length,
    feeUnresolved: dataset.programmes.filter((item) => item.tuition?.amount == null && !["archived_or_discontinued", "not_eligible"].includes(item.classification)).length,
    intakeVerified: dataset.programmes.filter((item) => item.intakes?.length).length,
    requirementsVerified: dataset.programmes.filter((item) => item.requirements).length,
    sourceUnavailable: dataset.programmes.filter((item) => item.classification === "source_unavailable").length,
    manualReview: dataset.programmes.filter((item) => item.classification === "needs_manual_review").length,
  };
  return {
    university: dataset.university,
    source: dataset.source,
    generatedAt: new Date().toISOString(),
    items,
    duplicates,
    summary: items.reduce((counts, item) => ({ ...counts, [item.action]: (counts[item.action] ?? 0) + 1 }), {}), coverage,
  };
}
