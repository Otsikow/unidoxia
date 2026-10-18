export type CourseFinderStudent = Record<string, unknown>;

export type CourseFinderDegree = {
  institution_name?: string | null;
  country?: string | null;
  state_region?: string | null;
  city?: string | null;
  degree_title?: string | null;
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
  id: 'personal' | 'passport' | 'addresses' | 'emergency' | 'background' | 'academic' | 'documents';
  title: string;
  description: string;
  completed: boolean;
  missing: string[];
};

const present = (value: unknown) =>
  typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

const requiredFields = (record: CourseFinderStudent, fields: Array<[string, string]>) =>
  fields.filter(([key]) => !present(record[key])).map(([, label]) => label);

export const validateCourseFinderDegree = (degree: CourseFinderDegree): string[] => {
  const missing = requiredFields(degree as CourseFinderStudent, [
    ['institution_name', 'institution'],
    ['country', 'country'],
    ['state_region', 'state or region'],
    ['city', 'city'],
    ['degree_title', 'degree title'],
    ['grade_scale', 'grading scale'],
    ['gpa', 'score'],
    ['language_of_instruction', 'language of instruction'],
    ['start_date', 'start date'],
    ['end_date', 'end date'],
  ]);
  return missing;
};

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
): CourseFinderSection[] => {
  const personal = requiredFields(student, [
    ['first_name', 'first name'],
    ['last_name', 'last name'],
    ['contact_phone', 'mobile number'],
    ['contact_email', 'email'],
    ['date_of_birth', 'date of birth'],
    ['gender', 'gender'],
    ['marital_status', 'marital status'],
    ['nationality', 'nationality'],
    ['citizenship', 'citizenship'],
    ['city_of_birth', 'city of birth'],
    ['country_of_birth', 'country of birth'],
  ]);

  const passport = requiredFields(student, [
    ['passport_number', 'passport number'],
    ['passport_issue_date', 'passport issue date'],
    ['passport_expiry', 'passport expiry date'],
    ['passport_issue_country', 'passport issue country'],
  ]);

  const addresses = requiredFields(student, [
    ['address_line_1', 'mailing address line 1'],
    ['country_of_residence', 'mailing country'],
    ['state_region', 'mailing state or region'],
    ['city', 'mailing city'],
    ['postal_code', 'mailing postcode'],
  ]);
  if (student.permanent_same_as_mailing !== true) {
    addresses.push(
      ...requiredFields(student, [
        ['permanent_address_line_1', 'permanent address line 1'],
        ['permanent_country', 'permanent country'],
        ['permanent_state_region', 'permanent state or region'],
        ['permanent_city', 'permanent city'],
        ['permanent_postal_code', 'permanent postcode'],
      ]),
    );
  }

  const emergency = requiredFields(student, [
    ['emergency_contact_name', 'emergency contact name'],
    ['emergency_contact_relationship', 'emergency contact relationship'],
    ['emergency_contact_phone', 'emergency contact phone'],
    ['emergency_contact_email', 'emergency contact email'],
  ]);

  const background = [
    ['has_other_citizenship', 'other citizenship'],
    ['lived_or_studied_abroad', 'lived or studied in another country'],
    ['previous_immigration_applications', 'previous immigration applications'],
    ['has_visa_refusals', 'visa refusals'],
  ].filter(([key]) => typeof student[key] !== 'boolean').map(([, label]) => label);

  const academic = requiredFields(student, [
    ['country_of_education', 'country of education'],
    ['highest_education_level', 'highest education level'],
    ['secondary_board', 'secondary board'],
    ['secondary_qualification', 'secondary qualification'],
    ['secondary_school_name', 'secondary school name'],
    ['secondary_school_country', 'secondary school country'],
    ['secondary_school_state', 'secondary school state'],
    ['secondary_school_city', 'secondary school city'],
    ['secondary_start_month', 'secondary start month'],
    ['secondary_start_year', 'secondary start year'],
    ['secondary_end_month', 'secondary end month'],
    ['secondary_end_year', 'secondary end year'],
    ['secondary_language_of_instruction', 'secondary language of instruction'],
    ['secondary_grades_band', 'secondary grades band'],
    ['waec_scratch_card_pin', 'WAEC scratch-card PIN'],
    ['waec_scratch_card_serial', 'WAEC scratch-card serial number'],
  ]);
  degrees.forEach((degree, index) => {
    academic.push(...validateCourseFinderDegree(degree).map((field) => `degree ${index + 1}: ${field}`));
  });
  tests.forEach((test, index) => {
    academic.push(...validateCourseFinderTest(test).map((field) => `English test ${index + 1}: ${field}`));
  });

  return [
    { id: 'personal', title: 'Personal details', description: 'Registration and personal information', completed: personal.length === 0, missing: personal },
    { id: 'passport', title: 'Passport details', description: 'Passport number, dates and issue country', completed: passport.length === 0, missing: passport },
    { id: 'addresses', title: 'Addresses', description: 'Mailing and permanent addresses', completed: addresses.length === 0, missing: addresses },
    { id: 'emergency', title: 'Emergency contact', description: 'One complete emergency contact', completed: emergency.length === 0, missing: emergency },
    { id: 'background', title: 'Background questions', description: 'All four yes or no answers', completed: background.length === 0, missing: background },
    { id: 'academic', title: 'Academic background', description: 'Secondary education, WAEC details and complete added records', completed: academic.length === 0, missing: academic },
    { id: 'documents', title: 'Required documents', description: 'All documents, including one accepted form of English proof', completed: documentsComplete, missing: documentsComplete ? [] : ['required documents'] },
  ];
};

export const calculateCourseFinderCompleteness = (sections: CourseFinderSection[]) =>
  Math.round((sections.filter((section) => section.completed).length / sections.length) * 100);
