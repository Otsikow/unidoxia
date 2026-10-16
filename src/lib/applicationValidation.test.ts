import { describe, expect, it } from 'vitest';
import { applicationRequiredDetailsSchema } from './applicationValidation';

const valid = () => ({
  personalInfo: {
    fullName: 'Test Applicant', email: 'applicant@example.com', phone: '+447700900123',
    whatsappNumber: '+447700900123', dateOfBirth: '2000-01-01', gender: 'Female',
    maritalStatus: 'Single', nationality: 'Ghana', currentCountry: 'Ghana',
    cityOfBirth: 'Accra', countryOfBirth: 'Ghana', passportIssueDate: '2020-01-01',
    passportPlaceOfIssue: 'Accra', correspondentAddress: '1 Test Street', mailingPostcode: 'GA-123',
    sameAsMailingAddress: true, permanentAddress: '', permanentPostcode: '',
    otherCitizenship: 'no', otherCitizenshipCountry: '', previousStudyAbroad: 'no', previousStudyAbroadDetails: '',
    previousResidenceAbroad: 'no', previousResidenceAbroadDetails: '', visaRefusals: 'no', visaRefusalsDetails: '',
  },
  emergencyContact: { fullName: 'Test Contact', relationship: 'Parent', phone: '+233501234567', email: 'contact@example.com', country: 'Ghana' },
  educationHistory: [{ level: 'high_school', institutionName: 'Test School', country: 'Ghana', startDate: '2014-09-01', endDate: '2018-06-01', gpa: 'A1, B2', gradeScale: 'WAEC', board: 'WAEC', languageOfInstruction: 'English' }],
});

describe('required application details', () => {
  it('accepts a complete application with free text secondary school grades', () => {
    expect(applicationRequiredDetailsSchema.safeParse(valid()).success).toBe(true);
  });

  it.each(['maritalStatus', 'mailingPostcode', 'cityOfBirth', 'countryOfBirth', 'passportIssueDate', 'passportPlaceOfIssue', 'gender', 'dateOfBirth'] as const)('requires %s even at final submission', (field) => {
    const data = valid();
    data.personalInfo[field] = ' ';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
  });

  it('requires a permanent address when it differs from mailing', () => {
    const data = valid();
    data.personalInfo.sameAsMailingAddress = false;
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
    data.personalInfo.permanentAddress = '2 Test Street';
    data.personalInfo.permanentPostcode = 'GA-456';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(true);
  });

  it.each(['otherCitizenship', 'previousStudyAbroad', 'previousResidenceAbroad', 'visaRefusals'] as const)('requires an explicit answer and conditional details for %s', (field) => {
    const data = valid();
    data.personalInfo[field] = '';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
    data.personalInfo[field] = 'yes';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
    Object.assign(data.personalInfo, { otherCitizenshipCountry: 'Canada', previousStudyAbroadDetails: 'Course in Canada', previousResidenceAbroadDetails: 'Residence in Canada', visaRefusalsDetails: 'Refusal in 2020' });
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(true);
  });

  it.each(['fullName', 'relationship', 'phone', 'email'] as const)('requires emergency contact %s', (field) => {
    const data = valid();
    data.emergencyContact[field] = '';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid emergency email and calendar dates', () => {
    const data = valid();
    data.emergencyContact.email = 'invalid';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
    data.emergencyContact.email = 'contact@example.com';
    data.personalInfo.dateOfBirth = '2000-02-30';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
  });

  it.each(['board', 'startDate', 'endDate', 'gpa', 'languageOfInstruction'] as const)('requires secondary school %s', (field) => {
    const data = valid();
    data.educationHistory[0][field] = '';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
  });

  it('requires secondary school even when a degree is present and language for each degree', () => {
    const data = valid();
    const degree = { ...data.educationHistory[0], level: 'bachelor', board: '' };
    data.educationHistory = [degree];
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
    data.educationHistory = [...valid().educationHistory, degree];
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(true);
    degree.languageOfInstruction = '';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
  });

  it('rejects completion before starting', () => {
    const data = valid();
    data.educationHistory[0].endDate = '2010-01-01';
    expect(applicationRequiredDetailsSchema.safeParse(data).success).toBe(false);
  });
});
