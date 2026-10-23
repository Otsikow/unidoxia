import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_PRIVACY_LINE,
  FINAL_GRADE_HELPER,
  NO_GAP_MESSAGES,
  VISA_REFUSAL_REASONS,
  backgroundSchema,
  canDeclareNoGap,
  getNoGapStatus,
  isWaecApplicable,
  getPostcodeLabel,
  getLastStudyEndMonthIndex,
  toMonthIndex,
  validateGapHistory,
  validateStudentRegistration,
} from './studentRegistrationSchema';

const TODAY = new Date('2026-10-23T12:00:00Z');

const completeRegistration: Record<string, unknown> = {
  first_name: 'Ama', last_name: 'Mensah', contact_phone: '+233201234567', contact_email: 'ama@example.com',
  date_of_birth: '2000-01-01', gender: 'Female', marital_status: 'Married', dependants_travelling: 1,
  nationality: 'Ghanaian', citizenship: 'Ghanaian', city_of_birth: 'Accra', country_of_birth: 'Ghana',
  passport_number: 'G1234567', passport_issue_date: '2024-01-01', passport_expiry: '2034-01-01', passport_issue_country: 'Ghana',
  address_line_1: '12 Ring Road', country_of_residence: 'Ghana', state_region: 'Greater Accra', city: 'Accra', postal_code: 'GA-123-4567',
  permanent_same_as_mailing: false, permanent_address_line_1: '4 Castle Road', permanent_country: 'Ghana', permanent_state_region: 'Ashanti', permanent_city: 'Kumasi', permanent_postal_code: 'AK-039-5028',
  emergency_contact_name: 'Kojo Mensah', emergency_contact_relationship: 'Uncle', emergency_contact_phone: '+233201111111', emergency_contact_email: 'kojo@example.com',
  has_other_citizenship: true, other_citizenship: 'British', lived_or_studied_abroad: false, previous_immigration_applications: true,
  has_visa_refusals: true, visa_refusal_country: 'United Kingdom', visa_refusal_year: 2023, visa_refusal_type: 'Student', visa_refusal_reason: 'Financial evidence',
  country_of_education: 'Ghana', highest_education_level: 'Undergraduate', secondary_board: 'WAEC', secondary_qualification: 'WASSCE',
  secondary_school_name: 'Accra High', secondary_school_country: 'Ghana', secondary_school_state: 'Greater Accra', secondary_school_city: 'Accra',
  secondary_start_month: 9, secondary_start_year: 2015, secondary_end_month: 6, secondary_end_year: 2018,
  secondary_language_of_instruction: 'English', secondary_grades_band: '70-79%', secondary_final_grade: 'Aggregate 12',
  waec_scratch_card_pin: 'PIN123', waec_scratch_card_serial: 'SER123',
  no_gap_since_study: false,
  work_experience: [
    { employer: 'National Service', job_title: 'Teaching assistant', start_date: '2022-09-01', end_date: '2023-08-31' },
    { employer: 'Mensah Traders', job_title: 'Sales lead', start_date: '2023-09-01', end_date: '', is_current: true },
  ],
};

const completeDegree = {
  institution_name: 'University of Ghana', country: 'Ghana', state_region: 'Greater Accra', city: 'Legon', degree_title: 'BSc Economics',
  final_grade: 'Second Class Upper', grade_scale: 'CGPA out of 4', gpa: 3.4, language_of_instruction: 'English', start_date: '2018-09-01', end_date: '2022-07-31',
};

const validate = (student: Record<string, unknown>, degrees = [completeDegree]) => validateStudentRegistration(student, degrees, TODAY);

