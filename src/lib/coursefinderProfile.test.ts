import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateCourseFinderCompleteness,
  COURSEFINDER_SUBMISSION_STATUSES,
  isProfileGateClear,
  profileStillBlocks,
  isValidOverrideReason,
  profileGateMessage,
  studentProfileLink,
  gateOptions,
  getCourseFinderProfileSections,
  getCourseFinderSubmissionBlockers,
  getMissingProfileFields,
  requiresCompleteProfileForStatus,
  validateCourseFinderDegree,
  validateCourseFinderTest,
} from './coursefinderProfile';

const completeStudent = {
  first_name: 'Ama', last_name: 'Mensah', middle_name: '', contact_phone: '+233201234567', contact_email: 'ama@example.com',
  date_of_birth: '2000-01-01', gender: 'female', marital_status: 'single', dependants_travelling: 0, nationality: 'Ghanaian', citizenship: 'Ghanaian', city_of_birth: 'Accra', country_of_birth: 'Ghana',
  passport_number: 'G123', passport_issue_date: '2024-01-01', passport_expiry: '2034-01-01', passport_issue_country: 'Ghana',
  address_line_1: '1 High Street', country_of_residence: 'Ghana', state_region: 'Greater Accra', city: 'Accra', postal_code: 'GA1', permanent_same_as_mailing: true,
  emergency_contact_name: 'Kojo Mensah', emergency_contact_relationship: 'Parent', emergency_contact_phone: '+233201111111', emergency_contact_email: 'kojo@example.com',
  has_other_citizenship: false, lived_or_studied_abroad: false, previous_immigration_applications: false, has_visa_refusals: false,
  country_of_education: 'Ghana', highest_education_level: 'secondary', secondary_board: 'WAEC', secondary_qualification: 'WASSCE', secondary_school_name: 'Accra High', secondary_school_country: 'Ghana', secondary_school_state: 'Greater Accra', secondary_school_city: 'Accra', secondary_start_month: 9, secondary_start_year: 2016, secondary_end_month: 6, secondary_end_year: 2019, secondary_language_of_instruction: 'English', secondary_grades_band: '80-89%', secondary_final_grade: 'WASSCE aggregate 12', waec_scratch_card_pin: 'PIN123', waec_scratch_card_serial: 'SER123',
  work_experience: [{ employer: 'Mensah Traders', job_title: 'Sales assistant', start_date: '2019-08-01', end_date: '', is_current: true }],
};

describe('CourseFinder profile rules', () => {
  it('treats optional fields as optional', () => {
    const sections = getCourseFinderProfileSections(completeStudent, [], [], true);
    expect(sections.every((section) => section.completed)).toBe(true);
    expect(calculateCourseFinderCompleteness(sections)).toBe(100);
  });

  it('does not count the optional WhatsApp number towards completeness', () => {
    const withoutWhatsApp = getCourseFinderProfileSections({ ...completeStudent, whatsapp_number: null }, [], [], true);
    const withWhatsApp = getCourseFinderProfileSections({ ...completeStudent, whatsapp_number: '+233501234567' }, [], [], true);
    expect(calculateCourseFinderCompleteness(withoutWhatsApp)).toBe(100);
    expect(calculateCourseFinderCompleteness(withWhatsApp)).toBe(100);
  });

  it('requires every specified personal and background field', () => {
    const sections = getCourseFinderProfileSections({ ...completeStudent, gender: '', has_visa_refusals: null }, [], [], true);
    expect(sections.find((section) => section.id === 'personal')?.missing).toContain('gender');
    expect(sections.find((section) => section.id === 'background')?.missing).toContain('visa refusals');
  });

  it('accepts the same-as-mailing tickbox instead of permanent fields', () => {
    expect(getCourseFinderProfileSections(completeStudent, [], [], true).find((s) => s.id === 'addresses')?.completed).toBe(true);
    expect(getCourseFinderProfileSections({ ...completeStudent, permanent_same_as_mailing: false }, [], [], true).find((s) => s.id === 'addresses')?.completed).toBe(false);
  });

  it('requires exactly one complete emergency contact represented by the single contact fields', () => {
    const section = getCourseFinderProfileSections({ ...completeStudent, emergency_contact_email: '' }, [], [], true).find((s) => s.id === 'emergency');
    expect(section?.completed).toBe(false);
    expect(section?.missing).toEqual(['emergency contact email']);
  });

  it('requires every degree field when a degree is added', () => {
    expect(validateCourseFinderDegree({ institution_name: 'University of Ghana' })).toContain('degree title');
    expect(validateCourseFinderDegree({ institution_name: 'UG', country: 'Ghana', state_region: 'Greater Accra', city: 'Accra', degree_title: 'BSc', final_grade: 'Second Class Upper', grade_scale: 'Out of 4', gpa: 3.5, language_of_instruction: 'English', start_date: '2020-09-01', end_date: '2024-06-01' })).toEqual([]);
  });

  it('keeps English tests optional but validates an added test', () => {
    expect(validateCourseFinderTest({})).toHaveLength(3);
    expect(getCourseFinderProfileSections(completeStudent, [], [], true).find((s) => s.id === 'academic')?.completed).toBe(true);
  });
});

