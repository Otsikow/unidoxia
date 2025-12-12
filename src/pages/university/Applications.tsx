import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Search,
  RefreshCw,
  Filter,
  Eye,
  User,
  Building2,
  GraduationCap,
  FileText,
  Mail,
  Phone,
  CalendarDays,
  Clock,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  MapPin,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  FileStack,
  Award,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";
import { StatePlaceholder } from "@/components/university/common/StatePlaceholder";
import {
  withUniversityCardStyles,
  withUniversitySurfaceTint,
} from "@/components/university/common/cardStyles";
import { LoadingState } from "@/components/LoadingState";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  formatErrorForToast,
  getErrorMessage,
  logError,
} from "@/lib/errorUtils";

type StatusFilter =
  | "all"
  | "pending"
  | "under_review"
  | "offer_sent"
  | "rejected";

interface ProfileInfo {
  full_name?: string | null;
  email?: string | null;
}

interface StudentInfo {
  id?: string;
  legal_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  current_country?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  preferred_name?: string | null;
  address?: Database["public"]["Tables"]["students"]["Row"]["address"] | null;
  guardian?: Database["public"]["Tables"]["students"]["Row"]["guardian"] | null;
  finances_json?: Database["public"]["Tables"]["students"]["Row"]["finances_json"] | null;
  test_scores?: Database["public"]["Tables"]["students"]["Row"]["test_scores"] | null;
  visa_history_json?: Database["public"]["Tables"]["students"]["Row"]["visa_history_json"] | null;
  education_history?: Database["public"]["Tables"]["students"]["Row"]["education_history"] | null;
  profile?: ProfileInfo | null;
}

interface AgentInfo {
  id?: string;
  company_name?: string | null;
  profile?: ProfileInfo | null;
}

interface ProgramInfo {
  id?: string;
  name?: string | null;
  level?: string | null;
}

interface TimelineItem {
  title?: string;
  description?: string;
  date?: string;
  status?: string;
}

interface ApplicationRow {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  app_number?: string | null;
  submission_channel?: string | null;
  intake_year?: number | null;
  intake_month?: number | null;
  student?: StudentInfo | null;
  agent?: AgentInfo | null;
  program?: ProgramInfo | null;
  notes?: string | null;
  internal_notes?: string | null;
  timeline_json?: unknown[] | null;
}

interface ApplicationDocument {
  id: string;
  document_type: string | null;
  storage_path: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_at: string | null;
  verified: boolean | null;
  verification_notes?: string | null;
}

interface EducationRecord {
  id: string;
  institution_name: string;
  country: string;
  level: string;
  start_date: string;
  end_date: string | null;
  gpa: number | null;
  grade_scale: string | null;
  transcript_url: string | null;
  certificate_url: string | null;
}

interface DetailedApplication extends ApplicationRow {
  documents?: ApplicationDocument[];
  educationRecords?: EducationRecord[];
}

const PAGE_SIZE = 10;
const APPLICATION_DOCS_BUCKET = "application-documents";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_FILTER_MAP: Record<StatusFilter, string[]> = {
  all: [],
  pending: ["draft", "submitted"],
  under_review: ["screening", "cas_loa", "visa"],
  offer_sent: ["conditional_offer", "unconditional_offer", "enrolled"],
  rejected: ["withdrawn", "deferred", "rejected"],
};

const formatDate = (
  value?: string | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
  } catch {
    return value;
  }
};

const formatDateTime = (value?: string | null) =>
  formatDate(value, { dateStyle: "medium", timeStyle: "short" });

const toDisplayName = (...candidates: (string | null | undefined)[]) =>
  candidates.find((candidate) => candidate && candidate.trim().length > 0) ??
  "—";

