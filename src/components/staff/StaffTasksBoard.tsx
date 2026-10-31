import { Link, useSearchParams, useLocation } from "react-router-dom";
import { TASK_VIEWS, parseTaskView } from "@/lib/taskViews";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarClock, CheckSquare, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StaffPagination from "@/components/staff/StaffPagination";
import { StaffTaskComposerButton } from "@/components/staff/StaffTaskComposerProvider";
import { useStaffTasks, useUpdateTaskStatus, STAFF_PAGE_SIZE } from "@/hooks/useStaffData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
  open: { label: "To do", variant: "secondary" },
  in_progress: { label: "In progress", variant: "default" },
  done: { label: "Completed", variant: "outline" },
  blocked: { label: "Blocked", variant: "outline" },
};

const priorityBadges: Record<string, string> = {
  high: "bg-orange-500/10 text-orange-600 border border-orange-500/40",
  medium: "bg-blue-500/10 text-blue-600 border border-blue-500/40",
  low: "bg-muted text-muted-foreground",
};

export function StaffTasksBoard() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const boardRef = useRef<HTMLDivElement>(null);
  const view = parseTaskView(params.get("taskView"));
  const pageValue = Number(params.get("taskPage") ?? 1);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const statusValue = params.get("taskStatus") ?? "all";
  const status = ["all", "open", "in_progress", "blocked", "done"].includes(statusValue) ? statusValue : "all";
  const priorityValue = params.get("taskPriority") ?? "all";
  const priority = ["all", "high", "medium", "low"].includes(priorityValue) ? priorityValue : "all";
  const changeFilters = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete("taskPage");
    for (const [key, value] of Object.entries(values)) {
      if (value === "all" || value === "1") next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  };
  const setPage = (value: number) => changeFilters({ taskPage: String(value) });
  useEffect(() => {
    if (location.hash !== "#task-list") return;
    boardRef.current?.scrollIntoView({ block: "start" });
    boardRef.current?.focus({ preventScroll: true });
  }, [location.key, location.hash]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data, isLoading, isFetching, isError, error, refetch } = useStaffTasks(page, { status, priority, view });
  const mutation = useUpdateTaskStatus();

  const total = (data as any)?.total ?? 0;
  const rows = (data as any)?.data ?? [];
  const isFiltered = view !== "all" || status !== "all" || priority !== "all";

  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "We couldn’t load your tasks. Please try again.";

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      { value: "open", label: "To do" },
      { value: "in_progress", label: "In progress" },
      { value: "blocked", label: "Blocked" },
      { value: "done", label: "Completed" },
    ],
    [],
  );

  const priorityOptions = useMemo(
    () => [
      { value: "all", label: "All priorities" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
    [],
  );

  const handleUpdateStatus = (taskId: string, nextStatus: string) => {
    if (mutation.isPending) return;

    setUpdatingTaskId(taskId);
    mutation.mutate(
      { taskId, status: nextStatus },
      {
        onSuccess: () => {
          const statusLabel = statusLabels[nextStatus]?.label ?? "Updated";
          toast({
            title: "Task updated",
            description: `Status changed to ${statusLabel}.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Update failed",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        },
        onSettled: () => {
          setUpdatingTaskId(null);
        },
      },
    );
  };

  const handleResetFilters = () => {
    changeFilters({ taskView: "all", taskStatus: "all", taskPriority: "all" });
  };

  return (
    <Card id="task-list" role="region" ref={boardRef} tabIndex={-1} aria-label="Task results" className="rounded-2xl scroll-mt-24 focus:outline-none">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="h-5 w-5 text-primary" /> Tasks & Workflows
          </CardTitle>
          <CardDescription>{TASK_VIEWS[view]} · Stay on top of deadlines with Zoe-assisted triage.</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Select value={view} onValueChange={(value) => changeFilters({ taskView: value, taskStatus: "all", taskPriority: "all" })}>
                <SelectTrigger aria-label="Task view" className="sm:w-52"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TASK_VIEWS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={status} onValueChange={(value) => changeFilters({ taskStatus: value })}>
                <SelectTrigger aria-label="Task status" className="sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={(value) => changeFilters({ taskPriority: value })}>
                <SelectTrigger aria-label="Task priority" className="sm:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end md:ml-4">
              <StaffTaskComposerButton />
            </div>
          </div>
          {isFetching && !isLoading ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing latest updates…
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFiltered && <Button variant="outline" size="sm" onClick={handleResetFilters}>Reset filters</Button>}
        {isError ? (
          <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div className="flex-1">
              <AlertTitle>Unable to load tasks</AlertTitle>
              <AlertDescription>{errorMessage || "We couldn’t load your tasks. Please try again."}</AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
            >
              Retry
            </Button>
          </Alert>
        ) : null}
        <div className="grid gap-3">
          {(isLoading || isFetching) && rows.length === 0 && (
            <div className="space-y-3 rounded-xl border bg-background p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!isLoading && rows.length === 0 && !isError && (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{isFiltered ? "No tasks match your filters." : "Zoe has no tasks for you right now."}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFiltered
                  ? "Try adjusting or resetting the filters to discover more tasks."
                  : "You’re all caught up for now. Zoe will surface new priorities here automatically."}
              </p>

            </div>
          )}

          {rows.map((task) => {
            const statusDetail = statusLabels[task.status ?? "open"] ?? statusLabels.open;
            const priorityClass = priorityBadges[task.priority ?? "medium"] ?? priorityBadges.medium;
            const isTaskUpdating = mutation.isPending && updatingTaskId === task.id;
            return (
              <div key={task.id} className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusDetail.variant}>{statusDetail.label}</Badge>
                      <Badge className={priorityClass}>Priority {task.priority ?? "medium"}</Badge>
                    </div>
                    <p className="mt-2 text-base font-semibold">{task.title}</p>
                    {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due date"}
                      </span>
                      {task.assigneeName && <span>Assigned to {task.assigneeName}</span>}
                      {task.applicationId && <Link className="text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={`${location.pathname.startsWith("/admin") ? "/admin/applications" : "/dashboard/applications"}?application=${encodeURIComponent(task.applicationId)}`}>Open application #{task.applicationId.slice(0, 8)}</Link>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.entries(statusLabels)
                      .filter(([value]) => value !== task.status)
                      .map(([value, detail]) => (
                        <Button
                          key={value}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleUpdateStatus(task.id, value)}
                          disabled={mutation.isPending}
                        >
                          {isTaskUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />} 
                          <span>{isTaskUpdating ? "Updating" : detail.label}</span>
                        </Button>
                      ))}
                  </div>
                  {isTaskUpdating ? (
                    <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                      Saving changes to this task…
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <StaffPagination page={page} total={total} pageSize={STAFF_PAGE_SIZE} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

export default StaffTasksBoard;
