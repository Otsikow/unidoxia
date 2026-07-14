import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// simple in-memory rate limiter (per warm instance)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateMap = new Map<string, { count: number; resetAt: number }>();

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
      return new Response(JSON.stringify({ error: 'Too many submissions, please try again shortly.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ success: true, reference_code: 'LEAD-IGNORED' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Validation failed', fields: errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    const todayIso = new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59Z').toISOString();

    const insertRow = {
      tenant_id: DEFAULT_TENANT_ID,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email,
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
      source: str(body.source ?? body.utm_source, 120),
      medium: str(body.medium ?? body.utm_medium, 120),
      campaign: str(body.campaign ?? body.utm_campaign, 120),
      utm_term: str(body.utm_term, 120),
      utm_content: str(body.utm_content, 120),
      landing_page: str(body.landingPage, 500),
      referrer: str(body.referrer, 500),
      lead_score: score,
      lead_temperature: temperature,
      stage: 'New Lead',
      next_follow_up_at: todayIso,
      is_test: bool(body.isTest) ?? false,
      raw_payload: body,
    };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('website_leads')
      .insert(insertRow)
      .select('id, reference_code')
      .single();

    if (error) {
      console.error('Lead insert failed', error);
      return new Response(JSON.stringify({ error: 'Could not save your submission. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort follow-up task; must not fail the submission
    try {
      await supabase.from('tasks').insert({
        tenant_id: DEFAULT_TENANT_ID,
        title: `Follow up with ${fullName} (${data.reference_code})`,
        description: `New website lead — ${email}. Score: ${score} (${temperature}). Preferred: ${preferredDestinations.join(', ') || 'n/a'}.`,
        due_at: todayIso,
        priority: temperature === 'hot' ? 'high' : 'medium',
        status: 'open',
      });
    } catch (e) {
      console.warn('Follow-up task not created', e);
    }

    return new Response(
      JSON.stringify({ success: true, reference_code: data.reference_code, lead_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('submit-website-lead error', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