const REQUIRED_FIELDS: Array<[string, string]> = [
  ['emergency_contact_name', 'emergency contact full name'],
  ['emergency_contact_relationship', 'emergency contact relationship'],
  ['emergency_contact_phone', 'emergency contact phone'],
  ['emergency_contact_email', 'emergency contact email'],
  ['marital_status', 'marital status'],
  ['dependants_travelling', 'number of dependant children travelling'],
  ['address_line_1', 'home address line 1'],
  ['country_of_residence', 'home country'],
  ['state_region', 'home state or region'],
  ['city', 'home city'],
  ['postal_code', 'home GhanaPost GPS address'],
  ['permanent_address_line_1', 'permanent address line 1'],
  ['permanent_postal_code', 'permanent GhanaPost GPS address'],
  ['date_of_birth', 'date of birth'],
  ['nationality', 'nationality'],
  ['first_name', 'first name'],
  ['last_name', 'last name'],
  ['contact_phone', 'mobile number'],
  ['contact_email', 'email'],
  ['gender', 'gender'],
  ['citizenship', 'citizenship'],
  ['city_of_birth', 'city of birth'],
  ['country_of_birth', 'country of birth'],
  ['passport_number', 'passport number'],
  ['passport_issue_date', 'passport issue date'],
  ['passport_expiry', 'passport expiry date'],
  ['passport_issue_country', 'passport issue country'],
  ['secondary_school_name', 'secondary school name'],
  ['secondary_start_month', 'secondary start month'],
  ['secondary_start_year', 'secondary start year'],
  ['secondary_end_month', 'secondary end month'],
  ['secondary_end_year', 'secondary end year'],
  ['secondary_final_grade', 'secondary final grade'],
  ['country_of_education', 'country of education'],
  ['highest_education_level', 'highest education level'],
  ['secondary_board', 'secondary board'],
  ['secondary_qualification', 'secondary qualification'],
  ['secondary_school_country', 'secondary school country'],
  ['secondary_school_state', 'secondary school state'],
  ['secondary_school_city', 'secondary school city'],
  ['secondary_language_of_instruction', 'secondary language of instruction'],
  ['secondary_grades_band', 'secondary grades band'],
  ['waec_scratch_card_pin', 'WAEC scratch-card PIN'],
  ['waec_scratch_card_serial', 'WAEC scratch-card serial number'],
  ['other_citizenship', 'other citizenship (which country)'],
  ['visa_refusal_country', 'visa refusal country'],
  ['visa_refusal_year', 'visa refusal year'],
  ['visa_refusal_type', 'visa refusal type'],
];

const YES_NO_FIELDS: Array<[string, string]> = [
  ['has_other_citizenship', 'other citizenship'],
  ['lived_or_studied_abroad', 'lived or studied in another country'],
  ['previous_immigration_applications', 'previous immigration applications'],
  ['has_visa_refusals', 'visa refusals'],
];

describe('student registration schema', () => {
  it('accepts a complete registration', () => {
    expect(validate(completeRegistration)).toEqual({ success: true, issues: [] });
  });

  it.each(REQUIRED_FIELDS)('rejects the registration when %s is blank', (field, label) => {
    for (const blank of ['', '   ', null, undefined]) {
      const result = validate({ ...completeRegistration, [field]: blank });
      expect(result.success).toBe(false);
      expect(result.issues).toContain(label);
    }
  });

  it.each(YES_NO_FIELDS)('rejects the registration when %s is unanswered', (field, label) => {
    const result = validate({ ...completeRegistration, [field]: null });
    expect(result.success).toBe(false);
    expect(result.issues).toContain(label);
  });

  it.each(Object.keys(completeDegree))('rejects a degree entry when %s is blank', (field) => {
    const result = validate(completeRegistration, [{ ...completeDegree, [field]: '' }]);
    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.startsWith('degree 1: '))).toBe(true);
  });

  it('accepts no dependant children travelling as 0 but rejects negatives and fractions', () => {
    expect(validate({ ...completeRegistration, dependants_travelling: 0 }).success).toBe(true);
    expect(validate({ ...completeRegistration, dependants_travelling: '0' }).success).toBe(true);
    expect(validate({ ...completeRegistration, dependants_travelling: -1 }).success).toBe(false);
    expect(validate({ ...completeRegistration, dependants_travelling: 1.5 }).success).toBe(false);
  });

  it('requires a valid emergency contact email', () => {
    const result = validate({ ...completeRegistration, emergency_contact_email: 'not-an-email' });
    expect(result.issues).toContain('emergency contact email must be a valid email address');
  });

  it('does not ask for other citizenship or refusal details when the answer is no', () => {
    expect(validate({ ...completeRegistration, has_other_citizenship: false, other_citizenship: '', has_visa_refusals: false, visa_refusal_country: '', visa_refusal_year: null, visa_refusal_type: '' }).success).toBe(true);
  });

  it('does not require permanent address fields when the permanent address is the same', () => {
    expect(validate({
      ...completeRegistration, permanent_same_as_mailing: true, permanent_address_line_1: '', permanent_country: '', permanent_state_region: '', permanent_city: '', permanent_postal_code: '',
    }).success).toBe(true);
  });

  it('rejects education that ends before it starts', () => {
    const secondary = validate({ ...completeRegistration, secondary_start_year: 2018, secondary_end_year: 2015 });
    expect(secondary.issues).toContain('secondary end date must not be before the start date');
    const sameYear = validate({ ...completeRegistration, secondary_start_month: 9, secondary_start_year: 2018, secondary_end_month: 6, secondary_end_year: 2018 });
    expect(sameYear.success).toBe(false);
    const degree = validate(completeRegistration, [{ ...completeDegree, start_date: '2022-09-01', end_date: '2018-07-31' }]);
    expect(degree.issues).toContain('degree 1: end date must not be before the start date');
  });

  it('rejects out of range months', () => {
    expect(validate({ ...completeRegistration, secondary_start_month: 13 }).issues).toContain('secondary start month must be a number from 1 to 12');
  });

  it('uses the GhanaPost GPS label only for Ghana', () => {
    expect(getPostcodeLabel('Ghana')).toBe('GhanaPost GPS address');
    expect(getPostcodeLabel(' ghana ')).toBe('GhanaPost GPS address');
    expect(getPostcodeLabel('United Kingdom')).toBe('Postcode');
    expect(getPostcodeLabel('')).toBe('Postcode');
    const uk = validate({ ...completeRegistration, country_of_residence: 'United Kingdom', postal_code: '' });
    expect(uk.issues).toContain('home postcode');
  });
});

