import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { useNavigate, useLocation } from "react-router-dom";

import { UniversitySidebar } from "./UniversitySidebar";
import { UniversityHeader } from "./UniversityHeader";
import { StatePlaceholder } from "../common/StatePlaceholder";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import {
  Building2,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  computeUniversityProfileCompletion,
  emptyUniversityProfileDetails,
  mergeUniversityProfileDetails,
  parseUniversityProfileDetails,
  type UniversityProfileDetails,
} from "@/lib/universityProfile";

// ----------------------
// TYPE DEFINITIONS
// ----------------------

type Nullable<T> = T | null;

type FeaturedListingStatus = Database["public"]["Enums"]["featured_listing_status"];

export interface UniversityRecord {
  id: string;
  tenant_id?: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  country: string;
  city: string | null;
  description?: string | null;

  featured?: boolean | null;
  featured_summary?: string | null;
  featured_highlight?: string | null;
  featured_image_url?: string | null;
  featured_priority?: number | null;
  featured_listing_status?: FeaturedListingStatus | null;
  featured_listing_expires_at?: string | null;
  featured_listing_last_paid_at?: string | null;
  featured_listing_current_order_id?: string | null;

  submission_config_json?: unknown;
}

export interface UniversityProgram {
  id: string;
  name: string;
  level: string;
  discipline: string | null;
  duration_months: number | null;
  tuition_amount: number | null;
  tuition_currency: string | null;
  intake_months: number[] | null;
  entry_requirements: string[] | null;
  ielts_overall: number | null;
  toefl_overall: number | null;
  seats_available: number | null;
  description: string | null;
  app_fee: number | null;
  image_url: string | null;
  active: boolean | null;
}

export interface UniversityApplication {
  id: string;
  appNumber: string;
  status: string;
  createdAt: string;
  programId: string;
  programName: string;
  programLevel: string;
  programDiscipline: string | null;
  studentId: string | null;
  studentName: string;
  studentNationality: string | null;
}

export interface UniversityDocumentRequest {
  id: string;
  studentId: string | null;
  studentName: string;
  status: string;
  requestType: string;
  requestedAt: string | null;
  documentUrl: string | null;
}

export interface UniversityAgent {
  id: string;
  companyName: string | null;
  contactName: string;
  contactEmail: string;
  referralCount: number;
}

export interface PipelineStage {
  key: string;
  label: string;
  description: string;
  count: number;
  percentage: number;
}

export interface ConversionMetric {
  key: string;
  label: string;
  value: number;
  description: string;
}

export interface ChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface UniversityDashboardMetrics {
  totalApplications: number;
  totalPrograms: number;
  totalOffers: number;
  totalCas: number;
  totalEnrolled: number;
  totalAgents: number;
  acceptanceRate: number;
  newApplicationsThisWeek: number;
  pendingDocuments: number;
  receivedDocuments: number;
}

export interface UniversityDashboardData {
  university: Nullable<UniversityRecord>;
  profileDetails: UniversityProfileDetails;
  programs: UniversityProgram[];
  applications: UniversityApplication[];
  documentRequests: UniversityDocumentRequest[];
  agents: UniversityAgent[];
  metrics: UniversityDashboardMetrics;
  pipeline: PipelineStage[];
  conversion: ConversionMetric[];
  statusSummary: ChartDatum[];
  countrySummary: ChartDatum[];
  recentApplications: UniversityApplication[];
}

interface UniversityDashboardContextValue {
  data: UniversityDashboardData | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Nullable<string>;
  refetch: () => Promise<void>;
}

// ----------------------
// CONTEXT
// ----------------------

export const UniversityDashboardContext =
  createContext<UniversityDashboardContextValue | null>(null);

// ----------------------
// HELPER CONSTANTS
// ----------------------

const statusColors: Record<string, string> = {
  accepted: "hsl(var(--success))",
  offers: "hsl(var(--info))",
  pending: "hsl(var(--warning))",
  other: "hsl(var(--muted-foreground))",
};

const pipelineStageDefinitions = [
  { key: "submitted", label: "New Applications", description: "Submitted and awaiting review", statuses: ["submitted", "draft"] },
  { key: "screening", label: "In Review", description: "Applications in screening or evaluation", statuses: ["screening"] },
  { key: "offers", label: "Offers Issued", description: "Conditional or unconditional offers sent", statuses: ["conditional_offer", "unconditional_offer"] },
  { key: "cas", label: "Visa & CAS", description: "Students completing CAS or visa steps", statuses: ["cas_loa", "visa"] },
  { key: "enrolled", label: "Enrolled Students", description: "Students confirmed for intake", statuses: ["enrolled"] },
];

