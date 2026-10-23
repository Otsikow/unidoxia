import { describe, expect, it } from 'vitest';
import {
  IN_PROGRESS_APPLICATION_STATUSES,
  canDismissPrompt,
  dismissPrompt,
  isPromptDismissed,
  shouldShowCompleteProfilePrompt,
  summariseMissingFields,
} from './completeProfilePrompt';
import { getCourseFinderProfileSections, getMissingProfileFields } from './coursefinderProfile';

const memoryStore = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
};

// A student who registered before the new fields were added: everything the old form asked for, nothing new.
const existingStudent = {
  first_name: 'Kofi', last_name: 'Boateng', contact_phone: '+233201234567', contact_email: 'kofi@example.com', date_of_birth: '1999-05-05',
  gender: 'Male', marital_status: 'Single', nationality: 'Ghanaian', citizenship: 'Ghanaian', city_of_birth: 'Kumasi', country_of_birth: 'Ghana',
  passport_number: 'G7654321', passport_issue_date: '2023-01-01', passport_expiry: '2033-01-01', passport_issue_country: 'Ghana',
  address_line_1: '3 Lake Road', country_of_residence: 'Ghana', state_region: 'Ashanti', city: 'Kumasi', postal_code: 'AK-039-5028', permanent_same_as_mailing: true,
  emergency_contact_name: 'Abena Boateng', emergency_contact_relationship: 'Mother', emergency_contact_phone: '+233209999999', emergency_contact_email: 'abena@example.com',
  has_other_citizenship: false, lived_or_studied_abroad: false, previous_immigration_applications: false, has_visa_refusals: false,
  country_of_education: 'Ghana', highest_education_level: 'Secondary', secondary_board: 'WAEC', secondary_qualification: 'WASSCE', secondary_school_name: 'Prempeh College',
  secondary_school_country: 'Ghana', secondary_school_state: 'Ashanti', secondary_school_city: 'Kumasi', secondary_start_month: 9, secondary_start_year: 2014,
  secondary_end_month: 6, secondary_end_year: 2017, secondary_language_of_instruction: 'English', secondary_grades_band: '70-79%',
  waec_scratch_card_pin: 'PIN', waec_scratch_card_serial: 'SERIAL', work_experience: [],
};

describe('complete profile prompt for existing students', () => {
  const missing = getMissingProfileFields(getCourseFinderProfileSections(existingStudent, [], [], true, new Date('2026-10-23')));

  it('finds the fields added since an existing student registered', () => {
    expect(missing).toEqual(expect.arrayContaining([
      'number of dependant children travelling',
      'secondary final grade',
      'gap or work history since your last study',
    ]));
  });

  it('shows the prompt when a student has missing fields', () => {
    expect(shouldShowCompleteProfilePrompt({ isStudent: true, isLoading: false, missingFields: missing, dismissed: false })).toBe(true);
  });

  it('does not show the prompt once the profile is complete', () => {
    expect(shouldShowCompleteProfilePrompt({ isStudent: true, isLoading: false, missingFields: [], dismissed: false })).toBe(false);
  });

  it('does not show the prompt while loading, after dismissal, or to non-students', () => {
    expect(shouldShowCompleteProfilePrompt({ isStudent: true, isLoading: true, missingFields: missing, dismissed: false })).toBe(false);
    expect(shouldShowCompleteProfilePrompt({ isStudent: true, isLoading: false, missingFields: missing, dismissed: true })).toBe(false);
    expect(shouldShowCompleteProfilePrompt({ isStudent: false, isLoading: false, missingFields: missing, dismissed: false })).toBe(false);
  });

  it('remembers a dismissal for this session and this user only', () => {
    const store = memoryStore();
    expect(isPromptDismissed('user-1', store)).toBe(false);
    dismissPrompt('user-1', store);
    expect(isPromptDismissed('user-1', store)).toBe(true);
    expect(isPromptDismissed('user-2', store)).toBe(false);
    expect(isPromptDismissed(undefined, store)).toBe(false);
  });

  it('summarises missing fields in plain English', () => {
    expect(summariseMissingFields(['marital status'])).toBe('marital status');
    expect(summariseMissingFields(['a', 'b'])).toBe('a and b');
    expect(summariseMissingFields(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c and 2 more');
  });
});

describe('prompt for existing students with an application in progress', () => {
  it('cannot be dismissed and stays up while an application is in progress', () => {
    expect(canDismissPrompt(true)).toBe(false);
    expect(canDismissPrompt(false)).toBe(true);
    const base = { isStudent: true, isLoading: false, missingFields: ['passport number'], dismissed: true };
    expect(shouldShowCompleteProfilePrompt({ ...base, hasApplicationInProgress: true })).toBe(true);
    expect(shouldShowCompleteProfilePrompt({ ...base, hasApplicationInProgress: false })).toBe(false);
  });

  it('goes once the profile is complete', () => {
    expect(shouldShowCompleteProfilePrompt({ isStudent: true, isLoading: false, missingFields: [], dismissed: false, hasApplicationInProgress: true })).toBe(false);
  });
});

describe('in-progress statuses for the banner', () => {
  it('include under review, pending documents and the interview statuses', () => {
    expect(IN_PROGRESS_APPLICATION_STATUSES).toEqual(
      expect.arrayContaining(['under_review', 'pending_documents', 'interview', 'interview_scheduled']),
    );
  });

  it('leave out finished or stopped applications', () => {
    for (const status of ['enrolled', 'withdrawn', 'deferred', 'rejected']) {
      expect(IN_PROGRESS_APPLICATION_STATUSES as readonly string[]).not.toContain(status);
    }
  });
});