const formatDocumentType = (value: string | null | undefined) => {
  if (!value) return "Document";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const ApplicationsPage = () => {
  const { data } = useUniversityDashboard();
  const { toast } = useToast();

  const universityId = data?.university?.id ?? null;
  const tenantId = data?.university?.tenant_id ?? null;

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationRow | null>(null);
  const [detailedApplication, setDetailedApplication] =
    useState<DetailedApplication | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const detailsCacheRef = useRef<Record<string, DetailedApplication>>({});

  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );

  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationTarget, setVerificationTarget] =
    useState<ApplicationDocument | null>(null);
  const [verificationNotesDraft, setVerificationNotesDraft] = useState("");
  const [verifyingDoc, setVerifyingDoc] = useState(false);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestDueDate, setRequestDueDate] = useState("");
  const [creatingRequest, setCreatingRequest] = useState(false);

  // Admission decision state
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionApplication, setDecisionApplication] = useState<ApplicationRow | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const debouncedSearch = useDebounce(searchTerm.trim(), 300);

  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);
  const endIndex = useMemo(() => startIndex + PAGE_SIZE - 1, [startIndex]);
  const totalPages = useMemo(
    () => (totalCount === 0 ? 1 : Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount],
  );

  const hasFiltersApplied =
    statusFilter !== "all" || searchTerm.trim().length > 0;

  const getStudentName = (application: ApplicationRow) =>
    toDisplayName(
      application.student?.legal_name,
      application.student?.profile?.full_name,
    );

  const getStudentEmail = (application: ApplicationRow) =>
    application.student?.contact_email ??
    application.student?.profile?.email ??
    null;

  const getStudentPhone = (application: ApplicationRow) =>
    application.student?.contact_phone ?? null;

  const getStudentNationality = (application: ApplicationRow) =>
    application.student?.nationality ?? null;

  const getStudentDateOfBirth = (application: ApplicationRow) =>
    application.student?.date_of_birth ?? null;

  const getStudentCountry = (application: ApplicationRow) =>
    application.student?.current_country ?? null;

  const getIntakeLabel = (application: ApplicationRow) => {
    const month = application.intake_month;
    const year = application.intake_year;
    if (!month || !year) return null;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[month - 1]} ${year}`;
  };

  const getAgentName = (application: ApplicationRow) =>
    toDisplayName(
      application.agent?.profile?.full_name,
      application.agent?.company_name,
    );

  const getAgentEmail = (application: ApplicationRow) =>
    application.agent?.profile?.email ?? null;

  const getProgramName = (application: ApplicationRow) =>
    application.program?.name ?? "—";

  const getProgramLevel = (application: ApplicationRow) =>
    application.program?.level ?? null;

  const fetchApplications = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      // ISOLATION CHECK: Must have both universityId and tenantId
      if (!universityId || !tenantId) {
        setApplications([]);
        setTotalCount(0);
        return false;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const statuses = STATUS_FILTER_MAP[statusFilter];
        const searchValue = debouncedSearch
          ? `%${debouncedSearch.replace(/\s+/g, "%")}%`
          : null;

        // ISOLATION: Filter applications by programs that belong to THIS university only
        let query = supabase
          .from("applications")
          .select(
            `
              id,
              status,
              submitted_at,
              updated_at,
              created_at,
              app_number,
              submission_channel,
              intake_year,
              intake_month,
              student:students (
                id,
                legal_name,
                contact_email,
                contact_phone,
                nationality,
                date_of_birth,
                current_country,
                passport_number,
                profile:profiles (
                  full_name,
                  email
                )
              ),
              agent:agents (
                id,
                company_name,
                profile:profiles (
                  full_name,
                  email
                )
              ),
              program:programs!inner (
                id,
                name,
                level,
                university_id,
                tenant_id
              )
            `,
            { count: "exact" },
          )
          // IMPORTANT: Filter by program tenant/university (not application.tenant_id).
          // Some historical applications may have been written with the submitter tenant_id;
          // using program.* keeps visibility correct and prevents "zero dashboard" when apps exist.
          .eq("program.tenant_id", tenantId)
          .eq("program.university_id", universityId)
          .not("submitted_at", "is", null)
          .neq("status", "draft");

        if (statuses.length > 0) {
          query = query.in("status", statuses as any);
        }

        if (searchValue) {
          query = query.or(
            [
              `app_number.ilike.${searchValue}`,
              `student.legal_name.ilike.${searchValue}`,
              `student.profile.full_name.ilike.${searchValue}`,
              `student.contact_email.ilike.${searchValue}`,
              `agent.company_name.ilike.${searchValue}`,
              `agent.profile.full_name.ilike.${searchValue}`,
              `program.name.ilike.${searchValue}`,
            ].join(","),
          );
        }

        const { data: rows, error, count } = await query
          .order("submitted_at", { ascending: false })
          .order("created_at", { ascending: false })
          .range(startIndex, endIndex);

        if (options?.signal?.aborted) {
          return false;
        }

        if (error) {
          throw error;
        }

        if ((count ?? 0) <= startIndex && page > 1) {
          setPage(1);
          return false;
        }

        setApplications((rows ?? []) as ApplicationRow[]);
        setTotalCount(count ?? rows?.length ?? 0);
        return true;
      } catch (error) {
        if (options?.signal?.aborted) {
          return false;
        }

        logError(error, "UniversityApplications.fetchApplications");
        const message = getErrorMessage(error);
        setErrorMessage(message);
        toast(formatErrorForToast(error, "Failed to load applications"));
        return false;
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      debouncedSearch,
      page,
      startIndex,
      endIndex,
      statusFilter,
      toast,
      universityId,
      tenantId,
    ],
  );

  useEffect(() => {
    // ISOLATION: Only fetch if we have proper university context
    if (!universityId || !tenantId) {
      return;
    }

    const controller = new AbortController();
    void fetchApplications({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [fetchApplications, universityId, tenantId]);

  // Real-time sync: keep the applications inbox live without manual refresh.
  useEffect(() => {
    if (!tenantId || !universityId) return;

    let timeout: number | null = null;
    const scheduleRefresh = () => {
      if (timeout) window.clearTimeout(timeout);
      // Debounce bursts of updates (e.g., document uploads + status changes).
      timeout = window.setTimeout(() => {
        void fetchApplications();
      }, 350);
    };

    const channel = supabase
      .channel(`uni-applications-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          // Best-effort filter: new rows should be written under the program/university tenant.
          filter: `tenant_id=eq.${tenantId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_documents",
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timeout) window.clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [tenantId, universityId, fetchApplications]);

  const loadApplicationDetails = useCallback(
    async (applicationId: string) => {
      if (detailsCacheRef.current[applicationId]) {
        setDetailedApplication(detailsCacheRef.current[applicationId]);
        setDetailsError(null);
        setDetailsLoading(false);
        return;
      }

      setDetailsLoading(true);
      setDetailsError(null);

      try {
        // ISOLATION: Ensure the application belongs to this university/tenant.
        const { data: applicationRow, error } = await supabase
          .from("applications")
          .select(
            `
              id,
              status,
              submitted_at,
              updated_at,
              created_at,
              app_number,
              submission_channel,
              notes,
              internal_notes,
              timeline_json,
              intake_year,
              intake_month,
              student:students (
                id,
                legal_name,
                preferred_name,
                contact_email,
                contact_phone,
                nationality,
                date_of_birth,
                current_country,
                passport_number,
                passport_expiry,
                address,
                guardian,
                finances_json,
                test_scores,
                visa_history_json,
                education_history,
                profile:profiles (
                  full_name,
                  email
                )
              ),
              agent:agents (
                id,
                company_name,
                profile:profiles (
                  full_name,
                  email
                )
              ),
              program:programs!inner (
                id,
                name,
                level,
                university_id,
                tenant_id
              )
            `,
          )
          .eq("id", applicationId)
          .eq("program.tenant_id", tenantId as any)
          .eq("program.university_id", universityId as any)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!applicationRow) {
          throw new Error("Application not found");
        }

        const { data: documentsData, error: documentsError } = await supabase
          .from("application_documents")
          .select(
            "id, document_type, storage_path, mime_type, file_size, uploaded_at, verified, verification_notes",
          )
          .eq("application_id", applicationId)
          .order("uploaded_at", { ascending: false });

        if (documentsError) {
          throw documentsError;
        }

        const studentId = (applicationRow as any)?.student?.id as
          | string
          | undefined;

        let educationRecords: EducationRecord[] = [];
        if (studentId) {
          const { data: eduData, error: eduError } = await supabase
            .from("education_records")
            .select(
              "id, institution_name, country, level, start_date, end_date, gpa, grade_scale, transcript_url, certificate_url",
            )
            .eq("student_id", studentId)
            .order("start_date", { ascending: false });

          if (eduError) {
            throw eduError;
          }

          educationRecords = (eduData ?? []) as unknown as EducationRecord[];
        }

        const detailed: DetailedApplication = {
          ...(applicationRow as ApplicationRow),
          documents: (documentsData ?? []) as unknown as ApplicationDocument[],
          educationRecords,
        };

        detailsCacheRef.current[applicationId] = detailed;
        setDetailedApplication(detailed);
      } catch (error) {
        logError(error, "UniversityApplications.loadApplicationDetails");
        const message = getErrorMessage(error);
        setDetailsError(message);
        toast(
          formatErrorForToast(error, "Failed to load application details"),
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [toast, tenantId, universityId],
  );

  useEffect(() => {
    const applicationId = selectedApplication?.id;

    if (!applicationId) {
      setDetailedApplication(null);
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    void loadApplicationDetails(applicationId);
  }, [loadApplicationDetails, selectedApplication?.id]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const handleRefresh = async () => {
    const success = await fetchApplications();
    if (success) {
      toast({
        title: "Applications refreshed",
        description: "Showing the latest applications submitted by agents.",
      });
    }
  };

  const handleViewApplication = (application: ApplicationRow) => {
    setSelectedApplication(application);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedApplication(null);
    }
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleOpenDecisionDialog = (application: ApplicationRow, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setDecisionApplication(application);
    setNewStatus(application.status || "submitted");
    setDecisionNotes("");
    setDecisionDialogOpen(true);
  };

  const handleCloseDecisionDialog = () => {
    setDecisionDialogOpen(false);
    setDecisionApplication(null);
    setNewStatus("");
    setDecisionNotes("");
  };

  const handleUpdateApplicationStatus = async () => {
    if (!decisionApplication || !newStatus) return;

    // ISOLATION CHECK: Verify we have proper context
    if (!universityId) {
      toast({
        title: "Missing university context",
        description: "Unable to verify your university profile. Please refresh.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // ISOLATION CHECK: Verify the application belongs to a program of this university
      const { data: programCheck } = await supabase
        .from("programs")
        .select("id, university_id")
        .eq("id", decisionApplication.program?.id)
        .eq("university_id", universityId)
        .single();

      if (!programCheck) {
        throw new Error("Cannot update application: program not found or does not belong to your university");
      }

      // Build timeline entry
      const timelineEntry = {
        title: `Status updated to ${newStatus.replace(/_/g, " ")}`,
        description: decisionNotes || undefined,
        date: new Date().toISOString(),
        status: newStatus,
      };

      // Get existing timeline or create new array
      const existingTimeline = Array.isArray(decisionApplication.timeline_json)
        ? decisionApplication.timeline_json
        : [];

      const updatedTimeline = [timelineEntry, ...existingTimeline];

      // ISOLATION: Update application only if it belongs to a program of this university
      const { error } = await supabase
        .from("applications")
        .update({
          status: newStatus as any,
          internal_notes: decisionNotes || decisionApplication.internal_notes,
          timeline_json: updatedTimeline as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", decisionApplication.id);

      if (error) throw error;

      // Create offer record if status is an offer
      if (newStatus === "conditional_offer" || newStatus === "unconditional_offer") {
        const offerType = newStatus === "conditional_offer" ? "conditional" : "unconditional";
        const { error: offerError } = await supabase
          .from("offers")
          .insert({
            application_id: decisionApplication.id,
            offer_type: offerType,
            letter_url: "",
            created_at: new Date().toISOString(),
          } as any);

        if (offerError) {
          logError(offerError, "ApplicationsPage.createOffer");
          // Don't throw - the status update succeeded
        }
      }

      toast({
        title: "Application updated",
        description: `Application status changed to ${newStatus.replace(/_/g, " ")}.`,
      });

      // Clear cache and refresh
      delete detailsCacheRef.current[decisionApplication.id];
      handleCloseDecisionDialog();
      await fetchApplications();
    } catch (error) {
      logError(error, "ApplicationsPage.updateApplicationStatus");
      toast(formatErrorForToast(error, "Failed to update application status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const admissionStatusOptions = [
    { value: "submitted", label: "Submitted", description: "Application received" },
    { value: "screening", label: "Under Review", description: "Being evaluated" },
    { value: "conditional_offer", label: "Conditional Offer", description: "Offer with conditions" },
    { value: "unconditional_offer", label: "Unconditional Offer", description: "Full offer issued" },
    { value: "cas_loa", label: "CAS/LOA Stage", description: "Preparing documents" },
    { value: "visa", label: "Visa Stage", description: "Visa processing" },
    { value: "enrolled", label: "Enrolled", description: "Student enrolled" },
    { value: "rejected", label: "Rejected", description: "Application declined" },
    { value: "withdrawn", label: "Withdrawn", description: "Student withdrew" },
    { value: "deferred", label: "Deferred", description: "Deferred to later intake" },
  ];

  const showingRangeStart = totalCount === 0 ? 0 : startIndex + 1;
  const showingRangeEnd =
    totalCount === 0 ? 0 : Math.min(totalCount, startIndex + applications.length);

  const renderTimeline = (items?: TimelineItem[] | null) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No timeline updates recorded yet.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${item.title ?? "timeline"}-${index}`} className="flex gap-3">
            <div className="relative">
              <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
              {index !== items.length - 1 && (
                <div className="ml-[3px] h-full w-px bg-primary/20" />
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-card-foreground">
                {item.title ?? "Update"}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
              {item.date && (
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(item.date)}
                </p>
              )}
              {item.status && (
                <StatusBadge status={item.status} className="text-xs" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDocuments = (documents?: ApplicationDocument[] | null) => {
    if (!documents || documents.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No documents uploaded for this application yet.
        </p>
      );
    }

    const handleOpenDocument = async (document: ApplicationDocument) => {
      if (!document.storage_path) {
        toast({
          title: "Missing document path",
          description: "This document has no storage path on record.",
          variant: "destructive",
        });
        return;
      }

      setOpeningDocumentId(document.id);
      try {
        const { data: signed, error } = await supabase.storage
          .from(APPLICATION_DOCS_BUCKET)
          .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRY_SECONDS);

        if (error) throw error;

        const url = signed?.signedUrl;
        if (!url) {
          throw new Error("Unable to generate a secure link for this document.");
        }

        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        logError(error, "UniversityApplications.openDocument");
        toast(formatErrorForToast(error, "Unable to open document"));
      } finally {
        setOpeningDocumentId(null);
      }
    };

    const handleToggleVerified = async (document: ApplicationDocument) => {
      setVerifyingDoc(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const verifierId = auth?.user?.id ?? null;
        const nextVerified = !document.verified;

        const { error } = await supabase
          .from("application_documents")
          .update({
            verified: nextVerified,
            verifier_id: verifierId,
            verification_notes:
              document.verification_notes && document.verification_notes.length > 0
                ? document.verification_notes
                : null,
          })
          .eq("id", document.id);

        if (error) throw error;

        // Update local state/cache
        setDetailedApplication((prev) => {
          if (!prev?.documents) return prev;
          const nextDocs = prev.documents.map((d) =>
            d.id === document.id ? { ...d, verified: nextVerified } : d,
          );
          const next = { ...prev, documents: nextDocs };
          if (prev.id) detailsCacheRef.current[prev.id] = next;
          return next;
        });

        toast({
          title: nextVerified ? "Document verified" : "Verification removed",
          description: "The document verification status has been updated.",
        });
      } catch (error) {
        logError(error, "UniversityApplications.toggleVerified");
        toast(formatErrorForToast(error, "Failed to update verification"));
      } finally {
        setVerifyingDoc(false);
      }
    };

    const handleOpenVerificationNotes = (document: ApplicationDocument) => {
      setVerificationTarget(document);
      setVerificationNotesDraft(document.verification_notes ?? "");
      setVerificationDialogOpen(true);
    };

    return (
      <div className="space-y-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className={withUniversitySurfaceTint("flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-start sm:justify-between")}
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-card-foreground">
                {formatDocumentType(document.document_type)}
              </p>
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDateTime(document.uploaded_at)}
              </p>
              {document.file_size != null && (
                <p className="text-xs text-muted-foreground/80">
                  Size: {(document.file_size / 1024).toFixed(1)} KB
                </p>
              )}
              {document.verification_notes && (
                <p className="text-xs text-muted-foreground">
                  Notes: {document.verification_notes}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge variant={document.verified ? "default" : "outline"}>
                {document.verified ? "Verified" : "Pending review"}
              </Badge>
              {document.mime_type && (
                <Badge variant="secondary" className="text-xs">
                  {document.mime_type}
                </Badge>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => void handleOpenDocument(document)}
                  disabled={!document.storage_path || openingDocumentId === document.id}
                >
                  {openingDocumentId === document.id ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleOpenVerificationNotes(document)}
                >
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Notes
                </Button>
                <Button
                  variant={document.verified ? "outline" : "default"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => void handleToggleVerified(document)}
                  disabled={verifyingDoc}
                >
                  {document.verified ? (
                    <>
                      <AlertCircle className="mr-1 h-3.5 w-3.5" />
                      Unverify
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEducationRecords = (records?: EducationRecord[] | null) => {
    if (!records || records.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No academic history records found.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className={withUniversitySurfaceTint("rounded-xl p-4")}
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {record.institution_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.level} • {record.country}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(record.start_date)} – {formatDate(record.end_date)}
              </p>
              {(record.gpa != null || record.grade_scale) && (
                <p className="text-xs text-muted-foreground">
                  GPA: {record.gpa ?? "—"}
                  {record.grade_scale ? ` (${record.grade_scale})` : ""}
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {record.transcript_url && (
                <a
                  href={record.transcript_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline underline-offset-4"
                >
                  View transcript
                </a>
              )}
              {record.certificate_url && (
                <a
                  href={record.certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline underline-offset-4"
                >
                  View certificate
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderJsonBlock = (value: unknown, emptyLabel: string) => {
    if (value == null) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    try {
      return (
        <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    } catch {
      return <p className="text-sm text-muted-foreground">{String(value)}</p>;
    }
  };

  const renderNotes = (application?: DetailedApplication | null) => {
    if (!application?.notes && !application?.internal_notes) {
      return (
        <p className="text-sm text-muted-foreground">
          No notes have been added yet.
        </p>
      );
    }

    return (
      <div className="space-y-4 text-sm">
        {application.notes && (
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">
              Agent notes
            </p>
            <p className="whitespace-pre-line text-card-foreground">
              {application.notes}
            </p>
          </div>
        )}
        {application.internal_notes && (
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">
              Internal notes
            </p>
            <p className="whitespace-pre-line text-card-foreground">
              {application.internal_notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const buildAiInsights = (
    application?: DetailedApplication | ApplicationRow | null,
  ) => {
    const insights: string[] = [];

    if (!application) {
      return [
        "Select an application to review AI-backed readiness prompts for the submitted package.",
      ];
    }

    const documents = (application as DetailedApplication).documents ?? [];
    const uploadedTypes = new Set(
      documents
        .map((document) => document.document_type?.toLowerCase())
        .filter(Boolean) as string[],
    );

    const requiredDocuments = [
      { key: "passport", label: "Passport bio page" },
      { key: "transcript", label: "Academic transcripts" },
      { key: "english_proficiency", label: "English test result" },
      { key: "cv", label: "CV/Resume" },
    ];

    requiredDocuments.forEach((requirement) => {
      if (!uploadedTypes.has(requirement.key)) {
        insights.push(
          `${requirement.label} missing — request the student or agent to upload it for a complete review.`,
        );
      }
    });

    if (!getStudentPhone(application)) {
      insights.push(
        "No contact phone recorded — confirm a number so admissions teams can follow up quickly.",
      );
    }

    if (!application.timeline_json || application.timeline_json.length === 0) {
      insights.push(
        "Add timeline updates (screening, offers, visa steps) to keep the university and student aligned.",
      );
    }

    if (insights.length === 0) {
      insights.push(
        "Everything required is present. Move ahead with review, offer issuance, or CAS processing.",
      );
    }

    return insights;
  };

  // Calculate application statistics
  const applicationStats = useMemo(() => {
    const total = totalCount;
    const pending = applications.filter(app => 
      ["draft", "submitted"].includes(app.status?.toLowerCase() ?? "")
    ).length;
    const underReview = applications.filter(app => 
      ["screening"].includes(app.status?.toLowerCase() ?? "")
    ).length;
    const offersIssued = applications.filter(app => 
      ["conditional_offer", "unconditional_offer"].includes(app.status?.toLowerCase() ?? "")
    ).length;
    const enrolled = applications.filter(app => 
      ["enrolled"].includes(app.status?.toLowerCase() ?? "")
    ).length;
    
    return { total, pending, underReview, offersIssued, enrolled };
  }, [applications, totalCount]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Monitor applications submitted by agents, review documentation, and
          stay on top of decisions.
        </p>
      </div>

      {/* Application Statistics Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={withUniversityCardStyles("rounded-2xl")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileStack className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{applicationStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Applications</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={withUniversityCardStyles("rounded-2xl")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{applicationStats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={withUniversityCardStyles("rounded-2xl")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{applicationStats.offersIssued}</p>
              <p className="text-sm text-muted-foreground">Offers Issued</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={withUniversityCardStyles("rounded-2xl")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <GraduationCap className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{applicationStats.enrolled}</p>
              <p className="text-sm text-muted-foreground">Enrolled Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={withUniversityCardStyles("rounded-2xl border-primary/30 bg-primary/5 text-card-foreground")}
        >
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/20 p-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-card-foreground">
                Submission-first visibility
              </p>
              <p className="text-muted-foreground">
                Universities only see student profiles, documents, and certificates after a submission is completed. Agents and staff keep access to their own student files throughout to continue advising.
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Submitted applications sync here automatically for offer issuance, CAS decisions, and feedback.
          </div>
        </CardContent>
      </Card>

      <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}>
        <CardHeader className="space-y-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Applications library
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {totalCount === 0
                ? "No applications to display yet"
                : `Showing ${showingRangeStart}-${showingRangeEnd} of ${totalCount} applications`}
            </CardDescription>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student, agent, or programme"
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {loading && (
            <div className={withUniversitySurfaceTint("rounded-xl py-6 bg-muted/50")}>
              <LoadingState
                message={
                  applications.length === 0
                    ? "Loading applications..."
                    : "Refreshing applications..."
                }
                size="sm"
              />
            </div>
          )}

          {/* 
            EMPTY STATE: New universities start with zero applications.
            This ensures a clean slate - no pre-existing applications from other institutions.
          */}
          {applications.length === 0 && !loading ? (
            <StatePlaceholder
              title={
                hasFiltersApplied
                  ? "No applications match your filters"
                  : "Your applications inbox is empty"
              }
              description={
                hasFiltersApplied
                  ? "Update the status filter or search criteria to broaden your results."
                  : "You're starting fresh! Once you add courses and students apply, their applications will appear here for review."
              }
              className="bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student name</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Date submitted</TableHead>
                    <TableHead>Last updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow
                      key={application.id}
                      className="cursor-pointer transition hover:bg-muted/40"
                      onClick={() => handleViewApplication(application)}
                    >
                      <TableCell className="space-y-1">
                        <p className="font-medium text-foreground">
                          {getStudentName(application)}
                        </p>
                        {getStudentEmail(application) && (
                          <p className="text-xs text-muted-foreground">
                            {getStudentEmail(application)}
                          </p>
                        )}
                        {getStudentNationality(application) && (
                          <p className="text-xs text-muted-foreground">
                            {getStudentNationality(application)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <p>{getAgentName(application)}</p>
                        {getAgentEmail(application) && (
                          <p className="text-xs text-muted-foreground">
                            {getAgentEmail(application)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <p>{getProgramName(application)}</p>
                        {getProgramLevel(application) && (
                          <p className="text-xs text-muted-foreground">
                            {getProgramLevel(application)}
                          </p>
                        )}
                        {getIntakeLabel(application) && (
                          <p className="text-xs text-muted-foreground">
                            Intake: {getIntakeLabel(application)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="border-primary/40 bg-primary/5 text-primary whitespace-nowrap gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          UniDoxia
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={application.status} />
                          {application.app_number && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] uppercase"
                            >
                              #{application.app_number}
                            </Badge>
                          )}
                          {application.submission_channel && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {application.submission_channel}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleViewApplication(application);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={(event) => handleOpenDecisionDialog(application, event)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Decision
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(application.submitted_at ?? application.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(application.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {applications.length > 0 && (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>
                  {STATUS_FILTER_OPTIONS.find(
                    (option) => option.value === statusFilter,
                  )?.label ?? "All statuses"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page === totalPages || totalCount === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedApplication)}
        onOpenChange={handleDialogChange}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>View full application</DialogTitle>
            <DialogDescription>
              Explore the application timeline, supporting documents, and agent
              information in one place.
            </DialogDescription>
          </DialogHeader>

          {!selectedApplication ? null : detailsLoading ? (
            <div className="py-10">
              <LoadingState message="Loading application details..." />
            </div>
          ) : detailsError ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {detailsError}
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-3">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={withUniversitySurfaceTint("rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      Programme
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p className="text-base font-semibold text-foreground">
                        {getProgramName(selectedApplication)}
                      </p>
                      {getProgramLevel(selectedApplication) && (
                        <p className="text-muted-foreground">
                          {getProgramLevel(selectedApplication)}
                        </p>
                      )}
                      {getIntakeLabel(selectedApplication) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Intended Intake: {getIntakeLabel(selectedApplication)}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Submitted{" "}
                        {formatDate(
                          selectedApplication.submitted_at ??
                            selectedApplication.created_at,
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Last updated {formatDateTime(selectedApplication.updated_at)}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="border-primary/40 bg-primary/5 text-primary gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          Source: UniDoxia
                        </Badge>
                        {data?.university && (
                          <Badge 
                            variant="outline" 
                            className="border-emerald-500/40 bg-emerald-500/5 text-emerald-600 gap-1"
                          >
                            <Award className="h-3 w-3" />
                            Accredited Institution
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={withUniversitySurfaceTint("rounded-2xl p-4")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                        <ClipboardList className="h-4 w-4" />
                        Application
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(null);
                          handleOpenDecisionDialog(selectedApplication);
                        }}
                        className="gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Make Decision
                      </Button>
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge status={selectedApplication.status} />
                        {selectedApplication.app_number && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            #{selectedApplication.app_number}
                          </Badge>
                        )}
                        {selectedApplication.submission_channel && (
                          <Badge variant="default" className="text-xs">
                            Source: {selectedApplication.submission_channel}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Created {formatDateTime(selectedApplication.created_at)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={withUniversitySurfaceTint("rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <User className="h-4 w-4" />
                      Student
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="text-base font-semibold text-foreground">
                        {getStudentName(selectedApplication)}
                      </p>
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        {getStudentEmail(selectedApplication) && (
                          <span className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            {getStudentEmail(selectedApplication)}
                          </span>
                        )}
                        {getStudentPhone(selectedApplication) && (
                          <span className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {getStudentPhone(selectedApplication)}
                          </span>
                        )}
                        {getStudentNationality(selectedApplication) && (
                          <span className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" />
                            {getStudentNationality(selectedApplication)}
                          </span>
                        )}
                        {getStudentCountry(selectedApplication) && (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            Currently in {getStudentCountry(selectedApplication)}
                          </span>
                        )}
                        {getStudentDateOfBirth(selectedApplication) && (
                          <span className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            DOB: {formatDate(getStudentDateOfBirth(selectedApplication))}
                          </span>
                        )}
                        {selectedApplication.student?.passport_number && (
                          <span className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Passport: {selectedApplication.student.passport_number}
                          </span>
                        )}
                        {selectedApplication.student?.passport_expiry && (
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Passport expiry: {formatDate(selectedApplication.student.passport_expiry)}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setRequestType("");
                            setRequestDescription("");
                            setRequestDueDate("");
                            setRequestDialogOpen(true);
                          }}
                        >
                          <AlertCircle className="mr-1 h-3.5 w-3.5" />
                          Request documents
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className={withUniversitySurfaceTint("rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Agent
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="text-base font-semibold text-foreground">
                        {getAgentName(selectedApplication)}
                      </p>
                      {getAgentEmail(selectedApplication) ? (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {getAgentEmail(selectedApplication)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No agent email on record.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={withUniversitySurfaceTint("space-y-3 rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Documents
                    </div>
                    {renderDocuments(detailedApplication?.documents)}
                  </div>

                  <div className={withUniversitySurfaceTint("space-y-3 rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Notes
                    </div>
                    {renderNotes(detailedApplication)}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={withUniversitySurfaceTint("space-y-3 rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      Academic history
                    </div>
                    {renderEducationRecords(detailedApplication?.educationRecords)}
                  </div>
                  <div className={withUniversitySurfaceTint("space-y-3 rounded-2xl p-4")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      Additional information
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Test scores
                        </p>
                        {renderJsonBlock(
                          detailedApplication?.student?.test_scores ?? null,
                          "No test scores submitted.",
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Finances
                        </p>
                        {renderJsonBlock(
                          detailedApplication?.student?.finances_json ?? null,
                          "No finance information submitted.",
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Address
                        </p>
                        {renderJsonBlock(
                          detailedApplication?.student?.address ?? null,
                          "No address submitted.",
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={withUniversitySurfaceTint("space-y-3 rounded-2xl p-4")}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    AI readiness assistant
                  </div>
                  <div className="space-y-2 text-sm">
                    {buildAiInsights(
                      detailedApplication ?? selectedApplication,
                    ).map((insight, index) => (
                      <div
                        key={`${selectedApplication?.id}-insight-${index}`}
                        className="flex items-start gap-2 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/40 p-3"
                      >
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p className="text-muted-foreground">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={withUniversitySurfaceTint("space-y-3 rounded-2xl p-4")}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </div>
                  {renderTimeline(
                    detailedApplication?.timeline_json ??
                      selectedApplication.timeline_json,
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Admission Decision Dialog */}
      <Dialog open={decisionDialogOpen} onOpenChange={(open) => !open && handleCloseDecisionDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Update Application Status
            </DialogTitle>
            <DialogDescription>
              Review the application and issue an admission decision for{" "}
              <span className="font-medium">
                {decisionApplication?.student?.legal_name ||
                  decisionApplication?.student?.profile?.full_name ||
                  "this student"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Status */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current status:</span>
                <StatusBadge status={decisionApplication?.status || "submitted"} />
              </div>
              {decisionApplication?.program?.name && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Program: </span>
                  <span className="font-medium">{decisionApplication.program.name}</span>
                </p>
              )}
            </div>

            {/* New Status Selection */}
            <div className="space-y-2">
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="new-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {admissionStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Decision Notes */}
            <div className="space-y-2">
              <Label htmlFor="decision-notes">Notes (optional)</Label>
              <Textarea
                id="decision-notes"
                placeholder="Add any relevant notes about this decision..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes will be recorded in the application timeline.
              </p>
            </div>

            {/* Status-specific guidance */}
            {(newStatus === "conditional_offer" || newStatus === "unconditional_offer") && (
              <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 p-3">
                <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-success">Issuing an offer</p>
                  <p className="text-muted-foreground">
                    An offer record will be created. The student and agent will be notified.
                  </p>
                </div>
              </div>
            )}

            {newStatus === "rejected" && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-destructive">Rejecting application</p>
                  <p className="text-muted-foreground">
                    Please ensure you've thoroughly reviewed all documents before declining.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCloseDecisionDialog}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateApplicationStatus}
              disabled={isUpdatingStatus || !newStatus || newStatus === decisionApplication?.status}
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Verification Notes Dialog */}
      <Dialog
        open={verificationDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setVerificationDialogOpen(false);
            setVerificationTarget(null);
            setVerificationNotesDraft("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document notes</DialogTitle>
            <DialogDescription>
              Add internal verification notes for{" "}
              {formatDocumentType(verificationTarget?.document_type)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="verification-notes">Notes</Label>
            <Textarea
              id="verification-notes"
              value={verificationNotesDraft}
              onChange={(e) => setVerificationNotesDraft(e.target.value)}
              rows={4}
              placeholder="e.g. Verified name matches passport; transcript needs clearer scan..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVerificationDialogOpen(false)}
              disabled={verifyingDoc}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!verificationTarget) return;
                setVerifyingDoc(true);
                try {
                  const { data: auth } = await supabase.auth.getUser();
                  const verifierId = auth?.user?.id ?? null;

                  const { error } = await supabase
                    .from("application_documents")
                    .update({
                      verification_notes:
                        verificationNotesDraft.trim().length > 0
                          ? verificationNotesDraft.trim()
                          : null,
                      verifier_id: verifierId,
                    })
                    .eq("id", verificationTarget.id);

                  if (error) throw error;

                  setDetailedApplication((prev) => {
                    if (!prev?.documents) return prev;
                    const nextDocs = prev.documents.map((d) =>
                      d.id === verificationTarget.id
                        ? {
                            ...d,
                            verification_notes:
                              verificationNotesDraft.trim().length > 0
                                ? verificationNotesDraft.trim()
                                : null,
                          }
                        : d,
                    );
                    const next = { ...prev, documents: nextDocs };
                    if (prev.id) detailsCacheRef.current[prev.id] = next;
                    return next;
                  });

                  toast({
                    title: "Notes saved",
                    description: "Document notes updated successfully.",
                  });
                  setVerificationDialogOpen(false);
                } catch (error) {
                  logError(error, "UniversityApplications.saveVerificationNotes");
                  toast(formatErrorForToast(error, "Failed to save notes"));
                } finally {
                  setVerifyingDoc(false);
                }
              }}
              disabled={verifyingDoc}
            >
              {verifyingDoc ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request additional documents */}
      <Dialog
        open={requestDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRequestDialogOpen(false);
            setRequestType("");
            setRequestDescription("");
            setRequestDueDate("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request additional documents</DialogTitle>
            <DialogDescription>
              Create a document request for the student. It will appear in the{" "}
              university document requests queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="request-type">Request type</Label>
              <Input
                id="request-type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                placeholder="e.g. Bank statement, updated passport, missing transcript"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-desc">Description (optional)</Label>
              <Textarea
                id="request-desc"
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                rows={3}
                placeholder="Add instructions or context for the student/agent..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-due">Due date (optional)</Label>
              <Input
                id="request-due"
                type="date"
                value={requestDueDate}
                onChange={(e) => setRequestDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              disabled={creatingRequest}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!tenantId) {
                  toast({
                    title: "Missing tenant context",
                    description: "Unable to verify your university account.",
                    variant: "destructive",
                  });
                  return;
                }

                const studentId = selectedApplication?.student?.id;
                if (!studentId) {
                  toast({
                    title: "Missing student",
                    description: "This application is missing a student record.",
                    variant: "destructive",
                  });
                  return;
                }

                if (requestType.trim().length === 0) {
                  toast({
                    title: "Request type required",
                    description: "Please enter what you’re requesting.",
                    variant: "destructive",
                  });
                  return;
                }

                setCreatingRequest(true);
                try {
                  const { data: auth } = await supabase.auth.getUser();
                  const requestedBy = auth?.user?.id ?? null;

                  const dueDateIso =
                    requestDueDate.trim().length > 0
                      ? new Date(requestDueDate).toISOString()
                      : null;

                  const { error } = await supabase.from("document_requests").insert({
                    tenant_id: tenantId,
                    student_id: studentId,
                    document_type: requestType.trim(),
                    request_type: requestType.trim(),
                    description:
                      requestDescription.trim().length > 0
                        ? requestDescription.trim()
                        : null,
                    due_date: dueDateIso,
                    status: "pending",
                    requested_at: new Date().toISOString(),
                    requested_by: requestedBy,
                  } as any);

                  if (error) throw error;

                  toast({
                    title: "Request created",
                    description:
                      "The document request is now visible in the Documents queue.",
                  });
                  setRequestDialogOpen(false);
                } catch (error) {
                  logError(error, "UniversityApplications.createDocumentRequest");
                  toast(formatErrorForToast(error, "Failed to create request"));
                } finally {
                  setCreatingRequest(false);
                }
              }}
              disabled={creatingRequest}
            >
              {creatingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationsPage;
