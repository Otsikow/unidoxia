import { describe, expect, it } from 'vitest';
import {
  calculateCourseFinderCompleteness,
  getCourseFinderProfileSections,
  validateCourseFinderDegree,
  validateCourseFinderTest,
} from './coursefinderProfile';

const completeStudent = {
  first_name: 'Ama', last_name: 'Mensah', middle_name: '', contact_phone: '+233201234567', contact_email: 'ama@example.com',
  date_of_birth: '2000-01-01', gender: 'female', marital_status: 'single', nationality: 'Ghanaian', citizenship: 'Ghanaian', city_of_birth: 'Accra', country_of_birth: 'Ghana',
  passport_number: 'G123', passport_issue_date: '2024-01-01', passport_expiry: '2034-01-01', passport_issue_country: 'Ghana',
  address_line_1: '1 High Street', country_of_residence: 'Ghana', state_region: 'Greater Accra', city: 'Accra', postal_code: 'GA1', permanent_same_as_mailing: true,
  emergency_contact_name: 'Kojo Mensah', emergency_contact_relationship: 'Parent', emergency_contact_phone: '+233201111111', emergency_contact_email: 'kojo@example.com',
  has_other_citizenship: false, lived_or_studied_abroad: false, previous_immigration_applications: false, has_visa_refusals: false,
  country_of_education: 'Ghana', highest_education_level: 'secondary', secondary_board: 'WAEC', secondary_qualification: 'WASSCE', secondary_school_name: 'Accra High', secondary_school_country: 'Ghana', secondary_school_state: 'Greater Accra', secondary_school_city: 'Accra', secondary_start_month: 9, secondary_start_year: 2016, secondary_end_month: 6, secondary_end_year: 2019, secondary_language_of_instruction: 'English', secondary_grades_band: '80-89%', waec_scratch_card_pin: 'PIN123', waec_scratch_card_serial: 'SER123',
};

describe('CourseFinder profile rules', () => {
  it('treats optional fields as optional', () => {
    const sections = getCourseFinderProfileSections(completeStudent, [], [], true);
    expect(sections.every((section) => section.completed)).toBe(true);
    expect(calculateCourseFinderCompleteness(sections)).toBe(100);
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
    expect(validateCourseFinderDegree({ institution_name: 'UG', country: 'Ghana', state_region: 'Greater Accra', city: 'Accra', degree_title: 'BSc', grade_scale: 'Out of 4', gpa: 3.5, language_of_instruction: 'English', start_date: '2020-09-01', end_date: '2024-06-01' })).toEqual([]);
  });

  it('keeps English tests optional but validates an added test', () => {
    expect(validateCourseFinderTest({})).toHaveLength(3);
    expect(getCourseFinderProfileSections(completeStudent, [], [], true).find((s) => s.id === 'academic')?.completed).toBe(true);
  });
});
