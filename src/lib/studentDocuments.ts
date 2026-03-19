export type RequiredStudentDocument = {
  type: string;
  label: string;
  acceptableTypes: string[];
};

export const REQUIRED_STUDENT_DOCUMENTS: RequiredStudentDocument[] = [
  { type: 'passport', label: 'Passport', acceptableTypes: ['passport'] },
  { type: 'passport_photo', label: 'Passport Photo', acceptableTypes: ['passport_photo'] },
  { type: 'transcript', label: 'Academic Transcript', acceptableTypes: ['transcript'] },
  {
    type: 'degree_certificate',
    label: 'Academic Certificate',
    acceptableTypes: ['degree_certificate', 'academic_certificate', 'certificate'],
  },
  {
    type: 'wassce_waec',
    label: 'WASSCE / WAEC Results (incl. English Language)',
    acceptableTypes: ['wassce_waec', 'wassce', 'waec', 'secondary_school_results'],
  },
  { type: 'sop', label: 'Statement of Purpose', acceptableTypes: ['sop', 'personal_statement'] },
  {
    type: 'reference_letter_1',
    label: 'Letter of Reference (1st)',
    acceptableTypes: ['lor', 'recommendation_letter', 'reference_letter', 'letter_of_reference', 'reference_letter_1'],
  },
  {
    type: 'reference_letter_2',
    label: 'Letter of Reference (2nd)',
    acceptableTypes: ['reference_letter_2'],
  },
  { type: 'cv', label: 'CV / Resume', acceptableTypes: ['cv'] },
  {
    type: 'english_proficiency',
    label: 'Statement of English Proficiency',
    acceptableTypes: ['english_proficiency', 'ielts', 'toefl', 'english_test'],
  },
];

export const getMissingRequiredStudentDocuments = (
  documents: { document_type: string }[],
): RequiredStudentDocument[] => {
  const uploadedTypes = documents.map((doc) => doc.document_type.toLowerCase());

  return REQUIRED_STUDENT_DOCUMENTS.filter(
    (requirement) =>
      !requirement.acceptableTypes.some((type) => uploadedTypes.includes(type.toLowerCase())),
  );
};
