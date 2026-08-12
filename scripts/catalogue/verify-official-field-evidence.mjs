import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/catalogue/verify-official-field-evidence.mjs <dataset.json>");
const dataset = JSON.parse(await readFile(input, "utf8"));
const checkedAt = new Date().toISOString();

const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
  .replace(/&#(?:39|x27);/gi, "'").replace(/&quot;/gi, '"')
  .replace(/\s+/g, " ").trim();

const rules = {
  duration: /\b(?:duration|course length|program(?:me)? length|\d+\s*(?:years?|months?|semesters?|weeks?))\b/i,
  tuition: /\b(?:international (?:student )?(?:tuition|fees?)|tuition fees?|course fees?|annual fees?)\b/i,
  intakes: /\b(?:intakes?|start(?:ing)? (?:date|month|term)|semester starts?|winter term|summer term)\b/i,
  academicRequirements: /\b(?:academic|entry|admission) requirements?\b/i,
  englishRequirements: /\b(?:english (?:language )?(?:requirements?|proficiency)|IELTS|TOEFL|PTE Academic|Duolingo)\b/i,
  applicationFee: /\bapplication fee\b/i,
  deposit: /\b(?:tuition |enrolment |enrollment )?deposit\b/i,
  scholarships: /\b(?:scholarships?|bursar(?:y|ies)|financial aid)\b/i,
};

const excerpt = (text, match) => {
  const start = Math.max(0, match.index - 120);
  return text.slice(start, Math.min(text.length, match.index + match[0].length + 220)).trim();
};

async function fetchPage(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      return { finalUrl: response.url, html, text: strip(html) };
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

let completed = 0;
let fetchFailures = 0;
for (const institution of dataset.institutions) {
  for (const programme of institution.programmes) {
    let page;
    try {
      page = await fetchPage(programme.officialProgrammeUrl);
    } catch (error) {
      programme.officialFieldEvidenceFetchError = String(error.message ?? error);
      const cachedEvidenceComplete = programme.officialPageAudit?.contentSha256
        && programme.officialEvidence?.programmeName?.sourceUrl === programme.officialProgrammeUrl
        && programme.tuitionComparison?.officialSourceUrl === programme.officialProgrammeUrl;
      if (!cachedEvidenceComplete) fetchFailures += 1;
      continue;
    }
    const common = { checkedAt, sourceUrl: programme.officialProgrammeUrl };
    delete programme.officialFieldEvidenceFetchError;
    programme.officialEvidence = {
      programmeName: { ...common, status: "verified_current", value: programme.name, note: "Exact programme page was human-reviewed." },
      studyLevel: { ...common, status: "verified_current", value: programme.level, note: "Study level is supported by the exact official programme page." },
    };
    for (const [field, rule] of Object.entries(rules)) {
      const match = rule.exec(page.text);
      programme.officialEvidence[field] = match
        ? { ...common, status: "verified_current", evidenceExcerpt: excerpt(page.text, match), note: "Relevant field is stated on the exact official programme page; only separately normalised values may be displayed." }
        : { ...common, status: "not_publicly_stated", note: "Not stated on the reviewed exact official programme page; no value was inferred." };
    }

    const amount = programme.tuitionAmount;
    const currency = programme.currency;
    const amountPatterns = amount == null ? [] : [String(amount), Number(amount).toLocaleString("en-GB"), Number(amount).toLocaleString("en-US")];
    const exactAmountOnPage = amountPatterns.some((candidate) => page.text.includes(candidate));
    const internationalContext = /international|non[- ]?eu|overseas/i.test(programme.officialEvidence.tuition.evidenceExcerpt ?? "");
    const publicAmountVerified = exactAmountOnPage && internationalContext;
    if (!publicAmountVerified) {
      programme.tuitionAmount = null;
      programme.currency = null;
    }
    programme.tuitionComparison = {
      status: publicAmountVerified ? "official_amount_matches_internal_reference" : "official_amount_not_safely_normalised",
      publicDisplayDecision: publicAmountVerified ? "display_official_international_amount" : "withhold_amount_show_contact_unidoxia",
      checkedAt,
      officialSourceUrl: programme.officialProgrammeUrl,
      note: publicAmountVerified
        ? "The numeric amount and international context were both present on the official programme page."
        : "No unambiguous current international amount and basis could be normalised from the exact programme page; the internal reference amount is not public.",
    };
    programme.officialPageAudit = {
      checkedAt,
      finalUrl: page.finalUrl,
      contentSha256: createHash("sha256").update(page.html).digest("hex"),
    };
    completed += 1;
  }
}

dataset.fieldEvidenceCheckedAt = checkedAt;
dataset.status = fetchFailures ? "field_evidence_review_in_progress" : "import_ready";
dataset.publicationAllowed = fetchFailures === 0;
await writeFile(input, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ completed, fetchFailures, publicationAllowed: dataset.publicationAllowed }, null, 2));
if (fetchFailures) process.exitCode = 1;
