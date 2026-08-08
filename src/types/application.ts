export interface EmergencyContact {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  country: string;
}

export const EMPTY_EMERGENCY_CONTACT: EmergencyContact = {
  fullName: '',
  relationship: '',
  phone: '+',
  email: '',
  country: '',
};

export interface ApplicationFormData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    whatsappNumber: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
    currentCountry: string;
    homeAddress: string;
    correspondentAddress: string;
  };
  emergencyContact: EmergencyContact;
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
    passport_photo: File | null;
    transcript: File | null;
    passport: File | null;
    ielts: File | null;
    sop: File | null;
  };
  notes: string;
}
