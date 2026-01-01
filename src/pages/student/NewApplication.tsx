import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, logError, formatErrorForToast } from '@/lib/errorUtils';
import { toValidUuidOrNull } from '@/lib/validation';
import BackButton from '@/components/BackButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database, Json } from '@/integrations/supabase/types';
import type { ApplicationFormData } from '@/types/application';
import { normalizeEducationLevel } from '@/lib/education';
import type { PostgrestError } from '@supabase/supabase-js';
import { useAgentProfileCompletion } from '@/hooks/useAgentProfileCompletion';
import { AgentProfileCompletionCard } from '@/components/agent/AgentProfileCompletionCard';
import { useApplicationLimitCheck } from '@/hooks/useStudentBilling';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

// Import step components
import PersonalInfoStep from '@/components/application/PersonalInfoStep';
import EducationHistoryStep from '@/components/application/EducationHistoryStep';
import ProgramSelectionStep from '@/components/application/ProgramSelectionStep';
import DocumentsUploadStep, { ExistingDocumentMap } from '@/components/application/DocumentsUploadStep';
import ReviewSubmitStep from '@/components/application/ReviewSubmitStep';

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Your basic details' },
  { id: 2, title: 'Education History', description: 'Academic background' },
  { id: 3, title: 'Course Selection', description: 'Select your course' },
  { id: 4, title: 'Documents', description: 'Upload required files' },
  { id: 5, title: 'Review & Submit', description: 'Final review' },
];

type ApplicationDraftRow = Database['public']['Tables']['application_drafts']['Row'];
type ApplicationRow = Database['public']['Tables']['applications']['Row'];

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const LEGACY_DRAFT_STORAGE_KEY = 'application_draft';
const APPLICATION_DOCUMENT_TYPES = ['passport_photo', 'transcript', 'passport', 'ielts', 'sop'] as const;
type ApplicationDocumentType = (typeof APPLICATION_DOCUMENT_TYPES)[number];

type StudentDocumentMetadata = {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  verified_status?: string | null;
};

const STUDENT_DOCUMENT_TYPE_MAP: Record<ApplicationDocumentType, string[]> = {
  passport_photo: ['passport_photo'],
  transcript: ['transcript', 'degree_certificate'],
  passport: ['passport'],
  ielts: ['english_test'],
  sop: ['personal_statement'],
};

const TRACKING_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TRACKING_ID_LENGTH = 8;
const WEST_AFRICAN_COUNTRIES = new Set(['Nigeria', 'Ghana', 'Sierra Leone', 'Gambia', 'Liberia']);

const generateTrackingId = () => {
  const bytes = new Uint32Array(TRACKING_ID_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((value) => TRACKING_ID_ALPHABET[value % TRACKING_ID_ALPHABET.length])
    .join('');
};

const getUniqueTrackingId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateTrackingId();

    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('app_number', candidate)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique tracking ID. Please try again.');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidUuidString = (value: string | null | undefined) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isMissingColumnError = (error: PostgrestError | null, column: string) => {
  if (!error) return false;

  const normalizedColumn = column.toLowerCase();
  const message = error.message?.toLowerCase() ?? '';
  const details = error.details?.toLowerCase() ?? '';
  const hint = error.hint?.toLowerCase() ?? '';
  const mentionsColumn =
    message.includes(normalizedColumn) || details.includes(normalizedColumn) || hint.includes(normalizedColumn);

  return (
    (error.code === '42703' && mentionsColumn) ||
    mentionsColumn ||
    message.includes('schema cache')
  );
};

const normalizeName = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';

