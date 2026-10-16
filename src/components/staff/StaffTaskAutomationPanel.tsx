import { formatUkDate } from '@/lib/dateFormat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStaffTasks } from "@/hooks/useStaffData";
import { useMemo } from "react";
import { Bot, CalendarClock, CheckSquare, ClipboardList, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const automationSteps = [
  {
    title: "Zoe monitors admissions events",
    description: "Stage changes, missing compliance documents, and payment reminders feed into Zoe’s triage engine.",
    icon: CalendarClock,
  },
  {
    title: "Intelligent triage",
    description: "Rules and AI heuristics prioritise tasks by urgency, risk, and relationship owner.",
    icon: Bot,
  },
  {
    title: "Assignments and nudges",
    description: "Zoe routes work to staff, agents, or keeps it unassigned until you escalate manually.",
    icon: Users,
  },
  {
    title: "Execution and closure",
    description: "Team updates task status. Zoe watches for completion signals and removes noise automatically.",
    icon: CheckSquare,
  },
];

export function StaffTaskAutomationPanel() {
  const { data, isLoading } = useStaffTasks(1);

  const highlightedTasks = useMemo(() => {
    const tasks = (data as any)?.data ?? [];
    return tasks
      .filter((task) => task.status !== "done")
      .slice(0, 3)
      .map((task) => ({
        id: task.id,
        title: task.title,
        dueAt: task.dueAt,
        priority: task.priority ?? "medium",
        assignee: task.assigneeName ?? "Unassigned",
      }));
  }, [data]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">How Zoe orchestrates your workflows</CardTitle>
        <CardDescription>
          Every task originates from a deterministic automation. Follow the path below to understand exactly where your
          queue comes from.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {automationSteps.map((step) => (
            <div key={step.title} className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <step.icon className="h-4 w-4 text-primary" />
                {step.title}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Latest tasks surfaced by Zoe</h3>
          {isLoading ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : highlightedTasks.length > 0 ? (
            <div className="mt-3 space-y-3">
              {highlightedTasks.map((task) => (
                <div key={task.id} className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Assigned to {task.assignee}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary">Priority {task.priority}</Badge>
                      <Badge variant="outline">
                        Due {task.dueAt ? formatUkDate(task.dueAt) : "Flexible"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
              <ClipboardList className="mb-2 h-4 w-4 text-primary" />
              Zoe has no pending follow-ups right now. Tasks will appear here the moment a new blocker is detected.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StaffTaskAutomationPanel;
