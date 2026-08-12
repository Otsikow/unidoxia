#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const CHECKED_AT = new Date().toISOString();
const args = process.argv.slice(2);
const selected = args.includes("--university") ? args[args.indexOf("--university") + 1] : "all";
const outputDirectory = args.includes("--output") ? args[args.indexOf("--output") + 1] : "data/catalogue-discovery";
const RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, headers: { "user-agent": "UniDoxia catalogue research/1.0", ...(options.headers || {}) } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(300 * attempt);
    }
  }
  throw new Error(`${url}: ${lastError?.message || "request failed"}`);
}

const decode = (value) => value
  .replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const qualificationFromTitle = (title) => {
  const known = ["Postgraduate Certificate in Education (PGCE)", "BSc (Hons)", "BA (Hons)", "BEng (Hons)", "MEng (Hons)", "LLB (Hons)", "PGCE", "PgCert", "PgDip", "MArch", "MBA", "MPH", "LLM", "MRes", "MSc", "MCh", "MPharm", "MBChB", "PhD", "MA"];
  return known.find((award) => new RegExp(`(^|[^a-z])${award.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(title)) || "Check official qualification";
};

const durationMonths = (value) => {
  const years = /([0-9.]+)\s*years?/i.exec(value || "");
  if (years) return Math.round(Number(years[1]) * 12);
  const months = /([0-9]+)\s*months?/i.exec(value || "");
  return months ? Number(months[1]) : null;
};

async function discoverTeesside() {
  const sources = [
    ["Undergraduate", "https://www.tees.ac.uk/undergraduate_courses/az.cfm"],
    ["Postgraduate", "https://www.tees.ac.uk/postgraduate_courses/az.cfm"],
  ];
  const courses = [];
  const errors = [];
  for (const [level, source] of sources) {
    try {
      const html = await (await request(source)).text();
      const pattern = /<a\s+href="(https:\/\/www\.tees\.ac\.uk\/(?:undergraduate|postgraduate)_courses\/[^"#?]+\.cfm)"[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      for (const match of html.matchAll(pattern)) {
        const title = decode(match[2] || match[3]);
        courses.push({ title, qualification: qualificationFromTitle(title), level, sourceUrl: match[1], sourceType: "official_course_catalogue", lastCheckedAt: CHECKED_AT, catalogueStatus: "discovered", dataStatus: "incomplete" });
      }
    } catch (error) { errors.push({ source, error: error.message }); }
  }
  return catalogue("Teesside University", sources.map(([, url]) => url), courses, errors);
}

async function discoverNorthumbria() {
  const endpoint = "https://www.northumbria.ac.uk/api/course/search";
  const courses = [];
  const errors = [];
  for (const level of ["undergraduate", "postgraduate", "research"]) {
    try {
      const response = await request(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ls: level, page: 1, ShowTNE: "False" }) });
      const payload = await response.json();
      const groups = payload?.results?.items || [];
      for (const group of groups) {
        const variants = group.items?.length ? group.items : [group.firstContentItem].filter(Boolean);
        for (const item of variants) {
          if (item.withdrawn || item.neverPublish || !item.url) continue;
          courses.push({
            title: decode(item.title || item.pageTitle), qualification: qualificationFromTitle(item.title || ""), level: item.levelOfStudy || level,
            programCode: item.mcrCode || null, duration: item.duration || null, durationMonths: durationMonths(item.duration), studyMode: item.modeOfStudy || null,
            campus: item.location || null, intakeMonths: (item.startMonths || []).map(Number), intakeYears: (item.startYears || []).map(Number),
            overview: item.pageDescription || item.summary || null, sourceUrl: new URL(item.url, "https://www.northumbria.ac.uk").href,
            sourceType: "official_course_search_api", lastCheckedAt: CHECKED_AT, catalogueStatus: "discovered", dataStatus: "needs_fee_review",
          });
        }
      }
    } catch (error) { errors.push({ source: `${endpoint} (${level})`, error: error.message }); }
  }
  return catalogue("Northumbria University", [endpoint], courses, errors);
}

async function discoverSunderland() {
  const source = "https://www.sunderland.ac.uk/sitemap.xml";
  const errors = [];
  const courses = [];
  try {
    const xml = await (await request(source)).text();
    const paths = [...xml.matchAll(/<loc>(https:\/\/www\.sunderland\.ac\.uk\/(undergraduate|postgraduate)\/([^?<]+))(?:\?[^<]*)?<\/loc>/gi)]
      .map((match) => ({ url: match[1], level: match[2] === "undergraduate" ? "Undergraduate" : "Postgraduate", slug: match[3] }))
      .filter(({ slug }) => /^(?:ba-|bsc-|beng-|llb-|fd|certificate-|mbchb-|mpharm-|ma-|msc-|mba-|mph-|llm-|mres-|pgcert-|pgdip-|doctorate-|phd-)/i.test(slug));
    const unique = [...new Map(paths.map((entry) => [entry.url, entry])).values()];
    for (const entry of unique) {
      const title = decode(entry.slug.split("-").map((part) => part.toUpperCase() === "MSC" ? "MSc" : part.toUpperCase() === "MBA" ? "MBA" : part.charAt(0).toUpperCase() + part.slice(1)).join(" "));
      courses.push({ title, qualification: qualificationFromTitle(title), level: entry.level, sourceUrl: entry.url, sourceType: "official_sitemap_discovery", lastCheckedAt: CHECKED_AT, catalogueStatus: "discovered_needs_page_parse", dataStatus: "incomplete" });
    }
  } catch (error) { errors.push({ source, error: error.message }); }
  return catalogue("University of Sunderland", [source], courses, errors);
}

function catalogue(university, sources, rawCourses, errors) {
  const unique = [...new Map(rawCourses.map((course) => [`${course.programCode || course.sourceUrl}|${course.title}|${course.duration || ""}`, course])).values()];
  return { schemaVersion: 1, university, discoveredAt: CHECKED_AT, sources, discovered: rawCourses.length, uniqueCourses: unique.length, duplicatesRemoved: rawCourses.length - unique.length, errors, courses: unique };
}

const adapters = { teesside: discoverTeesside, sunderland: discoverSunderland, northumbria: discoverNorthumbria };
const targets = selected === "all" ? Object.keys(adapters) : [selected];
await fs.mkdir(outputDirectory, { recursive: true });
const summary = [];
for (const target of targets) {
  if (!adapters[target]) throw new Error(`Unknown university adapter: ${target}`);
  const result = await adapters[target]();
  const file = path.join(outputDirectory, `${target}.json`);
  await fs.writeFile(file, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  summary.push({ university: result.university, uniqueCourses: result.uniqueCourses, duplicatesRemoved: result.duplicatesRemoved, errors: result.errors.length, file });
}
console.log(JSON.stringify({ checkedAt: CHECKED_AT, summary }, null, 2));
