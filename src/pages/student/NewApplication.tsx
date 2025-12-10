import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useDebounce } from '@/hooks/useDebounce';
import type { Database, Json } from '@/integrations/supabase/types';

// Import step components
import PersonalInfoStep from '@/components/application/PersonalInfoStep';
import EducationHistoryStep from '@/components/application/EducationHistoryStep';
import ProgramSelectionStep from '@/components/application/ProgramSelectionStep';
import DocumentsUploadStep from '@/components/application/DocumentsUploadStep';
import ReviewSubmitStep from '@/components/application/ReviewSubmitStep';

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Your basic details' },
  { id: 2, title: 'Education History', description: 'Academic background' },
  { id: 3, title: 'Desired Course', description: 'Select your course' },
  { id: 4, title: 'Documents', description: 'Upload required files' },
  { id: 5, title: 'Review & Submit', description: 'Final review' },
];

export interface ApplicationFormData {
  // Personal Information
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
  // Education History
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
  // Program Selection
  programSelection: {
    programId: string;
    intakeYear: number;
    intakeMonth: number;
    intakeId?: string;
  };
  // Documents
  documents: {
    transcript: File | null;
    passport: File | null;
    ielts: File | null;
    sop: File | null;
  };
  // Additional
  notes: string;
}

type ApplicationDraftRow = Database['public']['Tables']['application_drafts']['Row'];

