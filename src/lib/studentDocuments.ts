export type RequiredStudentDocument = {
  type: string;
  label: string;
  acceptableTypes: string[];
  optional?: boolean;
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
  // Optional supplementary documents — shown in the upload list, but never block "missing" checks
  {
    type: 'affidavit',
    label: 'Affidavit (Optional)',
    acceptableTypes: ['affidavit', 'affidavit_of_support', 'sworn_affidavit'],
    optional: true,
  },
  {
    type: 'birth_certificate',
    label: 'Birth Certificate (Optional)',
    acceptableTypes: ['birth_certificate'],
    optional: true,
  },
  {
    type: 'financial_document',
    label: 'Financial / Bank Statement (Optional)',
    acceptableTypes: ['financial_document', 'bank_statement', 'sponsor_letter', 'proof_of_funds'],
    optional: true,
  },
  {
    type: 'medical_report',
    label: 'Medical Report (Optional)',
    acceptableTypes: ['medical_report', 'health_certificate', 'vaccination_record'],
    optional: true,
  },
  {
    type: 'police_clearance',
    label: 'Police Clearance (Optional)',
    acceptableTypes: ['police_clearance', 'police_report', 'background_check'],
    optional: true,
  },
  {
    type: 'other_supporting',
    label: 'Other Supporting Document (Optional)',
    acceptableTypes: ['other', 'other_supporting', 'supporting_document', 'misc'],
    optional: true,
  },
];

export const getMissingRequiredStudentDocuments = (
  documents: { document_type: string }[],
): RequiredStudentDocument[] => {
  const uploadedTypes = documents.map((doc) => doc.document_type.toLowerCase());

  return REQUIRED_STUDENT_DOCUMENTS.filter(
    (requirement) =>
      !requirement.optional &&
      !requirement.acceptableTypes.some((type) => uploadedTypes.includes(type.toLowerCase())),
  );
};
