// Shared, read-only source for prerendering and sitemap generation. Never use a
// service-role key: these queries must see exactly the public catalogue.
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';

export function publicBuildConfig(environment = process.env) {
  let file = {};
  try { file = parse(readFileSync('.env')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const env = { ...file, ...environment };
  const endpoint = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!endpoint || !key) throw new Error('Public Supabase URL and anon/publishable key are required for SEO builds.');
  return { endpoint, key };
}

export async function fetchPublicRows(query, config = publicBuildConfig(), request = fetch) {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const response = await request(`${config.endpoint}/rest/v1/${query}&order=id.asc&limit=${pageSize}&offset=${offset}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Public SEO query failed (${query.split('?')[0]}): HTTP ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Invalid public SEO response');
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function loadPublicCatalogue() {
  const universities = await fetchPublicRows('universities?active=eq.true&listing_status=neq.archived&select=id,slug,name,city,country,description,featured,featured_priority,featured_summary,website,updated_at');
  const programmes = await fetchPublicRows('programs?active=eq.true&catalogue_status=eq.active&universities.active=eq.true&universities.listing_status=neq.archived&select=id,name,university_id,course_code,level,qualification,duration_months,campus,study_mode,overview,description,entry_requirements,english_requirements,intake_months,updated_at,universities!inner(id),program_intakes(intake_month,intake_year,status),program_fees(amount,currency,fee_basis,fee_year,applicant_type,resolution_status)');
  const ids = new Set(universities.map(u => u.id));
  if (programmes.some(p => !ids.has(p.university_id))) throw new Error('Catalogue changed during build; retry for a consistent public snapshot.');
  return { universities, programmes };
}
