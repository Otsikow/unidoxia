import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  Clock3,
  FileCheck2,
  FileText,
  GraduationCap,
  Handshake,
  ListTodo,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminHome } from "@/hooks/admin/useAdminHome";
import { overviewNextAction } from "@/lib/adminOverview";
import { formatWorkflowDate, londonDate } from "@/lib/applicationWorkflow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChooseApplicationStudent } from "@/components/applications/ChooseApplicationStudent";
import AdminReportExportButton from "@/components/admin/AdminReportExportButton";

function PanelState({
  loading,
  failed,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  failed: boolean;
  empty?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (loading)
    return (
      <div
        className="space-y-3 py-4"
        role="status"
        aria-label="Loading overview"
      >
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  if (failed)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm"
      >
        <p>This section could not be loaded.</p>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    );
  if (empty)
    return (
      <div className="flex gap-3 rounded-xl border border-dashed bg-muted/20 p-5">
        <CheckCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-relaxed text-muted-foreground">{empty}</p>
      </div>
    );
  return <>{children}</>;
}

export default function AdminOverview() {
  const { user, profile } = useAuth();
  const { students, applications, tasks, taskScopeAvailable } = useAdminHome();
  const [choosingStudent, setChoosingStudent] = useState(false);
  const refreshing =
    students.isFetching || applications.isFetching || tasks.isFetching;
  const refresh = () => {
    void Promise.allSettled([
      students.refetch(),
      applications.refetch(),
      ...(taskScopeAvailable ? [tasks.refetch()] : []),
    ]);
  };
  const tasksUnavailable = !taskScopeAvailable || tasks.isError;
  const today = londonDate();
  const formatCount = (value: number | undefined) =>
    value === undefined ? "—" : new Intl.NumberFormat("en-GB").format(value);
  const cards = [
    {
      label: "Students",
      value: students.data?.students,
      failed: students.isError,
      loading: students.isPending,
      detail: "Current student records",
      to: "/admin/students",
      action: "Open students",
      icon: Users,
      colour: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active applications",
      value: applications.data?.active,
      failed: applications.isError,
      loading: applications.isPending,
      detail: "Including drafts and deferrals",
      to: "/admin/applications?stage=active",
      action: "Open applications",
      icon: FileText,
      colour: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Files to review",
      value: students.data?.documentsToReview,
      failed: students.isError,
      loading: students.isPending,
      detail: "Student documents awaiting review",
      to: "/admin/students?view=review",
      action: "Review documents",
      icon: FileCheck2,
      colour: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    {
      label: "Overdue tasks",
      value: tasks.data?.overdue,
      failed: tasksUnavailable,
      loading: taskScopeAvailable && tasks.isPending,
      detail: "Team tasks due before today",
      to: "/admin/tasks",
      action: "Open team tasks",
      icon: Clock3,
      colour: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  ];
  const shortcuts = [
    {
      title: "Website leads",
      detail: "Follow up on enquiries",
      to: "/admin/leads",
      icon: Handshake,
    },
    {
      title: "Agent review",
      detail: "Review agency registrations",
      to: "/admin/agents",
      icon: Users,
    },
    {
      title: "Courses & intakes",
      detail: "Manage study options",
      to: "/admin/programs",
      icon: BookOpen,
    },
    {
      title: "Reports & finances",
      detail: "Open reporting tools",
      to: "/admin/reports",
      icon: ArrowDownToLine,
    },
  ];
  return (
    <div className="space-y-6 pb-4 sm:space-y-7">
      <section className="relative isolate overflow-hidden rounded-2xl border border-blue-900/20 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-5 text-white shadow-sm sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.04]"
        />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              YOUR ADMISSIONS WORKSPACE
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Admissions overview
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100/85">
              A clear view of your students, applications and the work that
              needs attention.
            </p>
            <p className="mt-4 text-xs text-blue-200/75">
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: "Europe/London",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-col xl:flex-row">
            <Button
              className="bg-white text-slate-950 shadow-sm hover:bg-blue-50"
              onClick={() => setChoosingStudent(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New application
            </Button>
            <Button
              aria-label="Refresh overview"
              variant="ghost"
              className="border border-white/20 text-white hover:bg-white/10 hover:text-white"
              disabled={refreshing}
              onClick={refresh}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            aria-label={`${card.label}: ${card.failed ? "unavailable" : card.loading ? "loading" : formatCount(card.value)}. ${card.action}`}
            className="group flex min-w-0 flex-col rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-h-10 text-xs font-medium leading-5 text-muted-foreground sm:text-sm">
                {card.label}
              </h2>
              <span className={`rounded-lg p-2 ${card.colour}`}>
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            {card.loading ? (
              <Skeleton className="my-2 h-9 w-16" />
            ) : (
              <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {card.failed ? "—" : formatCount(card.value)}
              </p>
            )}
            <p className="mt-2 min-h-8 text-[11px] leading-4 text-muted-foreground sm:text-xs">
              {card.failed ? "Unavailable · refresh to try again" : card.detail}
            </p>
            <span className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
              {card.action}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
        <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Applications needing attention
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Review files, finish drafts and follow up on blocked work.
              </p>
            </div>
            <Link
              to="/admin/applications?stage=attention"
              className="shrink-0 text-xs font-medium text-primary"
            >
              View all
              <ArrowUpRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
          <PanelState
            loading={applications.isPending}
            failed={applications.isError}
            onRetry={() => void applications.refetch()}
            empty={
              applications.data?.priorities.length === 0
                ? "No applications are flagged for attention. Open the pipeline to review your other records."
                : undefined
            }
          >
            <ul className="divide-y">
              {applications.data?.priorities.map((app) => (
                <li key={app.id}>
                  <Link
                    to={`/admin/applications?application=${app.id}`}
                    className="group flex items-start gap-3 rounded-lg py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold group-hover:text-primary">
                        {app.student?.legal_name ||
                          "Student details unavailable"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {app.program?.name || "Course unavailable"} ·{" "}
                        {app.app_number || app.id.slice(0, 8)}
                      </p>
                      <p className="mt-2 break-words text-xs leading-5 text-foreground/75">
                        {overviewNextAction(app)}
                      </p>
                    </div>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </PanelState>
        </section>
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Team follow-ups</h2>
              <Link
                to="/admin/tasks"
                aria-label="View team tasks"
                className="text-primary"
              >
                <ListTodo className="h-4 w-4" />
              </Link>
            </div>
            <PanelState
              loading={taskScopeAvailable && tasks.isPending}
              failed={tasksUnavailable}
              onRetry={
                taskScopeAvailable ? () => void tasks.refetch() : undefined
              }
              empty={
                tasks.data?.priorities.length === 0
                  ? "No overdue or blocked follow-ups in this workspace."
                  : undefined
              }
            >
              <ul className="divide-y">
                {tasks.data?.priorities.map((task) => (
                  <li key={task.id} className="py-3">
                    <Link
                      to={
                        task.application_id
                          ? `/admin/applications?application=${task.application_id}`
                          : "/admin/tasks"
                      }
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="break-words text-sm font-medium hover:text-primary">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.assignee_id === user?.id
                          ? "You"
                          : task.assignee?.full_name || "Unassigned"}{" "}
                        · {formatWorkflowDate(task.due_at)}
                      </p>
                      <span className="mt-2 inline-flex rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                        {task.status === "blocked"
                          ? "Blocked"
                          : task.due_at && londonDate(task.due_at) < today
                            ? "Overdue"
                            : "To follow up"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </PanelState>
            {tasks.data && !tasks.isError && (
              <Link
                to="/admin/tasks"
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                View all tasks · {tasks.data.open} open
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </section>
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Application pipeline</h2>
              <Link
                to="/admin/applications?stage=all"
                aria-label="Open full application pipeline"
                className="text-primary"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <PanelState
              loading={applications.isPending}
              failed={applications.isError}
              onRetry={() => void applications.refetch()}
              empty={
                applications.data?.total === 0
                  ? "Your pipeline will appear when applications are created."
                  : undefined
              }
            >
              <div className="space-y-3">
                {applications.data?.pipeline.map((stage) => (
                  <div key={stage.label}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {stage.label}
                      </span>
                      <span className="font-medium">{stage.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${stage.className}`}
                        style={{
                          width: `${applications.data?.pipelineTotal ? (stage.count / applications.data.pipelineTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-4 text-muted-foreground">
                Current recorded stages. Deferred, withdrawn and rejected
                records are outside these stages.
              </p>
            </PanelState>
          </section>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Keep recruitment moving</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <item.icon className="mb-3 h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.detail}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Link className="hover:text-primary" to="/admin/logs">
            System activity
          </Link>
          <Link className="hover:text-primary" to="/admin/commissions">
            Commissions
          </Link>
          <button
            className="inline-flex items-center gap-1 hover:text-primary"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("zoe:open-chat", {
                  detail: {
                    prompt:
                      "Help me review my admissions priorities. Ask me to confirm any information you cannot access.",
                  },
                }),
              )
            }
          >
            <Sparkles className="h-3 w-3" />
            Ask Zoe
          </button>
        </div>
        <AdminReportExportButton
          tenantId={profile?.tenant_id}
          defaultReportType="admissions"
          buttonVariant="ghost"
          buttonSize="sm"
        />
      </footer>
      <ChooseApplicationStudent
        open={choosingStudent}
        onClose={() => setChoosingStudent(false)}
      />
    </div>
  );
}
