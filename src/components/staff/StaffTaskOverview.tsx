import { TaskSummaryLink } from "./TaskSummaryLink";
import type { TaskView } from "@/lib/taskViews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useStaffTaskSummary } from "@/hooks/useStaffData";
import { StaffTaskComposerButton } from "@/components/staff/StaffTaskComposerProvider";
import { CalendarClock, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

export function StaffTaskOverview() {
  const { data, isLoading, isError, error, refetch, isFetching } = useStaffTaskSummary();

  const metrics = useMemo(() => {
    if (!data) {
      return { completionRate: 0, stats: [] as Array<{ label: string; value: number; description: string; view: TaskView }> };
    }

    const completionRate = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);

    return {
      completionRate,
      stats: [
        {
          label: "Open tasks",
          view: "open" as TaskView,
          value: data.open,
          description: "Workflows awaiting action",
        },
        {
          label: "Due in 3 days",
          view: "dueSoon" as TaskView,
          value: data.dueSoon,
          description: "Zoe has flagged these as urgent",
        },
        {
          label: "Overdue",
          view: "overdue" as TaskView,
          value: data.overdue,
          description: "Needs immediate follow-up",
        },
        {
          label: "Completed",
          view: "completed" as TaskView,
          value: data.completed,
          description: "Closed out this cycle",
        },
      ],
    };
  }, [data]);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-lg">Task health snapshot</CardTitle>
          <CardDescription>
            Zoe orchestrates every workflow—from stage changes to compliance checks—and keeps this dashboard in sync.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync with Zoe
          </Button>
          <StaffTaskComposerButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive" className="rounded-xl">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to sync tasks</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "We couldn’t refresh the task summary. Try again or confirm your Supabase connection."}
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.stats.map((metric) => (
                <TaskSummaryLink key={metric.label} view={metric.view} className="rounded-xl border bg-muted/40 p-4">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </TaskSummaryLink>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TaskSummaryLink view="all" className="space-y-3 rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Completion rate
                  </span>
                  <span>{metrics.completionRate}%</span>
                </div>
                <Progress value={metrics.completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Zoe closes tasks automatically when the related application reaches the required stage.
                </p>
              </TaskSummaryLink>
              <div className="grid gap-3 sm:grid-cols-2">
                <TaskSummaryLink view="automated" className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">Auto-triaged by Zoe</p>
                  <p className="mt-1 text-2xl font-semibold">{data.autoGenerated}</p>
                  <p className="text-xs text-muted-foreground">Created from admissions and compliance automations.</p>
                </TaskSummaryLink>
                <TaskSummaryLink view="manual" className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-medium text-muted-foreground">Logged by your team</p>
                  <p className="mt-1 text-2xl font-semibold">{data.manual}</p>
                  <p className="text-xs text-muted-foreground">Manual follow-ups captured via the task composer.</p>
                </TaskSummaryLink>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border bg-background p-4 lg:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarClock className="h-4 w-4 text-primary" /> Deadlines overview
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <TaskSummaryLink view="overdue" className="rounded-lg p-2 -m-2">
                    <p className="text-2xl font-semibold">{data.overdue}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </TaskSummaryLink>
                  <TaskSummaryLink view="dueSoon" className="rounded-lg p-2 -m-2">
                    <p className="text-2xl font-semibold">{data.dueSoon}</p>
                    <p className="text-xs text-muted-foreground">Due in next 3 days</p>
                  </TaskSummaryLink>
                  <TaskSummaryLink view="noDueDate" className="rounded-lg p-2 -m-2">
                    <p className="text-2xl font-semibold">{data.noDueDate}</p>
                    <p className="text-xs text-muted-foreground">No due date</p>
                  </TaskSummaryLink>
                </div>
              </div>
              <TaskSummaryLink view="assigned" className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2 className="h-4 w-4 text-primary" /> Active owners
                </div>
                <p className="mt-3 text-2xl font-semibold">{data.activeOwners}</p>
                <p className="text-xs text-muted-foreground">
                  Zoe currently routes tasks across {data.activeOwners || 0} teammates. Ownership updates in real time as
                  assignments change.
                </p>
              </TaskSummaryLink>
            </div>

            <p className="text-xs text-muted-foreground">
              Last synced {new Date(data.lastRefreshedAt).toLocaleString()}.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default StaffTaskOverview;
