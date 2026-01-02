import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";

import { useQuery, useQueryClient, type QueryObserverResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isValidUuid } from "@/lib/validation";

import { useNavigate, useLocation } from "react-router-dom";

import { UniversitySidebar } from "./UniversitySidebar";
import { UniversityHeader } from "./UniversityHeader";
import { StatePlaceholder } from "../common/StatePlaceholder";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import {
  categorizeApplication,
  type ApplicationCategorization,
} from "@/lib/applicationCategorization";

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

import {
  buildMissingRpcError,
  isRpcMissingError,
  isRpcUnavailable,
  markRpcMissing,
} from "@/lib/supabaseRpc";

/* =========================================================
   TYPES
========================================================= */

type Nullable<T> = T | null;

type FeaturedListingStatus =
  Database["public"]["Enums"]["featured_listing_status"];

export interface UniversityRecord {
  id: string;
  tenant_id?: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  country: string;
  city: string | null;
  description?: string | null;
  featured_image_url?: string | null;
  submission_config_json?: unknown;
  featured_listing_expires_at?: string | null;
  featured_listing_status?: FeaturedListingStatus | null;
  featured_summary?: string | null;
  featured_highlight?: string | null;
  featured_priority?: number | null;
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
  image_url?: string | null;
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
  studentDateOfBirth?: string | null;
  studentCurrentCountry?: string | null;
  documentsCount?: number;
  lastDocumentUploadedAt?: string | null;
  documentSummaries?: { type: string; uploadedAt: string }[];
  agentId?: string | null;
  categorization: ApplicationCategorization;
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
  refetch: () => Promise<QueryObserverResult<UniversityDashboardData>>;
  lastUpdated: Date | null;
}

export const UniversityDashboardContext =
  createContext<UniversityDashboardContextValue | null>(null);

/* =========================================================
   HELPERS
========================================================= */

const normalizeStatus = (s?: string | null) => s?.toLowerCase() ?? "unknown";

const titleCase = (v: string) =>
  v
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

const isWithinLastDays = (iso: string, days: number) =>
  Date.now() - new Date(iso).getTime() <= days * 86400000;

/* =========================================================
   EMPTY STATE
========================================================= */

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

/* =========================================================
   DASHBOARD FETCH (CONFLICT-FREE)
========================================================= */

const PIPELINE_STAGES = [
  { key: "submitted", label: "Submitted", description: "Initial applications received", statuses: ["submitted", "draft"] },
  { key: "screening", label: "Screening", description: "Under review by admissions", statuses: ["screening"] },
  { key: "offers", label: "Offers Issued", description: "Conditional & unconditional offers", statuses: ["conditional_offer", "unconditional_offer"] },
  { key: "cas", label: "CAS/LOA Issued", description: "Confirmation of Acceptance", statuses: ["cas_loa", "visa"] },
  { key: "enrolled", label: "Enrolled", description: "Successfully enrolled students", statuses: ["enrolled"] },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  submitted: "#3b82f6",
  screening: "#8b5cf6",
  conditional_offer: "#f59e0b",
  unconditional_offer: "#22c55e",
  cas_loa: "#06b6d4",
  visa: "#14b8a6",
  enrolled: "#10b981",
  withdrawn: "#ef4444",
  deferred: "#6366f1",
};

