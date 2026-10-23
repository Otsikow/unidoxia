import { z } from 'zod';

/**
 * Client-side rules for the fields CourseFinder (KC Overseas) needs before a
 * student can be submitted. The same rules are enforced on the server by the
 * enforce_coursefinder_required_fields trigger for new student records.
 */

export const PASSPORT_NOTE = 'Enter exactly as shown on your passport.';
export const EMERGENCY_EMAIL_HINT = 'Use another relative or guardian if a parent has no email.';
export const GHANA_POSTCODE_LABEL = 'GhanaPost GPS address';
export const DEFAULT_POSTCODE_LABEL = 'Postcode';
/** A student may say they have had no gap only if their last study ended within this many months. */
export const NO_GAP_THRESHOLD_MONTHS = 6;

export const isGhana = (country: unknown) => typeof country === 'string' && country.trim().toLowerCase() === 'ghana';

export const getPostcodeLabel = (country: unknown) => (isGhana(country) ? GHANA_POSTCODE_LABEL : DEFAULT_POSTCODE_LABEL);

const postcodeWord = (country: unknown) => (isGhana(country) ? GHANA_POSTCODE_LABEL : 'postcode');

export const getPostcodeHelper = (country: unknown) =>
  isGhana(country) ? 'For example GA-123-4567.' : undefined;

const blankToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return value;
};

const requiredText = (label: string) =>
  z.preprocess(blankToUndefined, z.string({ error: label }).min(1, label));

const optionalText = z.preprocess(blankToUndefined, z.string().optional());

const toNumber = (value: unknown) => {
  const cleaned = blankToUndefined(value);
  if (cleaned === undefined) return undefined;
  const parsed = typeof cleaned === 'number' ? cleaned : Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const requiredInt = (label: string, min: number, max: number, rangeMessage: string) =>
  z.preprocess(
    toNumber,
    z.number({ error: label }).refine((value) => !Number.isNaN(value), label).pipe(
      z.number().int(rangeMessage).min(min, rangeMessage).max(max, rangeMessage),
    ),
  );

const requiredYesNo = (label: string) => z.boolean({ error: label });

/**
 * Zod skips refinements once an object already has issues. These rules must
 * still run so every problem is listed at once, hence `when: () => true`.
 */
const always = { when: () => true } as const;
type Loose = Record<string, any>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requiredEmail = (label: string, invalid: string) =>
  z.preprocess(blankToUndefined, z.string({ error: label }).min(1, label).regex(EMAIL_PATTERN, invalid));

/** Months since year 0, so two month/year pairs can be compared. */
export const toMonthIndex = (year: unknown, month: unknown): number | null => {
  const y = toNumber(year);
  const m = toNumber(month);
  if (y === undefined || m === undefined || Number.isNaN(y) || Number.isNaN(m)) return null;
  return y * 12 + (m - 1);
};

/** Accepts YYYY-MM or YYYY-MM-DD. */
export const dateToMonthIndex = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return toMonthIndex(match[1], match[2]);
};

export const isEndBeforeStart = (start: unknown, end: unknown) => {
  if (typeof start !== 'string' || typeof end !== 'string' || !start.trim() || !end.trim()) return false;
  return end.trim() < start.trim();
};

// ---------------------------------------------------------------------------
// Personal, passport, address, emergency contact and background sections
// ---------------------------------------------------------------------------

export const personalSchema = z.object({
  first_name: requiredText('first name'),
  last_name: requiredText('last name'),
  contact_phone: requiredText('mobile number'),
  contact_email: requiredText('email'),
  date_of_birth: requiredText('date of birth'),
  gender: requiredText('gender'),
  marital_status: requiredText('marital status'),
  dependants_travelling: requiredInt(
    'number of dependant children travelling',
    0,
    20,
    'number of dependant children travelling must be a whole number from 0 to 20',
  ),
  nationality: requiredText('nationality'),
  citizenship: requiredText('citizenship'),
  city_of_birth: requiredText('city of birth'),
  country_of_birth: requiredText('country of birth'),
});

export const passportSchema = z.object({
  passport_number: requiredText('passport number'),
  passport_issue_date: requiredText('passport issue date'),
  passport_expiry: requiredText('passport expiry date'),
  passport_issue_country: requiredText('passport issue country'),
});

