#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const sourcePath = process.argv[2];
const outputPath = process.argv[3] || "data/catalogues/lethbridge-polytechnic-reviewed.json";
if (!sourcePath) throw new Error("Usage: node scripts/catalogue/build-lethbridge-dataset.mjs <official-page.html> [output.json]");

const html = await readFile(sourcePath, "utf8");
const sourceUrl = "https://lethpolytech.ca/programs-and-courses/international-programs";
const checkedAt = new Date().toISOString();
const decode = (value = "") => value
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#0?39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();
const disciplineFor = (name) => {
  const rules = [
    [/agric|animal|environment|natural resource|renewable/i, "Agriculture and Environment"],
    [/business|administrative|accounting|management|office/i, "Business and Management"],
    [/nurs|health|massage|exercise|therapeutic|medical/i, "Health and Medicine"],
    [/engineering|technology|computer|software|digital|architectural|interior|animation/i, "Engineering and Technology"],
    [/justice|correction|police|child|social|psychology|sociology/i, "Social and Community Services"],
    [/culinary|baker|cook|tourism/i, "Hospitality and Culinary Arts"],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] || "General Studies";
};
const levelFor = (credential) => /degree/i.test(credential) ? "Undergraduate" : /diploma/i.test(credential) ? "Diploma" : /certificate/i.test(credential) ? "Certificate" : "Other";
const monthFor = (term) => /winter/i.test(term) ? 1 : /summer/i.test(term) ? 5 : 9;
const statusFor = (status) => ({ open: "available", closed: "closed", waitlisting: "waitlisting", provisional: "provisional" }[status.toLowerCase()] || "unknown");

const programmes = [];
for (const segment of html.split('<div class="pl-title-row">').slice(1)) {
  const titleRow = segment;
  const availability = segment;
  const titleMatch = titleRow.match(/class="pl-title">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/);
  if (!titleMatch) continue;
  const starts = decode(titleRow.match(/class="pl-starts-in">([\s\S]*?)<\/div>/)?.[1]);
  const credential = decode(titleRow.match(/class="pl-credential">([\s\S]*?)<\/div>/)?.[1]);
  const name = decode(titleMatch[2]);
  const officialUrl = new URL(titleMatch[1], sourceUrl).toString();
  const careerOutcomes = decode(titleRow.match(/class="career-opportunities[^>]*">([\s\S]*?)<\/div>/)?.[1]) || null;
  const intakes = [];
  let pgwpStatus = "unknown";
  let cipCode = null;
  for (const statusRow of availability.matchAll(/class="pl-status-row">([\s\S]*?)(?=class="pl-status-row"|$)/g)) {
    const term = decode(statusRow[1].match(/class="pl-academic-term">([\s\S]*?)<\/div>/)?.[1]);
    const status = decode(statusRow[1].match(/program_availability international">[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)?.[1]);
    if (!term || !status) continue;
    const year = Number(term.match(/20\d{2}/)?.[0]);
    if (!year) continue;
    intakes.push({
      year,
      month: monthFor(term),
      status: statusFor(status),
      applicationDeadline: year === 2027 && monthFor(term) === 1 ? "2026-09-01" : null,
      sourceUrl,
    });
    const pgwp = decode(statusRow[1].match(/<div class="pgwp">([\s\S]*?)<\/div>/)?.[1]);
    if (/eligible/i.test(pgwp) && !/ineligible/i.test(pgwp)) pgwpStatus = "eligible";
    else if (/ineligible/i.test(pgwp)) pgwpStatus = "ineligible";
    cipCode ||= pgwp.match(/\b\d{2}\.\d{4}\b/)?.[0] || null;
  }
  programmes.push({
    title: name,
    qualification: credential || null,
    level: levelFor(credential),
    discipline: disciplineFor(name),
    officialUrl,
    durationMonths: null,
    studyMode: "Full-time",
    attendance: "On campus",
    campus: "Lethbridge",
    deliveryType: "On campus",
    overview: null,
    careerOutcomes,
    requirements: null,
    englishRequirements: {
      academicYear: "2026/27",
      ieltsAcademic: "6.0 overall, with no band below 6.0 (most programmes)",
      toeflIbt: "80 (most programmes)",
      pteAcademic: "54 (most programmes)",
      sourceUrl: "https://lethpolytech.ca/departments/admissions/entrance-requirements/english-language",
      programmeExceptionsApply: true,
    },
    intakes,
    tuition: {
      applicantType: "international",
      amount: null,
      currency: "CAD",
      feeYear: "2026/27",
      feeBasis: "annual",
      sourceUrl: "https://lethpolytech.ca/document-centre/program-cost-estimates",
    },
    applicationDetails: {
      routing: "guidance_only",
      pgwp: { status: pgwpStatus, cipCode, sourceUrl, checkedAt },
      starts,
      nursingCollaboration: /^Nursing(?: After Degree)? - Bachelor of/i.test(name)
        ? "Collaborative Nursing Education in Southwestern Alberta pathway with the University of Lethbridge; applicants must follow the University of Lethbridge application route."
        : null,
    },
    catalogueStatus: "active",
    classification: "verified_fee_pending",
    verificationState: "official_source_verified",
    dataStatus: "verified_fee_pending",
    sources: [
      { kind: "programme", url: officialUrl, priority: 1 },
      { kind: "intakes", url: sourceUrl, priority: 1 },
      { kind: "english_requirements", url: "https://lethpolytech.ca/departments/admissions/entrance-requirements/english-language", priority: 1 },
    ],
  });
}

if (programmes.length < 30) throw new Error(`Discovery guard failed: only ${programmes.length} programmes parsed`);
const dataset = {
  university: { name: "Lethbridge Polytechnic", slug: "lethbridge-polytechnic", city: "Lethbridge", country: "Canada", website: "https://lethpolytech.ca/" },
  source: { url: sourceUrl }, academicYear: "2026/27", checkedAt,
  discovered: programmes.length, classified: programmes.length,
  programmes,
};
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, discovered: programmes.length, preliminaryExpected: 43, discrepancy: programmes.length - 43 }, null, 2));