const AUTO_SAVE_DEBOUNCE_MS = 1500;
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const LEGACY_DRAFT_STORAGE_KEY = 'application_draft';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
            level: typeof level === 'string' ? level : '',
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const isAgentFlow = profile?.role === 'agent' || profile?.role === 'staff' || profile?.role === 'admin';

  const hasHydratedFromDraft = useRef(false);
  const hasAttemptedLegacyMigration = useRef(false);
  const skipNextAutoSave = useRef(true);
  const tenantId = profile?.tenant_id || DEFAULT_TENANT_ID;

  // Form data state
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
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
        setLoading(false);
        return;
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
          navigate('/student/onboarding');
        }
        return;
      }

      setStudentId(studentData.id);

      // Pre-fill personal information
      setFormData((prev) => ({
        ...prev,
        personalInfo: {
          fullName: studentData.legal_name || profile?.full_name || studentData.profile?.full_name || '',
          email: studentData.contact_email || profile?.email || studentData.profile?.email || '',
          phone: studentData.contact_phone || profile?.phone || studentData.profile?.phone || '',
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
            level: record.level,
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
  }, [user?.id, profile, navigate, toast, studentIdFromUrl]);

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
    if (user) {
      fetchStudentData();
    }
  }, [user, fetchStudentData]);

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
      skipNextAutoSave.current = true;
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
      setFormData((prev) => ({
        ...prev,
        ...draftData,
        programSelection: {
          ...prev.programSelection,
          ...draftData.programSelection,
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

  const autoSaveMutation = useMutation<ApplicationDraftRow, unknown, DraftMutationPayload>({
    mutationFn: upsertDraftMutationFn,
    onSuccess: handleDraftSuccess,
    onError: (error) => {
      logError(error, 'NewApplication.autoSaveDraft');
      setAutoSaveError(getErrorMessage(error));
    },
  });

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

  const debouncedFormData = useDebounce(formData, AUTO_SAVE_DEBOUNCE_MS);
  const debouncedStep = useDebounce(currentStep, AUTO_SAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!studentId || !tenantId) return;
    if (loading || draftQuery.isLoading || submitting) return;

    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }

    autoSaveMutation.mutate({
      studentId,
      tenantId,
      programId: debouncedFormData.programSelection.programId || null,
      lastStep: debouncedStep,
      formData: debouncedFormData,
    });
  }, [
    autoSaveMutation,
    debouncedFormData,
    debouncedStep,
    draftQuery.isLoading,
    loading,
    studentId,
    submitting,
    tenantId,
  ]);

  const isSavingDraft = autoSaveMutation.isPending || manualSaveMutation.isPending;

  const handleManualSave = useCallback(() => {
    if (!studentId) {
      toast({
        title: 'Unable to save draft',
        description: 'Student profile not loaded yet.',
        variant: 'destructive',
      });
      return;
    }

    manualSaveMutation.mutate({
      studentId,
      tenantId,
      programId: formData.programSelection.programId || null,
      lastStep: currentStep,
      formData,
    });
  }, [currentStep, formData, manualSaveMutation, studentId, tenantId, toast]);

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

    const submittedByAgent = profile?.role === 'agent' && Boolean(agentId);
    const submissionChannel = submittedByAgent ? 'agent_portal' : 'student_portal';

    setSubmitting(true);
    try {
      // Create application
      const { data: applicationData, error: appError } = await supabase
        .from('applications')
        .insert({
          student_id: studentId,
          program_id: formData.programSelection.programId,
          intake_year: formData.programSelection.intakeYear,
          intake_month: formData.programSelection.intakeMonth,
          intake_id: formData.programSelection.intakeId || null,
          status: 'submitted',
          notes: formData.notes || null,
          tenant_id: tenantId,
          submitted_at: new Date().toISOString(),
          agent_id: submittedByAgent ? agentId : null,
          submitted_by_agent: submittedByAgent,
          submission_channel: submissionChannel,
          application_source: 'UniDoxia', // Attribution: track that this application came through UniDoxia platform
        })
        .select()
        .single();

      if (appError) throw appError;

      setApplicationId(applicationData.id);

      // Upload documents to storage and create document records
      const documentTypes = ['transcript', 'passport', 'ielts', 'sop'] as const;
      
      for (const docType of documentTypes) {
        const file = formData.documents[docType];
        if (file) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${docType}_${Date.now()}.${fileExt}`;
            const filePath = `${applicationData.id}/${fileName}`;

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
            await supabase.from('application_documents').insert({
              application_id: applicationData.id,
              document_type: docType,
              storage_path: filePath,
              file_size: file.size,
              mime_type: file.type,
            });
          } catch (error) {
            console.error(`Error processing ${docType}:`, error);
          }
        }
      }

      // Get program details for notifications
      const { data: programData } = await supabase
        .from('programs')
        .select('*, university:universities(*)')
        .eq('id', formData.programSelection.programId)
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

      // Clear stored draft after successful submission
      try {
        await supabase
          .from('application_drafts')
          .delete()
          .eq('student_id', studentId);
        queryClient.removeQueries({ queryKey: draftQueryKey });
        setLastSavedAt(null);
        setAutoSaveError(null);
        skipNextAutoSave.current = true;
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
        }
      } catch (draftCleanupError) {
        logError(draftCleanupError, 'NewApplication.clearDraftAfterSubmit');
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

  const progressPercentage = (currentStep / STEPS.length) * 100;
  const applicationsListUrl = isAgentFlow ? '/dashboard/applications' : '/student/applications';
  const viewApplicationUrl = isAgentFlow || !applicationId
    ? applicationsListUrl
    : `/student/applications/${applicationId}`;

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
          />
        )}
        {currentStep === 5 && (
          <ReviewSubmitStep
            formData={formData}
            onBack={goToPreviousStep}
            onSubmit={handleSubmit}
            submitting={submitting}
            onNotesChange={(notes) => setFormData((prev) => ({ ...prev, notes }))}
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
              disabled={!studentId || isSavingDraft}
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  Auto-save keeps your progress safe.
                </p>
              )}
              {autoSaveError && (
                <p className="text-xs text-destructive mt-1">
                  Auto-save failed: {autoSaveError}
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
              {applicationId && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Application Tracking ID:</p>
                  <p className="text-lg font-mono font-bold">{applicationId.slice(0, 8).toUpperCase()}</p>
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
