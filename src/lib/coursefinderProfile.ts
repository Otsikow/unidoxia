import {
  addressesSchema,
  backgroundSchema,
  degreeSchema,
  emergencySchema,
  issueMessages,
  passportSchema,
  personalSchema,
  secondaryEducationSchema,
  isStrictStudent,
  validateGapHistory,
} from './studentRegistrationSchema';

export type CourseFinderSectionOptions = {
  /**
   * true: every CourseFinder field, used for the banner, checklist and staff submission.
   * false: leave out the fields added in October 2026, used to gate saves and pages for
   * existing students (coursefinder_fields_required = false) so they are never blocked.
   */
  strict?: boolean;
};

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

export const validateCourseFinderDegree = (degree: CourseFinderDegree, strict = true): string[] =>
  issueMessages(degreeSchema.safeParse(degree), strict);

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
  { strict = true }: CourseFinderSectionOptions = {},
): CourseFinderSection[] => {
  const personal = issueMessages(personalSchema.safeParse(student), strict);
  const passport = issueMessages(passportSchema.safeParse(student), strict);
  const addresses = issueMessages(addressesSchema.safeParse(student), strict);
  const emergency = issueMessages(emergencySchema.safeParse(student), strict);
  const background = issueMessages(backgroundSchema.safeParse(student), strict);

  const academic = issueMessages(secondaryEducationSchema.safeParse(student), strict);
  degrees.forEach((degree, index) => {
    academic.push(...validateCourseFinderDegree(degree, strict).map((field) => `degree ${index + 1}: ${field}`));
  });
  tests.forEach((test, index) => {
    academic.push(...validateCourseFinderTest(test).map((field) => `English test ${index + 1}: ${field}`));
  });

  const history = strict ? validateGapHistory(student, degrees, today) : [];

  return [
    { id: 'personal', title: 'Personal details', description: 'Registration and personal information', completed: personal.length === 0, missing: personal },
    { id: 'passport', title: 'Passport details', description: 'Passport number, dates and issue country', completed: passport.length === 0, missing: passport },
    { id: 'addresses', title: 'Addresses', description: 'Home address, and permanent address if different', completed: addresses.length === 0, missing: addresses },
    { id: 'emergency', title: 'Emergency contact', description: 'One complete emergency contact', completed: emergency.length === 0, missing: emergency },
    { id: 'background', title: 'Background questions', description: 'All four yes or no answers, with details where needed', completed: background.length === 0, missing: background },
    { id: 'academic', title: 'Education history', description: 'Secondary education, final grades, WAEC details where they apply, and complete added records', completed: academic.length === 0, missing: academic },
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

/** Options for gating saves and pages: strict only for students flagged as new. */
export const gateOptions = (student: CourseFinderStudent | null | undefined): CourseFinderSectionOptions => ({
  strict: isStrictStudent(student),
});

/**
 * Statuses that send an application on from UniDoxia (to CourseFinder or the
 * university), including a jump straight to an offer. Moving an application
 * into one of these from any other status (draft, submitted, withdrawn,
 * deferred, rejected, pending documents, interview and so on) needs a complete
 * profile. The server trigger enforce_application_profile_gate uses exactly
 * this list.
 */
export const COURSEFINDER_SUBMISSION_STATUSES = new Set([
  'screening', 'conditional_offer', 'unconditional_offer', 'cas_loa', 'visa', 'enrolled',
]);

export const requiresCompleteProfileForStatus = (oldStatus: string | null | undefined, newStatus: string) =>
  COURSEFINDER_SUBMISSION_STATUSES.has(newStatus) && !COURSEFINDER_SUBMISSION_STATUSES.has(String(oldStatus ?? 'draft'));

/** What the server says about one application (application_profile_gate_status). */
export type ApplicationProfileGate = {
  exempt?: boolean | null;
  overridden?: boolean | null;
  missing_count?: number | null;
};

/**
 * Whether an application may move on. Applications created before go-live
 * (exempt) and those with a logged admin override are never held back.
 */
export const isProfileGateClear = (gate: ApplicationProfileGate | null | undefined) =>
  Boolean(gate?.exempt) || Boolean(gate?.overridden) || Number(gate?.missing_count ?? 0) === 0;

/** The short staff message: a count, not the full list. */
export const profileGateMessage = (missingCount: number) =>
  `${missingCount} ${missingCount === 1 ? 'item is' : 'items are'} missing from the student's profile.`;

/** An admin override needs a reason; the server asks for at least 10 characters. */
export const OVERRIDE_REASON_MIN_LENGTH = 10;
export const isValidOverrideReason = (reason: string | null | undefined) =>
  (reason ?? '').trim().length >= OVERRIDE_REASON_MIN_LENGTH;

/** Which profile page staff should open for a student, by role. */
export const studentProfileLink = (role: string | null | undefined, studentId: string) =>
  role === 'admin' || role === 'staff'
    ? `/admin/students/${studentId}`
    : role === 'agent'
      ? `/agent/students/${studentId}`
      : null;

/**
 * Every missing CourseFinder field (including final grades and gap history) for
 * a student, regardless of whether they are new or existing. Empty when the
 * profile can be sent to CourseFinder.
 */
export const getCourseFinderSubmissionBlockers = (
  student: CourseFinderStudent,
  degrees: CourseFinderDegree[] = [],
  today: Date = new Date(),
) => getMissingProfileFields(getCourseFinderProfileSections(student, degrees, [], false, today, { strict: true }));
