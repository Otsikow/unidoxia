#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const endpoint = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!endpoint || !anonKey) {
  console.log("Catalogue sitemap entries skipped: public Supabase build credentials are not configured.");
  process.exit(0);
}

async function fetchRows(path) {
  // PostgREST caps unbounded responses (1000 rows by default), so page explicitly.
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(`${endpoint}/rest/v1/${path}&order=id.asc&limit=${pageSize}&offset=${offset}`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (!response.ok) throw new Error(`Catalogue sitemap query failed: ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

const universities = await fetchRows("universities?active=eq.true&listing_status=neq.archived&select=id,slug,updated_at");
// Only courses attached to publicly visible universities belong in the sitemap.
const universityIds = universities.map((university) => university.id);
const programmes = universityIds.length
  ? await fetchRows(`programs?active=eq.true&catalogue_status=eq.active&university_id=in.(${universityIds.join(",")})&select=id,updated_at`)
  : [];
const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const entry = (route, lastmod, priority) => [
  `  <url>`,
  `    <loc>https://unidoxia.com${escapeXml(route)}</loc>`,
  lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
  `    <changefreq>weekly</changefreq>`,
  `    <priority>${priority}</priority>`,
  `  </url>`,
].filter(Boolean).join("\n");
const dynamic = [
  ...universities.map((university) => entry(`/universities/${university.slug || university.id}`, university.updated_at, "0.8")),
  ...programmes.map((programme) => entry(`/courses/${programme.id}`, programme.updated_at, "0.7")),
].join("\n");
const file = new URL("../public/sitemap.xml", import.meta.url);
const current = await readFile(file, "utf8");
await writeFile(file, current.replace("</urlset>", `${dynamic ? `${dynamic}\n` : ""}</urlset>`));
console.log(`Catalogue sitemap appended: ${universities.length} universities, ${programmes.length} courses.`);
