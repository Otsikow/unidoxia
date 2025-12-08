import { z } from 'zod';

// ==================== COMMON VALIDATORS ====================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 digits');

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2000, 'URL must be less than 2000 characters');

export const dateSchema = z
  .string()
  .or(z.date())
  .refine((val) => {
    const date = typeof val === 'string' ? new Date(val) : val;
    return !isNaN(date.getTime());
  }, 'Invalid date format');

export const futureeDateSchema = dateSchema.refine((val) => {
  const date = typeof val === 'string' ? new Date(val) : val;
  return date > new Date();
}, 'Date must be in the future');

export const pastDateSchema = dateSchema.refine((val) => {
  const date = typeof val === 'string' ? new Date(val) : val;
  return date < new Date();
}, 'Date must be in the past');

// ==================== AUTH SCHEMAS ====================

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  role: z.union([z.literal('student'), z.literal('agent'), z.literal('staff')])
    .refine((val) => ['student', 'agent', 'staff'].includes(val), {
      message: 'Please select a role',
    }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ==================== PROFILE SCHEMAS ====================

export const studentProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  dateOfBirth: pastDateSchema.optional(),
  nationality: z.string().min(2, 'Please select your nationality'),
  passportNumber: z
    .string()
    .min(6, 'Passport number must be at least 6 characters')
    .max(20, 'Passport number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, 'Address must be less than 500 characters').optional(),
  city: z.string().max(100, 'City must be less than 100 characters').optional(),
  country: z.string().min(2, 'Please select your country').optional(),
  postalCode: z.string().max(20, 'Postal code must be less than 20 characters').optional(),
  emergencyContact: z
    .object({
      name: z.string().max(100).optional(),
      relationship: z.string().max(50).optional(),
      phone: phoneSchema.optional(),
    })
    .optional(),
});

export const educationSchema = z.object({
  institution: z
    .string()
    .min(2, 'Institution name must be at least 2 characters')
    .max(200, 'Institution name must be less than 200 characters'),
  degree: z.string().min(2, 'Degree must be at least 2 characters'),
  fieldOfStudy: z.string().min(2, 'Field of study must be at least 2 characters'),
  startDate: pastDateSchema,
  endDate: dateSchema.optional(),
  grade: z.string().max(20).optional(),
  achievements: z.string().max(1000).optional(),
});

export const workExperienceSchema = z.object({
  company: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name must be less than 200 characters'),
  position: z
    .string()
    .min(2, 'Position must be at least 2 characters')
    .max(100, 'Position must be less than 100 characters'),
  startDate: pastDateSchema,
  endDate: dateSchema.optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  current: z.boolean().optional(),
});

// ==================== APPLICATION SCHEMAS ====================

export const applicationSchema = z.object({
  programId: z.string().uuid('Invalid program ID'),
  intakeMonth: z.number().min(1).max(12),
  intakeYear: z.number().min(new Date().getFullYear()).max(new Date().getFullYear() + 3),
  englishTestType: z
    .enum(['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'None'])
    .optional(),
  englishTestScore: z.string().max(20).optional(),
  gpaScore: z.string().max(10).optional(),
  personalStatement: z
    .string()
    .min(100, 'Personal statement must be at least 100 characters')
    .max(5000, 'Personal statement must be less than 5000 characters')
    .optional(),
});

export const documentUploadSchema = z.object({
  documentType: z.enum([
    'passport',
    'transcript',
    'degree_certificate',
    'english_test',
    'recommendation_letter',
    'personal_statement',
    'cv_resume',
    'financial_document',
    'other',
  ]),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) =>
        [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.type),
      'File must be PDF, DOC, DOCX, JPG, or PNG'
    ),
  description: z.string().max(500).optional(),
});

// ==================== MESSAGE SCHEMAS ====================

export const messageSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject must be less than 200 characters')
    .optional(),
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(10000, 'Message must be less than 10000 characters'),
  attachments: z.array(z.instanceof(File)).max(5, 'Maximum 5 attachments allowed').optional(),
});

// ==================== PAYMENT SCHEMAS ====================

export const paymentSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount must be less than 1,000,000'),
  currency: z.string().length(3, 'Invalid currency code'),
  purpose: z.enum(['application_fee', 'service_fee', 'deposit', 'tuition', 'other']),
  description: z.string().max(500).optional(),
});

// ==================== AGENT SCHEMAS ====================

export const agentProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema,
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name must be less than 200 characters'),
  businessRegistrationNumber: z.string().max(50).optional(),
  website: urlSchema.optional().or(z.literal('')),
  address: z.string().max(500),
  city: z.string().max(100),
  country: z.string().min(2),
  postalCode: z.string().max(20),
  yearsOfExperience: z.number().min(0).max(100).optional(),
  specializations: z.array(z.string()).max(20).optional(),
});

export const bulkImportSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) =>
        [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ].includes(file.type),
      'File must be CSV or Excel format'
    ),
  mapping: z.record(z.string(), z.string()).optional(),
});

// ==================== SEARCH SCHEMAS ====================

export const universitySearchSchema = z.object({
  searchTerm: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  level: z.string().max(50).optional(),
  discipline: z.string().max(100).optional(),
  maxTuition: z.number().positive().optional(),
  scholarshipsOnly: z.boolean().optional(),
  ranking: z.number().positive().optional(),
});

// ==================== FEEDBACK SCHEMAS ====================

export const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'improvement', 'other']),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  rating: z.number().min(1).max(5).optional(),
  email: emailSchema.optional(),
  attachments: z.array(z.instanceof(File)).max(3).optional(),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Regular expression for validating UUID v4 format
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks if a string is a valid UUID
 * @param value - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUuid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * Returns the value if it's a valid UUID, otherwise returns null
 * Useful for database fields that expect UUID or null
 * @param value - The string to validate and return
 * @returns The value if valid UUID, null otherwise
 */
export function toValidUuidOrNull(value: string | null | undefined): string | null {
  return isValidUuid(value) ? value! : null;
}

export function validateField<T>(
  schema: z.ZodType<T>,
  value: unknown
): { success: boolean; data?: T; error?: string } {
  try {
    const data = schema.parse(value);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

export function getValidationErrors<T>(
  schema: z.ZodType<T>,
  data: unknown
): Record<string, string> {
  try {
    schema.parse(data);
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);
    }
    return {};
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

// ==================== TYPE EXPORTS ====================

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type StudentProfileFormData = z.infer<typeof studentProfileSchema>;
export type ApplicationFormData = z.infer<typeof applicationSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type AgentProfileFormData = z.infer<typeof agentProfileSchema>;
export type UniversitySearchFormData = z.infer<typeof universitySearchSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