// ----------------------
// UTILITY FUNCTIONS
// ----------------------

const normalizeStatus = (status: string | null | undefined) =>
  status ? status.toLowerCase() : "unknown";

const titleCase = (value: string) =>
  value
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

const isWithinLastDays = (iso: string | null, days: number) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return false;
  const diff = Date.now() - date.getTime();
  return diff / (1000 * 60 * 60 * 24) <= days;
};

// ----------------------
// BLANK DASHBOARD STATE
// ----------------------

export const buildEmptyDashboardData = (): UniversityDashboardData => ({
  university: null,
  profileDetails: { ...emptyUniversityProfileDetails },
  programs: [],
  applications: [],
  documentRequests: [],
  agents: [],
  metrics: {
    totalApplications: 0,
    totalPrograms: 0,
    totalOffers: 0,
    totalCas: 0,
    totalEnrolled: 0,
    totalAgents: 0,
    acceptanceRate: 0,
    newApplicationsThisWeek: 0,
    pendingDocuments: 0,
    receivedDocuments: 0,
  },
  pipeline: [],
  conversion: [],
  statusSummary: [],
  countrySummary: [],
  recentApplications: [],
});
/**
 * Fetch dashboard data for a particular university tenant.
 * Version B logic is enforced:
 *  - UUID validation
 *  - strict tenant isolation
 *  - improved security logs
 *  - fallback-safe Supabase querying
 */