const TODAY = new Date('2026-10-23T12:00:00Z');
const completeDegree = {
  institution_name: 'University of Ghana', country: 'Ghana', state_region: 'Greater Accra', city: 'Legon', degree_title: 'BSc Economics',
  final_grade: 'Second Class Upper', grade_scale: 'CGPA out of 4', gpa: 3.4, language_of_instruction: 'English', start_date: '2019-09-01', end_date: '2023-07-31',
};
const gateSections = ['personal', 'passport', 'addresses', 'emergency', 'background'];
const legacyStudent = {
  ...completeStudent,
  coursefinder_fields_required: false,
  dependants_travelling: null,
  secondary_final_grade: null,
  emergency_contact_email: 'kojo at example',
  work_experience: [],
};

describe('existing students are never locked out', () => {
  it('does not hide My Documents or refuse a personal details save for the new fields', () => {
    // Same call shape as Documents.tsx and PersonalInfoTab.tsx.
    const missing = getCourseFinderProfileSections(legacyStudent, [], [], false, TODAY, gateOptions(legacyStudent))
      .filter((section) => gateSections.includes(section.id))
      .flatMap((section) => section.missing);
    expect(missing).toEqual([]);
  });

  it('treats a student with no flag yet (before the migration) as existing', () => {
    const { coursefinder_fields_required: _flag, ...noFlag } = legacyStudent;
    expect(gateOptions(noFlag)).toEqual({ strict: false });
  });

  it('still shows the new fields in the banner and checklist', () => {
    const missing = getMissingProfileFields(getCourseFinderProfileSections(legacyStudent, [], [], false, TODAY));
    expect(missing).toEqual(expect.arrayContaining(['number of dependant children travelling', 'secondary final grade']));
  });

  it('holds new students to every field when they save', () => {
    const newStudent = { ...legacyStudent, coursefinder_fields_required: true };
    const missing = getCourseFinderProfileSections(newStudent, [], [], false, TODAY, gateOptions(newStudent))
      .filter((section) => gateSections.includes(section.id))
      .flatMap((section) => section.missing);
    expect(missing).toEqual(expect.arrayContaining(['number of dependant children travelling', 'emergency contact email must be a valid email address']));
  });

  it('does not count a degree without a final grade against an existing student when saving', () => {
    expect(validateCourseFinderDegree({ ...completeDegree, final_grade: '' }, false)).toEqual([]);
    expect(validateCourseFinderDegree({ ...completeDegree, final_grade: '' }, true)).toEqual(['final grade']);
  });
});

describe('sending an application on to CourseFinder', () => {
  it('needs a complete profile when moving into screening', () => {
    expect(requiresCompleteProfileForStatus('submitted', 'screening')).toBe(true);
    expect(requiresCompleteProfileForStatus('draft', 'screening')).toBe(true);
    expect(requiresCompleteProfileForStatus('screening', 'screening')).toBe(false);
    expect(requiresCompleteProfileForStatus('screening', 'conditional_offer')).toBe(false);
    expect(requiresCompleteProfileForStatus('submitted', 'withdrawn')).toBe(false);
  });

  it('blocks existing students too, including missing final grades and gap history', () => {
    const blockers = getCourseFinderSubmissionBlockers(legacyStudent, [{ ...completeDegree, final_grade: '' }], TODAY);
    expect(blockers).toEqual(expect.arrayContaining(['secondary final grade', 'degree 1: final grade', 'number of dependant children travelling']));
    expect(blockers.some((field) => field.startsWith('gap or work history'))).toBe(true);
  });

  it('keeps the six-month rule for "no gap"', () => {
    const student = { ...completeStudent, work_experience: [], no_gap_since_study: true };
    expect(getCourseFinderSubmissionBlockers(student, [{ ...completeDegree, end_date: '2026-07-31' }], TODAY)).toEqual([]);
    expect(getCourseFinderSubmissionBlockers(student, [{ ...completeDegree, end_date: '2025-07-31' }], TODAY).length).toBeGreaterThan(0);
  });

  it('lets a complete profile through without documents being checked here', () => {
    expect(getCourseFinderSubmissionBlockers(completeStudent, [completeDegree], TODAY)).toEqual([]);
  });
});

