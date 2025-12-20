import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase,
  FileClock,
  GraduationCap,
  Percent,
  Building2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState, Skeleton } from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { getErrorMessage, logError } from "@/lib/errorUtils";
import type { Database } from "@/integrations/supabase/types";
import {
  withUniversityCardStyles,
  withUniversitySurfaceSubtle,
  withUniversitySurfaceTint,
} from "@/components/university/common/cardStyles";

type DocumentsRow = {
  id: string;
  tenant_id?: string | null;
  status?: string | null;
};

type ApplicationDocumentsRow = {
  id: string;
  verified?: boolean | null;
  applications?: {
    tenant_id?: string | null;
  } | null;
};

type OfferRow = {
  id: string;
  applications?: {
    tenant_id?: string | null;
  } | null;
};

type DocumentRequestRow = {
  id: string;
  tenant_id?: string | null;
  status?: string | null;
};

const DOCUMENTS_TABLE = "documents";
const APPLICATION_DOCUMENTS_TABLE = "application_documents";
const OFFERS_TABLE = "offers";
const DOCUMENT_REQUESTS_TABLE = "document_requests";

const ACTIVE_APPLICATION_STATUSES = [
  "submitted",
  "screening",
  "conditional_offer",
  "unconditional_offer",
  "cas_loa",
  "visa",
  "enrolled",
] as const;

type ActiveStatus = (typeof ACTIVE_APPLICATION_STATUSES)[number];

type RecentApplicationRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  students?: {
    legal_name?: string | null;
    profile?: {
      full_name?: string | null;
    } | null;
  } | null;
  programs?: {
    name?: string | null;
  } | null;
  agents?: {
    company_name?: string | null;
    profile?: {
      full_name?: string | null;
    } | null;
  } | null;
};

type UniversityInfoRow = {
  id: string;
  name?: string | null;
  logo_url?: string | null;
  ranking?: Record<string, unknown> | null;
  description?: string | null;
};

interface OverviewData {
  summary: {
    totalApplications: number;
    activeApplications: number;
    offersIssued: number;
    pendingDocuments: number;
    conversionRate: number;
  };
  recentApplications: RecentApplicationRow[];
  university: UniversityInfoRow | null;
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getStatusLabel = (status: string | null | undefined) => status ?? "pending";

const isMissingTableError = (error: PostgrestError | null) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.message?.toLowerCase().includes("does not exist") ||
        error.message?.toLowerCase().includes("document")),
  );

const fetchPendingDocumentsCount = async (tenantId: string) => {
  const { count, error } = await (supabase as any)
    .from(DOCUMENTS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (!error) {
    return count ?? 0;
  }

  if (!isMissingTableError(error)) {
    throw error;
  }

  const { count: applicationDocumentsCount, error: applicationDocumentsError } = await (supabase as any)
    .from(APPLICATION_DOCUMENTS_TABLE)
    .select("id, verified, applications!inner(tenant_id)", { count: "exact", head: true })
    .eq("applications.tenant_id", tenantId)
    .eq("verified", false);

  if (!applicationDocumentsError) {
    return applicationDocumentsCount ?? 0;
  }

  if (!isMissingTableError(applicationDocumentsError)) {
    throw applicationDocumentsError;
  }

  const { count: documentRequestsCount, error: documentRequestsError } = await (supabase as any)
    .from(DOCUMENT_REQUESTS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (documentRequestsError && !isMissingTableError(documentRequestsError)) {
    throw documentRequestsError;
  }

  return documentRequestsCount ?? 0;
};

const fetchOverviewData = async (tenantId: string): Promise<OverviewData> => {
  const [
    totalApplicationsResponse,
    activeApplicationsResponse,
    offersResponse,
    recentApplicationsResponse,
    universityResponse,
    pendingDocumentsCount,
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", [...ACTIVE_APPLICATION_STATUSES] as ActiveStatus[]),
    (supabase as any)
      .from(OFFERS_TABLE)
      .select("id, applications!inner(tenant_id)", { count: "exact", head: true })
      .eq("applications.tenant_id", tenantId),
    supabase
      .from("applications")
      .select(
        `
        id,
        status,
        created_at,
        students:students(
          legal_name,
          profile:profiles(
            full_name
          )
        ),
        programs:programs(
          name
        ),
        agents:agents(
          company_name,
          profile:profiles(
            full_name
          )
        )
      `,
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
      supabase
        .from("universities")
        .select("id, name, logo_url, ranking, description")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .maybeSingle(),
    fetchPendingDocumentsCount(tenantId),
  ]);

  if (totalApplicationsResponse.error) throw totalApplicationsResponse.error;
  if (activeApplicationsResponse.error) throw activeApplicationsResponse.error;
  if (offersResponse.error) throw offersResponse.error;
  if (recentApplicationsResponse.error) throw recentApplicationsResponse.error;
  if (universityResponse.error) throw universityResponse.error;

  const totalApplications = totalApplicationsResponse.count ?? 0;
  const offersIssued = offersResponse.count ?? 0;
  const conversionRate = totalApplications === 0 ? 0 : offersIssued / totalApplications;

  return {
    summary: {
      totalApplications,
      activeApplications: activeApplicationsResponse.count ?? 0,
      offersIssued,
      pendingDocuments: pendingDocumentsCount,
      conversionRate,
    },
    recentApplications: recentApplicationsResponse.data ?? [],
    university: (universityResponse.data ?? null) as UniversityInfoRow | null,
  };
};

const SummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  loading?: boolean;
}) => (
  <Card className={withUniversityCardStyles()}>
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
        ) : null}
      </div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="mt-1" lines={1} />
      ) : (
        <p className="text-3xl font-semibold tracking-tight text-card-foreground">{value}</p>
      )}
    </CardContent>
  </Card>
);

