import { beforeEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real edge handler against an in-memory database boundary. No
// production URL, keys, database writes or notification services are involved.
const source = readFileSync('supabase/functions/submit-website-lead/index.ts', 'utf8').replace(/import \{ createClient \} from 'npm:[^']+';/, 'const createClient = globalThis.__leadClient;');
let handler;
let rows;
let tasks;
let fail;
const client = { from(table) {
  let insert;
  const filters = [];
  const query = {
    select() { return query; },
    eq(key, value) { filters.push([key, value]); return query; },
    ilike(key, value) { filters.push([key, value]); return query; },
    gte() { return query; },
    limit() { return Promise.resolve({ data: rows.filter(row => filters.every(([key, value]) => row[key] === value)) }); },
    insert(value) { insert = value; if (table === 'tasks') tasks.push(value); return query; },
    single() { if (fail) return Promise.resolve({ error: { message: 'isolated test failure' } }); rows.push({ ...insert, id: 'test-id', reference_code: 'TEST-123' }); return Promise.resolve({ data: { id: 'test-id', reference_code: 'TEST-123' } }); },
    then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
  };
  return query;
} };
beforeEach(async () => {
  rows = []; tasks = []; fail = false;
  globalThis.__leadClient = () => client;
  globalThis.Deno = { env: { get: () => 'local-only' }, serve: value => { handler = value; } };
  // Unique module gives each test an independent rate limiter.
  await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source) + `\n// ${Math.random()}`).toString('base64')}`);
});
const submit = body => handler(new Request('http://localhost/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const initial = { enquiryType: 'initial', name: 'Local Test', email: 'test@example.invalid', preferredContact: 'email', preferredDestinations: ['United Kingdom'], consent: true };
describe('website lead handling', () => {
  it('saves email-only enquiries and schedules the existing follow-up workflow', async () => {
    const response = await submit(initial);
    expect(response.status).toBe(200); expect((await response.json()).success).toBe(true);
    expect(rows[0].email).toBe(initial.email); expect(rows[0].phone).toBe(null); expect(tasks).toHaveLength(1);
    await submit(initial); expect(rows).toHaveLength(1); expect(tasks).toHaveLength(1);
  });
  it('saves and deduplicates phone-only and WhatsApp enquiries without inventing an email', async () => {
    for (const preferredContact of ['phone', 'whatsapp']) {
      const data = { ...initial, email: undefined, phone: preferredContact === 'phone' ? '+44 7700 900123' : '+44 7700 900456', preferredContact };
      expect((await submit(data)).status).toBe(200); await submit(data);
    }
    expect(rows).toHaveLength(2); expect(rows.every(row => row.email === null)).toBe(true); expect(rows[1].whatsapp).toBe('+447700900456');
  });
  it('rejects missing contact, missing destination, missing consent and invalid methods', async () => {
    for (const patch of [{ email: undefined }, { preferredDestinations: [] }, { consent: false }, { preferredContact: 'invalid' }]) expect((await submit({ ...initial, ...patch })).status).toBe(400);
    expect(rows).toHaveLength(0);
  });
  it('preserves full intake validation and persistence', async () => {
    expect((await submit({ ...initial, enquiryType: undefined })).status).toBe(400);
    expect((await submit({ firstName: 'Local', lastName: 'Test', email: initial.email, phone: '+447700900123', preferredContact: 'email', consent: true, preferredDestinations: ['Canada'], preferredIntakeYear: '2027', preferredIntakeSeason: 'January' })).status).toBe(200);
    expect(rows[0].intake_year).toBe('2027');
  });
  it('returns failure when persistence fails and creates no follow-up task', async () => {
    fail = true; expect((await submit(initial)).status).toBe(500); expect(rows).toHaveLength(0); expect(tasks).toHaveLength(0);
  });
});