describe('application profile gate (grandfathering, override, bypasses)', () => {
  it('lets a grandfathered application through even with items missing', () => {
    expect(isProfileGateClear({ exempt: true, overridden: false, missing_count: 12 })).toBe(true);
  });

  it('lets an overridden application through, and needs a real reason to override', () => {
    expect(isProfileGateClear({ exempt: false, overridden: true, missing_count: 12, sharing_authorised: true })).toBe(true);
    expect(isValidOverrideReason('too short')).toBe(false);
    expect(isValidOverrideReason('   short   ')).toBe(false);
    expect(isValidOverrideReason('Passport renewal in progress')).toBe(true);
  });

  it('holds back a new application with items missing, and clears a complete one', () => {
    expect(isProfileGateClear({ exempt: false, overridden: false, missing_count: 3, sharing_authorised: true })).toBe(false);
    expect(isProfileGateClear({ exempt: false, overridden: false, missing_count: 0, sharing_authorised: true })).toBe(true);
  });

  it('blocks skipping straight to an offer or later stage', () => {
    for (const next of ['conditional_offer', 'unconditional_offer', 'cas_loa', 'visa', 'enrolled']) {
      expect(requiresCompleteProfileForStatus('submitted', next)).toBe(true);
      expect(requiresCompleteProfileForStatus('draft', next)).toBe(true);
    }
  });

  it("blocks the university review dialog's Under Review (screening) move", () => {
    expect(requiresCompleteProfileForStatus('submitted', 'screening')).toBe(true);
  });

  it('never blocks withdrawing, deferring, or moves between later stages', () => {
    expect(requiresCompleteProfileForStatus('submitted', 'withdrawn')).toBe(false);
    expect(requiresCompleteProfileForStatus('draft', 'deferred')).toBe(false);
    expect(requiresCompleteProfileForStatus('conditional_offer', 'cas_loa')).toBe(false);
    expect(requiresCompleteProfileForStatus('screening', 'submitted')).toBe(false);
  });

  it('gives staff a short count and the right profile link', () => {
    expect(profileGateMessage(1)).toBe("1 item is missing from the student's profile.");
    expect(profileGateMessage(7)).toBe("7 items are missing from the student's profile.");
    expect(studentProfileLink('admin', 's1')).toBe('/admin/students/s1');
    expect(studentProfileLink('staff', 's1')).toBe('/admin/students/s1');
    expect(studentProfileLink('agent', 's1')).toBe('/agent/students/s1');
    expect(studentProfileLink('school_rep', 's1')).toBeNull();
  });
});

describe('gated statuses (re-entry and non-gated moves)', () => {
  it('checks moves out of withdrawn, deferred and other non-gated statuses into gated ones', () => {
    for (const from of ['withdrawn', 'deferred', 'rejected', 'under_review', 'pending_documents', 'interview', 'interview_scheduled']) {
      expect(requiresCompleteProfileForStatus(from, 'screening')).toBe(true);
      expect(requiresCompleteProfileForStatus(from, 'conditional_offer')).toBe(true);
    }
  });

  it('never blocks rejecting, asking for documents or an interview', () => {
    for (const to of ['rejected', 'pending_documents', 'interview', 'interview_scheduled', 'under_review', 'withdrawn', 'deferred']) {
      expect(requiresCompleteProfileForStatus('submitted', to)).toBe(false);
      expect(requiresCompleteProfileForStatus('draft', to)).toBe(false);
    }
  });

  it('uses exactly the same gated list as the server trigger', () => {
    const sql = readFileSync('supabase/migrations/20261103000000_coursefinder_mandatory_registration_fields.sql', 'utf8');
    const match = sql.match(/gated_statuses constant text\[\] := ARRAY\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const serverList = [...match![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(serverList).toEqual([...COURSEFINDER_SUBMISSION_STATUSES].sort());
  });
});

describe('sharing authorisation in the gate', () => {
  it('blocks a complete profile without the authorisation', () => {
    expect(isProfileGateClear({ exempt: false, overridden: false, missing_count: 0, sharing_authorised: false })).toBe(false);
    expect(isProfileGateClear({ exempt: false, overridden: false, missing_count: 0, sharing_authorised: true })).toBe(true);
  });

  it('an admin override does not bypass the authorisation', () => {
    expect(isProfileGateClear({ exempt: false, overridden: true, missing_count: 12, sharing_authorised: false })).toBe(false);
    expect(isProfileGateClear({ exempt: false, overridden: true, missing_count: 12, sharing_authorised: true })).toBe(true);
    expect(profileStillBlocks({ exempt: false, overridden: true, missing_count: 12 })).toBe(false);
  });

  it('does not block a grandfathered (exempt) application', () => {
    expect(isProfileGateClear({ exempt: true, overridden: false, missing_count: 12, sharing_authorised: false })).toBe(true);
  });
});