const parseDateStrict = (value: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const mergeLegacyFormData = (
  current: ApplicationFormData,
  legacy: unknown,
): ApplicationFormData => {
  if (!isRecord(legacy)) {
    return current;
  }

  const personalInfoFields: Array<keyof ApplicationFormData['personalInfo']> = [
    'fullName',
    'email',
    'phone',
    'whatsappNumber',
    'dateOfBirth',
    'nationality',
    'passportNumber',
    'currentCountry',
    'address',
  ];

  const personalInfo = { ...current.personalInfo };
  const legacyPersonal = isRecord(legacy.personalInfo) ? legacy.personalInfo : null;
  if (legacyPersonal) {
    for (const field of personalInfoFields) {
      const rawValue = legacyPersonal[field as keyof typeof legacyPersonal];
      if (typeof rawValue === 'string') {
        personalInfo[field] = rawValue;
      }
    }
  }

  const educationHistory = Array.isArray(legacy.educationHistory)
    ? legacy.educationHistory
        .map((entry, index) => {
          if (!isRecord(entry)) return null;

          const id = entry.id;
          const level = entry.level;
          const institutionName = entry.institutionName;
          const country = entry.country;
          const startDate = entry.startDate;
          const endDate = entry.endDate;
          const gpa = entry.gpa;
          const gradeScale = entry.gradeScale;

          return {
            id: typeof id === 'string' && id.length > 0 ? id : `legacy-${index}`,
            level: typeof level === 'string' ? normalizeEducationLevel(level) : '',
            institutionName: typeof institutionName === 'string' ? institutionName : '',
            country: typeof country === 'string' ? country : '',
            startDate: typeof startDate === 'string' ? startDate : '',
            endDate: typeof endDate === 'string' ? endDate : '',
            gpa:
              typeof gpa === 'string'
                ? gpa
                : typeof gpa === 'number'
                ? gpa.toString()
                : '',
            gradeScale: typeof gradeScale === 'string' ? gradeScale : '',
          };
        })
        .filter((entry): entry is ApplicationFormData['educationHistory'][number] => Boolean(entry))
    : current.educationHistory;

  const programSelection = { ...current.programSelection };
  const legacyProgramSelection = isRecord(legacy.programSelection) ? legacy.programSelection : null;
  if (legacyProgramSelection) {
    const programId = legacyProgramSelection.programId;
    const intakeYear = legacyProgramSelection.intakeYear;
    const intakeMonth = legacyProgramSelection.intakeMonth;
    const intakeId = legacyProgramSelection.intakeId;

    if (typeof programId === 'string') {
      programSelection.programId = programId;
    }

    const parsedYear =
      typeof intakeYear === 'number'
        ? intakeYear
        : typeof intakeYear === 'string'
        ? Number(intakeYear)
        : NaN;
    if (!Number.isNaN(parsedYear) && Number.isFinite(parsedYear)) {
      programSelection.intakeYear = parsedYear;
    }

    const parsedMonth =
      typeof intakeMonth === 'number'
        ? intakeMonth
        : typeof intakeMonth === 'string'
        ? Number(intakeMonth)
        : NaN;
    if (!Number.isNaN(parsedMonth) && Number.isFinite(parsedMonth)) {
      programSelection.intakeMonth = parsedMonth;
    }

    if (typeof intakeId === 'string') {
      programSelection.intakeId = intakeId;
    }
  }

  const notes = typeof legacy.notes === 'string' ? legacy.notes : current.notes;

  return {
    ...current,
    personalInfo,
    educationHistory,
    programSelection,
    documents: current.documents,
    notes,
  };
};

const sanitizeFormDataForDraft = (data: ApplicationFormData): ApplicationFormData => ({
  ...data,
  documents: {
    passport_photo: null,
    transcript: null,
    passport: null,
    ielts: null,
    sop: null,
  },
});

type DraftMutationPayload = {
  studentId: string;
  tenantId: string;
  programId: string | null;
  lastStep: number;
  formData: ApplicationFormData;
};

export default function NewApplication() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programIdFromUrl = searchParams.get('program');
  const studentIdFromUrl = searchParams.get('studentId') || searchParams.get('student');
  const { user, profile } = useAuth();
  const {
    completion: agentCompletion,
    checklist: agentChecklist,
    hasAgentProfile,
    isLoading: agentProfileLoading,
  } = useAgentProfileCompletion();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [studentDocuments, setStudentDocuments] = useState<
    Partial<Record<ApplicationDocumentType, StudentDocumentMetadata>>
  >({});
  const isAgentFlow = profile?.role === 'agent' || profile?.role === 'staff' || profile?.role === 'admin';
  const isAgent = profile?.role === 'agent';
  const isStudent = profile?.role === 'student';
  const agentProfileIncomplete =
    isAgent && (!hasAgentProfile || agentCompletion.percentage < 100);
  
  // Application limit check for students
  const { 
    canCreate: canCreateApplication, 
    remainingApplications, 
    planInfo 
  } = useApplicationLimitCheck();

  const hasHydratedFromDraft = useRef(false);
  const hasAttemptedLegacyMigration = useRef(false);
  const hasInitializedForm = useRef(false);
  const tenantId = profile?.tenant_id || DEFAULT_TENANT_ID;

  // Form data state
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      whatsappNumber: '+',
      dateOfBirth: '',
      nationality: '',
      passportNumber: '',
      currentCountry: '',
      address: '',
    },
    educationHistory: [],
    programSelection: {
      programId: programIdFromUrl || '',
      intakeYear: new Date().getFullYear(),
      intakeMonth: 1,
    },
    documents: {
      passport_photo: null,
      transcript: null,
      passport: null,
      ielts: null,
      sop: null,
    },
    notes: '',
  });

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    const personal = formData.personalInfo;

    if (!personal.fullName.trim()) {
      issues.push('Add your full legal name as it appears on your passport.');
    }

    const profileName = normalizeName(profile?.full_name);
    const passportName = normalizeName(personal.fullName);
    if (profileName && passportName && profileName !== passportName) {
      issues.push('The name on your passport must match your profile name exactly. Update one of them so they are identical.');
    }

    const parsedDob = parseDateStrict(personal.dateOfBirth);
    if (!parsedDob) {
      issues.push('Use the YYYY-MM-DD format for your date of birth to avoid unreadable handwritten dates.');
    }

    if (!personal.nationality.trim()) {
      issues.push('Select your nationality so we can apply the right country-specific rules.');
    }

    if (formData.educationHistory.length === 0) {
      issues.push('Add at least one education record so universities can verify your academic history.');
    }

    const datedRecords: { startYear: number; endYear: number; label: string }[] = [];

    formData.educationHistory.forEach((record, index) => {
      const label = record.institutionName || `Education record ${index + 1}`;
      const startDate = parseDateStrict(record.startDate);
      const endDate = parseDateStrict(record.endDate);

      if (!startDate) {
        issues.push(`${label}: add a valid start date in YYYY-MM-DD format.`);
      }

      if (!endDate) {
        issues.push(`${label}: include an end date or expected graduation year so there are no missing years.`);
      }

      if (startDate && endDate) {
        if (endDate < startDate) {
          issues.push(`${label}: end date cannot be before the start date.`);
        } else {
          datedRecords.push({
            startYear: startDate.getUTCFullYear(),
            endYear: endDate.getUTCFullYear(),
            label,
          });
        }
      }

      const normalizedLevel = record.level.toLowerCase();
      if (WEST_AFRICAN_COUNTRIES.has(record.country.trim()) && !['WAEC', 'NECO'].includes(record.gradeScale)) {
        issues.push(`${label}: pick WAEC or NECO because the record is from a West African country.`);
      }

      if (normalizedLevel.includes('a level') && record.gradeScale !== 'A-Levels') {
        issues.push(`${label}: choose "A-Levels" for A-Level studies so admissions see the right exam system.`);
      }

      if (normalizedLevel.includes('ib') && record.gradeScale !== 'IB') {
        issues.push(`${label}: select "IB" for International Baccalaureate coursework.`);
      }
    });

    datedRecords
      .sort((a, b) => a.startYear - b.startYear)
      .some((record, index, arr) => {
        if (index === 0) return false;
        const previous = arr[index - 1];
        if (record.startYear - previous.endYear > 1) {
          issues.push(
            `Education history gap detected between ${previous.endYear} and ${record.startYear}. Add a record or update dates so there are no missing years.`,
          );
          return true;
        }
        return false;
      });

    if (!formData.programSelection.programId) {
      issues.push('Select a course before you submit your application.');
    }

    return issues;
  }, [formData, profile]);

  const mapStudentDocuments = useCallback(
    (documents: StudentDocumentMetadata[]): Partial<Record<ApplicationDocumentType, StudentDocumentMetadata>> => {
      const mapped: Partial<Record<ApplicationDocumentType, StudentDocumentMetadata>> = {};

      for (const docType of APPLICATION_DOCUMENT_TYPES) {
        const matches = documents.filter((doc) => STUDENT_DOCUMENT_TYPE_MAP[docType].includes(doc.document_type));

        if (matches.length > 0) {
          mapped[docType] = matches[0];
        }
      }

      return mapped;
    },
    [],
  );

  const loadStudentDocuments = useCallback(
    async (id: string) => {
      try {
        const { data, error } = await supabase
          .from('student_documents')
          .select('id, document_type, file_name, file_size, mime_type, storage_path, verified_status')
          .eq('student_id', id);

        if (error) throw error;

        setStudentDocuments(mapStudentDocuments(data ?? []));
      } catch (error) {
        logError(error, 'NewApplication.loadStudentDocuments');
      }
    },
    [mapStudentDocuments],
  );

  // Fetch student data and pre-fill personal info
  const fetchStudentData = useCallback(async () => {
    try {
      const actingAsStudent = profile?.role === 'student';
      const targetStudentId = actingAsStudent ? null : studentIdFromUrl;

      if (!user?.id && !targetStudentId) {
        setLoading(false);
        return;
      }

      if (!actingAsStudent && !targetStudentId) {
        toast({
          title: 'Student required',
          description: 'Select a student before submitting an application.',
          variant: 'destructive',
        });
        navigate('/dashboard/students', { replace: true });
        return;
      }

      if (profile?.role === 'agent') {
        if (!agentId) {
          return;
        }

        const { data: link, error: linkError } = await supabase
          .from('agent_student_links')
          .select('id')
          .eq('agent_id', agentId)
          .eq('student_id', targetStudentId)
          .maybeSingle();

        if (linkError) throw linkError;

        if (!link) {
          toast({
            title: 'Access restricted',
            description: 'You can only work with students assigned to you.',
            variant: 'destructive',
          });
          navigate('/dashboard/students', { replace: true });
          setLoading(false);
          return;
        }
      }

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(
          `*,
          profile:profiles!students_profile_id_fkey(
            full_name,
            email,
            phone
          )
        `,
        )
        .eq(actingAsStudent ? 'profile_id' : 'id', actingAsStudent ? user?.id : targetStudentId)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!studentData) {
        toast({
          title: 'Profile Required',
          description: 'Please complete your student profile first.',
          variant: 'destructive',
        });
        if (actingAsStudent) {
          navigate('/student/profile');
        }
        return;
      }

      setStudentId(studentData.id);
      void loadStudentDocuments(studentData.id);

      // Pre-fill personal information
      setFormData((prev) => ({
        ...prev,
        personalInfo: {
          fullName: studentData.legal_name || profile?.full_name || studentData.profile?.full_name || '',
          email: studentData.contact_email || profile?.email || studentData.profile?.email || '',
          phone: studentData.contact_phone || profile?.phone || studentData.profile?.phone || '',
          whatsappNumber:
            (studentData.address as any)?.whatsapp ||
            studentData.contact_phone ||
            profile?.phone ||
            studentData.profile?.phone ||
            '+',
          dateOfBirth: studentData.date_of_birth || '',
          nationality: studentData.nationality || '',
          passportNumber: studentData.passport_number || '',
          currentCountry: studentData.current_country || '',
          address: (studentData.address as any)?.street || '',
        },
      }));

      // Fetch education records
      const { data: eduRecords, error: eduError } = await supabase
        .from('education_records')
        .select('*')
        .eq('student_id', studentData.id)
        .order('start_date', { ascending: false });

      if (eduError) throw eduError;

      if (eduRecords && eduRecords.length > 0) {
      setFormData((prev) => ({
        ...prev,
        educationHistory: eduRecords.map((record) => ({
          id: record.id,
          level: normalizeEducationLevel(record.level),
          institutionName: record.institution_name,
          country: record.country,
          startDate: record.start_date,
          endDate: record.end_date || '',
          gpa: record.gpa?.toString() || '',
          gradeScale: record.grade_scale || '',
        })),
      }));
      }
    } catch (error) {
      logError(error, 'NewApplication.fetchStudentData');
      toast(formatErrorForToast(error, 'Failed to load student data'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile, navigate, toast, studentIdFromUrl, agentId]);

  useEffect(() => {
    const loadAgentId = async () => {
      if (profile?.role !== 'agent' || !user?.id) return;

      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        logError(error, 'NewApplication.loadAgentId');
        return;
      }

      setAgentId(data?.id ?? null);
    };

    void loadAgentId();
  }, [profile?.role, user?.id]);

  useEffect(() => {
    if (!user) return;
    if (profile?.role === 'agent' && !agentId) return;

    fetchStudentData();
  }, [user, fetchStudentData, profile?.role, agentId]);

  useEffect(() => {
    if (studentId) {
      void loadStudentDocuments(studentId);
    }
  }, [loadStudentDocuments, studentId]);

  const draftQueryKey = ['application-draft', studentId] as const;

  const upsertDraftMutationFn = useCallback(async (
    payload: DraftMutationPayload,
  ): Promise<ApplicationDraftRow> => {
    // Validate program_id is a valid UUID before saving (fallback courses have non-UUID IDs)
    const validProgramId = toValidUuidOrNull(payload.programId);
    
    const draftRecord = {
      student_id: payload.studentId,
      tenant_id: payload.tenantId,
      program_id: validProgramId,
      last_step: payload.lastStep,
      form_data: sanitizeFormDataForDraft(payload.formData) as unknown as Json,
    };

    const { data, error } = await supabase
      .from('application_drafts')
      .upsert(draftRecord, { onConflict: 'student_id' })
      .select('id, student_id, tenant_id, program_id, form_data, last_step, updated_at, created_at')
      .single();

    if (error) {
      throw error;
    }

    return data as ApplicationDraftRow;
  }, []);

  const handleDraftSuccess = useCallback((data: ApplicationDraftRow) => {
    queryClient.setQueryData(draftQueryKey, data);
    if (data.updated_at) {
      setLastSavedAt(new Date(data.updated_at));
    } else {
      setLastSavedAt(new Date());
    }
    setAutoSaveError(null);
    setHasUnsavedChanges(false);
  }, [draftQueryKey, queryClient]);

  const draftQuery = useQuery({
    queryKey: draftQueryKey,
    enabled: Boolean(studentId),
    queryFn: async (): Promise<ApplicationDraftRow | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('application_drafts')
        .select('id, form_data, last_step, updated_at, program_id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as ApplicationDraftRow | null;
    },
  });

  useEffect(() => {
    if (draftQuery.error) {
      logError(draftQuery.error, 'NewApplication.loadDraft');
      toast(formatErrorForToast(draftQuery.error, 'Failed to load saved draft'));
    }
  }, [draftQuery.error, toast]);

  useEffect(() => {
    if (hasAttemptedLegacyMigration.current) return;
    if (!studentId) return;
    if (!tenantId) return;
    if (draftQuery.isLoading || draftQuery.isFetching) return;

    if (draftQuery.data) {
      hasAttemptedLegacyMigration.current = true;
      return;
    }

    if (typeof window === 'undefined') {
      hasAttemptedLegacyMigration.current = true;
      return;
    }

    const legacyDraft = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
    if (!legacyDraft) {
      hasAttemptedLegacyMigration.current = true;
      return;
    }

    hasAttemptedLegacyMigration.current = true;

    try {
      const parsed = JSON.parse(legacyDraft);
      const mergedFormData = mergeLegacyFormData(formDataRef.current, parsed);
      formDataRef.current = mergedFormData;
      setFormData(mergedFormData);

      const legacyStep = (() => {
        if (!isRecord(parsed)) return null;
        const possibleKeys: Array<'currentStep' | 'lastStep' | 'step'> = ['currentStep', 'lastStep', 'step'];
        for (const key of possibleKeys) {
          const rawValue = parsed[key];
          const numeric =
            typeof rawValue === 'number'
              ? rawValue
              : typeof rawValue === 'string'
              ? Number(rawValue)
              : NaN;
          if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
            const rounded = Math.round(numeric);
            if (rounded >= 1 && rounded <= STEPS.length) {
              return rounded;
            }
          }
        }
        return null;
      })();

      if (legacyStep) {
        setCurrentStep(legacyStep);
      }

      const stepForDraft = legacyStep ?? currentStep;

      void (async () => {
        try {
          const data = await upsertDraftMutationFn({
            studentId,
            tenantId,
            programId: mergedFormData.programSelection.programId || null,
            lastStep: stepForDraft,
            formData: mergedFormData,
          });
          handleDraftSuccess(data);
          window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
          toast({
            title: 'Draft Restored',
            description: 'We moved your saved application progress to your account.',
          });
        } catch (migrationError) {
          logError(migrationError, 'NewApplication.migrateLegacyDraft');
          setAutoSaveError(getErrorMessage(migrationError));
          toast(formatErrorForToast(migrationError, 'Failed to migrate saved draft'));
        }
      })();
    } catch (error) {
      logError(error, 'NewApplication.parseLegacyDraft');
      window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
    }
  }, [
    currentStep,
    draftQuery.data,
    draftQuery.isFetching,
    draftQuery.isLoading,
    handleDraftSuccess,
    studentId,
    tenantId,
    toast,
    upsertDraftMutationFn,
  ]);

  useEffect(() => {
    if (hasHydratedFromDraft.current) return;
    if (!draftQuery.data) {
      hasHydratedFromDraft.current = true;
      return;
    }

    const draftData = draftQuery.data.form_data as unknown as ApplicationFormData | null;
    if (draftData) {
      const normalizedDraftData: ApplicationFormData = {
        ...draftData,
        educationHistory: Array.isArray(draftData.educationHistory)
          ? draftData.educationHistory.map((record, index) => ({
              ...record,
              id: record.id || `draft-${index}`,
              level: normalizeEducationLevel(record.level),
            }))
          : [],
        documents: draftData.documents,
      };

      setFormData((prev) => ({
        ...prev,
        ...normalizedDraftData,
        programSelection: {
          ...prev.programSelection,
          ...normalizedDraftData.programSelection,
        },
        documents: prev.documents,
      }));

      if (draftQuery.data.last_step) {
        setCurrentStep(draftQuery.data.last_step);
      }

      if (draftQuery.data.updated_at) {
        setLastSavedAt(new Date(draftQuery.data.updated_at));
      }
    }

    hasHydratedFromDraft.current = true;
  }, [draftQuery.data]);

  const manualSaveMutation = useMutation<ApplicationDraftRow, unknown, DraftMutationPayload>({
    mutationFn: upsertDraftMutationFn,
    onSuccess: (data) => {
      handleDraftSuccess(data);
      toast({
        title: 'Draft Saved',
        description: 'Your progress has been saved.',
      });
    },
    onError: (error) => {
      logError(error, 'NewApplication.manualSaveDraft');
      toast(formatErrorForToast(error, 'Failed to save draft'));
      setAutoSaveError(getErrorMessage(error));
    },
  });
  const backgroundSaveMutation = useMutation<ApplicationDraftRow, unknown, DraftMutationPayload>({
    mutationFn: upsertDraftMutationFn,
    onSuccess: (data) => {
      handleDraftSuccess(data);
    },
    onError: (error) => {
      logError(error, 'NewApplication.backgroundSaveDraft');
      setAutoSaveError(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (loading || !hasHydratedFromDraft.current) return;
    if (!hasInitializedForm.current) {
      hasInitializedForm.current = true;
      return;
    }

    setHasUnsavedChanges(true);
  }, [currentStep, formData, loading]);

  const isSavingDraft = backgroundSaveMutation.isPending || manualSaveMutation.isPending;

  const persistLocalDraft = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const sanitized = sanitizeFormDataForDraft(formDataRef.current);
    const snapshot = {
      ...sanitized,
      currentStep,
    };

    window.localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    setLastSavedAt(new Date());
    return true;
  }, [currentStep]);

  const handleBackgroundSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    if (!studentId || !tenantId) {
      persistLocalDraft();
      return;
    }

    try {
      await backgroundSaveMutation.mutateAsync({
        studentId,
        tenantId,
        programId: formDataRef.current.programSelection.programId || null,
        lastStep: currentStep,
        formData: formDataRef.current,
      });
    } catch (error) {
      logError(error, 'NewApplication.backgroundSaveOnExit');
      setAutoSaveError(getErrorMessage(error));
      persistLocalDraft();
    }
  }, [
    backgroundSaveMutation,
    currentStep,
    hasUnsavedChanges,
    persistLocalDraft,
    studentId,
    tenantId,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void handleBackgroundSave();
      }
    };

    const handleBeforeUnload = () => {
      if (!hasUnsavedChanges) return;
      void handleBackgroundSave();
      persistLocalDraft();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBackgroundSave, hasUnsavedChanges, persistLocalDraft]);

  const handleManualSave = useCallback(async () => {
    if (!studentId) {
      const savedLocally = persistLocalDraft();
      toast({
        title: savedLocally ? 'Draft saved locally' : 'Unable to save draft',
        description: savedLocally
          ? 'We will sync your progress once your student profile is available.'
          : 'Student profile not loaded yet.',
        variant: savedLocally ? 'default' : 'destructive',
      });
      if (savedLocally) {
        setHasUnsavedChanges(false);
      }
      return;
    }

    try {
      await manualSaveMutation.mutateAsync({
        studentId,
        tenantId,
        programId: formData.programSelection.programId || null,
        lastStep: currentStep,
        formData,
      });
    } catch (error) {
      logError(error, 'NewApplication.manualSaveDraft');
        toast(formatErrorForToast(error, 'Failed to save draft'));
        setAutoSaveError(getErrorMessage(error));
      }
    }, [
      currentStep,
    formData,
    manualSaveMutation,
    persistLocalDraft,
    studentId,
    tenantId,
    toast,
  ]);

  const isInitialLoading = loading || draftQuery.isLoading;

  // Handle step navigation
  const goToNextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!studentId || !formData.programSelection.programId) {
      toast({
        title: 'Error',
        description: 'Missing required information',
        variant: 'destructive',
      });
      return;
    }

    if (validationIssues.length > 0) {
      toast({
        title: 'Complete the required details',
        description: validationIssues.join(' '),
        variant: 'destructive',
      });
      return;
    }

    const programId = toValidUuidOrNull(formData.programSelection.programId);
    if (!programId) {
      toast({
        title: 'Invalid program selected',
        description: 'Please pick a valid course before submitting your application.',
        variant: 'destructive',
      });
      return;
    }

    const submittedByAgent = profile?.role === 'agent' && Boolean(agentId);
    const submissionChannel = submittedByAgent ? 'agent_portal' : 'student_portal';

    setSubmitting(true);
    try {
      // Persist the student particulars captured in this application so universities
      // can reliably review identity + background from the application record.
      const syncStudentProfile = async () => {
        const personal = formDataRef.current.personalInfo;
        const legalName = personal.fullName?.trim() ?? '';
        const contactEmail = personal.email?.trim() ?? '';
        const contactPhone = personal.phone?.trim() ?? '';
        const whatsappNumber = personal.whatsappNumber?.trim() ?? '';
        const nationality = personal.nationality?.trim() ?? '';
        const passportNumber = personal.passportNumber?.trim() ?? '';
        const currentCountry = personal.currentCountry?.trim() ?? '';
        const dateOfBirth = personal.dateOfBirth?.trim() ?? '';
        const addressText = personal.address?.trim() ?? '';

        const educationRecords = (formDataRef.current.educationHistory ?? []).map((rec) => ({
          id: rec.id,
          level: normalizeEducationLevel(rec.level),
          institutionName: rec.institutionName?.trim() ?? '',
          country: rec.country?.trim() ?? '',
          startDate: rec.startDate,
          endDate: rec.endDate,
          gpa: rec.gpa,
          gradeScale: rec.gradeScale,
        }));

        const rpcResult = await supabase.rpc(
          'sync_student_profile_from_application_submit' as any,
          {
            p_student_id: studentId,
            p_legal_name: legalName || null,
            p_contact_email: contactEmail || null,
            p_contact_phone: contactPhone || null,
            p_whatsapp_number: whatsappNumber || null,
            p_date_of_birth: dateOfBirth || null,
            p_nationality: nationality || null,
            p_passport_number: passportNumber || null,
            p_current_country: currentCountry || null,
            p_address: addressText ? ({ street: addressText } as any) : null,
            p_education_records: educationRecords as any,
          },
        );

        // WhatsApp number is stored in address JSON, no separate column update needed

        // If RPC exists and succeeded, we're done.
        if (!rpcResult.error) return;

        // If RPC is missing, fall back to direct updates (works for student-owned records).
        const msg = (rpcResult.error.message ?? '').toLowerCase();
        const code = rpcResult.error.code ?? '';
        const isMissingRpc =
          code === 'PGRST202' ||
          code === 'PGRST204' ||
          code === '42P01' ||
          msg.includes('could not find the function') ||
          msg.includes('schema cache');

        if (!isMissingRpc) {
          // Permission or other error: don't block submission, but log for diagnosis.
          console.warn('[NewApplication] Student sync RPC failed:', rpcResult.error);
          return;
        }

        const updateStudent: Record<string, unknown> = {};
        if (legalName) updateStudent.legal_name = legalName;
        if (contactEmail) updateStudent.contact_email = contactEmail;
        if (contactPhone) updateStudent.contact_phone = contactPhone;
        if (whatsappNumber) updateStudent.whatsapp_number = whatsappNumber;
        if (nationality) updateStudent.nationality = nationality;
        if (passportNumber) updateStudent.passport_number = passportNumber;
        if (currentCountry) updateStudent.current_country = currentCountry;
        if (dateOfBirth) updateStudent.date_of_birth = dateOfBirth;
        if (addressText) updateStudent.address = { street: addressText };

        if (Object.keys(updateStudent).length > 0) {
          const { error: stuErr } = await supabase
            .from('students')
            .update(updateStudent as never)
            .eq('id', studentId);
          if (stuErr) {
            console.warn('[NewApplication] Student update fallback failed:', stuErr);
          }
        }

        const eduRows = educationRecords
          .filter((r) => r.institutionName && r.country && r.startDate)
          .map((r) => ({
            id: isValidUuidString(r.id) ? r.id : undefined,
            student_id: studentId,
            level: r.level,
            institution_name: r.institutionName,
            country: r.country,
            start_date: r.startDate,
            end_date: r.endDate || null,
            grade_scale: r.gradeScale || null,
            gpa:
              typeof r.gpa === 'string' && r.gpa.trim().length > 0
                ? Number(r.gpa)
                : null,
          }));

        if (eduRows.length > 0) {
          const { error: eduErr } = await supabase
            .from('education_records')
            .upsert(eduRows as never, { onConflict: 'id' })
            .select('id')
            .limit(1);
          if (eduErr) {
            console.warn('[NewApplication] Education upsert fallback failed:', eduErr);
          }
        }
      };

      await syncStudentProfile();

      // Ensure the application is stored under the program/university tenant (not the submitter's tenant).
      // This is critical for university dashboards to see applications instantly and consistently.
      const { data: programMeta, error: programMetaError } = await supabase
        .from('programs')
        .select('id, tenant_id')
        .eq('id', programId)
        .single();

      if (programMetaError) {
        throw programMetaError;
      }

      const applicationTenantId =
        typeof programMeta?.tenant_id === 'string' && programMeta.tenant_id.length > 0
          ? programMeta.tenant_id
          : tenantId;

      const trackingId = await getUniqueTrackingId();

      const baseApplicationPayload = {
        app_number: trackingId,
        student_id: studentId,
        program_id: programId,
        intake_year: formData.programSelection.intakeYear,
        intake_month: formData.programSelection.intakeMonth,
        intake_id: formData.programSelection.intakeId || null,
        status: 'submitted',
        notes: formData.notes || null,
        tenant_id: applicationTenantId,
        submitted_at: new Date().toISOString(),
      };

      const optionalApplicationColumns = {
        application_source: 'UniDoxia' as const, // Attribution: track that this application came through UniDoxia platform
        submitted_by_agent: submittedByAgent,
        submission_channel: submissionChannel,
        agent_id: submittedByAgent ? agentId : null,
      };

      const attemptInsert = async (
        payload: Record<string, unknown>,
      ) => supabase.from('applications').insert(payload as never).select().single();

      // Keep retrying by stripping optional columns that are missing from the target schema
      // until the insert succeeds or we exhaust all optional columns.
      const optionalColumnEntries = Object.entries(optionalApplicationColumns);
      const excludedColumns = new Set<string>();
      let currentPayload: Record<string, unknown> = {
        ...baseApplicationPayload,
        ...optionalApplicationColumns,
      };
      let lastError: PostgrestError | null = null;
      let createdApplication: ApplicationRow | null = null;

      for (let attempt = 0; attempt <= optionalColumnEntries.length; attempt++) {
        const { data, error } = await attemptInsert(currentPayload);

        if (!error && data) {
          createdApplication = data;
          break;
        }

        lastError = error;

        const missingColumns = optionalColumnEntries
          .map(([column]) => column)
          .filter((column) => !excludedColumns.has(column) && isMissingColumnError(error, column));

        if (missingColumns.length === 0) {
          break;
        }

        missingColumns.forEach((column) => excludedColumns.add(column));

        console.warn(
          'Optional application columns missing, retrying insert without them',
          missingColumns,
        );

        const nextPayload: Record<string, unknown> = {
          ...baseApplicationPayload,
        };

        for (const [column, value] of optionalColumnEntries) {
          if (!excludedColumns.has(column)) {
            nextPayload[column] = value;
          }
        }

        currentPayload = nextPayload;
      }

      if (!createdApplication) {
        throw lastError || new Error('Failed to create application');
      }

      setApplicationId(createdApplication.id);
      setTrackingCode(createdApplication.app_number ?? trackingId);

      // Upload documents to storage and create document records
      for (const docType of APPLICATION_DOCUMENT_TYPES) {
        const file = formData.documents[docType];
        if (file) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${docType}_${Date.now()}.${fileExt}`;
            const filePath = `${createdApplication.id}/${fileName}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('application-documents')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error(`Failed to upload ${docType}:`, uploadError);
              continue; // Continue with other documents
            }

            // Create document record
            await supabase.from('application_documents').insert([{
              application_id: createdApplication.id,
              document_type: docType as any,
              storage_path: filePath,
              file_size: file.size,
              mime_type: file.type,
            }]);
          } catch (error) {
            console.error(`Error processing ${docType}:`, error);
          }
        } else {
          const studentDocument = studentDocuments[docType];

          if (!studentDocument) {
            continue;
          }

          try {
            const { data: existingFile, error: downloadError } = await supabase.storage
              .from('student-documents')
              .download(studentDocument.storage_path);

            if (downloadError || !existingFile) {
              console.error(`Failed to fetch existing ${docType} for reuse:`, downloadError);
              continue;
            }

            const fileName = `${docType}_${Date.now()}_${studentDocument.file_name}`;
            const filePath = `${createdApplication.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('application-documents')
              .upload(filePath, existingFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: studentDocument.mime_type,
              });

            if (uploadError) {
              console.error(`Failed to reuse ${docType}:`, uploadError);
              continue;
            }

            await supabase.from('application_documents').insert([{
              application_id: createdApplication.id,
              document_type: docType as any,
              storage_path: filePath,
              file_size: studentDocument.file_size,
              mime_type: studentDocument.mime_type,
            }]);
          } catch (error) {
            console.error(`Error reusing ${docType}:`, error);
          }
        }
      }

      // Get program details for notifications
      try {
        const { data: programData } = await supabase
          .from('programs')
          .select('*, university:universities(*)')
          .eq('id', programId)
          .single();

        // Send notification to agent if assigned
        const { data: assignmentData } = await supabase
          .from('student_assignments')
          .select('counselor_id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (assignmentData?.counselor_id) {
          await supabase.from('notifications').insert({
            user_id: assignmentData.counselor_id,
            tenant_id: tenantId,
            type: 'general',
            title: 'New Application Submitted',
            content: `A new application has been submitted for ${programData?.name || 'a program'}.`,
            metadata: {
              program_id: programData?.id ?? null,
              program_name: programData?.name ?? null,
              university_name: programData?.university?.name ?? null,
            },
            action_url: '/dashboard/applications',
          });
        }
      } catch (notificationError) {
        logError(notificationError, 'NewApplication.notifications');
      }

      // Clear stored draft after successful submission
      try {
        await supabase
          .from('application_drafts')
          .delete()
          .eq('student_id', studentId);
        queryClient.removeQueries({ queryKey: draftQueryKey });
        setLastSavedAt(null);
        setAutoSaveError(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
        }
      } catch (draftCleanupError) {
        logError(draftCleanupError, 'NewApplication.clearDraftAfterSubmit');
      }

        // Send email notification (submission)
        try {
          await supabase.functions.invoke('send-application-update', {
            body: {
              applicationId: createdApplication.id,
              type: 'submitted'
            }
          });
        } catch (emailError) {
          console.error("Failed to send submission email:", emailError);
        }

        // Show success modal
        setShowSuccessModal(true);
    } catch (error) {
      logError(error, 'NewApplication.handleSubmit');
      toast(formatErrorForToast(error, 'Failed to submit application'));
    } finally {
      setSubmitting(false);
    }
  };

  const existingDocumentsForStep = useMemo<ExistingDocumentMap>(() => {
    const map: ExistingDocumentMap = {};

    for (const docType of APPLICATION_DOCUMENT_TYPES) {
      const studentDoc = studentDocuments[docType];
      if (studentDoc) {
        map[docType] = {
          fileName: studentDoc.file_name,
          fileSize: studentDoc.file_size,
          mimeType: studentDoc.mime_type,
          verifiedStatus: studentDoc.verified_status,
        };
      }
    }

    return map;
  }, [studentDocuments]);

  const progressPercentage = (currentStep / STEPS.length) * 100;
  const applicationsListUrl = isAgentFlow ? '/dashboard/applications' : '/student/applications';
  const viewApplicationUrl = isAgentFlow || !applicationId
    ? applicationsListUrl
    : `/student/applications/${applicationId}`;

  if (isAgent && agentProfileLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isAgent && agentProfileIncomplete) {
    return (
      <div className="container mx-auto py-8 max-w-5xl space-y-6">
        <BackButton variant="ghost" size="sm" wrapperClassName="mb-2" fallback="/dashboard" />
        <AgentProfileCompletionCard
          completion={agentCompletion}
          checklist={agentChecklist}
          loading={agentProfileLoading}
          actionHref="/agent/settings"
        />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Profile required to start applications</CardTitle>
            <CardDescription>
              Complete every field in your agent profile (name, agency, certificate, phone, and location) to unlock
              student applications.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // University limit check for students on Free plan
  if (isStudent && !canCreateApplication) {
    return (
      <div className="container mx-auto py-8 max-w-3xl space-y-6">
        <BackButton variant="ghost" size="sm" wrapperClassName="mb-2" fallback="/student/dashboard" />

        <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg">University Limit Reached</AlertTitle>
          <AlertDescription className="mt-3 space-y-4">
            <p>
              You have reached the maximum of <strong>1 university</strong> on the Free plan.
            </p>
            <p className="text-sm">
              Current plan: <strong>{planInfo.displayName}</strong>
            </p>
            <p>
              Upgrade to Self-Service ($49) or Agent-Supported ($200) to apply to unlimited universities.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button asChild>
                <Link to="/pricing">View Plans & Upgrade</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/student/applications">View My Applications</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      <BackButton variant="ghost" size="sm" wrapperClassName="mb-4" fallback="/dashboard" />

      {/* Header */}
      <div className="space-y-1.5 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          New Application
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Complete all steps to submit your application
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center flex-1 ${
                  step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${
                    step.id < currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'border-primary bg-background'
                      : 'border-muted bg-background'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <span className="text-xs text-center hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {validationIssues.length > 0 && (
        <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:bg-amber-950/40">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-base">Finish these items before you submit</AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            <ul className="list-disc pl-5 space-y-1">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="animate-fade-in">
        {currentStep === 1 && (
          <PersonalInfoStep
            data={formData.personalInfo}
            onChange={(data) => setFormData((prev) => ({ ...prev, personalInfo: data }))}
            onNext={goToNextStep}
          />
        )}
        {currentStep === 2 && (
          <EducationHistoryStep
            data={formData.educationHistory}
            onChange={(data) => setFormData((prev) => ({ ...prev, educationHistory: data }))}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 3 && (
          <ProgramSelectionStep
            data={formData.programSelection}
            onChange={(data) => setFormData((prev) => ({ ...prev, programSelection: data }))}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}
        {currentStep === 4 && (
          <DocumentsUploadStep
            data={formData.documents}
            onChange={(data) => setFormData((prev) => ({ ...prev, documents: data }))}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            existingDocuments={existingDocumentsForStep}
          />
        )}
        {currentStep === 5 && (
          <ReviewSubmitStep
            formData={formData}
            onBack={goToPreviousStep}
            onSubmit={handleSubmit}
            submitting={submitting}
            onNotesChange={(notes) => setFormData((prev) => ({ ...prev, notes }))}
            existingDocuments={existingDocumentsForStep}
            validationIssues={validationIssues}
          />
        )}
      </div>

      {/* Save Draft Button */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleManualSave}
              className="w-full sm:w-auto"
              disabled={isSavingDraft}
              >
              {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Continue Later
            </Button>
            <div className="flex-1 text-left sm:text-right">
              {isSavingDraft ? (
                <p className="text-xs text-muted-foreground">Saving draft...</p>
              ) : lastSavedAt ? (
                <p className="text-xs text-muted-foreground">
                  Last saved at {lastSavedAt.toLocaleTimeString()}
                </p>
              ) : hasUnsavedChanges ? (
                <p className="text-xs text-muted-foreground">
                  Unsaved changes. Click "Save & Continue Later" to keep your work.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We'll save your progress automatically if you leave this page.
                </p>
              )}
              {autoSaveError && (
                <p className="text-xs text-destructive mt-1">
                  Background save failed: {autoSaveError}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Application Submitted!</DialogTitle>
            <DialogDescription className="text-center space-y-4">
              <p>
                Your application has been successfully submitted. You will receive updates via
                email and notifications.
              </p>
              {trackingCode && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Application Tracking ID</p>
                  <p className="text-lg font-mono font-bold">{trackingCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use this ID anytime in your dashboard to instantly open your application status.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              onClick={() => navigate(viewApplicationUrl)}
              className="flex-1"
            >
              View Application
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(applicationsListUrl)}
              className="flex-1"
            >
              Track Applications
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(applicationsListUrl)}
              className="flex-1"
            >
              My Applications
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
