import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const input = process.argv[2];
const output = process.argv[3] ?? input;
if (!input) throw new Error("Usage: node scripts/catalogue/enrich-official-programme-sources.mjs <input.json> [output.json]");

const dataset = JSON.parse(await readFile(input, "utf8"));
let manualSources = {};
try {
  const overrides = JSON.parse(await readFile(join(dirname(input), "official-programme-source-overrides.json"), "utf8"));
  manualSources = overrides.sources ?? {};
} catch {}
const decoder = new TextDecoder();
const stopWords = new Set([
  "bachelor", "master", "arts", "science", "sciences", "honours", "honors", "degree", "program", "programme",
  "general", "foundation", "diploma", "year", "years", "and", "with", "the", "of", "in", "to", "part", "optional",
  "co", "op", "ba", "bsc", "mba", "ma", "msc",
]);

function normalize(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value) {
  return [...new Set(normalize(value).split(/\s+/).filter((token) => token.length > 2 && !stopWords.has(token) && !/^\d+$/.test(token)))];
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "UniDoxiaCatalogueVerifier/1.0 (+https://unidoxia.com)" }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return { url: response.url, text: decoder.decode(await response.arrayBuffer()) };
}

function xmlUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].replaceAll("&amp;", "&"));
}

async function discoverSitemaps(origin) {
  const seeds = new Set([new URL("/sitemap.xml", origin).href, new URL("/sitemap_index.xml", origin).href, new URL("/wp-sitemap.xml", origin).href]);
  try {
    const robots = await fetchText(new URL("/robots.txt", origin).href);
    for (const match of robots.text.matchAll(/^sitemap:\s*(\S+)/gim)) seeds.add(match[1]);
  } catch {}
  return [...seeds];
}

async function collectOfficialUrls(origin) {
  const queue = await discoverSitemaps(origin);
  const visited = new Set();
  const pages = new Set();
  while (queue.length && visited.size < 80) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const result = await fetchText(url);
      for (const child of xmlUrls(result.text)) {
        if (/\.xml(?:\?|$)/i.test(child) || /sitemap/i.test(child)) {
          if (!visited.has(child)) queue.push(child);
        } else if (new URL(child).origin === origin) pages.add(child);
      }
    } catch {}
  }
  return [...pages];
}

function scoreUrl(programmeName, url) {
  const wanted = tokens(programmeName);
  if (!wanted.length) return 0;
  const haystack = new Set(tokens(decodeURIComponent(new URL(url).pathname)));
  const matched = wanted.filter((token) => haystack.has(token)).length;
  return matched / wanted.length;
}

function pageConfirms(programmeName, html) {
  const wanted = tokens(programmeName);
  const body = new Set(tokens(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")));
  const matched = wanted.filter((token) => body.has(token)).length;
  return { matched, total: wanted.length, ratio: wanted.length ? matched / wanted.length : 0 };
}

function safeProgrammePage(url) {
  return !/\/(?:news|blog|events?|pressroom|departments?|about|electives)(?:\/|$)/i.test(new URL(url).pathname);
}

for (const institution of dataset.institutions) {
  const origin = new URL(institution.officialUrl).origin;
  let urls = [];
  try {
    urls = await collectOfficialUrls(origin);
  } catch (error) {
    institution.officialSourceDiscoveryError = String(error.message ?? error);
  }
  institution.officialSitemapUrlCount = urls.length;
  for (const programme of institution.programmes) {
    const manualSource = manualSources[`${institution.slug}::${programme.name}`];
    if (manualSource) {
      try {
        const page = await fetchText(manualSource);
        const confirmation = pageConfirms(programme.name, page.text);
        if (safeProgrammePage(page.url)) {
          programme.officialProgrammeUrl = page.url;
          programme.officialProgrammeVerificationStatus = "verified_current";
          programme.officialProgrammeVerifiedAt = new Date().toISOString();
          programme.officialSourceMatch = { url: page.url, method: "human_reviewed_override", pageTokenScore: confirmation.ratio };
          continue;
        }
      } catch (error) {
        // A human-reviewed override may be inaccessible to the Node fetcher
        // because of bot protection even though it was verified in a browser.
        // Preserve that distinction instead of silently treating it as a
        // machine match or discarding the completed human review.
        if (safeProgrammePage(manualSource)) {
          programme.officialProgrammeUrl = manualSource;
          programme.officialProgrammeVerificationStatus = "verified_current";
          programme.officialProgrammeVerifiedAt = new Date().toISOString();
          programme.officialSourceMatch = {
            url: manualSource,
            method: "human_reviewed_override",
            liveFetchStatus: "blocked_or_unavailable",
            liveFetchError: String(error.message ?? error),
          };
          continue;
        }
      }
    }
    const ranked = urls.map((url) => ({ url, score: scoreUrl(programme.name, url) })).filter((item) => item.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, 5);
    let confirmed = null;
    for (const candidate of ranked) {
      try {
        const page = await fetchText(candidate.url);
        const confirmation = pageConfirms(programme.name, page.text);
        if (safeProgrammePage(page.url) && candidate.score >= 0.66 && confirmation.ratio >= 0.75) {
          confirmed = { url: page.url, urlScore: candidate.score, pageTokenScore: confirmation.ratio };
          break;
        }
      } catch {}
    }
    if (confirmed) {
      programme.officialProgrammeUrl = confirmed.url;
      programme.officialProgrammeVerificationStatus = "candidate_machine_match";
      programme.officialProgrammeVerifiedAt = new Date().toISOString();
      programme.officialSourceMatch = { ...confirmed, method: "machine_candidate_only" };
    } else {
      programme.officialProgrammeVerificationStatus = "pending_exact_official_source";
      programme.officialSourceCandidates = ranked;
    }
  }
}

dataset.officialSourceEnrichmentAt = new Date().toISOString();
const remaining = dataset.institutions.flatMap((institution) => institution.programmes).filter((programme) => programme.officialProgrammeVerificationStatus !== "verified_current").length;
const evidenceFields = ["programmeName", "studyLevel", "duration", "tuition", "intakes", "academicRequirements", "englishRequirements", "applicationFee", "deposit", "scholarships"];
const evidenceStatuses = new Set(["verified_current", "not_publicly_stated"]);
const evidenceRemaining = dataset.institutions.flatMap((institution) => institution.programmes).reduce((count, programme) => {
  const fieldCount = evidenceFields.filter((field) => {
    const item = programme.officialEvidence?.[field];
    return !item || !evidenceStatuses.has(item.status) || !item.checkedAt || !item.sourceUrl;
  }).length;
  const comparisonMissing = !programme.tuitionComparison?.status || !programme.tuitionComparison?.publicDisplayDecision || !programme.tuitionComparison?.checkedAt;
  return count + fieldCount + Number(comparisonMissing);
}, 0);
dataset.status = remaining
  ? "official_programme_review_in_progress"
  : evidenceRemaining
    ? "field_evidence_review_in_progress"
    : "import_ready";
dataset.publicationAllowed = remaining === 0 && evidenceRemaining === 0;
await writeFile(output, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ institutions: dataset.institutions.length, programmes: dataset.institutions.flatMap((institution) => institution.programmes).length, officialProgrammeSourcesVerified: 75 - remaining, officialProgrammeSourcesPending: remaining, fieldEvidencePending: evidenceRemaining, publicationAllowed: dataset.publicationAllowed }, null, 2));
