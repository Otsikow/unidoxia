import { describe, expect, it } from 'vitest';
import {
  canDeclareNoGap,
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
  has_visa_refusals: true, visa_refusal_details: 'UK student visa refused in 2023 for insufficient funds evidence',
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
  ['visa_refusal_details', 'visa refusal details'],
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
    expect(validate({ ...completeRegistration, has_other_citizenship: false, other_citizenship: '', has_visa_refusals: false, visa_refusal_details: '' }).success).toBe(true);
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
    const result = validate({ ...completeRegistration, country_of_residence: '', postal_code: '', has_visa_refusals: true, visa_refusal_details: '', lived_or_studied_abroad: null });
    expect(result.issues).toEqual(expect.arrayContaining(['home country', 'home postcode', 'visa refusal details', 'lived or studied in another country']));
  });
});