const PERMANENT_ADDRESS_FIELDS: Array<[string, (value: Loose) => string]> = [
  ['permanent_address_line_1', () => 'permanent address line 1'],
  ['permanent_country', () => 'permanent country'],
  ['permanent_state_region', () => 'permanent state or region'],
  ['permanent_city', () => 'permanent city'],
  ['permanent_postal_code', (value) => `permanent ${postcodeWord(value.permanent_country)}`],
];

export const addressesSchema = z.intersection(
  z.object({
    address_line_1: requiredText('home address line 1'),
    country_of_residence: requiredText('home country'),
    state_region: requiredText('home state or region'),
    city: requiredText('home city'),
  }),
  // A separate branch so these checks run even when the fields above are blank.
  z.any().superRefine((value: Loose, ctx) => {
    if (blankToUndefined(value.postal_code) === undefined) {
      ctx.addIssue({ code: 'custom', path: ['postal_code'], message: `home ${postcodeWord(value.country_of_residence)}` });
    }
    if (value.permanent_same_as_mailing === true) return;
    for (const [key, label] of PERMANENT_ADDRESS_FIELDS) {
      if (blankToUndefined(value[key]) === undefined) ctx.addIssue({ code: 'custom', path: [key], message: label(value) });
    }
  }),
);

export const emergencySchema = z.object({
  emergency_contact_name: requiredText('emergency contact full name'),
  emergency_contact_relationship: requiredText('emergency contact relationship'),
  emergency_contact_phone: requiredText('emergency contact phone'),
  emergency_contact_email: requiredEmail('emergency contact email', 'emergency contact email must be a valid email address'),
});

export const backgroundSchema = z
  .object({
    has_other_citizenship: requiredYesNo('other citizenship'),
    other_citizenship: optionalText,
    lived_or_studied_abroad: requiredYesNo('lived or studied in another country'),
    previous_immigration_applications: requiredYesNo('previous immigration applications'),
    has_visa_refusals: requiredYesNo('visa refusals'),
    visa_refusal_details: optionalText,
  })
  .refine((value: Loose) => value.has_other_citizenship !== true || Boolean(blankToUndefined(value.other_citizenship)), {
    ...always, path: ['other_citizenship'], message: 'other citizenship (which country)',
  })
  .refine((value: Loose) => value.has_visa_refusals !== true || Boolean(blankToUndefined(value.visa_refusal_details)), {
    ...always, path: ['visa_refusal_details'], message: 'visa refusal details',
  });

// ---------------------------------------------------------------------------
// Education history
// ---------------------------------------------------------------------------

const month = (label: string) => requiredInt(label, 1, 12, `${label} must be a number from 1 to 12`);
const year = (label: string) => requiredInt(label, 1950, 2100, `${label} must be a four-digit year`);

export const secondaryEducationSchema = z
  .object({
    country_of_education: requiredText('country of education'),
    highest_education_level: requiredText('highest education level'),
    secondary_board: requiredText('secondary board'),
    secondary_qualification: requiredText('secondary qualification'),
    secondary_school_name: requiredText('secondary school name'),
    secondary_school_country: requiredText('secondary school country'),
    secondary_school_state: requiredText('secondary school state'),
    secondary_school_city: requiredText('secondary school city'),
    secondary_start_month: month('secondary start month'),
    secondary_start_year: year('secondary start year'),
    secondary_end_month: month('secondary end month'),
    secondary_end_year: year('secondary end year'),
    secondary_language_of_instruction: requiredText('secondary language of instruction'),
    secondary_grades_band: requiredText('secondary grades band'),
    secondary_final_grade: requiredText('secondary final grade'),
    waec_scratch_card_pin: requiredText('WAEC scratch-card PIN'),
    waec_scratch_card_serial: requiredText('WAEC scratch-card serial number'),
  })
  .refine((value: Loose) => {
    const start = toMonthIndex(value.secondary_start_year, value.secondary_start_month);
    const end = toMonthIndex(value.secondary_end_year, value.secondary_end_month);
    return start === null || end === null || end >= start;
  }, { ...always, path: ['secondary_end_year'], message: 'secondary end date must not be before the start date' });

export const degreeSchema = z
  .object({
    institution_name: requiredText('institution'),
    country: requiredText('country'),
    state_region: requiredText('state or region'),
    city: requiredText('city'),
    degree_title: requiredText('degree title'),
    final_grade: requiredText('final grade'),
    grade_scale: requiredText('grading scale'),
    gpa: z.preprocess(toNumber, z.number({ error: 'score' }).refine((value) => !Number.isNaN(value), 'score')),
    language_of_instruction: requiredText('language of instruction'),
    start_date: requiredText('start date'),
    end_date: requiredText('end date'),
  })
  .refine((value: Loose) => !isEndBeforeStart(value.start_date, value.end_date), {
    ...always, path: ['end_date'], message: 'end date must not be before the start date',
  });

