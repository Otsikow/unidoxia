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
import { useAuth } from "@/hooks/useAuth";
import {
  buildMissingRpcError,
  isRpcMissingError,
  isRpcUnavailable,
  markRpcMissing,
} from "@/lib/supabaseRpc";

const STORAGE_BUCKET = "student-documents";
const APPLICATION_DOCUMENTS_BUCKET = "application-documents";

interface UseExtendedApplicationReturn {
  extendedApplication: ExtendedApplication | null;
  isLoading: boolean;
  error: string | null;
  fetchExtendedApplication: (applicationId: string) => Promise<void>;
  clearApplication: () => void;
  updateLocalStatus: (newStatus: string, timelineEvent?: TimelineEvent) => void;
  updateLocalNotes: (notes: string) => void;
}

/* ======================================================
   Helpers
====================================================== */

const getPublicUrl = (storagePath: string | null): string | null => {
  if (!storagePath) return null;
  
  // Try application-documents bucket first (most common for application docs)
  const { data: appData } = supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);
  
  if (appData?.publicUrl) {
    return appData.publicUrl;
  }
  
  // Fallback to student-documents bucket
  const { data: studentData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  
  return studentData?.publicUrl ?? null;
};

const parseTimelineJson = (raw: unknown): TimelineEvent[] | null => {
  if (!Array.isArray(raw)) return null;
  return raw.map((item: any) => ({
    id: item.id ?? crypto.randomUUID(),
    action: item.action ?? "",
    timestamp: item.timestamp ?? "",
    actor: item.actor ?? undefined,
    details: item.details ?? undefined,
  }));
};

const mapEducationRecordsFromDB = (records: any[]): EducationRecord[] =>
  records.map((rec) => ({
    id: rec.id,
    level: rec.level ?? "",
    institutionName: rec.institution_name ?? "",
    country: rec.country ?? "",
    startDate: rec.start_date ?? "",
    endDate: rec.end_date ?? "",
    gpa: rec.gpa?.toString() ?? "",
    gradeScale: rec.grade_scale ?? "4.0",
    transcriptUrl: rec.transcript_url ?? null,
    certificateUrl: rec.certificate_url ?? null,
  }));

const mapTestScoresFromDB = (scores: any[]): TestScore[] =>
  scores.map((score) => ({
    testType: score.test_type ?? "",
    totalScore: Number(score.total_score) || 0,
    testDate: score.test_date ?? "",
    subscores: score.subscores_json ?? undefined,
    reportUrl: score.report_url ?? null,
  }));

/* ======================================================
   Hook
====================================================== */