export const fetchUniversityDashboardData = async (
  tenantId: string,
): Promise<UniversityDashboardData> => {
  try {
    if (!isValidUuid(tenantId)) {
      console.warn("[UniversityDashboard] Invalid tenant ID:", tenantId);
      return buildEmptyDashboardData();
    }

    // IMPORTANT: Match the Profile page query to ensure consistency
    // - Use .order() to get the most recently updated university
    // - Use .maybeSingle() for cleaner single-row handling
    // - Always check for errors to avoid silent failures
    const { data: universityData, error: universityError } = await supabase
      .from("universities")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (universityError) {
      console.error("[UniversityDashboard] Error fetching university:", universityError);
      // Don't return empty data for errors - throw so the error state is shown
      throw universityError;
    }

    const university = universityData as Nullable<UniversityRecord>;
    
    if (!university) {
      console.log("[UniversityDashboard] No university found for tenant:", tenantId);
      return buildEmptyDashboardData();
    }

    console.log("[UniversityDashboard] University loaded:", university.name, "id:", university.id);

    const parsed = parseUniversityProfileDetails(
      university.submission_config_json ?? null,
    );

    const profileDetails = mergeUniversityProfileDetails(
      emptyUniversityProfileDetails,
      parsed,
    );

    /* ---------- PROGRAMS ---------- */

    const { data: programRows } = await supabase
      .from("programs")
      .select("*")
      .eq("university_id", university.id);

    const programs = (programRows ?? []) as UniversityProgram[];
    const programIds = programs.map((p) => p.id);

    /* ---------- DOCUMENT REQUESTS ---------- */
    // Fetch document requests for this tenant
    const { data: docRequestRows } = await supabase
      .from("document_requests")
      .select("id, student_id, status, document_type, request_type, created_at, requested_at, storage_path")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    const rawDocRequests = docRequestRows ?? [];

    /* ---------- APPLICATIONS ---------- */

    let applications: UniversityApplication[] = [];
    let documentRequests: UniversityDocumentRequest[] = [];
    let rows: any[] = [];

    if (programIds.length) {
      const { data: appRows } = await supabase
        .from("applications")
        .select("id, app_number, status, created_at, updated_at, program_id, student_id, agent_id")
        .in("program_id", programIds)
        .order("created_at", { ascending: false });

      rows = appRows ?? [];
    }

    // Combine student IDs from both sources
    const studentIds = [
      ...new Set([
        ...rows.map((r) => r.student_id).filter(Boolean),
        ...rawDocRequests.map((r) => r.student_id).filter(Boolean)
      ])
    ] as string[];
    
    const studentMap = new Map<string, {
      legal_name: string | null;
      preferred_name: string | null;
      nationality: string | null;
      date_of_birth: string | null;
      current_country: string | null;
      profile_name: string | null;
      profile_email: string | null;
    }>();

    if (studentIds.length > 0) {
      try {
        const { data: studentData } = await supabase
          .rpc("get_students_for_university_applications", { p_student_ids: studentIds });

        if (studentData) {
          for (const s of studentData) {
            studentMap.set(s.id, {
              legal_name: s.legal_name,
              preferred_name: s.preferred_name,
              nationality: s.nationality,
              date_of_birth: s.date_of_birth,
              current_country: s.current_country,
              profile_name: s.profile_name,
              profile_email: s.profile_email,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch student data for applications:", err);
      }
    }

    // Process Applications
    if (rows.length > 0) {
      // Build a map of programs for quick lookup
      const programMap = new Map(programs.map((p) => [p.id, p]));

      applications = rows.map((app) => {
        const program = programMap.get(app.program_id);
        const student = app.student_id ? studentMap.get(app.student_id) : undefined;

        // Determine best student name: preferred_name > legal_name > profile_name
        const studentName = student?.preferred_name
          || student?.legal_name
          || student?.profile_name
          || "Unknown Student";

        const categorization = categorizeApplication({
          programLevel: program?.level ?? null,
          programName: program?.name ?? null,
          universityCountry: university?.country ?? null,
          studentNationality: student?.nationality ?? null,
          studentCurrentCountry: student?.current_country ?? null,
          status: app.status ?? "unknown",
          createdAt: app.created_at,
          lastUpdatedAt: app.updated_at ?? app.created_at,
          documentsCount: 0,
          agentId: app.agent_id ?? null,
        });

        return {
          id: app.id,
          appNumber: app.app_number ?? "—",
          status: app.status ?? "unknown",
          createdAt: app.created_at,
          programId: app.program_id,
          programName: program?.name ?? "Unknown Program",
          programLevel: program?.level ?? "—",
          programDiscipline: program?.discipline ?? null,
          studentId: app.student_id,
          studentName,
          studentNationality: student?.nationality ?? null,
          studentDateOfBirth: student?.date_of_birth ?? null,
          studentCurrentCountry: student?.current_country ?? null,
          agentId: app.agent_id,
          // Document fields will be populated below
          documentsCount: 0,
          lastDocumentUploadedAt: null,
          documentSummaries: [],
          categorization,
        };
      });
    }

    // -----------------------------------------------------
    // DOCUMENT SUMMARY FOR APPLICATION CARDS
    // -----------------------------------------------------
    const applicationIds = applications.map((app) => app.id);
    if (applicationIds.length > 0) {
      const { data: documentRows, error: documentsError } = await supabase
        .from("application_documents")
        .select("application_id, document_type, uploaded_at")
        .in("application_id", applicationIds);

      if (documentsError) {
        console.warn("[UniversityDashboard] Document summary fetch failed", documentsError);
      }

      const docSummary = new Map<string, { count: number; lastUploaded: string | null; summaries: { type: string; uploadedAt: string }[] }>();
      for (const row of documentRows ?? []) {
        const current = docSummary.get(row.application_id) ?? {
          count: 0,
          lastUploaded: null as string | null,
          summaries: [],
        };

        const uploadedAt = row.uploaded_at ?? null;
        const nextLastUploaded = current.lastUploaded && uploadedAt
          ? (new Date(uploadedAt) > new Date(current.lastUploaded) ? uploadedAt : current.lastUploaded)
          : uploadedAt ?? current.lastUploaded;

        docSummary.set(row.application_id, {
          count: current.count + 1,
          lastUploaded: nextLastUploaded,
          summaries: [
            ...current.summaries,
            {
              type: row.document_type ?? "unknown",
              uploadedAt: row.uploaded_at ?? "",
            },
          ],
        });
      }

      // Merge document summary data into applications
      applications = applications.map((app) => {
        const summary = docSummary.get(app.id);
        const documentsCount = summary?.count ?? 0;
        const lastDocumentUploadedAt = summary?.lastUploaded ?? null;

        const categorization = categorizeApplication({
          programLevel: app.programLevel,
          programName: app.programName,
          universityCountry: university?.country ?? null,
          studentNationality: app.studentNationality ?? null,
          studentCurrentCountry: app.studentCurrentCountry ?? null,
          status: app.status,
          createdAt: app.createdAt,
          lastUpdatedAt: lastDocumentUploadedAt ?? app.createdAt,
          lastDocumentAt: lastDocumentUploadedAt,
          documentsCount,
          agentId: app.agentId ?? null,
        });

        return {
          ...app,
          documentsCount,
          lastDocumentUploadedAt,
          documentSummaries: summary?.summaries ?? [],
          categorization,
        };
      });
    }

    // Process Document Requests
    documentRequests = rawDocRequests.map(req => {
      const student = req.student_id ? studentMap.get(req.student_id) : undefined;
      const studentName = student?.preferred_name 
        || student?.legal_name 
        || student?.profile_name 
        || "Unknown Student";

      let documentUrl = null;
      if (req.storage_path) {
        // Generate a public URL for the document if storage_path exists
        const { data } = supabase.storage.from('student-documents').getPublicUrl(req.storage_path);
        documentUrl = data.publicUrl;
      }

      return {
        id: req.id,
        studentId: req.student_id,
        studentName,
        status: req.status || "pending",
        requestType: req.request_type || req.document_type || "Document",
        requestedAt: req.requested_at || req.created_at,
        documentUrl
      };
    });

    /* ---------- METRICS ---------- */

    const pendingDocsCount = documentRequests.filter(d => d.status !== 'received').length;
    const receivedDocsCount = documentRequests.length - pendingDocsCount;
    
    // Count offers (including CAS/LOA/Visa/Enrolled as they also had offers issued)
    const offersCount = applications.filter((a) =>
      ["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"].includes(normalizeStatus(a.status)),
    ).length;
    
    // Count CAS/LOA issued
    const casCount = applications.filter((a) =>
      ["cas_loa", "visa", "enrolled"].includes(normalizeStatus(a.status)),
    ).length;
    
    // Count enrolled
    const enrolledCount = applications.filter(
      (a) => normalizeStatus(a.status) === "enrolled",
    ).length;

    const metrics: UniversityDashboardMetrics = {
      totalApplications: applications.length,
      totalPrograms: programs.length,
      totalOffers: offersCount,
      totalCas: casCount,
      totalEnrolled: enrolledCount,
      totalAgents: 0,
      acceptanceRate:
        applications.length === 0
          ? 0
          : Math.round((offersCount / applications.length) * 100),
      newApplicationsThisWeek: applications.filter((a) =>
        isWithinLastDays(a.createdAt, 7),
      ).length,
      pendingDocuments: pendingDocsCount,
      receivedDocuments: receivedDocsCount,
    };

    /* ---------- PIPELINE STAGES ---------- */
    
    const totalApps = applications.length;
    const pipeline: PipelineStage[] = PIPELINE_STAGES.map((stage) => {
      const count = applications.filter((a) =>
        stage.statuses.includes(normalizeStatus(a.status)),
      ).length;
      return {
        key: stage.key,
        label: stage.label,
        description: stage.description,
        count,
        percentage: totalApps === 0 ? 0 : Math.round((count / totalApps) * 100),
      };
    });

    /* ---------- CONVERSION METRICS ---------- */
    
    const submittedCount = applications.filter((a) =>
      !["draft"].includes(normalizeStatus(a.status)),
    ).length;
    
    const conversion: ConversionMetric[] = [
      {
        key: "submission_to_offer",
        label: "Submission → Offer",
        value: submittedCount === 0 ? 0 : Math.round((offersCount / submittedCount) * 100),
        description: "Applications that received an offer",
      },
      {
        key: "offer_to_cas",
        label: "Offer → CAS/LOA",
        value: offersCount === 0 ? 0 : Math.round((casCount / offersCount) * 100),
        description: "Offers that progressed to CAS/LOA",
      },
      {
        key: "cas_to_enrolled",
        label: "CAS → Enrolled",
        value: casCount === 0 ? 0 : Math.round((enrolledCount / casCount) * 100),
        description: "CAS holders who enrolled",
      },
    ];

    /* ---------- STATUS SUMMARY ---------- */
    
    const statusCounts = new Map<string, number>();
    for (const app of applications) {
      const status = normalizeStatus(app.status);
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    }
    
    const statusSummary: ChartDatum[] = Array.from(statusCounts.entries()).map(([status, count]) => ({
      name: titleCase(status),
      value: count,
      color: STATUS_COLORS[status] ?? "#6b7280",
    }));

    /* ---------- COUNTRY SUMMARY ---------- */
    
    const countryCounts = new Map<string, number>();
    for (const app of applications) {
      const country = app.studentNationality ?? app.studentCurrentCountry ?? "Unknown";
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    }
    
    const countrySummary: ChartDatum[] = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({
        name: country,
        value: count,
      }));

    return {
      university,
      profileDetails,
      programs,
      applications,
      documentRequests,
      agents: [],
      metrics,
      pipeline,
      conversion,
      statusSummary,
      countrySummary,
      recentApplications: applications.slice(0, 5),
    };
  } catch (err) {
    console.error("[UniversityDashboard] Dashboard fetch failed:", err);
    // Re-throw the error so react-query can handle it properly
    // This ensures the error state is shown instead of silently showing empty data
    throw err;
  }
};

/* =========================================================
   LAYOUT + CONTEXT
========================================================= */

export const UniversityDashboardLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { profile, loading, profileLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const ensureUniversityAttemptedRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tenantId = profile?.tenant_id ?? null;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["university-dashboard", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () =>
      tenantId ? fetchUniversityDashboardData(tenantId) : buildEmptyDashboardData(),
    // Reduce stale time for more frequent background refreshes
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });

  // Self-healing: automatically create/connect the university profile if it is missing
  useEffect(() => {
    const validTenantId = tenantId && isValidUuid(tenantId) ? tenantId : null;
    const shouldEnsure =
      !ensureUniversityAttemptedRef.current &&
      !loading &&
      !profileLoading &&
      !isLoading &&
      !isFetching &&
      !error &&
      validTenantId &&
      !data?.university;

    if (!shouldEnsure) return;

    ensureUniversityAttemptedRef.current = true;

    const ensureUniversity = async () => {
      try {
        console.warn("[UniversityDashboard] Missing university profile detected, attempting to create/connect", {
          tenantId: validTenantId,
          userId: profile?.id,
          email: profile?.email,
        });

        const { error: rpcError } = await supabase.rpc("get_or_create_university", {
          p_tenant_id: validTenantId,
          p_name: profile?.full_name ? `${profile.full_name}'s University` : "University Partner",
          p_country: profile?.country || "Unknown",
          p_contact_name: profile?.full_name || profile?.email || "University Partner",
          p_contact_email: profile?.email || null,
        });

        if (rpcError) {
          console.error("[UniversityDashboard] Failed to self-heal university profile:", rpcError);
          toast({
            title: "Unable to load university profile",
            description: "We couldn't connect your university automatically. Please refresh or contact support.",
            variant: "destructive",
          });
          return;
        }

        console.log("[UniversityDashboard] University profile ensured successfully. Refreshing dashboard data…");
        await refetch();
      } catch (err) {
        console.error("[UniversityDashboard] Unexpected error ensuring university profile:", err);
        toast({
          title: "Connection issue",
          description: "We couldn't verify your university profile. Please try again shortly.",
          variant: "destructive",
        });
      }
    };

    void ensureUniversity();
  }, [
    data?.university,
    error,
    isFetching,
    isLoading,
    loading,
    profile?.country,
    profile?.email,
    profile?.full_name,
    profile?.id,
    profileLoading,
    refetch,
    tenantId,
    toast,
  ]);

  // Get program IDs for filtering real-time updates
  const programIds = useMemo(() => data?.programs?.map(p => p.id) ?? [], [data?.programs]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!tenantId) return;

    const handleRealtimeUpdate = (payload: any) => {
      console.log("[UniversityDashboard] Real-time update received:", payload);
      setLastUpdated(new Date());
      void refetch();
    };

    const channel = supabase
      .channel(`university-dashboard-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        handleRealtimeUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        (payload) => {
          // Filter by program_id if we have program IDs
          const newRecord = payload.new as Record<string, any> | null;
          const oldRecord = payload.old as Record<string, any> | null;
          const programId = newRecord?.program_id || oldRecord?.program_id;
          if (programIds.length === 0 || programIds.includes(programId)) {
            handleRealtimeUpdate(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_documents',
        },
        handleRealtimeUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'programs',
        },
        (payload) => {
          // Filter by university programs
          const universityId = data?.university?.id;
          const newRecord = payload.new as Record<string, any> | null;
          const oldRecord = payload.old as Record<string, any> | null;
          const payloadUniversityId = newRecord?.university_id || oldRecord?.university_id;
          if (!universityId || payloadUniversityId === universityId) {
            handleRealtimeUpdate(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("[UniversityDashboard] Real-time subscription active for tenant:", tenantId);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, refetch, programIds, data?.university?.id]);

  // Include profileLoading to prevent "No partner profile" flash during auth
  if (loading || profileLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Preparing dashboard…" size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="No partner profile"
        description="Please sign in with your university account."
      />
    );
  }

  if (!tenantId) {
    return (
      <StatePlaceholder
        icon={<AlertCircle />}
        title="Partner space not configured"
        description="We couldn't find a university workspace linked to your account. Please contact support or try refreshing."
        action={<Button onClick={() => navigate('/dashboard')}>Go back</Button>}
      />
    );
  }

  if (!data?.university) {
    return (
      <StatePlaceholder
        icon={<RefreshCw />}
        title="Setting up your dashboard"
        description="We're preparing your university workspace. This usually takes a few seconds—try refreshing if the screen stays blank."
        action={<Button onClick={() => void refetch()}>Refresh now</Button>}
      />
    );
  }

  if (error) {
    return (
      <StatePlaceholder
        icon={<AlertCircle />}
        title="Dashboard error"
        description={(error as Error).message}
        action={<Button onClick={() => void refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <UniversityDashboardContext.Provider
      value={{
        data: data ?? buildEmptyDashboardData(),
        isLoading,
        isRefetching: isFetching,
        error: error ? (error as Error).message : null,
        refetch: () => refetch(),
        lastUpdated,
      }}
    >
      <div className="flex min-h-screen">
        <UniversitySidebar
          className="hidden lg:flex"
          collapsed={sidebarCollapsed}
        />

        {/* Mobile sidebar */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <UniversitySidebar
              className="flex h-full"
              onNavigate={() => setMobileNavOpen(false)}
              collapsed={sidebarCollapsed}
            />
          </SheetContent>
        </Sheet>

        <div className="flex flex-col flex-1">
          <UniversityHeader
            onRefresh={() => void refetch()}
            refreshing={isFetching}
            onToggleMobileNav={() => setMobileNavOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
            sidebarCollapsed={sidebarCollapsed}
          />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </UniversityDashboardContext.Provider>
  );
};

export const useUniversityDashboard = () => {
  const ctx = useContext(UniversityDashboardContext);
  if (!ctx)
    throw new Error(
      "useUniversityDashboard must be used inside UniversityDashboardLayout",
    );
  return ctx;
};