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

    /* ---------- APPLICATIONS ---------- */

    let applications: UniversityApplication[] = [];

    if (programIds.length) {
      const { data: appRows } = await supabase
        .from("applications")
        .select("id, app_number, status, created_at, program_id, student_id, agent_id")
        .in("program_id", programIds)
        .order("created_at", { ascending: false });

      const rows = appRows ?? [];

      applications = rows.map((app) => ({
        id: app.id,
        appNumber: app.app_number ?? "—",
        status: app.status ?? "unknown",
        createdAt: app.created_at,
        programId: app.program_id,
        programName: "Program",
        programLevel: "—",
        programDiscipline: null,
        studentId: app.student_id,
        studentName: "Student",
        studentNationality: "Unknown",
        agentId: app.agent_id,
      }));
    }

    /* ---------- METRICS ---------- */

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
      pendingDocuments: 0,
      receivedDocuments: 0,
    };

    return {
      university,
      profileDetails,
      programs,
      applications,
      documentRequests: [],
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