const RecentApplicationsTable = ({
  applications,
  loading,
}: {
  applications: RecentApplicationRow[];
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={withUniversitySurfaceTint(
              "grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-5 md:items-center",
            )}
          >
            <Skeleton lines={1} className="h-5" />
            <Skeleton lines={1} className="h-5" />
            <Skeleton lines={1} className="h-5" />
            <Skeleton lines={1} className="h-5" />
            <Skeleton lines={1} className="h-5" />
          </div>
        ))}
      </div>
    );
  }

  /* 
   * EMPTY STATE: New universities start with zero applications.
   * This ensures a clean slate - no pre-existing applications from other institutions.
   */
  if (applications.length === 0) {
    return (
      <div
        className={withUniversitySurfaceSubtle(
          "flex flex-col items-center justify-center space-y-3 rounded-lg border-dashed p-8 text-center",
        )}
      >
        <p className="text-sm font-medium text-foreground">No applications yet</p>
        <p className="text-sm text-muted-foreground">
          Your application inbox is empty. Once you add courses and students start applying, 
          their applications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/40">
            <TableHead className="text-muted-foreground">Student</TableHead>
            <TableHead className="text-muted-foreground">Course</TableHead>
            <TableHead className="text-muted-foreground">Agent</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-right text-muted-foreground">Date Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => {
            const studentName =
              application.students?.legal_name ||
              application.students?.profile?.full_name ||
              "Unknown student";
            const courseName = application.programs?.name || "—";
            const agentName =
              application.agents?.profile?.full_name ||
              application.agents?.company_name ||
              "—";

            return (
              <TableRow
                key={application.id}
                className="border-b border-border bg-muted/30 hover:bg-muted/40"
              >
                <TableCell className="text-card-foreground">{studentName}</TableCell>
                <TableCell className="text-muted-foreground">{courseName}</TableCell>
                <TableCell className="text-muted-foreground">{agentName}</TableCell>
                <TableCell>
                  <StatusBadge status={getStatusLabel(application.status)} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDate(application.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const UniversityInfoPanel = ({
  university,
  loading,
}: {
  university: UniversityInfoRow | null;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <Card className={withUniversityCardStyles()}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-card-foreground">
            University Information
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Latest institution details synced from your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-lg" lines={1} />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5" lines={1} />
              <Skeleton className="h-4" lines={1} />
            </div>
          </div>
          <Skeleton className="h-4" lines={1} />
          <Skeleton className="h-4" lines={1} />
        </CardContent>
      </Card>
    );
  }

  /* 
   * EMPTY STATE: Shows when university profile hasn't been completed yet.
   * New universities start with a blank profile - they need to add their details.
   */
  if (!university) {
    return (
      <Card className={withUniversitySurfaceSubtle("text-center shadow-none rounded-3xl border-dashed")}>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <CardTitle className="text-base font-semibold text-foreground">
            Set Up Your University Profile
          </CardTitle>
          <CardDescription className="max-w-sm text-sm text-muted-foreground">
            You&apos;re starting fresh! Add your institution&apos;s details, logo, and description 
            to unlock tailored insights and attract students worldwide.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const ranking = university.ranking;
  const rankingRecord = isRecord(ranking) ? ranking : null;
  const accreditationFromRanking =
    rankingRecord
      ? (rankingRecord.accreditation_summary as string | undefined) ??
        (rankingRecord.accreditation as string | undefined)
      : undefined;
  const accreditationDetails =
    accreditationFromRanking ??
    (typeof university.description === "string" && university.description.trim()
      ? university.description
      : undefined) ??
    "Accreditation information not available.";

  return (
    <Card className={withUniversityCardStyles()}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={withUniversitySurfaceTint("flex h-16 w-16 items-center justify-center rounded-lg bg-muted/60")}>
            {university.logo_url ? (
              <img
                src={university.logo_url}
                alt={university.name ?? "University logo"}
                className="h-full w-full rounded-lg object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground">
              {university.name ?? "Unnamed University"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Partnership profile and accreditation summary.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Accreditation</p>
          <p className="text-sm text-foreground">{accreditationDetails}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const UniversityOverviewPage = () => {
  const { profile, loading: authLoading, profileLoading } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["university-dashboard-overview", tenantId],
    queryFn: () => fetchOverviewData(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60 * 2, // 2 minutes - match dashboard layout for consistency
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const errorMessage = isError ? getErrorMessage(error) : null;

  // Include profileLoading to prevent "University profile incomplete" flash during auth
  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="Loading your university overview..." size="lg" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <Alert variant="destructive" className="border border-red-500/40 bg-red-500/5 text-red-100">
        <AlertTitle>University profile incomplete</AlertTitle>
        <AlertDescription>
          We couldn&apos;t determine your tenant. Please contact support to complete your university
          setup.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-10 text-card-foreground">
      <header className={withUniversityCardStyles("space-y-3 rounded-3xl p-8 shadow-[0_28px_72px_-36px_rgba(30,64,175,0.55)]")}
      >
        <p className="text-sm text-primary">Welcome back</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">University Dashboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monitor student applications, documents, and offer progress in real time.
        </p>
      </header>

      {isError ? (
        <Alert variant="destructive" className="border border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Unable to load overview</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{errorMessage ?? "Something went wrong while fetching your dashboard data."}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logError(error, "UniversityOverviewPage.fetchOverviewData");
                refetch();
              }}
              disabled={isFetching}
              className="gap-2"
            >
              {isFetching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Applications"
          description="Currently progressing"
          value={numberFormatter.format(data?.summary.activeApplications ?? 0)}
          icon={Briefcase}
          loading={isLoading && !data}
        />
        <SummaryCard
          title="Offers Issued"
          description="Conditional & unconditional"
          value={numberFormatter.format(data?.summary.offersIssued ?? 0)}
          icon={GraduationCap}
          loading={isLoading && !data}
        />
        <SummaryCard
          title="Pending Document Requests"
          description="Awaiting submission"
          value={numberFormatter.format(data?.summary.pendingDocuments ?? 0)}
          icon={FileClock}
          loading={isLoading && !data}
        />
        <SummaryCard
          title="Conversion Rate (%)"
          description="Offers vs. applications"
          value={
            data
              ? percentageFormatter.format(data.summary.conversionRate)
              : percentageFormatter.format(0)
          }
          icon={Percent}
          loading={isLoading && !data}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className={withUniversityCardStyles("hover:border-primary/30 hover:shadow-[0_32px_72px_-30px_rgba(37,99,235,0.55)]")}>
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-card-foreground">Recent Applications</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                The five most recent submissions in your tenant.
              </CardDescription>
            </div>
            <Button asChild variant="secondary" size="sm" className="gap-2 self-start">
              <Link to="/dashboard/applications">View All Applications</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentApplicationsTable
              applications={data?.recentApplications ?? []}
              loading={isLoading && !data}
            />
          </CardContent>
        </Card>

        <UniversityInfoPanel university={data?.university ?? null} loading={isLoading && !data} />
      </section>

      <footer
        className={withUniversitySurfaceTint(
          "rounded-3xl p-6 shadow-inner shadow-[inset_0_12px_24px_-18px_rgba(37,99,235,0.35)]",
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Need assistance?</p>
            <p>
              Reach the UniDoxia team at{" "}
              <a
                href="mailto:info@unidoxia.com"
                className="text-primary hover:text-primary-foreground hover:underline"
              >
                info@unidoxia.com
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-primary">
            <Link to="/courses?view=programs" className="hover:text-primary-foreground hover:underline">
              Search Universities
            </Link>
            <Link to="/blog" className="hover:text-primary-foreground hover:underline">
              Blog
            </Link>
            <Link to="/visa-calculator" className="hover:text-primary-foreground hover:underline">
              Visa Calculator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UniversityOverviewPage;