describe('gap or work history', () => {
  it('requires at least one entry unless the student has had no gap', () => {
    const result = validate({ ...completeRegistration, work_experience: [] });
    expect(result.issues).toContain('gap or work history since your last study');
  });

  it('requires activity, from date and to date (or still doing this) for each entry', () => {
    const issues = validateGapHistory({ ...completeRegistration, work_experience: [{ employer: '', start_date: '', end_date: '' }] }, [completeDegree], TODAY);
    expect(issues).toEqual([
      'history entry 1: activity or employer',
      'history entry 1: from date',
      'history entry 1: to date (or tick that you are still doing this)',
    ]);
  });

  it('rejects an entry that ends before it starts', () => {
    const issues = validateGapHistory({ ...completeRegistration, work_experience: [{ employer: 'Volunteering', start_date: '2024-05-01', end_date: '2023-01-01' }] }, [], TODAY);
    expect(issues).toContain('history entry 1: to date must not be before the from date');
  });

  it('allows "no gap" only when the last study ended in the past six months', () => {
    const recent = { ...completeRegistration, work_experience: [], no_gap_since_study: true, secondary_end_month: 7, secondary_end_year: 2026 };
    expect(validateStudentRegistration(recent, [], TODAY).success).toBe(true);

    const longAgo = { ...completeRegistration, work_experience: [], no_gap_since_study: true };
    const result = validateStudentRegistration(longAgo, [completeDegree], TODAY);
    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.startsWith('gap or work history (you can only choose "no gap"'))).toBe(true);
  });

  it('uses the latest of secondary and degree end dates as the last study date', () => {
    expect(getLastStudyEndMonthIndex(completeRegistration, [completeDegree])).toBe(toMonthIndex(2022, 7));
    expect(canDeclareNoGap(toMonthIndex(2026, 4), TODAY)).toBe(true);
    expect(canDeclareNoGap(toMonthIndex(2026, 3), TODAY)).toBe(false);
    expect(canDeclareNoGap(null, TODAY)).toBe(false);
  });
});

describe('reporting every problem at once', () => {
  it('lists conditional problems even when other fields in the section are blank', () => {
    const result = validate({ ...completeRegistration, country_of_residence: '', postal_code: '', has_visa_refusals: true, visa_refusal_country: '', lived_or_studied_abroad: null });
    expect(result.issues).toEqual(expect.arrayContaining(['home country', 'home postcode', 'visa refusal country', 'lived or studied in another country']));
  });
});

describe('existing students (coursefinder_fields_required = false)', () => {
  // A student who signed up before October 2026 and only filled in the fields required then.
  const legacy: Record<string, unknown> = {
    ...completeRegistration,
    coursefinder_fields_required: false,
    dependants_travelling: null,
    has_other_citizenship: true,
    other_citizenship: '',
    has_visa_refusals: true,
    visa_refusal_country: null,
    visa_refusal_year: null,
    visa_refusal_type: null,
    visa_refusal_reason: null,
    secondary_final_grade: '',
    emergency_contact_email: 'not-an-email',
    secondary_end_year: 2010,
    work_experience: [],
    no_gap_since_study: null,
  };
  const legacyDegree = { ...completeDegree, final_grade: '', end_date: '2017-01-01' };

  it('are not blocked by the fields and rules added for CourseFinder', () => {
    expect(validateStudentRegistration(legacy, [legacyDegree], TODAY, false)).toEqual({ success: true, issues: [] });
  });

  it('are still asked for the new fields when the full check runs (banner and checklist)', () => {
    const result = validateStudentRegistration(legacy, [legacyDegree], TODAY, true);
    expect(result.issues).toEqual(expect.arrayContaining([
      'number of dependant children travelling',
      'other citizenship (which country)',
      'visa refusal country',
      'secondary final grade',
      'degree 1: final grade',
    ]));
  });

  it('are still held to the fields that were required before', () => {
    const result = validateStudentRegistration({ ...legacy, passport_number: '' }, [legacyDegree], TODAY, false);
    expect(result.issues).toEqual(['passport number']);
  });
});

