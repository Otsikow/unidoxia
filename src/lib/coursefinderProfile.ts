import {
  addressesSchema,
  backgroundSchema,
  degreeSchema,
  emergencySchema,
  issueMessages,
  passportSchema,
  personalSchema,
  secondaryEducationSchema,
  validateGapHistory,
} from './studentRegistrationSchema';

export type CourseFinderStudent = Record<string, unknown>;

export type CourseFinderDegree = {
  institution_name?: string | null;
  country?: string | null;
  state_region?: string | null;
  city?: string | null;
  degree_title?: string | null;
  final_grade?: string | null;
  grade_scale?: string | null;
  gpa?: number | null;
  language_of_instruction?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type CourseFinderTest = {
  test_type?: string | null;
  total_score?: number | null;
  test_date?: string | null;
};

export type CourseFinderSection = {
  id: 'personal' | 'passport' | 'addresses' | 'emergency' | 'background' | 'academic' | 'history' | 'documents';
  title: string;
  description: string;
  completed: boolean;
  missing: string[];
};

const present = (value: unknown) =>
  typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

const requiredFields = (record: CourseFinderStudent, fields: Array<[string, string]>) =>
  fields.filter(([key]) => !present(record[key])).map(([, label]) => label);

export const validateCourseFinderDegree = (degree: CourseFinderDegree): string[] =>
  issueMessages(degreeSchema.safeParse(degree));

export const validateCourseFinderTest = (test: CourseFinderTest): string[] =>
  requiredFields(test as CourseFinderStudent, [
    ['test_type', 'test type'],
    ['total_score', 'score'],
    ['test_date', 'test date'],
  ]);

export const getCourseFinderProfileSections = (
  student: CourseFinderStudent,
  degrees: CourseFinderDegree[] = [],
  tests: CourseFinderTest[] = [],
  documentsComplete = false,
  today: Date = new Date(),
): CourseFinderSection[] => {
  const personal = issueMessages(personalSchema.safeParse(student));
  const passport = issueMessages(passportSchema.safeParse(student));
  const addresses = issueMessages(addressesSchema.safeParse(student));
  const emergency = issueMessages(emergencySchema.safeParse(student));
  const background = issueMessages(backgroundSchema.safeParse(student));

  const academic = issueMessages(secondaryEducationSchema.safeParse(student));
  degrees.forEach((degree, index) => {
    academic.push(...validateCourseFinderDegree(degree).map((field) => `degree ${index + 1}: ${field}`));
  });
  tests.forEach((test, index) => {
    academic.push(...validateCourseFinderTest(test).map((field) => `English test ${index + 1}: ${field}`));
  });

  const history = validateGapHistory(student, degrees, today);

  return [
    { id: 'personal', title: 'Personal details', description: 'Registration and personal information', completed: personal.length === 0, missing: personal },
    { id: 'passport', title: 'Passport details', description: 'Passport number, dates and issue country', completed: passport.length === 0, missing: passport },
    { id: 'addresses', title: 'Addresses', description: 'Home address, and permanent address if different', completed: addresses.length === 0, missing: addresses },
    { id: 'emergency', title: 'Emergency contact', description: 'One complete emergency contact', completed: emergency.length === 0, missing: emergency },
    { id: 'background', title: 'Background questions', description: 'All four yes or no answers, with details where needed', completed: background.length === 0, missing: background },
    { id: 'academic', title: 'Education history', description: 'Secondary education, final grades, WAEC details and complete added records', completed: academic.length === 0, missing: academic },
    { id: 'history', title: 'Gap or work history', description: 'What you have done since your last study', completed: history.length === 0, missing: history },
    { id: 'documents', title: 'Required documents', description: 'All documents, including one accepted form of English proof', completed: documentsComplete, missing: documentsComplete ? [] : ['required documents'] },
  ];
};

/** Field sections only (not documents), used for the "complete your profile" prompt. */
export const getMissingProfileFields = (sections: CourseFinderSection[]) =>
  sections.filter((section) => section.id !== 'documents').flatMap((section) => section.missing);

/** Which profile tab a section's fields live on. */
export const sectionTab = (id: CourseFinderSection['id']) =>
  id === 'documents' ? 'documents' : id === 'academic' || id === 'history' ? 'education' : 'personal';

export const calculateCourseFinderCompleteness = (sections: CourseFinderSection[]) =>
  Math.round((sections.filter((section) => section.completed).length / sections.length) * 100);
