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
  document_url?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  uploaded_at: string | null;
  verified: boolean | null;
  verification_notes?: string | null;
}

interface DetailedApplication extends ApplicationRow {
  documents?: ApplicationDocument[];
}

const PAGE_SIZE = 10;

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
          // ISOLATION: Filter by both tenant_id AND university_id to ensure complete data isolation
          // Defense in depth: even if program.university_id filter fails, tenant_id ensures isolation
          .eq("tenant_id", tenantId)
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
              program:programs (
                id,
                name,
                level
              )
            `,
          )
          .eq("id", applicationId)
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
            "id, document_type, storage_path, document_url, file_url, mime_type, uploaded_at, verified, verification_notes",
          )
          .eq("application_id", applicationId)
          .order("uploaded_at", { ascending: false });

        if (documentsError) {
          throw documentsError;
        }

        const detailed: DetailedApplication = {
          ...(applicationRow as ApplicationRow),
          documents: (documentsData ?? []) as unknown as ApplicationDocument[],
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
    [toast],
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
              {document.storage_path && (
                <p className="break-all text-xs text-muted-foreground/80">
                  Storage path: {document.storage_path}
                </p>
              )}
              {document.document_url && (
                <p className="break-all text-xs text-muted-foreground/80">
                  URL: {document.document_url}
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
            </div>
          </div>
        ))}
      </div>
    );
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
                  : "You're starting fresh! Once you add programmes and students apply, their applications will appear here for review."
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
    </div>
  );
};

export default ApplicationsPage;
