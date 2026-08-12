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

const [universities, programmes] = await Promise.all([
  fetchRows("universities?active=eq.true&listing_status=neq.archived&select=id,slug,updated_at"),
  fetchRows("programs?active=eq.true&catalogue_status=eq.active&select=id,updated_at"),
]);
const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const entry = (route, lastmod, priority) => `  <url>\n    <loc>https://unidoxia.com${escapeXml(route)}</loc>\n    <lastmod>${escapeXml(lastmod || new Date().toISOString())}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
const dynamic = [
  ...universities.map((university) => entry(`/universities/${university.slug || university.id}`, university.updated_at, "0.8")),
  ...programmes.map((programme) => entry(`/courses/${programme.id}`, programme.updated_at, "0.7")),
].join("\n");
const file = new URL("../public/sitemap.xml", import.meta.url);
const current = await readFile(file, "utf8");
await writeFile(file, current.replace("</urlset>", `${dynamic ? `${dynamic}\n` : ""}</urlset>`));
console.log(`Catalogue sitemap appended: ${universities.length} universities, ${programmes.length} courses.`);
