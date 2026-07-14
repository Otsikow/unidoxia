import { createClient } from 'npm:@supabase/supabase-js@2';

// Explicit local CORS headers — avoids relying on npm:@supabase/supabase-js@2/cors
// which is not always resolvable in Edge Runtime.
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// In-memory rate limiter (per warm instance).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateMap = new Map<string, { count: number; resetAt: number }>();

// Idempotency window for accidental double-submits (same email + phone).
const DEDUPE_WINDOW_MINUTES = 10;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

function str(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  return t.slice(0, max);
}

function arr(v: unknown, maxItems = 20, maxLen = 120): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => str(x, maxLen))
    .filter((x): x is string => !!x)
    .slice(0, maxItems);
}

function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

function normalizePhone(v: string): string {
  return v.replace(/[^0-9+]/g, '');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{6,25}$/;

export function scoreLead(input: {
  budgetRange?: string | null;
  englishProficiency?: string | null;
  intakeYear?: string | null;
  passportReady?: boolean | null;
  proofOfFundsReady?: boolean | null;
  preferredDestinations?: string[];
  programLevel?: string | null;
}): { score: number; temperature: 'hot' | 'warm' | 'cold' } {
  let score = 0;
  const budget = (input.budgetRange || '').toLowerCase();
  if (budget.includes('above') || budget.includes('35')) score += 25;
  else if (budget.includes('25')) score += 18;
  else if (budget.includes('15')) score += 10;

  const eng = (input.englishProficiency || '').toLowerCase();
  if (eng === 'official' || eng === 'native' || eng === 'advanced') score += 20;
  else if (eng === 'intermediate') score += 10;

  const year = parseInt(input.intakeYear || '', 10);
  const currentYear = new Date().getFullYear();
  if (year && year <= currentYear + 1) score += 20;
  else if (year && year <= currentYear + 2) score += 10;

  if (input.passportReady) score += 10;
  if (input.proofOfFundsReady) score += 15;
  if ((input.preferredDestinations?.length ?? 0) > 0) score += 5;
  if (input.programLevel) score += 5;

  const temperature = score >= 60 ? 'hot' : score >= 30 ? 'warm' : 'cold';
  return { score, temperature };
}

/**
 * Compute the next actionable follow-up moment for Europe/London operations.
 * - Within business hours (Mon–Fri, 09:00–17:00 London): 2 hours from now
 *   (clamped so it never spills past 17:00 the same day).
 * - Outside business hours / weekends: 09:30 on the next business day (London).
 * Returned as an ISO UTC timestamp.
 */
export function computeNextFollowUp(now: Date = new Date()): Date {
  const londonParts = getLondonParts(now);
  const dayOfWeek = londonParts.weekday; // 1=Mon .. 7=Sun
  const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;
  const withinHours =
    !isWeekend && londonParts.hour >= 9 && londonParts.hour < 17;

  if (withinHours) {
    const target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const targetLondon = getLondonParts(target);
    if (targetLondon.hour >= 17 || targetLondon.day !== londonParts.day) {
      // clamp to 16:30 today London
      return londonWallClockToUtc(
        londonParts.year,
        londonParts.month,
        londonParts.day,
        16,
        30,
      );
    }
    return target;
  }

  // Move to next business day at 09:30 London
  let d = new Date(now);
  for (let i = 0; i < 7; i++) {
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const p = getLondonParts(d);
    if (p.weekday >= 1 && p.weekday <= 5) {
      return londonWallClockToUtc(p.year, p.month, p.day, 9, 30);
    }
  }
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function getLondonParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdayStr = get('weekday');
  const weekdayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    weekday: weekdayMap[weekdayStr] ?? 1,
  };
}