export const fetchUniversityDashboardData = async (
  tenantId: string,
): Promise<UniversityDashboardData> => {
  console.log("=== FETCH UNIVERSITY DASHBOARD DATA ===", { tenantId });

  // -----------------------------------------------------
  // SECURITY: Validate tenantId is a UUID (Version B)
  // -----------------------------------------------------
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!tenantId || !uuidRegex.test(tenantId)) {
    console.error("SECURITY: Invalid or missing tenant ID:", tenantId);
    return buildEmptyDashboardData();
  }

  // -----------------------------------------------------
  // FETCH UNIVERSITY RECORD (isolation: tenant-scoped)
  // -----------------------------------------------------
  const { data: uniRows, error: uniError } = await supabase
    .from("universities")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("active", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (uniError) {
    console.error("Error fetching university:", uniError);
    throw uniError;
  }

  const uniData = (uniRows?.[0] ?? null) as Nullable<UniversityRecord>;

  // -----------------------------------------------------
  // NEW UNIVERSITY → return blank dashboard
  // -----------------------------------------------------
  if (!uniData) {
    console.log("New university detected – returning blank dashboard.");
    return buildEmptyDashboardData();
  }

  // -----------------------------------------------------
  // DOUBLE-CHECK TENANT OWNERSHIP (Version B strictness)
  // -----------------------------------------------------
  if (uniData.tenant_id !== tenantId) {
    console.error("SECURITY: University tenant mismatch detected", {
      expectedTenant: tenantId,
      actualTenant: uniData.tenant_id,
      universityId: uniData.id,
      universityName: uniData.name,
    });
    throw new Error("Data isolation error: Invalid university ownership.");
  }

  console.log("University loaded:", {
    id: uniData.id,
    name: uniData.name,
    tenantId: uniData.tenant_id,
  });

  // -----------------------------------------------------
  // Parse + merge submission config with fallback details
  // -----------------------------------------------------
  const parsedDetails = parseUniversityProfileDetails(
    uniData.submission_config_json ?? null,
  );

  const profileDetails = mergeUniversityProfileDetails(
    emptyUniversityProfileDetails,
    {
      ...parsedDetails,
      media: {
        ...parsedDetails.media,
        heroImageUrl:
          parsedDetails.media.heroImageUrl ??
          uniData.featured_image_url ??
          null,
      },
      social: {
        ...parsedDetails.social,
        website: parsedDetails.social.website ?? uniData.website ?? null,
      },
    },
  );

  // -----------------------------------------------------
  // PROGRAM FETCH (with image_url fallback)
  // -----------------------------------------------------

  const programColumns = [
    "id",
    "name",
    "level",
    "discipline",
    "duration_months",
    "tuition_amount",
    "tuition_currency",
    "intake_months",
    "entry_requirements",
    "ielts_overall",
    "toefl_overall",
    "seats_available",
    "description",
    "app_fee",
    "image_url",
    "active",
  ] as const;

  const selectPrograms = (columns: readonly string[]) =>
    supabase
      .from("programs")
      .select(columns.join(", "))
      .eq("university_id", uniData.id)
      .order("name");

  const fetchProgramsWithFallback = async (): Promise<UniversityProgram[]> => {
    const response = await selectPrograms(programColumns);

    if (!response.error && response.data) {
      return response.data as unknown as UniversityProgram[];
    }

    const err = response.error;
    const missingColumn =
      err.code === "42703" || err.message.toLowerCase().includes("image_url");

    if (!missingColumn) throw err;

    console.warn("programs.image_url missing – refetching without image_url");

    const fallbackCols = programColumns.filter((c) => c !== "image_url");
    const fallback = await selectPrograms(fallbackCols);

    if (fallback.error) throw fallback.error;

    return (fallback.data ?? []).map((p: any) => ({
      ...p,
      image_url: null,
    })) as UniversityProgram[];
  };

  const programs = await fetchProgramsWithFallback();
  const isolatedPrograms = programs; // Already filtered by university_id

  // Collect program IDs for application mapping
  const programIds = isolatedPrograms.map((p) => p.id);

  // -----------------------------------------------------
  // PARALLEL FETCH: document requests + agents
  // -----------------------------------------------------
  const [documentRequestsRes, agentsRes] = await Promise.all([
    supabase
      .from("document_requests")
      .select(
        "id, student_id, request_type, status, requested_at, created_at, document_url, uploaded_file_url, file_url"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),

    supabase
      .from("agents")
      .select(
        `
        id,
        company_name,
        profile:profiles!inner (
          full_name,
          email
        )
      `
      )
      .eq("tenant_id", tenantId),
  ]);

  if (documentRequestsRes.error) throw documentRequestsRes.error;
  if (agentsRes.error) throw agentsRes.error;

  // -----------------------------------------------------
  // APPLICATIONS (mapped through programs)
  // -----------------------------------------------------
  let applications: UniversityApplication[] = [];

  if (programIds.length > 0) {
    const { data: rawApps, error: appsErr } = await supabase
      .from("applications")
      .select("id, app_number, status, created_at, program_id, student_id")
      .eq("tenant_id", tenantId)
      .in("program_id", programIds)
      .order("created_at", { ascending: false });

    if (appsErr) throw appsErr;

    const rows = rawApps ?? [];
    const studentIds = [
      ...new Set(rows.map((r) => r.student_id).filter(Boolean)),
    ] as string[];

    // Fetch students (tenant scoped)
    let studentsMap = new Map<
      string,
      { id: string; legal_name: string | null; nationality: string | null }
    >();

    if (studentIds.length > 0) {
      const { data: stuData, error: stuErr } = await supabase
        .from("students")
        .select("id, legal_name, nationality")
        .eq("tenant_id", tenantId)
        .in("id", studentIds);

      if (stuErr) throw stuErr;

      studentsMap = new Map(stuData?.map((s) => [s.id, s]) ?? []);
    }

    const programMap = new Map(
      isolatedPrograms.map((p) => [
        p.id,
        { id: p.id, name: p.name, level: p.level, discipline: p.discipline },
      ]),
    );

    applications = rows.map((app) => {
      const student = app.student_id ? studentsMap.get(app.student_id) : null;
      const program = programMap.get(app.program_id);

      return {
        id: app.id,
        appNumber: app.app_number ?? "—",
        status: app.status ?? "unknown",
        createdAt: app.created_at,
        programId: app.program_id,
        programName: program?.name ?? "Unknown Program",
        programLevel: program?.level ?? "—",
        programDiscipline: program?.discipline ?? null,
        studentId: app.student_id ?? null,
        studentName: student?.legal_name ?? "Unknown Student",
        studentNationality: student?.nationality ?? "Unknown",
      };
    });
  }

  // -----------------------------------------------------
  // DOCUMENT REQUEST MAPPING
  // -----------------------------------------------------
  const documentRequests: UniversityDocumentRequest[] =
    (documentRequestsRes.data ?? []).map((req) => ({
      id: req.id,
      studentId: req.student_id ?? null,
      studentName: "Student",
      status: normalizeStatus(req.status),
      requestType: titleCase(req.request_type ?? "Document"),
      requestedAt: req.requested_at ?? req.created_at,
      documentUrl:
        req.document_url ?? req.uploaded_file_url ?? req.file_url ?? null,
    }));

  // Fetch associated students for document requests
  if (documentRequests.length > 0) {
    const docStudentIds = [
      ...new Set(documentRequests.map((r) => r.studentId).filter(Boolean)),
    ] as string[];

    if (docStudentIds.length > 0) {
      const { data: docStudents, error: docErr } = await supabase
        .from("students")
        .select("id, legal_name, preferred_name")
        .eq("tenant_id", tenantId)
        .in("id", docStudentIds);

      if (docErr) throw docErr;

      const map = new Map(docStudents?.map((s) => [s.id, s]) ?? []);

      documentRequests.forEach((r) => {
        const s = r.studentId ? map.get(r.studentId) : null;
        if (s)
          r.studentName = s.preferred_name ?? s.legal_name ?? "Student";
      });
    }
  }

  // -----------------------------------------------------
  // AGENTS + referral counts
  // -----------------------------------------------------
  const agents: UniversityAgent[] = await Promise.all(
    (agentsRes.data ?? []).map(async (agent: any) => {
      const { count, error: cntErr } = await supabase
        .from("applications")
        .select("id", { head: true, count: "exact" })
        .eq("tenant_id", tenantId)
        .eq("agent_id", agent.id);

      if (cntErr) throw cntErr;

      return {
        id: agent.id,
        companyName: agent.company_name ?? null,
        contactName: agent.profile?.full_name ?? "Agent",
        contactEmail: agent.profile?.email ?? "—",
        referralCount: count ?? 0,
      };
    }),
  );

  // -----------------------------------------------------
  // METRICS + PIPELINE + SUMMARIES
  // -----------------------------------------------------
  const metrics = buildMetrics(
    applications,
    documentRequests,
    isolatedPrograms,
    agents,
  );
  const pipeline = buildPipeline(applications);
  const conversion = buildConversion(applications);
  const statusSummary = buildStatusSummary(applications);
  const countrySummary = buildCountrySummary(applications);
  const recentApplications = applications.slice(0, 5);

  // -----------------------------------------------------
  // FINAL RESULT
  // -----------------------------------------------------
  return {
    university: {
      id: uniData.id,
      tenant_id: uniData.tenant_id,
      name: uniData.name,
      logo_url: uniData.logo_url,
      website: uniData.website,
      country: uniData.country,
      city: uniData.city,
      description: uniData.description,
      featured_image_url: uniData.featured_image_url,
    },
    profileDetails,
    programs: isolatedPrograms,
    applications,
    documentRequests,
    agents,
    metrics,
    pipeline,
    conversion,
    statusSummary,
    countrySummary,
    recentApplications,
  };
};
// -----------------------------------------------------
// METRICS BUILDER
// -----------------------------------------------------
const buildMetrics = (
  applications: UniversityApplication[],
  documentRequests: UniversityDocumentRequest[],
  programs: UniversityProgram[],
  agents: UniversityAgent[],
): UniversityDashboardMetrics => {
  const totalApplications = applications.length;
  const totalPrograms = programs.length;

  const offerStatuses = ["conditional_offer", "unconditional_offer"];
  const casStatuses = ["cas_loa", "visa"];
  const enrolledStatuses = ["enrolled"];

  let totalOffers = 0;
  let totalCas = 0;
  let totalEnrolled = 0;
  let newApplicationsThisWeek = 0;

  for (const app of applications) {
    const st = normalizeStatus(app.status);

    if (offerStatuses.includes(st)) totalOffers++;
    if (casStatuses.includes(st)) totalCas++;
    if (enrolledStatuses.includes(st)) totalEnrolled++;

    if (isWithinLastDays(app.createdAt, 7)) newApplicationsThisWeek++;
  }

  const acceptanceRate =
    totalApplications > 0
      ? Math.round((totalOffers / totalApplications) * 100)
      : 0;

  const pendingDocuments = documentRequests.filter(
    (r) => normalizeStatus(r.status) !== "received",
  ).length;

  const receivedDocuments = documentRequests.length - pendingDocuments;

  return {
    totalApplications,
    totalPrograms,
    totalOffers,
    totalCas,
    totalEnrolled,
    totalAgents: agents.length,
    acceptanceRate,
    newApplicationsThisWeek,
    pendingDocuments,
    receivedDocuments,
  };
};