export function useExtendedApplication(): UseExtendedApplicationReturn {
  const [extendedApplication, setExtendedApplication] =
    useState<ExtendedApplication | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  /* ============================
     Fetch Extended Application
  ============================ */

  const fetchExtendedApplication = useCallback(async (applicationId: string) => {
    if (!applicationId) {
      console.warn("[useExtendedApplication] No application ID provided");
      return;
    }

    console.log("[useExtendedApplication] Fetching application:", applicationId);
    setIsLoading(true);
    setError(null);

    try {
      /* ---------------------------
         Application + Program
      --------------------------- */
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
          programs (
            id,
            name,
            level,
            discipline
          )
        `)
        .eq("id", applicationId)
        .single();

      if (appError) {
        console.error("[useExtendedApplication] Application fetch error:", appError);
        const errorMessage = appError.code === "PGRST116" 
          ? "Application not found. It may have been deleted or you may not have permission to view it."
          : appError.code === "42501"
            ? "Permission denied. You may not have access to view this application."
            : `Failed to load application: ${appError.message}`;
        throw new Error(errorMessage);
      }

      if (!appData) {
        throw new Error("Application not found. It may have been deleted or you may not have permission to view it.");
      }

      console.log("[useExtendedApplication] Application loaded:", { id: appData.id, status: appData.status });

      const program = appData.programs as any;

      /* ---------------------------
         Student Details
      --------------------------- */
      let studentDetails: StudentDetails | null = null;

      if (appData.student_id) {
        console.log("[useExtendedApplication] Fetching student:", appData.student_id);
        
        // Try the security definer function first (most reliable for university partners)
        const rpcName = "get_student_details_for_application";
        const rpcResult = isRpcUnavailable(rpcName)
          ? { data: null, error: buildMissingRpcError(rpcName) }
          : await supabase.rpc(rpcName as any, {
              p_application_id: applicationId,
            });

        if (isRpcMissingError(rpcResult.error)) {
          markRpcMissing(rpcName, rpcResult.error);
        }

        let studentData: any = null;
        let studentError: any = null;

        const rpcStudentArray = rpcResult.data as any[] | null;
        if (!rpcResult.error && rpcStudentArray && rpcStudentArray.length > 0) {
          // Use RPC data - transform to expected format
          const rpcRow = rpcStudentArray[0];
          studentData = {
            id: rpcRow.student_id,
            profile_id: rpcRow.profile_id,
            legal_name: rpcRow.legal_name,
            preferred_name: rpcRow.preferred_name,
            contact_email: rpcRow.contact_email,
            contact_phone: rpcRow.contact_phone,
            nationality: rpcRow.nationality,
            date_of_birth: rpcRow.date_of_birth,
            passport_number: rpcRow.passport_number,
            passport_expiry: rpcRow.passport_expiry,
            current_country: rpcRow.current_country,
            address: rpcRow.address,
            guardian: rpcRow.guardian,
            finances_json: rpcRow.finances_json,
            visa_history_json: rpcRow.visa_history_json,
            profile: {
              full_name: rpcRow.profile_full_name,
              email: rpcRow.profile_email,
              phone: rpcRow.profile_phone,
              avatar_url: rpcRow.profile_avatar_url,
            },
          };
          console.log("[useExtendedApplication] Student loaded via RPC:", studentData.id);
        } else {
          // Fallback to direct query
          console.log(
            "[useExtendedApplication] RPC not available or failed, trying direct query:",
            rpcResult.error?.message
          );
          
          let studentQuery = supabase
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
              passport_expiry,
              current_country,
              address,
              guardian,
              finances_json,
              visa_history_json,
              profile:profiles (
                id,
                full_name,
                email,
                phone,
                avatar_url
              )
            `)
            .eq("id", appData.student_id);

          if (tenantId) {
            studentQuery = studentQuery.eq("tenant_id", tenantId);
          }

          const directResult = await studentQuery.single();

          studentData = directResult.data;
          studentError = directResult.error;
        }

        if (studentError) {
          console.warn("[useExtendedApplication] Student fetch warning:", studentError);
          // Don't throw - student data is optional, we can still show the application
        }

        if (!studentError && studentData) {
          console.log("[useExtendedApplication] Student loaded:", studentData.id);
          const profile = studentData.profile as any;

          /* Education Records (table → fallback JSON if needed) */
          let educationHistory: EducationRecord[] | null = null;
          const { data: eduData } = await supabase
            .from("education_records")
            .select("*")
            .eq("student_id", studentData.id)
            .order("start_date", { ascending: false });

          if (eduData && eduData.length > 0) {
            educationHistory = mapEducationRecordsFromDB(eduData);
          }

          /* Test Scores */
          let testScores: TestScore[] | null = null;
          const { data: testData } = await supabase
            .from("test_scores")
            .select("*")
            .eq("student_id", studentData.id)
            .order("test_date", { ascending: false });

          if (testData && testData.length > 0) {
            testScores = mapTestScoresFromDB(testData);
          }

          studentDetails = {
            id: studentData.id,
            profileId: studentData.profile_id,
            legalName:
              studentData.legal_name ??
              studentData.preferred_name ??
              profile?.full_name ??
              "Unknown",
            preferredName: studentData.preferred_name ?? null,
            email: studentData.contact_email ?? profile?.email ?? null,
            phone: studentData.contact_phone ?? profile?.phone ?? null,
            nationality: studentData.nationality ?? null,
            dateOfBirth: studentData.date_of_birth ?? null,
            passportNumber: studentData.passport_number ?? null,
            passportExpiry: studentData.passport_expiry ?? null,
            currentCountry: studentData.current_country ?? null,
            address: studentData.address as any ?? null,
            guardian: studentData.guardian as any ?? null,
            finances: studentData.finances_json as any ?? null,
            visaHistory: studentData.visa_history_json as any ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            educationHistory,
            testScores,
          };
        }

        // Final fallback: hydrate student basics via security definer RPC if still missing
        if (!studentDetails) {
          console.log(
            "[useExtendedApplication] Student not found via primary queries, attempting fallback RPC hydration",
          );

          const fallbackRpcName = "get_students_for_university_applications";
          const fallbackResult = isRpcUnavailable(fallbackRpcName)
            ? { data: null, error: buildMissingRpcError(fallbackRpcName) }
            : await supabase.rpc(fallbackRpcName as any, {
                p_student_ids: [appData.student_id],
              });

          if (isRpcMissingError(fallbackResult.error)) {
            markRpcMissing(fallbackRpcName, fallbackResult.error);
          }

          if (fallbackResult.error) {
            console.warn(
              "[useExtendedApplication] Fallback student RPC failed:",
              fallbackResult.error.message,
            );
          }

          const fallbackRow = (fallbackResult.data as any[] | null)?.[0];
          if (fallbackRow) {
            studentDetails = {
              id: fallbackRow.id ?? appData.student_id,
              profileId: null,
              legalName:
                fallbackRow.legal_name ??
                fallbackRow.preferred_name ??
                fallbackRow.profile_name ??
                "Student",
              preferredName: fallbackRow.preferred_name ?? null,
              email: fallbackRow.profile_email ?? null,
              phone: null,
              nationality: fallbackRow.nationality ?? null,
              dateOfBirth: null,
              passportNumber: null,
              passportExpiry: null,
              currentCountry: null,
              address: null,
              guardian: null,
              finances: null,
              visaHistory: null,
              avatarUrl: null,
              educationHistory: null,
              testScores: null,
            };
          }
        }
      }

      /* ---------------------------
         Documents
      --------------------------- */
      let documents: ApplicationDocument[] = [];

      // First, try to fetch from application_documents (linked to application)
      console.log("[useExtendedApplication] Fetching documents for application:", applicationId);
      const { data: appDocs, error: docsError } = await supabase
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

      if (docsError) {
        console.warn("[useExtendedApplication] Documents fetch warning:", docsError);
        // Don't throw - documents are optional, we can still show the application
      }

      if (appDocs && appDocs.length > 0) {
        console.log("[useExtendedApplication] Application documents loaded:", appDocs.length);
        documents = appDocs.map((doc) => ({
          id: doc.id,
          documentType: doc.document_type,
          storagePath: doc.storage_path,
          fileName: doc.storage_path?.split("/").pop() ?? "Unknown",
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          verified: doc.verified ?? false,
          verificationNotes: doc.verification_notes ?? null,
          uploadedAt: doc.uploaded_at ?? "",
          publicUrl: getPublicUrl(doc.storage_path),
        }));
      }

      // If no application_documents, fall back to student_documents (linked to student)
      if (documents.length === 0 && appData.student_id) {
        console.log("[useExtendedApplication] No application documents, checking student documents for student:", appData.student_id);
        const { data: studentDocs, error: studentDocsError } = await supabase
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

        if (studentDocsError) {
          console.warn("[useExtendedApplication] Student documents fetch warning:", studentDocsError);
        }

        if (studentDocs && studentDocs.length > 0) {
          console.log("[useExtendedApplication] Student documents loaded:", studentDocs.length);
          documents = studentDocs.map((doc) => ({
            id: doc.id,
            documentType: doc.document_type,
            storagePath: doc.storage_path,
            fileName: doc.file_name ?? doc.storage_path?.split("/").pop() ?? "Unknown",
            mimeType: doc.mime_type,
            fileSize: doc.file_size,
            verified: doc.verified_status === "verified",
            verificationNotes: doc.verification_notes ?? null,
            uploadedAt: doc.created_at ?? "",
            publicUrl: getPublicUrl(doc.storage_path),
          }));
        }
      }

      if (documents.length === 0) {
        console.log("[useExtendedApplication] No documents found for application");
      }

      /* ---------------------------
         Final Assembly
      --------------------------- */
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

      console.log("[useExtendedApplication] Application fully loaded:", {
        id: extended.id,
        status: extended.status,
        studentName: extended.studentName,
        documentsCount: extended.documents.length,
      });
      
      setExtendedApplication(extended);
    } catch (err) {
      const error = err as Error & { code?: string; details?: string };
      console.error("[useExtendedApplication] Failed to fetch application:", {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
      });
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.code === "42501" || error.message?.toLowerCase().includes("permission")) {
        userMessage = "You don't have permission to view this application. Please contact your administrator.";
      } else if (error.code === "PGRST116" || error.message?.toLowerCase().includes("not found")) {
        userMessage = "Application not found. It may have been deleted or moved.";
      } else if (error.message?.toLowerCase().includes("network")) {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ============================
     Utilities
  ============================ */

  const clearApplication = useCallback(() => {
    setExtendedApplication(null);
    setError(null);
  }, []);

  const updateLocalStatus = useCallback(
    (newStatus: string, timelineEvent?: TimelineEvent) => {
      setExtendedApplication((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          timelineJson: timelineEvent
            ? [...(prev.timelineJson ?? []), timelineEvent]
            : prev.timelineJson,
        };
      });
    },
    []
  );

  const updateLocalNotes = useCallback((notes: string) => {
    setExtendedApplication((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        internalNotes: notes,
        updatedAt: new Date().toISOString(),
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
    updateLocalNotes,
  };
}
