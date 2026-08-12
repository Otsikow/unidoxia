import { readFile } from "node:fs/promises";

const input = process.argv[2];
const requireImportReady = process.argv.includes("--require-import-ready");

if (!input) {
  throw new Error("Usage: node scripts/catalogue/validate-applyboard-portfolio.mjs <dataset.json> [--require-import-ready]");
}

const dataset = JSON.parse(await readFile(input, "utf8"));
const errors = [];
const warnings = [];
const expectedCountries = new Set(["Canada", "Australia", "United States", "Germany", "Ireland"]);
const allowedCurrencies = new Set(["CAD", "AUD", "USD", "EUR"]);
const institutionKeys = new Set();
const programmeKeys = new Set();

if (dataset.institutions?.length !== 15) errors.push(`Expected 15 institutions; found ${dataset.institutions?.length ?? 0}`);

const countryCounts = new Map();
let programmeCount = 0;
let exactOfficialPending = 0;
let fieldEvidencePending = 0;
const evidenceFields = ["programmeName", "studyLevel", "duration", "tuition", "intakes", "academicRequirements", "englishRequirements", "applicationFee", "deposit", "scholarships"];
const evidenceStatuses = new Set(["verified_current", "not_publicly_stated"]);
const unsafeOfficialPath = /\/(?:news|blog|events?|pressroom|departments?|about|electives)(?:\/|$)/i;
const comparableHost = (hostname) => hostname.toLowerCase().replace(/^www\./, "");

for (const institution of dataset.institutions ?? []) {
  countryCounts.set(institution.country, (countryCounts.get(institution.country) ?? 0) + 1);
  if (!expectedCountries.has(institution.country)) errors.push(`${institution.name}: unsupported country ${institution.country}`);
  if (institutionKeys.has(institution.slug)) errors.push(`${institution.name}: duplicate institution slug ${institution.slug}`);
  institutionKeys.add(institution.slug);
  if (institution.applicationChannel !== "applyboard") errors.push(`${institution.name}: applicationChannel must be applyboard`);
  if (institution.directContract !== false) errors.push(`${institution.name}: directContract must be false`);
  if (institution.applyboardAvailable !== true || !institution.applyboardVerifiedAt) errors.push(`${institution.name}: missing ApplyBoard institution verification`);
  if (!/^https:\/\/www\.applyboard\.com\/schools\//.test(institution.applyboardReference ?? "")) errors.push(`${institution.name}: invalid ApplyBoard reference`);
  if ((institution.programmes?.length ?? 0) < 5) errors.push(`${institution.name}: fewer than five programmes`);

  for (const programme of institution.programmes ?? []) {
    programmeCount += 1;
    const key = `${institution.slug}::${programme.name.toLowerCase()}`;
    if (programmeKeys.has(key)) errors.push(`${institution.name}: duplicate programme ${programme.name}`);
    programmeKeys.add(key);
    if (!programme.level) errors.push(`${institution.name} / ${programme.name}: missing level`);
    if (programme.tuitionAmount != null && (!Number.isFinite(programme.tuitionAmount) || programme.tuitionAmount < 0)) errors.push(`${institution.name} / ${programme.name}: invalid tuition`);
    if (programme.currency != null && !allowedCurrencies.has(programme.currency)) errors.push(`${institution.name} / ${programme.name}: invalid currency ${programme.currency}`);
    if (programme.applyboardProgramStatus === "verified_available" && (!programme.applyboardProgramVerifiedAt || !/^https:\/\/www\.applyboard\.com\/schools\/.+\/programs\//.test(programme.applyboardProgramReference ?? ""))) errors.push(`${institution.name} / ${programme.name}: falsely verified ApplyBoard programme`);
    let exactSourceValid = false;
    try {
      const source = new URL(programme.officialProgrammeUrl);
      const institutionOrigin = new URL(institution.officialUrl);
      const approvedHosts = new Set([comparableHost(institutionOrigin.hostname), ...(institution.approvedOfficialHosts ?? []).map(comparableHost)]);
      exactSourceValid = approvedHosts.has(comparableHost(source.hostname)) && !unsafeOfficialPath.test(source.pathname);
    } catch {}
    if (!exactSourceValid || programme.officialProgrammeVerificationStatus !== "verified_current" || programme.officialSourceMatch?.method !== "human_reviewed_override") exactOfficialPending += 1;

    const evidence = programme.officialEvidence;
    for (const field of evidenceFields) {
      const item = evidence?.[field];
      if (!item || !evidenceStatuses.has(item.status) || !item.checkedAt || !item.sourceUrl) fieldEvidencePending += 1;
    }
    if (!programme.tuitionComparison?.status || !programme.tuitionComparison?.publicDisplayDecision || !programme.tuitionComparison?.checkedAt) {
      fieldEvidencePending += 1;
    }
  }
}

for (const country of expectedCountries) {
  if (countryCounts.get(country) !== 3) errors.push(`${country}: expected 3 institutions; found ${countryCounts.get(country) ?? 0}`);
}
if (programmeCount < 75) errors.push(`Expected at least 75 programmes; found ${programmeCount}`);
if (exactOfficialPending) warnings.push(`${exactOfficialPending} programmes still require exact official-university source verification`);
if (fieldEvidencePending) warnings.push(`${fieldEvidencePending} official field-evidence checks remain incomplete`);
if (requireImportReady && exactOfficialPending) errors.push(`Import blocked: ${exactOfficialPending} programmes lack a safe exact current official-university programme page`);
if (requireImportReady && fieldEvidencePending) errors.push(`Import blocked: ${fieldEvidencePending} official field-evidence checks remain incomplete`);
if (requireImportReady && dataset.publicationAllowed !== true) errors.push("Import blocked: publicationAllowed is not true");

const result = { valid: errors.length === 0, importReady: errors.length === 0 && exactOfficialPending === 0 && fieldEvidencePending === 0 && dataset.publicationAllowed === true, institutions: dataset.institutions?.length ?? 0, programmes: programmeCount, countryCounts: Object.fromEntries(countryCounts), exactOfficialPending, fieldEvidencePending, errors, warnings };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
