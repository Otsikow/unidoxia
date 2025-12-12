import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  UserPlus,
  GraduationCap,
  RefreshCw,
  Search,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Building2,
} from "lucide-react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { getErrorMessage, logError } from "@/lib/errorUtils";

interface AgentApplicationStats {
  totalStudents: number;
  activeApplications: number;
  totalEarnings: number;
  pendingEarnings: number;
  recentApplications: RecentApplication[];
}

interface RecentApplication {
  id: string;
  status: string;
  createdAt: string;
  studentName: string;
  programName: string;
  universityName: string;
  appNumber: string | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const fetchAgentStats = async (
  agentProfileId: string,
): Promise<AgentApplicationStats> => {
  // Get the agent ID from profile
  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("id")
    .eq("profile_id", agentProfileId)
    .maybeSingle();

  if (agentError) throw agentError;

  const agentId = agentData?.id;

  // Count students assigned to the agent
  let totalStudents = 0;
  if (agentId) {
    const { count: studentsCount, error: studentsError } = await supabase
      .from("agent_student_links")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);

    if (!studentsError) {
      totalStudents = studentsCount ?? 0;
    }
  }

  // Get applications submitted by this agent
  let activeApplications = 0;
  let recentApplications: RecentApplication[] = [];

  if (agentId) {
    // Count active applications
    const { count: appCount, error: appCountError } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .not("status", "in", '("withdrawn","rejected","enrolled")');

    if (!appCountError) {
      activeApplications = appCount ?? 0;
    }

    // Get recent applications with student and program info
    const { data: appsData, error: appsError } = await supabase
      .from("applications")
      .select(
        `
        id,
        status,
        created_at,
        app_number,
        student:students (
          id,
          legal_name,
          preferred_name,
          profile:profiles!students_profile_id_fkey (
            full_name
          )
        ),
        program:programs (
          name,
          university:universities (
            name
          )
        )
      `
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!appsError && appsData) {
      recentApplications = appsData.map((app: any) => ({
        id: app.id,
        status: app.status,
        createdAt: app.created_at,
        appNumber: app.app_number,
        studentName:
          app.student?.preferred_name ||
          app.student?.legal_name ||
          app.student?.profile?.full_name ||
          "Unknown Student",
        programName: app.program?.name || "Unknown Program",
        universityName: app.program?.university?.name || "Unknown University",
      }));
    }
  }

  // Get commissions
  let totalEarnings = 0;
  let pendingEarnings = 0;

  if (agentId) {
    const { data: commissions, error: commError } = await supabase
      .from("commissions")
      .select("amount, status")
      .eq("agent_id", agentId);

    if (!commError && commissions) {
      commissions.forEach((comm: any) => {
        const amount = comm.amount ?? 0;
        if (comm.status === "paid") {
          totalEarnings += amount;
        } else if (comm.status === "approved" || comm.status === "pending") {
          pendingEarnings += amount;
        }
      });
    }
  }

  return {
    totalStudents,
    activeApplications,
    totalEarnings,
    pendingEarnings,
    recentApplications,
  };
};

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
  variant = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  loading?: boolean;
  variant?: "default" | "success" | "warning";
}) => {
  const valueColorClass =
    variant === "success"
      ? "text-success"
      : variant === "warning"
      ? "text-warning"
      : "text-foreground";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${valueColorClass}`}>{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

export default function AgentDashboardOverview() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const agentProfileId = profile?.id ?? null;
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["agent-dashboard-stats", agentProfileId],
    queryFn: () => fetchAgentStats(agentProfileId!),
    enabled: Boolean(agentProfileId),
    staleTime: 60_000,
  });

  // Fetch or create referral code
  useEffect(() => {
    if (!agentProfileId) return;

    const fetchReferralCode = async () => {
      try {
        const { data: agentData } = await supabase
          .from("agents")
          .select("id, tenant_id")
          .eq("profile_id", agentProfileId)
          .maybeSingle();

        if (!agentData?.id) return;

        // Check for existing referral
        const { data: refData } = await supabase
          .from("referrals")
          .select("code")
          .eq("agent_id", agentData.id)
          .eq("active", true)
          .maybeSingle();

        if (refData?.code) {
          setReferralCode(refData.code);
          return;
        }

        // Create new referral code
        const newCode = `AG-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`;
        const { error: insertError } = await supabase.from("referrals").insert({
          code: newCode,
          agent_id: agentData.id,
          tenant_id: agentData.tenant_id,
          active: true,
        });

        if (!insertError) {
          setReferralCode(newCode);
        }
      } catch (err) {
        logError(err, "AgentDashboardOverview.fetchReferralCode");
      }
    };

    void fetchReferralCode();
  }, [agentProfileId]);

  const handleCopyReferralLink = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return formatDistanceToNowStrict(parseISO(dateStr), { addSuffix: true });
    } catch {
      return "—";
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!agentProfileId) {
    return (
      <Card className="p-8 text-center">
        <CardContent className="space-y-4">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Agent Profile Found</h3>
          <p className="text-muted-foreground">
            Please ensure you are signed in with an agent account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          description="In your organization"
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Active Applications"
          value={stats?.activeApplications ?? 0}
          description="Currently in progress"
          icon={FileText}
          loading={isLoading}
        />
        <StatCard
          title="Total Earnings"
          value={formatCurrency(stats?.totalEarnings ?? 0)}
          description="Commissions paid"
          icon={DollarSign}
          loading={isLoading}
          variant="success"
        />
        <StatCard
          title="Pending Earnings"
          value={formatCurrency(stats?.pendingEarnings ?? 0)}
          description="Awaiting payout"
          icon={TrendingUp}
          loading={isLoading}
          variant="warning"
        />
      </div>

      {/* Quick Actions & Referral Link */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/dashboard/students")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Manage Students
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/universities")}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              Browse Universities
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/courses?view=programs")}
              className="gap-2"
            >
              <GraduationCap className="h-4 w-4" />
              Browse Courses
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/applications")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              View Applications
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/commissions")}
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Commission Report
            </Button>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Your Referral Link</CardTitle>
            <CardDescription>
              Share this link with students to connect them to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {referralCode ? (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/signup?ref=${referralCode}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyReferralLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your referral code: <span className="font-mono font-semibold">{referralCode}</span>
                </p>
              </>
            ) : (
              <Skeleton className="h-10 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
            <CardDescription>
              Latest applications submitted by your organization
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                </div>
              ))}
            </div>
          ) : !stats?.recentApplications?.length ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No applications yet. Start by browsing universities and programs, then submit applications on behalf of your students.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => navigate("/universities")}
                  className="gap-2"
                  variant="outline"
                >
                  <Building2 className="h-4 w-4" />
                  Browse Universities
                </Button>
                <Button
                  onClick={() => navigate("/courses?view=programs")}
                  className="gap-2"
                  variant="outline"
                >
                  <GraduationCap className="h-4 w-4" />
                  Browse Courses
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.studentName}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={app.programName}>
                        {app.programName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.universityName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(app.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/student/applications/${app.id}`)}
                          className="gap-1.5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {stats?.recentApplications?.length ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/applications")}
                className="gap-2"
              >
                View All Applications
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Need help getting started?</p>
            <p className="text-sm text-muted-foreground">
              Check out our resources or contact support for assistance.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard/resources")}>
              View Resources
            </Button>
            <Button variant="ghost" asChild>
              <a href="mailto:support@unidoxia.com">Contact Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
