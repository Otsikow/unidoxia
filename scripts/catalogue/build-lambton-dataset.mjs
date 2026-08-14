#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const sourcePath = args.find((value) => !value.startsWith("--"));
const outputIndex = sourcePath ? args.indexOf(sourcePath) + 1 : -1;
const outputPath = outputIndex > 0 && args[outputIndex] && !args[outputIndex].startsWith("--")
  ? args[outputIndex]
  : "data/catalogues/lambton-college-reviewed.json";
const fetchDetails = args.includes("--fetch-details");
if (!sourcePath) throw new Error("Usage: node scripts/catalogue/build-lambton-dataset.mjs <official-catalogue.html> [output.json] [--fetch-details]");

const sourceUrl = "https://www.lambtoncollege.ca/programs/international";
const englishUrl = "https://www.lambtoncollege.ca/international/international-education/language-requirements-esl";
const checkedAt = new Date().toISOString();
const html = await readFile(sourcePath, "utf8");

const decode = (value = "") => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#x27;|&#0?39;|&apos;/gi, "'")
  .replace(/&ndash;|&#8211;/gi, "–")
  .replace(/&mdash;|&#8212;/gi, "—")
  .replace(/&rsquo;|&#8217;/gi, "’")
  .replace(/\s+/g, " ")
  .trim();

const attribute = (tag, name) => decode(tag.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] || "");
const amount = (value) => {
  const numeric = String(value || "").replace(/[^0-9.]/g, "");
  if (!numeric) return null;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};
const monthsFor = (value) => {
  const match = value.match(/\b(One|Two|Three|Four)[ -]Year\b/i)?.[1]?.toLowerCase();
  return ({ one: 12, two: 24, three: 36, four: 48 })[match] || null;
};
const qualificationFor = (credential) => credential
  .replace(/^ontariocollege/i, "Ontario College ")
  .replace(/graduatecertificate/i, "Graduate Certificate")
  .replace(/advanceddiploma/i, "Advanced Diploma")
  .replace(/diploma/i, "Diploma")
  .replace(/certificate/i, "Certificate")
  .replace(/degree/i, "Degree")
  .replace(/\s+/g, " ")
  .trim() || null;
const disciplineFor = (area) => ({
  business: "Business and Management",
  communityservices: "Social and Community Services",
  computerstudies: "Computing and Information Technology",
  educationdesigncreativity: "Education, Design and Creativity",
  emergencyservices: "Emergency Services",
  engineeringsciences: "Engineering and Sciences",
  healthcaresafety: "Health Care and Safety",
  hospitalitytourismculinary: "Hospitality, Tourism and Culinary Arts",
  technologytrades: "Technology and Skilled Trades",
  projectmanagement: "Business and Management",
})[area] || "General Studies";
const levelFor = (level, qualification) => level === "graduate" || /graduate certificate/i.test(qualification || "")
  ? "Graduate Certificate"
  : "Undergraduate";
const intakeStatus = (value) => value === "Open" ? "available" : value === "Closed" ? "closed" : "unavailable";
const englishRequirements = (level) => level === "Graduate Certificate" ? {
  academicYear: "2026/27", ieltsAcademic: "6.5 overall, with no band below 6.0",
  pteAcademic: "60 overall, with no band below 60", toeflIbt: "88 overall, with no band below 18",
  cael: "70 overall, with no band below 60", celpip: "8", ellt: "7",
  lambtonInstituteOfEnglish: "70 overall", sourceUrl: englishUrl, programmeExceptionsApply: true,
} : {
  academicYear: "2026/27", ieltsAcademic: "6.0 overall, with no band below 6.0",
  pteAcademic: "60 overall, with no band below 60", toeflIbt: "78 overall, with no band below 18",
  cael: "60 overall, with no band below 50", celpip: "7", ellt: "6",
  lambtonInstituteOfEnglish: "70 overall", sourceUrl: englishUrl, programmeExceptionsApply: true,
};

const detailFor = (detailHtml) => {
  if (!detailHtml) return {};
  const durationLabel = decode(detailHtml.match(/icon-font-calendar[^>]*><\/span>([\s\S]*?)<\/span>/i)?.[1]);
  const credential = decode(detailHtml.match(/icon-font-grad-cap[^>]*><\/span>([\s\S]*?)<\/span>/i)?.[1]);
  const overview = decode(detailHtml.match(/class="program-description">([\s\S]*?)<\/div>/i)?.[1]) || null;
  const requirements = decode(detailHtml.match(/>Admission Requirements<\/h3>([\s\S]*?)(?:<hr>|<\/section>)/i)?.[1]) || null;
  const costBlock = detailHtml.match(/id="tuitionFees"([\s\S]*?)class="mt-5 additionalfees"/i)?.[1] || "";
  const total = amount(costBlock.match(/class="total-cost[^>]*>([^<]+)/i)?.[1]);
  const terms = [...costBlock.matchAll(/<li>\s*<span>([^<]+)<\/span>\s*\$([0-9,.]+)/gi)].map((match) => ({
    label: decode(match[1]), amount: amount(match[2]), currency: "CAD",
  }));
  const additional = decode(detailHtml.match(/class="mt-5 additionalfees">([\s\S]*?)<script>/i)?.[1]) || null;
  const coursesBlock = detailHtml.match(/id="courses">Courses<\/h2>([\s\S]*?)(?:id="form"|class="contact)/i)?.[1] || "";
  const modules = [...coursesBlock.matchAll(/style="min-width:\s*10rem;">([^<]+)<\/div>[\s\S]*?<h5[^>]*>([^<]+)<\/h5>/gi)]
    .map((match) => `${decode(match[1])} — ${decode(match[2])}`);
  const careers = decode(detailHtml.match(/>Employment Opportunities<\/h3>([\s\S]*?)(?:<\/section>|Looking for Support)/i)?.[1]) || null;
  const coOp = /\bwith Co-op\b/i.test(durationLabel) || /<h2 class="text-center">Co-op<\/h2>/i.test(detailHtml);
  return {
    qualification: credential || null,
    durationLabel: durationLabel || null,
    durationMonths: monthsFor(durationLabel),
    overview,
    requirements,
    modules,
    careerOutcomes: careers,
    tuition: { total, terms, additionalFees: additional, estimated: true },
    coOp,
  };
};

const segments = html.split(/<li role="listitem" class="[^"]*listingpage__list__item complex d-flex"/i).slice(1);
const detailPages = new Map();
if (fetchDetails) {
  const urls = [...new Set(segments.flatMap((segment) => {
    const relativeUrl = segment.match(/class="listingpage__list__item__link" href="([^"]+)"/i)?.[1];
    return relativeUrl ? [new URL(relativeUrl, sourceUrl).toString()] : [];
  }))];
  for (let index = 0; index < urls.length; index += 6) {
    const batch = urls.slice(index, index + 6);
    const pages = await Promise.all(batch.map(async (url) => {
      const response = await fetch(url, {
        headers: { "User-Agent": "UniDoxia official-source catalogue verifier/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`);
      return [url, await response.text()];
    }));
    pages.forEach(([url, page]) => detailPages.set(url, page));
    console.error(`Fetched ${Math.min(index + batch.length, urls.length)}/${urls.length} official programme pages`);
  }
}
const programmes = [];
for (const segment of segments) {
  const openTag = segment.slice(0, segment.indexOf(">") + 1);
  const code = attribute(openTag, "data-code");
  const title = attribute(openTag, "data-title");
  const campus = attribute(openTag, "data-location").replace(/^./, (letter) => letter.toUpperCase());
  if (!code || !title || !["Sarnia", "Ottawa"].includes(campus)) continue;
  const relativeUrl = segment.match(/class="listingpage__list__item__link" href="([^"]+)"/i)?.[1];
  const officialUrl = new URL(relativeUrl, sourceUrl).toString();
  const publishedCip = decode(segment.match(/>CIP Code<\/label>[\s\S]*?class="listingpage__list__item__flex noline">\s*([^<]+)/i)?.[1]);
  const cipCode = publishedCip && !/^n\/?a$/i.test(publishedCip) ? publishedCip : null;
  const pgwpStatus = attribute(openTag, "data-pgwp") === "true" ? "eligible" : attribute(openTag, "data-pgwp") === "false" ? "ineligible" : "unknown";
  const rawQualification = qualificationFor(attribute(openTag, "data-credentials"));
  const level = levelFor(attribute(openTag, "data-level"), rawQualification);
  const detail = fetchDetails ? detailFor(detailPages.get(officialUrl)) : {};
  const qualification = detail.qualification || rawQualification;
  const intakes = [
    { key: "2026F", year: 2026, month: 9 },
    { key: "2027W", year: 2027, month: 1 },
    { key: "2027S", year: 2027, month: 5 },
  ].map(({ key, year, month }) => ({
    year, month, status: intakeStatus(attribute(openTag, `data-intake-${key}`)),
    applicationDeadline: null, sourceUrl,
  }));
  const tuition = {
    applicantType: "international", amount: detail.tuition?.total ?? null, currency: "CAD",
    feeYear: "2026/27", feeBasis: "programme", sourceUrl: officialUrl,
    terms: detail.tuition?.terms || [], additionalFees: detail.tuition?.additionalFees || null,
    estimated: detail.tuition?.estimated ?? true,
  };
  programmes.push({
    title, slug: `${title}-${code}`.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    courseCode: code, qualification, level, discipline: disciplineFor(attribute(openTag, "data-aos")),
    officialUrl, durationMonths: detail.durationMonths ?? null, studyMode: "Full-time", attendance: "On campus",
    campus, deliveryType: /online/i.test(detail.durationLabel || "") ? "Online" : "In person",
    placementAvailable: detail.coOp ?? null, overview: detail.overview || null,
    careerOutcomes: detail.careerOutcomes || null, requirements: detail.requirements || null,
    modules: detail.modules || [], englishRequirements: englishRequirements(level), intakes, tuition,
    applicationDetails: {
      routing: "guidance_only", locationType: campus === "Ottawa" ? "public_saint_paul_university_campus" : "public_main_campus",
      dli: "O19305293332", coOp: detail.coOp ?? null,
      feeBreakdown: { terms: tuition.terms, additionalFees: tuition.additionalFees, estimated: tuition.estimated },
      pgwp: { status: pgwpStatus, cipCode, sourceUrl, checkedAt },
    },
    catalogueStatus: "active", classification: tuition.amount == null ? "verified_fee_pending" : "verified_current",
    verificationState: "official_source_verified", dataStatus: tuition.amount == null ? "verified_fee_pending" : "verified_current",
    sources: [
      { kind: "programme", url: officialUrl, priority: 1 },
      { kind: "intakes", url: sourceUrl, priority: 1 },
      { kind: "fees", url: officialUrl, priority: 1 },
      { kind: "english_requirements", url: englishUrl, priority: 1 },
    ],
  });
}

if (programmes.length < 35) throw new Error(`Discovery guard failed: only ${programmes.length} Lambton programmes parsed`);
const dataset = {
  university: { name: "Lambton College", legalName: "Lambton College of Applied Arts and Technology", slug: "lambton-college", city: "Sarnia", province: "Ontario", country: "Canada", dli: "O19305293332", website: "https://www.lambtoncollege.ca/" },
  source: { url: sourceUrl }, academicYear: "2026/27", checkedAt,
  discovered: programmes.length, classified: programmes.length, programmes,
};
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, discovered: programmes.length, preliminaryExpected: 45, discrepancy: programmes.length - 45, detailsFetched: fetchDetails }, null, 2));
