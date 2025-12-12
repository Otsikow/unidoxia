export interface ApplicationFormData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
    currentCountry: string;
    address: string;
  };
  educationHistory: Array<{
    id: string;
    level: string;
    institutionName: string;
    country: string;
    startDate: string;
    endDate: string;
    gpa: string;
    gradeScale: string;
  }>;
  programSelection: {
    programId: string;
    intakeYear: number;
    intakeMonth: number;
    intakeId?: string;
  };
  documents: {
    transcript: File | null;
    passport: File | null;
    ielts: File | null;
    sop: File | null;
  };
  notes: string;
}
