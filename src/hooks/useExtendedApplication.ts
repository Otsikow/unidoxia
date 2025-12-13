import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ExtendedApplication,
  ApplicationDocument,
  StudentDetails,
  EducationRecord,
  TestScore,
  TimelineEvent,
} from "@/components/university/applications/ApplicationReviewDialog";

const STORAGE_BUCKET = "student-documents";

interface UseExtendedApplicationReturn {
  extendedApplication: ExtendedApplication | null;
  isLoading: boolean;
  error: string | null;
  fetchExtendedApplication: (applicationId: string) => Promise<void>;
  clearApplication: () => void;
  updateLocalStatus: (newStatus: string, timelineEvent?: TimelineEvent) => void;
}

const getPublicUrl = (storagePath: string | null): string | null => {
  if (!storagePath) return null;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
};

const parseEducationHistory = (raw: unknown): EducationRecord[] | null => {
  if (!raw) return null;
  if (!Array.isArray(raw)) return null;
  return raw.map((item: any) => ({
    id: item.id ?? undefined,
    level: item.level ?? "",
    institutionName: item.institutionName ?? item.institution_name ?? "",
    country: item.country ?? "",
    startDate: item.startDate ?? item.start_date ?? "",
    endDate: item.endDate ?? item.end_date ?? "",
    gpa: item.gpa ?? "",
    gradeScale: item.gradeScale ?? item.grade_scale ?? "4.0",
  }));
};

const parseTestScores = (raw: unknown): TestScore[] | null => {
  if (!raw) return null;
  if (!Array.isArray(raw)) return null;
  return raw.map((item: any) => ({
    testType: item.testType ?? item.test_type ?? "",
    totalScore: item.totalScore ?? item.total_score ?? 0,
    testDate: item.testDate ?? item.test_date ?? "",
    subscores: item.subscores ?? item.subscores_json ?? undefined,
  }));
};

const parseTimelineJson = (raw: unknown): TimelineEvent[] | null => {
  if (!raw) return null;
  if (!Array.isArray(raw)) return null;
  return raw.map((item: any) => ({
    id: item.id ?? crypto.randomUUID(),
    action: item.action ?? "",
    timestamp: item.timestamp ?? "",
    actor: item.actor ?? undefined,
    details: item.details ?? undefined,
  }));
};

