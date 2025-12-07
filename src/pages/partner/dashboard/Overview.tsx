import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Gift,
  FileClock,
  Percent,
  RefreshCw,
  ArrowRight,
  University,
  MapPin,
  Mail,
  Globe,
  ClipboardList,
} from "lucide-react";
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
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingState, Skeleton } from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { getErrorMessage, logError } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  parseUniversityProfileDetails,
  emptyUniversityProfileDetails,
  type UniversityProfileDetails,
} from "@/lib/universityProfile";

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

const DOCUMENTS_TABLE = "documents";
const APPLICATION_DOCUMENTS_TABLE = "application_documents";
const OFFERS_TABLE = "offers";

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
    universities?: {
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
};

type UniversityOverviewRow = {
  id: string;
  name: string | null;
  country: string | null;
  city: string | null;
  created_at: string | null;
  logo_url?: string | null;
  website?: string | null;
  submission_config_json?: unknown;
  profileDetails?: UniversityProfileDetails;
};

interface OverviewData {
  summary: {
    totalApplications: number;
    activeApplications: number;
    offersReceived: number;
    pendingDocuments: number;
    conversionRate: number;
  };
  recentApplications: RecentApplicationRow[];
  universities: {
    list: UniversityOverviewRow[];
    total: number;
  };
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

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

const getGreeting = (fullName?: string | null) => {
  const hours = new Date().getHours();
  const salutation =
    hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";
  if (!fullName) return `${salutation}, Partner`;
  const firstName = fullName.split(" ")[0] ?? fullName;
  return `${salutation}, ${firstName}`;
};

const isMissingTableError = (error: PostgrestError | null) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.message?.toLowerCase().includes("does not exist") ||
        error.message?.toLowerCase().includes("documents")),
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
    .from("document_requests")
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
    universitiesResponse,
    universitiesCountResponse,
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
      .in("status", [...ACTIVE_APPLICATION_STATUSES]),
    supabase
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
          name,
          universities:universities(
            name,
            country
          )
        )
      `,
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("universities")
      .select("id, name, country, city, created_at, logo_url, website, submission_config_json")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("universities")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    fetchPendingDocumentsCount(tenantId),
  ]);

  if (totalApplicationsResponse.error) throw totalApplicationsResponse.error;
  if (activeApplicationsResponse.error) throw activeApplicationsResponse.error;
  if (offersResponse.error) throw offersResponse.error;
  if (recentApplicationsResponse.error) throw recentApplicationsResponse.error;
  if (universitiesResponse.error) throw universitiesResponse.error;
  if (universitiesCountResponse.error) throw universitiesCountResponse.error;

  const totalApplications = totalApplicationsResponse.count ?? 0;
  const offersReceived = offersResponse.count ?? 0;
  const conversionRate = totalApplications === 0 ? 0 : offersReceived / totalApplications;

  const universityRows: UniversityOverviewRow[] = (universitiesResponse.data ?? []).map((university) => ({
    id: university.id,
    name: university.name,
    country: university.country,
    city: university.city,
    created_at: university.created_at,
    logo_url: university.logo_url,
    website: university.website,
    submission_config_json: university.submission_config_json,
    profileDetails: parseUniversityProfileDetails(university.submission_config_json ?? null),
  }));

  return {
    summary: {
      totalApplications,
      activeApplications: activeApplicationsResponse.count ?? 0,
      offersReceived,
      pendingDocuments: pendingDocumentsCount,
      conversionRate,
    },
    recentApplications: recentApplicationsResponse.data ?? [],
    universities: {
      list: universityRows,
      total: universitiesCountResponse.count ?? universityRows.length,
    },
  };
};

const SummaryCard = ({
  title,
  description,
  value,
  icon: Icon,
  loading = false,
}: {
  title: string;
  description?: string;
  value: string;
  icon: typeof Briefcase;
  loading?: boolean;
}) => (
  <Card className="border border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40 transition hover:border-slate-300 hover:shadow-slate-300/50 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-950/20 dark:hover:border-slate-700 dark:hover:shadow-slate-900/30">
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs text-slate-500">{description}</CardDescription>
        ) : null}
      </div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="mt-1" lines={1} />
      ) : (
        <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
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
          <div key={index} className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-5 md:items-center">
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

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No recent applications</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          When new applications are submitted, you will see them appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/60 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/40">
            <TableHead className="text-slate-600 dark:text-slate-300">Student</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">University</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">Course</TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">Status</TableHead>
            <TableHead className="text-right text-slate-600 dark:text-slate-300">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => {
            const studentName =
              application.students?.legal_name ||
              application.students?.profile?.full_name ||
              "Unknown student";
            const universityName =
              application.programs?.universities?.name || "—";
            const courseName = application.programs?.name || "—";
            const status = application.status ?? "pending";

            return (
              <TableRow
                key={application.id}
                className="border-b border-slate-200/60 bg-white/40 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/20 dark:hover:bg-slate-900/40"
              >
                <TableCell className="text-slate-900 dark:text-slate-100">{studentName}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">{universityName}</TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">{courseName}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-right text-slate-500 dark:text-slate-400">
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

const UniversityOverviewCard = ({
  total,
  universities,
  loading,
  onRetry,
  refreshing,
}: {
  total: number;
  universities: UniversityOverviewRow[];
  loading: boolean;
  onRetry: () => void;
  refreshing: boolean;
}) => (
  <Card className="border border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40 transition hover:border-slate-300 hover:shadow-slate-300/50 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-950/20 dark:hover:border-slate-700 dark:hover:shadow-slate-900/30">
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
      <div>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">University Overview</CardTitle>
        <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
          Snapshot of the institutions you collaborate with.
        </CardDescription>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        onClick={onRetry}
        disabled={refreshing}
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </Button>
    </CardHeader>
    <CardContent className="space-y-6">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="rounded-full bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300">
                <University className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Skeleton lines={1} className="h-5" />
                <Skeleton lines={1} className="mt-2 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No University Found.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add universities to your partnership list to unlock tailored analytics and insights.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry} disabled={refreshing} className="gap-2">
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-500/10 dark:bg-blue-500/5">
            <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">Active partnerships</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{numberFormatter.format(total)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You currently collaborate with {total === 1 ? "one university" : `${numberFormatter.format(total)} universities`}.
            </p>
          </div>
          <div className="space-y-4">
            {universities.map((university) => {
              const profileDetails = university.profileDetails ?? emptyUniversityProfileDetails;
              const primaryContact = profileDetails.contacts?.primary ?? null;

              const initials = (university.name || "").split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join("") || "U";

              return (
                <div
                  key={university.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      <Avatar className="h-12 w-12 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60">
                        {university.logo_url ? (
                          <AvatarImage src={university.logo_url} alt={university.name ?? "University logo"} />
                        ) : null}
                        <AvatarFallback className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                              {university.name ?? "Unnamed university"}
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Added {formatDate(university.created_at)}
                          </p>
                        </div>
                        {profileDetails.tagline ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300">{profileDetails.tagline}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[university.city, university.country].filter(Boolean).join(", ") || "Location unavailable"}
                          </span>
                          {primaryContact?.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {primaryContact.email}
                            </span>
                          ) : null}
                          {university.website ? (
                            <span className="inline-flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {university.website.replace(/^https?:\/\//, "")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  {profileDetails.highlights.length > 0 ? (
                    <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                      {profileDetails.highlights.slice(0, 2).map((highlight, index) => (
                        <div
                          key={`${university.id}-highlight-${index}`}
                          className="rounded-md border border-slate-200/80 bg-white/50 p-3 dark:border-slate-800/80 dark:bg-slate-950/50"
                        >
                          {highlight}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm" className="gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100">
              <Link to="/courses?view=programs">
                <University className="h-4 w-4" />
                Search Universities
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100">
              <Link to="/universities">
                <ArrowRight className="h-4 w-4" />
                View Directory
              </Link>
            </Button>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

const PartnerOverviewPage = () => {
  const { profile, loading: authLoading } = useAuth();

  const tenantId = profile?.tenant_id ?? null;

  const greeting = useMemo(() => getGreeting(profile?.full_name), [profile?.full_name]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["partner-dashboard-overview", tenantId],
    queryFn: () => fetchOverviewData(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60 * 2, // 2 minutes - match dashboard layout for consistency
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const errorMessage = isError ? getErrorMessage(error) : null;

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="Loading your partner overview..." size="lg" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <Alert variant="destructive" className="border border-red-500/40 bg-red-500/5 text-red-100">
        <AlertTitle>Partner profile incomplete</AlertTitle>
        <AlertDescription>
          We were unable to determine your tenant. Please contact support to complete your partner setup.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-10 text-slate-900 dark:text-slate-100">
      <header className="space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-8 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-slate-950/30">
        <p className="text-sm text-blue-600 dark:text-blue-300">{greeting}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Partner Dashboard</h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Monitor applications, documents, and conversion rates in real time.
        </p>
      </header>

      {isError && (
        <Alert variant="destructive" className="border border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
          <AlertTitle>Unable to load overview</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{errorMessage ?? "Something went wrong while fetching your dashboard data."}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logError(error, "PartnerOverviewPage.fetchOverviewData");
                refetch();
              }}
              disabled={isFetching}
              className="gap-2"
            >
              {isFetching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Applications"
          description="Received via UniDoxia"
          value={numberFormatter.format(data?.summary.totalApplications ?? 0)}
          icon={ClipboardList}
          loading={isLoading && !data}
        />
        <SummaryCard
          title="Active Applications"
          description="Currently in progress"
          value={numberFormatter.format(data?.summary.activeApplications ?? 0)}
          icon={Briefcase}
          loading={isLoading && !data}
        />
        <SummaryCard
          title="Offers Received"
          description="Conditional & unconditional"
          value={numberFormatter.format(data?.summary.offersReceived ?? 0)}
          icon={Gift}
          loading={isLoading && !data}
        />
        <SummaryCard
          title="Pending Documents"
          description="Awaiting partner action"
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
        <Card className="border border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40 transition hover:border-slate-300 hover:shadow-slate-300/50 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-950/20 dark:hover:border-slate-700 dark:hover:shadow-slate-900/30">
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Applications</CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                The five most recent submissions in your tenant.
              </CardDescription>
            </div>
            <Button asChild variant="secondary" size="sm" className="gap-2 self-start">
              <Link to="/dashboard/applications">
                View All Applications
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentApplicationsTable applications={data?.recentApplications ?? []} loading={isLoading && !data} />
          </CardContent>
        </Card>

        <UniversityOverviewCard
          total={data?.universities.total ?? 0}
          universities={data?.universities.list ?? []}
          loading={isLoading && !data}
          onRetry={refetch}
          refreshing={isFetching}
        />
      </section>

      <footer className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 shadow-inner shadow-slate-100/40 dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-slate-950/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-200">Need assistance?</p>
            <p>
              Reach the UniDoxia team at{" "}
              <a
                href="mailto:info@unidoxia.com"
                className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-300 dark:hover:text-blue-100"
              >
                info@unidoxia.com
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-blue-600 dark:text-blue-300">
            <Link to="/courses?view=programs" className="hover:text-blue-700 hover:underline dark:hover:text-blue-100">
              Search Universities
            </Link>
            <Link to="/blog" className="hover:text-blue-700 hover:underline dark:hover:text-blue-100">
              Blog
            </Link>
            <Link to="/visa-calculator" className="hover:text-blue-700 hover:underline dark:hover:text-blue-100">
              Visa Calculator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PartnerOverviewPage;
