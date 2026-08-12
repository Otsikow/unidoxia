#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const universityKey = value("--university") || "all";
const concurrency = Math.max(1, Math.min(8, Number(value("--concurrency") || 4)));
const resume = !args.includes("--no-resume");
const reclassifyOnly = args.includes("--reclassify-only");
const rawDirectory = value("--input") || "data/catalogue-discovery";
const outputDirectory = value("--output") || "data/catalogues";
const CHECKED_AT = new Date().toISOString();
const RETRIES = 3;
const TARGET_RECRUITMENT_START = new Date("2027-01-01T00:00:00Z");
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

function value(flag) { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decode = (text = "") => text.replace(/\\u002F/g, "/").replace(/\\u00a3|&pound;|&#163;|&#xA3;/gi, "£").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#x27;/g, "'");
const strip = (html = "") => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const first = (html, patterns) => { for (const pattern of patterns) { const match = pattern.exec(html); if (match?.[1]) return strip(match[1]); } return null; };
const truncate = (text, length = 900) => text ? text.slice(0, length).replace(/\s+\S*$/, "").trim() : null;
const durationMonths = (text) => { const months = /([0-9]+)\s*months?/i.exec(text || ""); if (months) return Number(months[1]); const years = /([0-9.]+)\s*years?/i.exec(text || ""); return years ? Math.round(Number(years[1]) * 12) : null; };

function qualification(title = "") {
  const awards = [
    ["BEng Tech (Hons)", /\bBEng\s+Tech\s*\(Hons\)/i], ["BSc (Hons)", /\bBSc\s*(?:\(Hons\)|Hons\b)/i],
    ["BA (Hons)", /\bBA\s*(?:\(Hons\)|Hons\b)/i], ["BEng (Hons)", /\bBEng\s*(?:\(Hons\)|Hons\b)/i],
    ["MEng (Hons)", /\bMEng\s*(?:\(Hons\)|Hons\b)/i], ["MPharm (Hons)", /\bMPharm\s*(?:\(Hons\)|Hons\b)/i],
    ["MOptom (Hons)", /\bMOptom\s*(?:\(Hons\)|Hons\b)/i], ["MMath (Hons)", /\bMMath\s*(?:\(Hons\)|Hons\b)/i],
    ["MPhys (Hons)", /\bMPhys\s*(?:\(Hons\)|Hons\b)/i], ["LLB (Hons)", /\bLLB\s*(?:\(Hons\)|Hons\b)/i],
    ["Professional Doctorate", /\b(?:Doctor of Professional Practice|Professional Doctorate|Doctorate of Design|Doctor of Sport(?: and Exercise Psychology)?|Education Doctorate)\b/i],
    ["Doctorate", /\bDoctorate\b/i],
    ["DBA", /\b(?:DBA|Doctor of Business Administration)\b/i], ["DClinPsy", /\b(?:DClinPsy|Clinical Psychology.*Doctorate)\b/i],
    ["DrPH", /\bDrPH\b/i], ["CertHE", /\b(?:Cert\s*HE|Certificate of Higher Education)\b/i],
    ["ProfGradCertEd", /\bProfGradCertEd\b/i], ["CertEd", /\bCertEd\b/i], ["PGCEi", /\bPGCEi\b/i],
    ["PgDip", /\b(?:PgDip|Postgraduate Diploma)\b/i], ["PgCert", /\b(?:PgCert|Postgraduate Certificate)\b/i],
    ["Degree Apprenticeship", /\bDegree Apprenticeship\b/i], ["Advanced Diploma", /\bAdvanced Diploma\b/i],
    ["Higher Apprenticeship", /\bHigher Apprenticeship\b/i], ["Specialist Apprenticeship", /\bSpecialist Teaching Assistant Apprenticeship\b/i],
    ["Bar Course", /^Bar (?:Course|Knowledge Course|Skills Course)\b/i], ["Pre-sessional English", /^Pre-sessional English Language and Study Skills\b/i],
    ["Certificate", /\bCertificate$/i],
    ["MChem", /\bMChem\b/i], ["MPA", /\bMPA\b|Master of Public Administration/i], ["MPH", /\bMPH\b|Master of Public Health/i],
    ["EMBA", /\bEMBA\b|Executive Master of Business Administration/i], ["MPharm", /\bMPharm\b/i], ["MBChB", /\bMBChB\b/i],
    ["PGCE", /\bPGCE\b/i], ["MArch", /\bMArch\b/i], ["MBA", /\bMBA\b/i], ["LLM", /\bLLM\b/i],
    ["MRes", /\bMRes\b/i], ["MSc", /\bMSc\b/i], ["MCh", /\bMCh\b/i], ["PhD", /\bPhD\b/i],
    ["MA", /\bMA\b/i], ["HND", /\bHND\b/i], ["HNC", /\bHNC\b/i], ["FdA", /\bFdA\b/i], ["FdSc", /\bFdSc\b/i],
  ];
  return awards.find(([, pattern]) => pattern.test(title))?.[0] || null;
}

function subjectFrom(course, html) {
  const department = /["']department["']\s*:\s*["']([^"']+)/i.exec(html)?.[1];
  if (department) return decode(department);
  const segments = new URL(course.sourceUrl).pathname.split("/").filter(Boolean);
  const category = segments.length > 2 ? segments.at(-2) : null;
  return category && !/^(courses|undergraduate|postgraduate)$/i.test(category)
    ? category.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : inferSubject(course.title);
}

function inferSubject(title = "") {
  const groups = [
    ["Computer Science", /comput|software|cyber|data science|artificial intelligence|digital forensic/i],
    ["Business and Management", /business|management|marketing|account|finance|econom|mba/i],
    ["Engineering", /engineer|manufactur|mechatronic/i], ["Law", /\blaw\b|legal|llb|llm/i],
    ["Health and Nursing", /nurs|health|physio|pharmac|medical|medicine|midwif|clinical/i],
    ["Education", /education|teaching|pgce/i], ["Arts and Design", /art|design|animation|film|music|fashion/i],
    ["Social Sciences", /psycholog|sociolog|crimin|politic|history/i],
  ];
  return groups.find(([, pattern]) => pattern.test(title))?.[0] || "Other";
}

async function request(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000), headers: { "user-agent": "UniDoxia catalogue review/1.0 (+https://unidoxia.com)" } });
      if (response.status === 404 || response.status === 410) return { response, html: "" };
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return { response, html: await response.text() };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(500 * (2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function jsonLdCourse(html) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(decode(match[1]));
      const nodes = parsed["@graph"] || (Array.isArray(parsed) ? parsed : [parsed]);
      const course = nodes.find((node) => node?.["@type"] === "Course");
      if (course) return course;
    } catch { /* malformed structured data remains reviewable */ }
  }
  return null;
}

function extractSection(html, headingPattern) {
  const pattern = new RegExp(`<h[2-4][^>]*>[^<]*${headingPattern}[^<]*<\\/h[2-4]>([\\s\\S]{0,7000}?)(?=<h[2-4][^>]*>|$)`, "i");
  return truncate(strip(pattern.exec(html)?.[1] || ""));
}

function extractIntakes(course, html, jsonLd) {
  const candidates = [];
  for (const [month, year] of (course.intakeMonths || []).flatMap((month, index) => (course.intakeYears || []).map((year) => [month, year]))) {
    candidates.push({ month: Number(month), year: Number(year) });
  }
  const structuredDates = [jsonLd?.hasCourseInstance?.startDate].flat().filter(Boolean);
  const dateText = structuredDates.join(" ");
  for (const match of dateText.matchAll(new RegExp(`(${Object.keys(MONTHS).join("|")})\\s+(20\\d{2})`, "gi"))) candidates.push({ month: MONTHS[match[1].toLowerCase()], year: Number(match[2]) });
  if (/tees\.ac\.uk/.test(course.sourceUrl)) {
    const startBlock = [...html.matchAll(/class=["'][^"']*datestart[^"']*["'][^>]*>([\s\S]{0,500})/gi)].map((match) => strip(match[1])).join(" ");
    for (const match of startBlock.matchAll(new RegExp(`(${Object.keys(MONTHS).join("|")})\\s+(20\\d{2})`, "gi"))) candidates.push({ month: MONTHS[match[1].toLowerCase()], year: Number(match[2]) });
  }
  return [...new Map(candidates.filter(({ month, year }) => new Date(Date.UTC(year, month - 1, 1)) >= TARGET_RECRUITMENT_START).map((item) => [`${item.year}-${item.month}`, item])).values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((item) => ({ ...item, status: "available", sourceUrl: course.sourceUrl }));
}

function extractInternationalFee(html, university) {
  const plain = strip(html);
  // Only accept an amount directly attached to the university's explicit
  // international-fee label. Broad proximity matching can silently capture
  // home fees, bursaries or unrelated monetary figures from long pages.
  const patterns = university === "Northumbria University"
    ? [/International Fee in Year 1:?\s*£([0-9,]+)/i]
    : university === "Teesside University"
      ? [/Fee for international applicants\s*£([0-9,]+)/i]
      : [];
  for (const pattern of patterns) {
    const match = pattern.exec(plain);
    if (match) return Number(match[1].replace(/,/g, ""));
  }
  return null;
}

function classify(record, httpStatus) {
  if (httpStatus === 404 || httpStatus === 410) return "archived_or_discontinued";
  if (/^Study a Degree in London \| Northumbria University London$/i.test(record.officialTitle || record.title || "")) return "not_eligible";
  if (/^Advanced Musculoskeletal Physiotherapy Practice/i.test(record.officialTitle || record.title || "") && /\bmodule\b/i.test(record.overview || "")) return "not_eligible";
  if (!record.officialTitle || !record.qualification) return "needs_manual_review";
  if (!record.requirements) return "verified_requirements_pending";
  if (!record.tuition) return "verified_fee_pending";
  return "verified_current";
}

async function reviewCandidate(university, course) {
  try {
    const { response, html } = await request(course.sourceUrl);
    if (response.status === 404 || response.status === 410) return { ...base(course), classification: "archived_or_discontinued", catalogueStatus: "discontinued", sourceHttpStatus: response.status };
    const jsonLd = jsonLdCourse(html);
    const officialTitle = jsonLd?.name || first(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i]);
    const summary = truncate(jsonLd?.description || first(html, [/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i]));
    const durationText = course.duration || first(html, [/>Duration<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i, />Duration<\/[^>]+>\s*<[^>]+>([\s\S]*?)<\//i, /Duration:?\s*<[^>]+>([\s\S]{0,120}?)<\//i]);
    const code = course.programCode || first(html, [/>Course code<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i, /Course code:?\s*<[^>]+>([\s\S]{0,80}?)<\//i]);
    const campus = course.campus || first(html, [/>Location<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i, /Campus:?\s*<[^>]+>([\s\S]{0,100}?)<\//i]);
    const mode = course.studyMode || jsonLd?.hasCourseInstance?.courseMode || first(html, [/>Study mode<\/[^>]+>\s*<[^>]+>([\s\S]{0,100}?)<\//i]);
    const requirements = extractSection(html, "Entry requirements?");
    const englishText = truncate((/IELTS[\s\S]{0,500}/i.exec(strip(html)) || [])[0], 500);
    const tuition = extractInternationalFee(html, university);
    const record = {
      ...base(course), officialTitle, title: officialTitle || course.title, qualification: qualification(officialTitle || course.title),
      subject: subjectFrom(course, html), courseCode: code || null, durationMonths: course.durationMonths || durationMonths(durationText),
      durationText: durationText || null, studyMode: mode || null, attendance: /part.?time/i.test(mode || "") ? "Part-time" : /full.?time/i.test(mode || "") ? "Full-time" : null,
      campus: campus || null, deliveryType: /online|distance/i.test(`${mode} ${officialTitle}`) ? "Online" : "On campus",
      placementAvailable: /placement|advanced practice|sandwich/i.test(`${officialTitle} ${durationText}`), overview: summary,
      requirements, englishRequirements: englishText ? { summary: englishText } : {}, intakes: extractIntakes(course, html, jsonLd),
      tuition: tuition ? { applicantType: "international", amount: tuition, currency: "GBP", feeYear: "2026/27", feeBasis: "annual", sourceUrl: course.sourceUrl } : null,
      catalogueStatus: "active", sourceHttpStatus: response.status, finalSourceUrl: response.url,
    };
    record.classification = classify(record, response.status);
    record.verificationState = record.classification === "verified_current" ? "official_source_verified" : "imported_unverified";
    record.dataStatus = record.classification;
    return record;
  } catch (error) {
    return { ...base(course), classification: "source_unavailable", catalogueStatus: "temporarily_unavailable", error: error.message };
  }
}

function base(course) {
  return { title: course.title, qualification: qualification(course.title), level: normaliseLevel(course.level), discipline: inferSubject(course.title), officialUrl: course.sourceUrl,
    sourceUrl: course.sourceUrl, checkedAt: CHECKED_AT, sources: [{ kind: "programme", url: course.sourceUrl, priority: 1 }] };
}
function normaliseLevel(value = "") { if (/undergraduate/i.test(value)) return "Undergraduate"; if (/postgraduate|master/i.test(value)) return "Postgraduate"; if (/research|phd|doctor/i.test(value)) return "Research"; return value || "Other"; }

async function runPool(items, worker, onResult) {
  let index = 0;
  async function runner() { while (index < items.length) { const current = index++; await onResult(current, await worker(items[current], current)); } }
  await Promise.all(Array.from({ length: concurrency }, runner));
}

const universityMetadata = {
  teesside: { name: "Teesside University", slug: "teesside-university", city: "Middlesbrough", country: "United Kingdom", website: "https://www.tees.ac.uk/" },
  sunderland: { name: "University of Sunderland", slug: "university-of-sunderland", city: "Sunderland", country: "United Kingdom", website: "https://www.sunderland.ac.uk/" },
  northumbria: { name: "Northumbria University", slug: "northumbria-university", city: "Newcastle upon Tyne", country: "United Kingdom", website: "https://www.northumbria.ac.uk/" },
};

await mkdir(outputDirectory, { recursive: true });
const targets = universityKey === "all" ? Object.keys(universityMetadata) : [universityKey];
for (const key of targets) {
  if (!universityMetadata[key]) throw new Error(`Unknown university: ${key}`);
  const raw = JSON.parse(await readFile(path.join(rawDirectory, `${key}.json`), "utf8"));
  const outputPath = path.join(outputDirectory, `${key}-reviewed.json`);
  const checkpointPath = `${outputPath}.checkpoint`;
  if (reclassifyOnly) {
    const existingDataset = JSON.parse(await readFile(outputPath, "utf8"));
    const programmes = existingDataset.programmes.map((record) => {
      const next = { ...record, qualification: qualification(record.officialTitle || record.title) };
      next.classification = classify(next, next.sourceHttpStatus);
      next.dataStatus = next.classification;
      next.verificationState = next.classification === "verified_current" ? "official_source_verified" : "imported_unverified";
      return next;
    });
    const metrics = Object.fromEntries([...new Set(programmes.map((item) => item.classification))].map((status) => [status, programmes.filter((item) => item.classification === status).length]));
    const dataset = { ...existingDataset, classified: programmes.length, metrics, programmes };
    await writeFile(`${outputPath}.tmp`, `${JSON.stringify(dataset, null, 2)}\n`);
    await rename(`${outputPath}.tmp`, outputPath);
    console.log(JSON.stringify({ university: key, discovered: dataset.discovered, classified: dataset.classified, metrics, outputPath }, null, 2));
    continue;
  }
  let reviewed = [];
  if (resume) { try { reviewed = JSON.parse(await readFile(checkpointPath, "utf8")).programmes || []; } catch { reviewed = []; } }
  const completed = new Map(reviewed.map((item) => [item.officialUrl, item]));
  const pending = raw.courses.filter((course) => !completed.has(course.sourceUrl));
  let processed = reviewed.length;
  await runPool(pending, (course) => reviewCandidate(raw.university, course), async (_index, result) => {
    completed.set(result.officialUrl, result); processed += 1;
    if (processed % 20 === 0 || processed === raw.courses.length) {
      const snapshot = { university: universityMetadata[key], source: { url: raw.sources[0] }, academicYear: "2026/27", checkedAt: CHECKED_AT, discovered: raw.uniqueCourses, programmes: [...completed.values()] };
      await writeFile(checkpointPath, `${JSON.stringify(snapshot, null, 2)}\n`);
      console.error(`${key}: ${processed}/${raw.courses.length}`);
    }
  });
  const programmes = [...completed.values()].sort((a, b) => a.title.localeCompare(b.title));
  const metrics = Object.fromEntries([...new Set(programmes.map((item) => item.classification))].map((status) => [status, programmes.filter((item) => item.classification === status).length]));
  const dataset = { university: universityMetadata[key], source: { url: raw.sources[0] }, academicYear: "2026/27", checkedAt: CHECKED_AT, discovered: raw.uniqueCourses, classified: programmes.length, metrics, programmes };
  await writeFile(`${outputPath}.tmp`, `${JSON.stringify(dataset, null, 2)}\n`);
  await rename(`${outputPath}.tmp`, outputPath);
  console.log(JSON.stringify({ university: key, discovered: raw.uniqueCourses, classified: programmes.length, metrics, outputPath }, null, 2));
}
