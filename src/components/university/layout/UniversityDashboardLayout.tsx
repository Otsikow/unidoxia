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
import { isValidUuid } from "@/lib/validation";

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
  agentId?: string | null;
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

export const fetchUniversityDashboardData = async (
  tenantId: string,
): Promise<UniversityDashboardData> => {
  try {
    if (!isValidUuid(tenantId)) return buildEmptyDashboardData();

    const { data: uniRows } = await supabase
      .from("universities")
      .select("*")
      .eq("tenant_id", tenantId)
      .limit(1);

    const university = (uniRows?.[0] ?? null) as Nullable<UniversityRecord>;
    if (!university) return buildEmptyDashboardData();

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
        .select("id, app_number, status, created_at, program_id, student_id, agent_id")
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

    const metrics: UniversityDashboardMetrics = {
      totalApplications: applications.length,
      totalPrograms: programs.length,
      totalOffers: applications.filter((a) =>
        ["conditional_offer", "unconditional_offer"].includes(normalizeStatus(a.status)),
      ).length,
      totalCas: applications.filter((a) =>
        ["cas_loa", "visa"].includes(normalizeStatus(a.status)),
      ).length,
      totalEnrolled: applications.filter(
        (a) => normalizeStatus(a.status) === "enrolled",
      ).length,
      totalAgents: 0,
      acceptanceRate:
        applications.length === 0
          ? 0
          : Math.round(
              (applications.filter((a) =>
                ["conditional_offer", "unconditional_offer"].includes(
                  normalizeStatus(a.status),
                ),
              ).length /
                applications.length) *
                100,
            ),
      newApplicationsThisWeek: applications.filter((a) =>
        isWithinLastDays(a.createdAt, 7),
      ).length,
      pendingDocuments: pendingDocsCount,
      receivedDocuments: receivedDocsCount,
    };

    return {
      university,
      profileDetails,
      programs,
      applications,
      documentRequests,
      agents: [],
      metrics,
      pipeline: [],
      conversion: [],
      statusSummary: [],
      countrySummary: [],
      recentApplications: applications.slice(0, 5),
    };
  } catch (err) {
    console.error("University dashboard fetch failed", err);
    return buildEmptyDashboardData();
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
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const tenantId = profile?.tenant_id ?? null;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["university-dashboard", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () =>
      tenantId ? fetchUniversityDashboardData(tenantId) : buildEmptyDashboardData(),
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('university-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          void refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        () => {
             void refetch();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, refetch]);

  if (loading || isLoading) {
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
        refetch: async () => void refetch(),
      }}
    >
      <div className="flex min-h-screen">
        <UniversitySidebar className="hidden lg:flex" />
        <div className="flex flex-col flex-1">
          <UniversityHeader onRefresh={() => void refetch()} refreshing={isFetching} />
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
