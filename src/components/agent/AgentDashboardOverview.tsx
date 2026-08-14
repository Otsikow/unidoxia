import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAgentProfileCompletion } from "@/hooks/useAgentProfileCompletion";
import { useAgentInviteCode } from "@/hooks/useAgentInviteCode";
import {
  useAgentOverviewData,
  PIPELINE_STAGES,
  type AgentOverviewApplication,
} from "@/hooks/agent/useAgentOverviewData";
import {
  Users,
  FileText,
  DollarSign,
  UserPlus,
  GraduationCap,
  RefreshCw,
  Copy,
  Check,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Search,
  Send,
  FilePlus2,
  ClipboardList,
  ShieldCheck,
  BookOpen,
  Headphones,
} from "lucide-react";
import { formatDistanceToNowStrict, parseISO, isBefore } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const relativeTime = (value: string | null) => {
  if (!value) return "—";
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
  } catch {
    return "—";
  }
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const intakeLabel = (app: AgentOverviewApplication) =>
  app.intakeYear
    ? `${app.intakeMonth ? `${MONTHS[Math.max(0, Math.min(11, app.intakeMonth - 1))]} ` : ""}${app.intakeYear}`
    : "—";

interface StatCardProps {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
  onClick?: () => void;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

const StatCard = ({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
  onClick,
}: StatCardProps) => (
  <Card
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(event) => {
      if (!onClick) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    }}
    className={cn(
      "rounded-2xl border-border/70 shadow-sm transition-all",
      onClick &&
        "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    )}
  >
    <CardContent className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={cn("rounded-xl p-2.5", toneClasses[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </CardContent>
  </Card>
);

export default function AgentDashboardOverview() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showAllStats, setShowAllStats] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const agentProfileId = profile?.id ?? null;
  const { data, isLoading, isFetching, isError, refetch } = useAgentOverviewData(agentProfileId);
  const {
    completion: agentCompletion,
    checklist: agentChecklist,
    isLoading: completionLoading,
  } = useAgentProfileCompletion();
  const { data: inviteCode } = useAgentInviteCode(agentProfileId);
  const inviteLink = inviteCode
    ? `${window.location.origin}/signup?ref=${inviteCode}`
    : null;

  const apps = data?.applications ?? [];

  const metrics = useMemo(() => {
    const count = (statuses: string[]) => apps.filter((a) => statuses.includes(a.status)).length;
    const now = new Date();
    const overdueTasks = (data?.tasks ?? []).filter(
      (t) => t.dueAt && isBefore(parseISO(t.dueAt), now),
    ).length;
    return {
      active: apps.filter(
        (a) => !["withdrawn", "enrolled", "deferred"].includes(a.status),
      ).length,
      offers: count(["conditional_offer", "unconditional_offer"]),
      conditional: count(["conditional_offer"]),
      unconditional: count(["unconditional_offer"]),
      visa: count(["visa", "cas_loa"]),
      enrolled: count(["enrolled"]),
      closed: count(["withdrawn", "deferred"]),
      outstandingDocs: data?.documentRequests.length ?? 0,
      tasksDue: data?.tasks.length ?? 0,
      overdueTasks,
    };
  }, [apps, data]);

  const pipeline = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        ...stage,
        count: apps.filter((a) => stage.statuses.includes(a.status)).length,
      })),
    [apps],
  );

  const filteredApps = useMemo(() => {
    const term = search.trim().toLowerCase();
    return apps
      .filter((a) => {
        if (stageFilter) {
          const stage = PIPELINE_STAGES.find((s) => s.key === stageFilter);
          if (stage && !stage.statuses.includes(a.status)) return false;
        }
        if (!term) return true;
        return [a.studentName, a.programName, a.universityName, a.studentRef, a.appNumber]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term));
      })
      .slice(0, 8);
  }, [apps, search, stageFilter]);

  const yearlyApplicationTrend = useMemo(() => {
    const year = new Date().getFullYear();
    const monthlyCounts = Array.from({ length: 12 }, () => 0);

    apps.forEach((application) => {
      if (!application.createdAt) return;
      const createdAt = parseISO(application.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt.getFullYear() !== year) return;
      monthlyCounts[createdAt.getMonth()] += 1;
    });

    let cumulative = 0;
    return MONTHS.map((month, index) => {
      cumulative += monthlyCounts[index];
      return { month, applications: monthlyCounts[index], total: cumulative };
    });
  }, [apps]);

  const priorities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      due: string;
      tone: "warning" | "danger" | "default";
      action: () => void;
    }> = [];

    (data?.documentRequests ?? []).slice(0, 4).forEach((doc) => {
      items.push({
        id: `doc-${doc.id}`,
        title: `${doc.documentType.replace(/_/g, " ")} outstanding`,
        subtitle: doc.studentName,
        due: doc.dueDate ? relativeTime(doc.dueDate) : "No deadline set",
        tone: "warning",
        action: () => navigate(`/agent/students/${doc.studentId}`),
      });
    });

    (data?.tasks ?? []).slice(0, 4).forEach((task) => {
      const overdue = task.dueAt ? isBefore(parseISO(task.dueAt), new Date()) : false;
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: overdue ? "Overdue task" : "Task assigned to you",
        due: task.dueAt ? relativeTime(task.dueAt) : "No due date",
        tone: overdue ? "danger" : "default",
        action: () => navigate("/dashboard/tasks"),
      });
    });

    return items.slice(0, 6);
  }, [data, navigate]);

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Invite link copied", description: "Share it with your students." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!agentProfileId) {
    return (
      <Card className="rounded-2xl p-8 text-center">
        <CardContent className="space-y-3">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No agent profile found</h3>
          <p className="text-sm text-muted-foreground">
            Please sign in with an authorised UniDoxia partner account.
          </p>
        </CardContent>
      </Card>
    );
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";
  const verified = agentCompletion.percentage >= 100;

  const primaryStats: StatCardProps[] = [
    {
      title: "Students",
      value: data?.totalStudents ?? 0,
      hint: `${data?.newStudents30d ?? 0} added in the last 30 days`,
      icon: Users,
      onClick: () => navigate("/dashboard/students"),
    },
    {
      title: "Active applications",
      value: metrics.active,
      hint: "In progress across all destinations",
      icon: FileText,
      onClick: () => navigate("/dashboard/applications"),
    },
    {
      title: "Offers received",
      value: metrics.offers,
      hint: `${metrics.conditional} conditional · ${metrics.unconditional} unconditional`,
      icon: CheckCircle2,
      tone: "success",
      onClick: () => navigate("/dashboard/applications"),
    },
    {
      title: "Visa and CAS stage",
      value: metrics.visa,
      hint: "Students preparing to travel",
      icon: ShieldCheck,
      onClick: () => navigate("/dashboard/applications"),
    },
    {
      title: "Outstanding documents",
      value: metrics.outstandingDocs,
      hint: "Awaiting upload or resubmission",
      icon: AlertCircle,
      tone: "warning",
      onClick: () => navigate("/dashboard/students"),
    },
    {
      title: "Commission earned",
      value: currency(data?.commissionPaid ?? 0),
      hint: `${currency(data?.commissionPending ?? 0)} pending payout`,
      icon: DollarSign,
      onClick: () => navigate("/dashboard/commissions"),
    },
  ];

  const secondaryStats: StatCardProps[] = [
    {
      title: "Enrolled students",
      value: metrics.enrolled,
      hint: "Successfully placed",
      icon: GraduationCap,
      tone: "success",
    },
    {
      title: "Tasks due",
      value: metrics.tasksDue,
      hint: `${metrics.overdueTasks} overdue`,
      icon: ClipboardList,
      tone: metrics.overdueTasks ? "danger" : "default",
      onClick: () => navigate("/dashboard/tasks"),
    },
    {
      title: "Closed or withdrawn",
      value: metrics.closed,
      hint: "Archived this cycle",
      icon: Clock,
    },
  ];

  const quickActions = [
    { label: "Add new student", icon: UserPlus, to: "/dashboard/students", primary: true },
    { label: "Create application", icon: FilePlus2, to: "/dashboard/applications/new" },
    { label: "Add new lead", icon: Users, to: "/dashboard/leads" },
    { label: "Search programmes", icon: Search, to: "/courses?view=programs" },
    { label: "Listed universities", icon: Building2, to: "/dashboard/partners" },
    { label: "Send message", icon: Send, to: "/dashboard/messages" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h2>
            <p className="text-sm text-muted-foreground">
              Manage your students, applications and university partnerships from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                verified
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {verified ? "Account approved" : "Verification in progress"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {quickActions.map(({ label, icon: Icon, to, primary }) => (
            <Button
              key={label}
              variant={primary ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-xl"
              onClick={() => navigate(to)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </section>

      {isError && (
        <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive" />
              We could not load your latest dashboard data.
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Performance snapshot
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllStats((prev) => !prev)}
            className="text-xs"
          >
            {showAllStats ? "Show less" : "View all statistics"}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(showAllStats ? [...primaryStats, ...secondaryStats] : primaryStats).map((stat) => (
            <StatCard key={stat.title} {...stat} loading={isLoading} />
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Application pipeline</CardTitle>
            <CardDescription>Select a stage to filter the applications below.</CardDescription>
          </div>
          {stageFilter && (
            <Button variant="ghost" size="sm" onClick={() => setStageFilter(null)}>
              Clear filter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {pipeline.map((stage) => {
              const active = stageFilter === stage.key;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setStageFilter(active ? null : stage.key)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border/70 bg-muted/30 hover:bg-muted/60",
                  )}
                >
                  <p className="text-2xl font-semibold tracking-tight">
                    {isLoading ? "—" : stage.count}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stage.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priorities */}
        <Card className="rounded-2xl border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">Today&apos;s priorities</CardTitle>
            <CardDescription>Documents, deadlines and tasks that need you now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))
            ) : priorities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                <p className="mt-2 text-sm font-medium">You are all caught up</p>
                <p className="text-xs text-muted-foreground">
                  New document requests and tasks will appear here.
                </p>
              </div>
            ) : (
              priorities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium capitalize">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        item.tone === "danger"
                          ? "bg-destructive/10 text-destructive"
                          : item.tone === "warning"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.due}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Onboarding + invite */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">Getting started</CardTitle>
              <CardDescription>Complete your partner setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {completionLoading ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Setup progress</span>
                    <span>{agentCompletion.percentage}%</span>
                  </div>
                  <Progress value={agentCompletion.percentage} className="h-2" />
                  <ul className="space-y-1.5 pt-1">
                    {agentChecklist.slice(0, 5).map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-sm">
                        {item.isComplete ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            item.isComplete && "text-muted-foreground line-through",
                          )}
                        >
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/agent/settings")}
                  >
                    Continue setup
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">Invite students</CardTitle>
              <CardDescription>Share your unique UniDoxia link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {inviteLink ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={inviteLink} className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={handleCopyInvite}
                      aria-label="Copy invite link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {inviteCode && (
                    <p className="text-xs text-muted-foreground">
                      Code: <span className="font-mono font-semibold">{inviteCode}</span>
                    </p>
                  )}
                </>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Business insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Business insights</CardTitle>
              <CardDescription>
                Applications started in {new Date().getFullYear()}, with the cumulative trend.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 rounded-full">
              {apps.filter((app) => app.createdAt?.startsWith(String(new Date().getFullYear()))).length} this year
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full" aria-label="Applications started by month">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyApplicationTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "total" ? "Cumulative applications" : "New applications",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-5 rounded bg-primary" /> Cumulative applications
              </span>
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-muted-foreground" /> New each month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Support and resources</CardTitle>
            <CardDescription>Guidance when you need it, without leaving your workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard/resources")}
              className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Partner resources</span>
                <span className="block truncate text-xs text-muted-foreground">Training, documents and recruitment tools</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/help")}
              className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Headphones className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">UniDoxia support</span>
                <span className="block truncate text-xs text-muted-foreground">Answers, tickets and direct assistance</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Keep student records and application updates inside UniDoxia so your team has one reliable audit trail.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications table */}
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent applications</CardTitle>
            <CardDescription>
              {stageFilter
                ? `Filtered by ${PIPELINE_STAGES.find((s) => s.key === stageFilter)?.label}`
                : "Latest activity across your students"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applications"
                aria-label="Search applications"
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/applications")}
            >
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground opacity-60" />
              <p className="mt-3 text-sm font-medium">No applications to show</p>
              <p className="text-xs text-muted-foreground">
                Add a student and submit their first application to get started.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => navigate("/dashboard/students")}>
                  Add a student
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/courses?view=programs")}
                >
                  Search programmes
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Destination</TableHead>
                    <TableHead className="hidden lg:table-cell">University</TableHead>
                    <TableHead className="hidden lg:table-cell">Programme</TableHead>
                    <TableHead className="hidden sm:table-cell">Intake</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="hidden sm:table-cell">Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{app.studentName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {app.studentRef ?? app.appNumber ?? "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {app.country ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[180px] truncate text-muted-foreground">
                        {app.universityName}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                        {app.programName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {intakeLabel(app)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {relativeTime(app.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => navigate(`/student/applications/${app.id}`)}
                        >
                          Open
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
