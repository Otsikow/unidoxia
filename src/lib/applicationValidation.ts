import { applicationDateBounds, isDateWithinBounds } from './applicationDates';
import { z } from 'zod';

const required = (label: string) => z.string().trim().min(1, `${label} is required.`);
const date = (label: string) => required(label).refine((value) => {
  const parsed = new Date(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, `${label} must be a valid date.`);
const pastDate = (label: string) => date(label).refine((value) => value <= new Date().toISOString().slice(0, 10), `${label} cannot be in the future.`);
const yesNo = z.enum(['yes', 'no'], { error: 'Select yes or no.' });

export const emergencyContactSchema = z.object({
  fullName: required('Emergency contact full name'),
  relationship: required('Emergency contact relationship'),
  phone: z.string().trim().regex(/^\+[\d\s()-]+$/, 'Include the emergency contact country code.').refine((value) => value.replace(/\D/g, '').length >= 8, 'Enter a valid emergency contact phone number.'),
  email: z.string().trim().email('Enter a valid emergency contact email address.'),
  country: required('Emergency contact country'),
});

export const applicationPersonalInfoSchema = z.object({
  fullName: required('Full name'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: required('Phone number'),
  whatsappNumber: required('WhatsApp number'),
  dateOfBirth: date('Date of birth').refine((value) => isDateWithinBounds(value, applicationDateBounds().birth), 'Date of birth must be from 1950 to the current year minus 15.'),
  gender: required('Gender'),
  maritalStatus: required('Marital status'),
  nationality: required('Nationality'),
  currentCountry: required('Current country'),
  cityOfBirth: required('City of birth'),
  countryOfBirth: required('Country of birth'),
  passportIssueDate: pastDate('Passport issue date').refine((value) => isDateWithinBounds(value, applicationDateBounds().passportIssue), 'Passport issue date must be within the last 15 years and cannot be in the future.'),
  passportPlaceOfIssue: required('Passport place of issue'),
  correspondentAddress: required('Mailing address'),
  mailingPostcode: required('Mailing address postcode'),
  sameAsMailingAddress: z.boolean(),
  permanentAddress: z.string(),
  permanentPostcode: z.string(),
  otherCitizenship: yesNo,
  otherCitizenshipCountry: z.string(),
  previousStudyAbroad: yesNo,
  previousStudyAbroadDetails: z.string(),
  previousResidenceAbroad: yesNo,
  previousResidenceAbroadDetails: z.string(),
  visaRefusals: yesNo,
  visaRefusalsDetails: z.string(),
}).superRefine((data, ctx) => {
  if (!data.sameAsMailingAddress) {
    for (const field of ['permanentAddress', 'permanentPostcode'] as const) {
      if (!data[field].trim()) ctx.addIssue({ code: 'custom', path: [field], message: 'Complete your permanent address and postcode.' });
    }
  }
  for (const [answer, detail, label] of [
    ['otherCitizenship', 'otherCitizenshipCountry', 'Other country of citizenship'],
    ['previousStudyAbroad', 'previousStudyAbroadDetails', 'Previous study abroad details'],
    ['previousResidenceAbroad', 'previousResidenceAbroadDetails', 'Previous residence abroad details'],
    ['visaRefusals', 'visaRefusalsDetails', 'Visa refusal details'],
  ] as const) {
    if (data[answer] === 'yes' && !data[detail].trim()) ctx.addIssue({ code: 'custom', path: [detail], message: `${label} is required.` });
  }
});

export const applicationEducationRecordSchema = z.object({
  level: required('Education level'),
  institutionName: required('Institution name'),
  country: required('Education country'),
  startDate: date('Education start date'),
  endDate: date('Education completion date'),
  gpa: required('Grades'),
  gradeScale: required('Grade scale'),
  languageOfInstruction: required('Language of instruction'),
  board: z.string(),
}).superRefine((data, ctx) => {
  if (data.level === 'high_school') {
    for (const field of ['startDate', 'endDate'] as const) {
      if (!isDateWithinBounds(data[field], applicationDateBounds().secondarySchool)) ctx.addIssue({ code: 'custom', path: [field], message: 'Secondary school dates must be from the current year minus 40 to next year.' });
    }
  }
  if (data.endDate < data.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Completion cannot be before the start date.' });
  if (data.level === 'high_school' && !data.board.trim()) ctx.addIssue({ code: 'custom', path: ['board'], message: 'Secondary school board is required.' });
});

export const applicationEducationHistorySchema = z.array(applicationEducationRecordSchema).min(1).refine(
  (records) => records.some((record) => record.level === 'high_school'),
  'Add your secondary school education, including board, dates and grades.',
);

export const applicationRequiredDetailsSchema = z.object({
  personalInfo: applicationPersonalInfoSchema,
  emergencyContact: emergencyContactSchema,
  educationHistory: applicationEducationHistorySchema,
});