// -----------------------------------------------------
// PIPELINE BUILDER
// -----------------------------------------------------
const buildPipeline = (
  applications: UniversityApplication[],
): PipelineStage[] => {
  const total = applications.length;

  return pipelineStageDefinitions.map((def) => {
    const count = applications.filter((a) =>
      def.statuses.includes(normalizeStatus(a.status)),
    ).length;

    return {
      key: def.key,
      label: def.label,
      description: def.description,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
};

// -----------------------------------------------------
// CONVERSION BUILDER
// -----------------------------------------------------
const buildConversion = (
  applications: UniversityApplication[],
): ConversionMetric[] => {
  const total = applications.length;

  const offers = applications.filter((a) =>
    ["conditional_offer", "unconditional_offer"].includes(
      normalizeStatus(a.status),
    ),
  ).length;

  const cas = applications.filter((a) =>
    ["cas_loa", "visa"].includes(normalizeStatus(a.status)),
  ).length;

  const enrolled = applications.filter((a) =>
    ["enrolled"].includes(normalizeStatus(a.status)),
  ).length;

  return [
    {
      key: "offer",
      label: "Offer Rate",
      value: total > 0 ? Math.round((offers / total) * 100) : 0,
      description: `${offers} offers issued`,
    },
    {
      key: "visa",
      label: "Visa Progress",
      value: offers > 0 ? Math.round((cas / offers) * 100) : 0,
      description: `${cas} students in CAS or Visa`,
    },
    {
      key: "enrolled",
      label: "Enrollment Rate",
      value: total > 0 ? Math.round((enrolled / total) * 100) : 0,
      description: `${enrolled} students enrolled`,
    },
  ];
};

// -----------------------------------------------------
// STATUS SUMMARY
// -----------------------------------------------------
const buildStatusSummary = (
  applications: UniversityApplication[],
): ChartDatum[] => {
  const accepted = applications.filter((a) =>
    ["conditional_offer", "unconditional_offer"].includes(
      normalizeStatus(a.status),
    ),
  ).length;

  const pending = applications.filter((a) =>
    ["submitted", "screening", "draft"].includes(
      normalizeStatus(a.status),
    ),
  ).length;

  const other = applications.length - (accepted + pending);

  return [
    { name: "Accepted", value: accepted, color: statusColors.accepted },
    { name: "Pending", value: pending, color: statusColors.pending },
    { name: "Other", value: other, color: statusColors.other },
  ];
};

// -----------------------------------------------------
// COUNTRY SUMMARY
// -----------------------------------------------------
const buildCountrySummary = (
  applications: UniversityApplication[],
): ChartDatum[] => {
  const map = new Map<string, number>();

  for (const app of applications) {
    const c = app.studentNationality ?? "Unknown";
    map.set(c, (map.get(c) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
};
export const UniversityDashboardLayout = ({
  children,
}: { children: ReactNode }) => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const tenantId = profile?.tenant_id ?? null;

  // -----------------------------------------------------
  // REACT QUERY FETCH
  // -----------------------------------------------------
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["university-dashboard", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return buildEmptyDashboardData();
      return await fetchUniversityDashboardData(tenantId);
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // -----------------------------------------------------
  // REAL-TIME SUBSCRIPTIONS
  // -----------------------------------------------------
  useEffect(() => {
    if (!tenantId) return;

    // Reset channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () =>
      queryClient.invalidateQueries({
        queryKey: ["university-dashboard", tenantId],
      });

    const channel = supabase
      .channel(`uni-dashboard-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        handleChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "programs" },
        handleChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_requests" },
        handleChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        handleChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "universities" },
        handleChange,
      )
      .subscribe(() => {
        console.log("Real-time sync active for tenant:", tenantId);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, queryClient]);

  // -----------------------------------------------------
  // ERROR HANDLING
  // -----------------------------------------------------
  useEffect(() => {
    if (error) {
      toast({
        title: "Unable to load dashboard",
        description: (error as Error)?.message ?? "Unknown error.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // -----------------------------------------------------
  // CONTEXT VALUE (must be defined before early returns)
  // -----------------------------------------------------
  const contextValue: UniversityDashboardContextValue = useMemo(
    () => ({
      data: data ?? buildEmptyDashboardData(),
      isLoading,
      isRefetching: isFetching,
      error: error ? (error as Error).message : null,
      refetch: async () => void queryRefetch(),
    }),
    [data, isLoading, isFetching, error, queryRefetch],
  );

  // -----------------------------------------------------
  // PROFILE COMPLETION CALCULATION
  // -----------------------------------------------------
  const profileCompletion = useMemo(() => {
    if (!data?.university) {
      return { percentage: 0, missingFields: [] as string[] };
    }

    const mergedDetails = mergeUniversityProfileDetails(
      data.profileDetails ?? emptyUniversityProfileDetails,
      {
        contacts: {
          primary: {
            name:
              data.profileDetails?.contacts?.primary?.name ??
              profile?.full_name ??
              null,
            email:
              data.profileDetails?.contacts?.primary?.email ??
              profile?.email ??
              null,
            phone:
              data.profileDetails?.contacts?.primary?.phone ??
              profile?.phone ??
              null,
            title: data.profileDetails?.contacts?.primary?.title ?? null,
          },
        },
      },
    );

    return computeUniversityProfileCompletion(
      // @ts-expect-error: internal union type mismatch tolerated
      data.university,
      mergedDetails,
    );
  }, [data, profile]);

  const showProfileReminder =
    Boolean(data?.university) && profileCompletion.percentage < 100;

  const missingSummary = showProfileReminder
    ? profileCompletion.missingFields.slice(0, 3).join(", ")
    : "";

  // -----------------------------------------------------
  // LOADING + AUTH STATES
  // -----------------------------------------------------
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState
          message="Preparing your university dashboard..."
          size="lg"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No partner profile found"
          description="Sign in with your university partner credentials."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <StatePlaceholder
          icon={<AlertCircle className="h-12 w-12 text-red-400" />}
          title="Unable to load dashboard"
          description={(error as Error)?.message ?? "An error occurred."}
          action={
            <Button onClick={() => void queryRefetch()} className="gap-2">
              Try again <ArrowUpRight className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    );
  }

  // -----------------------------------------------------
  // NEW UNIVERSITY WELCOME STATE
  // Skip this screen if user is on the profile page (so they can set up their profile)
  // -----------------------------------------------------
  const isOnProfilePage = location.pathname === "/university/profile";
  if ((!data || !data.university) && !isOnProfilePage) {
    const handleSetUpProfile = () => {
      navigate("/university/profile");
    };

    const handleRefresh = async () => {
      try {
        await queryRefetch();
        toast({
          title: "Dashboard refreshed",
          description: "Checking for updates...",
        });
      } catch (err) {
        toast({
          title: "Refresh failed",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg text-center flex flex-col items-center gap-6">
          <div className="p-4 bg-primary/10 rounded-full">
            <Building2 className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-2xl font-semibold">Welcome to UniDoxia</h1>

          <p className="text-muted-foreground">
            Your university dashboard is ready. Begin by setting up your profile
            and adding your first programs.
          </p>

          <div className="flex gap-4 mt-2">
            <Button
              type="button"
              onClick={handleSetUpProfile}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Set Up Profile
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-2"
            >
              {isFetching ? "Refreshing..." : "Refresh"}
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Workspace ID: {tenantId?.slice(0, 8)}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <UniversityDashboardContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Desktop Sidebar */}
        <UniversitySidebar className="hidden lg:flex" />

        {/* Mobile Sidebar */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-background border-r border-border overflow-y-auto"
          >
            <UniversitySidebar
              className="flex lg:hidden"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Area */}
        <div className="flex flex-col flex-1 min-h-screen">
          <UniversityHeader
            onToggleMobileNav={() => setMobileNavOpen(true)}
            onRefresh={() => void queryRefetch()}
            refreshing={isFetching}
          />

          <main className="flex-1 overflow-y-auto bg-gradient-subtle px-3 py-4 sm:px-4 lg:px-8 xl:px-10 lg:py-8 xl:py-10">
            <div className="mx-auto max-w-7xl flex flex-col gap-6">
              {showProfileReminder && (
                <Alert className="border-primary/40 bg-primary/5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <AlertTitle className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        Complete your university profile
                      </AlertTitle>

                      <AlertDescription>
                        You are {profileCompletion.percentage}% complete.
                        {missingSummary
                          ? ` Missing: ${missingSummary}`
                          : " Add remaining details to finish your profile."}
                      </AlertDescription>

                      <div className="flex items-center gap-3 mt-3">
                        <Progress
                          value={profileCompletion.percentage}
                          className="h-2 flex-1"
                        />
                        <span className="font-medium text-primary">
                          {profileCompletion.percentage}%
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate("/university/profile")}
                    >
                      Update Profile
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Alert>
              )}

              {children}
            </div>
          </main>
        </div>
      </div>
    </UniversityDashboardContext.Provider>
  );
};
export const useUniversityDashboard = () => {
  const ctx = useContext(UniversityDashboardContext);
  if (!ctx) {
    throw new Error(
      "useUniversityDashboard must be used within UniversityDashboardLayout",
    );
  }
  return ctx;
};
