export type RequiredStudentDocument = {
  type: string;
  label: string;
  acceptableTypes: string[];
};

export const REQUIRED_STUDENT_DOCUMENTS: RequiredStudentDocument[] = [
  { type: 'passport', label: 'Passport photo page', acceptableTypes: ['passport', 'passport_photo_page'] },
  { type: 'passport_photo', label: 'Passport-style photo', acceptableTypes: ['passport_photo'] },
  { type: 'transcript', label: 'Transcript(s)', acceptableTypes: ['transcript'] },
  { type: 'degree_certificate', label: 'Academic or degree certificate', acceptableTypes: ['degree_certificate', 'academic_certificate', 'certificate'] },
  { type: 'wassce_waec', label: 'WASSCE or WAEC results', acceptableTypes: ['wassce_waec', 'wassce', 'waec', 'secondary_school_results'] },
  { type: 'sop', label: 'Statement of purpose', acceptableTypes: ['sop', 'personal_statement'] },
  { type: 'reference_letter_1', label: 'Reference letter 1', acceptableTypes: ['reference_letter_1'] },
  { type: 'reference_letter_2', label: 'Reference letter 2', acceptableTypes: ['reference_letter_2'] },
  { type: 'cv', label: 'CV', acceptableTypes: ['cv'] },
];

export const ENGLISH_PROOF_DOCUMENT: RequiredStudentDocument = {
  type: 'english_proof',
  label: 'English proof',
  acceptableTypes: [
    'english_test_certificate', 'english_medium_letter', 'english_proficiency',
    'ielts', 'toefl', 'pte', 'duolingo', 'english_test',
    'wassce_waec', 'wassce', 'waec', 'secondary_school_results',
  ],
};

export const isEnglishProofComplete = (documents: { document_type: string }[]) => {
  const uploadedTypes = new Set(documents.map((doc) => doc.document_type.toLowerCase()));
  return ENGLISH_PROOF_DOCUMENT.acceptableTypes.some((type) => uploadedTypes.has(type.toLowerCase()));
};

export const getMissingRequiredStudentDocuments = (
  documents: { document_type: string }[],
): RequiredStudentDocument[] => {
  const uploadedTypes = new Set(documents.map((doc) => doc.document_type.toLowerCase()));
  const missing = REQUIRED_STUDENT_DOCUMENTS.filter(
    (requirement) => !requirement.acceptableTypes.some((type) => uploadedTypes.has(type.toLowerCase())),
  );
  if (!isEnglishProofComplete(documents)) {
    missing.push(ENGLISH_PROOF_DOCUMENT);
  }
  return missing;
};

export const areRequiredStudentDocumentsComplete = (documents: { document_type: string }[]) =>
  getMissingRequiredStudentDocuments(documents).length === 0;