// ---------------------------------------------------------------------------
// Gap or work history since the last period of study
// ---------------------------------------------------------------------------

export type GapHistoryEntry = {
  employer?: string | null;
  job_title?: string | null;
  city?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  description?: string | null;
};

export const gapHistoryEntrySchema = z
  .object({
    employer: requiredText('activity or employer'),
    start_date: requiredText('from date'),
    end_date: optionalText,
    is_current: z.boolean().nullish(),
  })
  .refine((value: Loose) => Boolean(blankToUndefined(value.end_date)) || value.is_current === true, {
    ...always, path: ['end_date'], message: 'to date (or tick that you are still doing this)',
  })
  .refine((value: Loose) => !isEndBeforeStart(value.start_date, value.end_date), {
    ...always, path: ['end_date'], message: 'to date must not be before the from date',
  });

/** Latest month index at which the student finished any recorded study. */
export const getLastStudyEndMonthIndex = (
  student: Record<string, unknown>,
  degrees: Array<{ end_date?: string | null }> = [],
): number | null => {
  const candidates = [
    toMonthIndex(student.secondary_end_year, student.secondary_end_month),
    ...degrees.map((degree) => dateToMonthIndex(degree.end_date)),
  ].filter((value): value is number => value !== null);
  return candidates.length ? Math.max(...candidates) : null;
};

/** "No gap" is allowed only when the last study ended no more than NO_GAP_THRESHOLD_MONTHS ago (or is still ongoing). */
export const canDeclareNoGap = (lastStudyEnd: number | null, today: Date = new Date()) => {
  if (lastStudyEnd === null) return false;
  const now = today.getFullYear() * 12 + today.getMonth();
  return now - lastStudyEnd <= NO_GAP_THRESHOLD_MONTHS;
};

export const validateGapHistory = (
  student: Record<string, unknown>,
  degrees: Array<{ end_date?: string | null }> = [],
  today: Date = new Date(),
): string[] => {
  const entries = Array.isArray(student.work_experience) ? (student.work_experience as GapHistoryEntry[]) : [];
  const issues: string[] = [];
  if (student.no_gap_since_study === true) {
    if (!canDeclareNoGap(getLastStudyEndMonthIndex(student, degrees), today)) {
      issues.push(
        `gap or work history (you can only choose "no gap" if your last study ended in the past ${NO_GAP_THRESHOLD_MONTHS} months)`,
      );
    }
  } else if (entries.length === 0) {
    issues.push('gap or work history since your last study');
  }
  entries.forEach((entry, index) => {
    const result = gapHistoryEntrySchema.safeParse(entry);
    if (!result.success) {
      result.error.issues.forEach((issue) => issues.push(`history entry ${index + 1}: ${issue.message}`));
    }
  });
  return issues;
};

// ---------------------------------------------------------------------------
// Whole registration
// ---------------------------------------------------------------------------

export const issueMessages = (result: { success: boolean; error?: z.ZodError }) =>
  result.success || !result.error ? [] : result.error.issues.map((issue) => issue.message);

export const fieldErrors = (result: { success: boolean; error?: z.ZodError }) => {
  const errors: Record<string, string> = {};
  if (result.success || !result.error) return errors;
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
};

export const PROFILE_FORM_SCHEMAS = {
  personal: personalSchema,
  passport: passportSchema,
  addresses: addressesSchema,
  emergency: emergencySchema,
  background: backgroundSchema,
} as const;

/** Validates everything a new student must give at registration and onboarding. */
export const validateStudentRegistration = (
  student: Record<string, unknown>,
  degrees: Array<Record<string, unknown>> = [],
  today: Date = new Date(),
): { success: boolean; issues: string[] } => {
  const issues = [
    ...Object.values(PROFILE_FORM_SCHEMAS).flatMap((schema) => issueMessages(schema.safeParse(student))),
    ...issueMessages(secondaryEducationSchema.safeParse(student)),
    ...degrees.flatMap((degree, index) =>
      issueMessages(degreeSchema.safeParse(degree)).map((message) => `degree ${index + 1}: ${message}`),
    ),
    ...validateGapHistory(student, degrees as Array<{ end_date?: string | null }>, today),
  ];
  return { success: issues.length === 0, issues };
};