// Convert a London wall-clock time to a UTC Date by iterating offsets (BST/GMT safe).
function londonWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Start from a naive UTC candidate, then adjust by observed London offset.
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let i = 0; i < 2; i++) {
    const p = getLondonParts(candidate);
    const deltaHours = hour - p.hour;
    const deltaDays = day - p.day;
    if (deltaHours === 0 && deltaDays === 0) break;
    candidate = new Date(
      candidate.getTime() + (deltaHours + deltaDays * 24) * 60 * 60 * 1000,
    );
  }
  return candidate;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';
    if (!checkRate(ip)) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions, please try again shortly.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Honeypot — reject silently-successfully to avoid feedback to bots
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      return new Response(
        JSON.stringify({ success: true, reference_code: 'LEAD-IGNORED' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const firstName = str(body.firstName, 80);
    const lastName = str(body.lastName, 80);
    const email = str(body.email, 200);
    const phone = str(body.phone, 40);
    const consentGranted = bool(body.consent) ?? false;

    const errors: Record<string, string> = {};
    if (!firstName) errors.firstName = 'First name is required';
    if (!lastName) errors.lastName = 'Last name is required';
    if (!email || !EMAIL_RE.test(email)) errors.email = 'A valid email is required';
    if (!phone || !PHONE_RE.test(phone)) errors.phone = 'A valid phone number is required';
    if (!consentGranted) errors.consent = 'Consent is required';

    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', fields: errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const preferredDestinations = arr(body.preferredDestinations);
    const supportServices = arr(body.supportServices);
    const programLevel = str(body.programLevel, 80);
    const intakeYear = str(body.intakeYear ?? body.preferredIntakeYear, 8);
    const englishProficiency = str(body.englishProficiency, 40);
    const budgetRange = str(body.budgetRange, 80);
    const passportReady = bool(body.passportReady);
    const proofOfFundsReady = bool(body.proofOfFundsReady);

    const { score, temperature } = scoreLead({
      budgetRange,
      englishProficiency,
      intakeYear,
      passportReady,
      proofOfFundsReady,
      preferredDestinations,
      programLevel,
    });

    const fullName = `${firstName} ${lastName}`.trim();
    const nowIso = new Date().toISOString();
    const followUpAt = computeNextFollowUp().toISOString();

    // Attribution: default to 'website' when no source/UTM was supplied.
    const rawSource = str(body.source ?? body.utm_source, 120);
    const source = rawSource ?? 'website';
    const medium = str(body.medium ?? body.utm_medium, 120);
    const campaign = str(body.campaign ?? body.utm_campaign, 120);

    const normalizedEmail = normalizeEmail(email!);
    const normalizedPhone = normalizePhone(phone!);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency: within DEDUPE_WINDOW_MINUTES, same normalized email AND phone
    // returns the existing lead so double-clicks do not create duplicates.
    const dedupeSince = new Date(
      Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();
    const { data: existing } = await supabase
      .from('website_leads')
      .select('id, reference_code, phone, email')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .ilike('email', normalizedEmail)
      .gte('created_at', dedupeSince)
      .limit(5);

    if (existing && existing.length > 0) {
      const match = existing.find(
        (row: { email: string | null; phone: string | null }) =>
          normalizePhone(row.phone ?? '') === normalizedPhone,
      );
      if (match) {
        return new Response(
          JSON.stringify({
            success: true,
            reference_code: match.reference_code,
            lead_id: match.id,
            deduped: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const insertRow = {
      tenant_id: DEFAULT_TENANT_ID,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: normalizedEmail,
      phone,
      whatsapp: str(body.whatsapp, 40),
      preferred_contact: str(body.preferredContact, 20),
      citizenship: str(body.citizenship, 80),
      current_country: str(body.currentLocation ?? body.currentCountry, 80),
      preferred_destinations: preferredDestinations,
      program_level: programLevel,
      study_area: str(body.studyArea, 120),
      field_of_study: str(body.fieldOfStudy, 120),
      study_mode: str(body.studyMode, 40),
      intake_season: str(body.intakeSeason ?? body.preferredIntakeSeason, 40),
      intake_year: intakeYear,
      budget_range: budgetRange,
      highest_education: str(body.highestEducation, 80),
      school_name: str(body.schoolName, 200),
      graduation_year: str(body.graduationYear, 8),
      gpa_scale: str(body.gpaScale, 20),
      grade_average: str(body.gradeAverage, 60),
      english_proficiency: englishProficiency,
      english_test: str(body.englishTest, 40),
      english_test_score: str(body.englishTestScore ?? body.testScore, 20),
      passport_ready: passportReady,
      proof_of_funds_ready: proofOfFundsReady,
      sponsor_ready: bool(body.sponsorReady),
      support_services: supportServices,
      housing_preference: str(body.housingPreference, 40),
      scholarship_interest: bool(body.scholarshipInterest),
      notes: str(body.notes ?? body.additionalNotes, 2000),
      consent_granted: true,
      consent_at: nowIso,
      source,
      medium,
      campaign,
      utm_term: str(body.utm_term, 120),
      utm_content: str(body.utm_content, 120),
      landing_page: str(body.landingPage, 500),
      referrer: str(body.referrer, 500),
      lead_score: score,
      lead_temperature: temperature,
      stage: 'New Lead',
      next_follow_up_at: followUpAt,
      // Public submissions are never marked as test regardless of client input.
      is_test: false,
      raw_payload: body,
    };

    const { data, error } = await supabase
      .from('website_leads')
      .insert(insertRow)
      .select('id, reference_code')
      .single();

    if (error || !data) {
      console.error('Lead insert failed', error);
      return new Response(
        JSON.stringify({
          error: 'Could not save your submission. Please try again.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Best-effort follow-up task. Failure is logged and reported via `warning`
    // so monitoring can detect partial persistence.
    let warning: string | null = null;
    const taskInsert = await supabase.from('tasks').insert({
      tenant_id: DEFAULT_TENANT_ID,
      website_lead_id: data.id,
      title: `Follow up with ${fullName} (${data.reference_code})`,
      description: `New website lead — ${normalizedEmail}. Score: ${score} (${temperature}). Preferred: ${preferredDestinations.join(', ') || 'n/a'}.`,
      due_at: followUpAt,
      priority: temperature === 'hot' ? 'high' : 'medium',
      status: 'open',
    });

    if (taskInsert.error) {
      warning = `follow_up_task_not_created: ${taskInsert.error.message}`;
      console.error('Follow-up task insert failed', taskInsert.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference_code: data.reference_code,
        lead_id: data.id,
        warning,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error('submit-website-lead error', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
