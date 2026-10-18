import { describe, expect, it } from 'vitest';
import { getMissingRequiredStudentDocuments, isEnglishProofComplete } from './studentDocuments';

const core = [
  'passport', 'passport_photo', 'transcript', 'degree_certificate', 'wassce_waec',
  'sop', 'reference_letter_1', 'reference_letter_2', 'cv',
].map((document_type) => ({ document_type }));

describe('CourseFinder document checklist', () => {
  it('requires every core document and one English proof', () => {
    expect(getMissingRequiredStudentDocuments([]).map((doc) => doc.type)).toEqual([
      'passport', 'passport_photo', 'transcript', 'degree_certificate', 'wassce_waec',
      'sop', 'reference_letter_1', 'reference_letter_2', 'cv', 'english_proof',
    ]);
  });

  it.each(['english_test_certificate', 'english_medium_letter', 'wassce_waec'])(
    'accepts %s as the one required English proof',
    (documentType) => {
      expect(isEnglishProofComplete([{ document_type: documentType }])).toBe(true);
      const docs = documentType === 'wassce_waec' ? core : [...core, { document_type: documentType }];
      expect(getMissingRequiredStudentDocuments(docs)).toEqual([]);
    },
  );
});