export function useExtendedApplication(): UseExtendedApplicationReturn {
  const [extendedApplication, setExtendedApplication] = useState<ExtendedApplication | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExtendedApplication = useCallback(async (applicationId: string) => {
    if (!applicationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch application with program info
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          app_number,
          status,
          created_at,
          submitted_at,
          updated_at,
          program_id,
          student_id,
          agent_id,
          intake_month,
          intake_year,
          notes,
          internal_notes,
          timeline_json,
          programs:programs (
            id,
            name,
            level,
            discipline
          )
        `)
        .eq("id", applicationId)
        .single();

      if (appError) throw appError;
      if (!appData) throw new Error("Application not found");

      const program = appData.programs as any;

      // Fetch student details with profile fallback
      let studentDetails: StudentDetails | null = null;
      if (appData.student_id) {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(`
            id,
            profile_id,
            legal_name,
            preferred_name,
            contact_email,
            contact_phone,
            nationality,
            date_of_birth,
            passport_number,
            current_country,
            education_history,
            test_scores,
            profile:profiles!students_profile_id_fkey (
              full_name,
              email,
              phone
            )
          `)
          .eq("id", appData.student_id)
          .single();

        if (!studentError && studentData) {
          const profile = studentData.profile as any;
          // Use legal_name, then preferred_name, then profile.full_name as fallback
          const displayName = studentData.legal_name ?? studentData.preferred_name ?? profile?.full_name ?? "Unknown";
          
          studentDetails = {
            id: studentData.id,
            profileId: studentData.profile_id,
            legalName: displayName,
            preferredName: studentData.preferred_name ?? null,
            email: studentData.contact_email ?? profile?.email ?? null,
            phone: studentData.contact_phone ?? profile?.phone ?? null,
            nationality: studentData.nationality ?? null,
            dateOfBirth: studentData.date_of_birth ?? null,
            passportNumber: studentData.passport_number ?? null,
            currentCountry: studentData.current_country ?? null,
            educationHistory: parseEducationHistory(studentData.education_history),
            testScores: parseTestScores(studentData.test_scores),
          };
        }
      }

      // Fetch application documents
      let documents: ApplicationDocument[] = [];
      
      // Try application_documents first
      const { data: appDocsData } = await supabase
        .from("application_documents")
        .select(`
          id,
          document_type,
          storage_path,
          mime_type,
          file_size,
          verified,
          verification_notes,
          uploaded_at
        `)
        .eq("application_id", applicationId);

      if (appDocsData && appDocsData.length > 0) {
        documents = appDocsData.map((doc) => ({
          id: doc.id,
          documentType: doc.document_type,
          storagePath: doc.storage_path,
          fileName: doc.storage_path.split("/").pop() ?? "Unknown",
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          verified: doc.verified ?? false,
          verificationNotes: doc.verification_notes ?? null,
          uploadedAt: doc.uploaded_at ?? "",
          publicUrl: getPublicUrl(doc.storage_path),
        }));
      }

      // Also fetch student documents if no application documents found
      if (documents.length === 0 && appData.student_id) {
        const { data: studentDocsData } = await supabase
          .from("student_documents")
          .select(`
            id,
            document_type,
            storage_path,
            file_name,
            mime_type,
            file_size,
            verified_status,
            verification_notes,
            created_at
          `)
          .eq("student_id", appData.student_id);

        if (studentDocsData && studentDocsData.length > 0) {
          documents = studentDocsData.map((doc) => ({
            id: doc.id,
            documentType: doc.document_type,
            storagePath: doc.storage_path,
            fileName: doc.file_name,
            mimeType: doc.mime_type,
            fileSize: doc.file_size,
            verified: doc.verified_status === "verified",
            verificationNotes: doc.verification_notes ?? null,
            uploadedAt: doc.created_at ?? "",
            publicUrl: getPublicUrl(doc.storage_path),
          }));
        }
      }

      const extended: ExtendedApplication = {
        id: appData.id,
        appNumber: appData.app_number ?? "—",
        status: appData.status ?? "unknown",
        createdAt: appData.created_at ?? "",
        submittedAt: appData.submitted_at ?? null,
        updatedAt: appData.updated_at ?? null,
        programId: appData.program_id,
        programName: program?.name ?? "Unknown Program",
        programLevel: program?.level ?? "—",
        programDiscipline: program?.discipline ?? null,
        intakeMonth: appData.intake_month,
        intakeYear: appData.intake_year,
        studentId: appData.student_id,
        studentName: studentDetails?.legalName ?? "Unknown Student",
        studentNationality: studentDetails?.nationality ?? null,
        agentId: appData.agent_id ?? null,
        notes: appData.notes ?? null,
        internalNotes: appData.internal_notes ?? null,
        timelineJson: parseTimelineJson(appData.timeline_json),
        student: studentDetails,
        documents,
      };

      setExtendedApplication(extended);
    } catch (err) {
      console.error("Failed to fetch extended application:", err);
      setError(err instanceof Error ? err.message : "Failed to load application details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearApplication = useCallback(() => {
    setExtendedApplication(null);
    setError(null);
  }, []);

  // Update local status immediately after a status change
  const updateLocalStatus = useCallback((newStatus: string, timelineEvent?: TimelineEvent) => {
    setExtendedApplication((prev) => {
      if (!prev) return prev;
      const updatedTimeline = timelineEvent 
        ? [...(prev.timelineJson ?? []), timelineEvent]
        : prev.timelineJson;
      return {
        ...prev,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        timelineJson: updatedTimeline,
      };
    });
  }, []);

  return {
    extendedApplication,
    isLoading,
    error,
    fetchExtendedApplication,
    clearApplication,
    updateLocalStatus,
  };
}