describe('visa refusals are structured, with no free text', () => {
  const parse = (value: Record<string, unknown>) => backgroundSchema.safeParse({ ...completeRegistration, ...value });

  it('needs country, year and visa type, and the reason is optional', () => {
    expect(parse({ visa_refusal_reason: null }).success).toBe(true);
    const issues = parse({ visa_refusal_country: '', visa_refusal_year: '', visa_refusal_type: '' }).error?.issues.map((issue) => issue.message);
    expect(issues).toEqual(['visa refusal country', 'visa refusal year', 'visa refusal type']);
  });

  it('only accepts listed visa types and reasons', () => {
    expect(parse({ visa_refusal_type: 'Something else' }).success).toBe(false);
    expect(parse({ visa_refusal_reason: 'They said I lied on the form' }).success).toBe(false);
  });

  it('has no criminal or health reasons in the list', () => {
    expect(VISA_REFUSAL_REASONS.join(' ').toLowerCase()).not.toMatch(/crimin|convict|health|medical|tuberculosis/);
  });

  it('rejects a future or implausible refusal year', () => {
    expect(parse({ visa_refusal_year: 2099 }).success).toBe(false);
    expect(parse({ visa_refusal_year: 1900 }).success).toBe(false);
  });
});

describe('WAEC results card', () => {
  const nonWaec = {
    ...completeRegistration,
    country_of_education: 'India', secondary_school_country: 'India', secondary_board: 'CBSE', secondary_qualification: 'Class XII',
    waec_scratch_card_pin: '', waec_scratch_card_serial: '',
  };

  it('is only asked for a WAEC board or a West African country', () => {
    expect(isWaecApplicable(completeRegistration)).toBe(true);
    expect(isWaecApplicable(nonWaec)).toBe(false);
    expect(isWaecApplicable({ ...nonWaec, secondary_school_country: 'Nigeria' })).toBe(true);
    expect(isWaecApplicable({ ...nonWaec, secondary_school_country: 'The Gambia' })).toBe(true);
    expect(isWaecApplicable({ ...nonWaec, secondary_qualification: 'WASSCE' })).toBe(true);
  });

  it('is not required for students outside West Africa', () => {
    expect(validate(nonWaec).success).toBe(true);
  });

  it('uses worldwide wording for the final grade helper', () => {
    expect(FINAL_GRADE_HELPER).toBe('As shown on your certificate, for example WASSCE aggregate 12, A level AAB or IB 34.');
  });
});

describe('"no gap" edge cases', () => {
  it('treats a degree with no end date as still in progress', () => {
    const ongoing = { ...completeDegree, end_date: null };
    expect(getNoGapStatus(getLastStudyEndMonthIndex(completeRegistration, [ongoing]), TODAY)).toBe('allowed');
    const student = { ...completeRegistration, work_experience: [], no_gap_since_study: true };
    expect(validateGapHistory(student, [ongoing], TODAY)).toEqual([]);
  });

  it('asks for education dates first when there are none', () => {
    expect(getNoGapStatus(getLastStudyEndMonthIndex({}, []), TODAY)).toBe('no-dates');
    expect(NO_GAP_MESSAGES['no-dates']).toBe('Add your education dates first.');
    const student = { ...completeRegistration, secondary_end_year: null, secondary_end_month: null, work_experience: [], no_gap_since_study: true };
    expect(validateGapHistory(student, [], TODAY)).toEqual(['gap or work history (add your education dates first, then choose "no gap")']);
  });

  it('re-checks a "no gap" tick when the dates change later', () => {
    const ticked = { ...completeRegistration, work_experience: [], no_gap_since_study: true, secondary_end_month: 7, secondary_end_year: 2026 };
    expect(validateStudentRegistration(ticked, [], TODAY).success).toBe(true);
    const datesChanged = { ...ticked, secondary_end_year: 2020 };
    expect(validateStudentRegistration(datesChanged, [], TODAY).success).toBe(false);
  });
});

describe('Background privacy line', () => {
  it('uses the wording agreed with Kojo', () => {
    expect(`${BACKGROUND_PRIVACY_LINE} See our Privacy Notice.`).toBe(
      "We need these details to prepare and submit your university applications, as part of the service you've asked us for. We share them only with the universities you apply to and our application partner KC Overseas Education (CourseFinder). See our Privacy Notice.",
    );
  });
});
