import {
  applicationNeedsAttention,
  getNextApplicationAction,
  isActiveApplication,
  isFollowUpOverdue,
  londonDate,
  openFollowUps,
  type ApplicationFollowUp,
} from "./applicationWorkflow";

export interface OverviewStudent {
  id: string;
  archived_at: string | null;
  documents: { id: string; admin_review_status: string | null }[];
}
export interface OverviewApplication {
  id: string;
  app_number: string | null;
  status: string;
  created_at: string | null;
  student: { legal_name: string | null } | null;
  program: { name: string } | null;
  documents: { id: string; verified: boolean }[];
  tasks: ApplicationFollowUp[];
}
export interface OverviewTask extends ApplicationFollowUp {
  application_id: string | null;
}
export function overviewStudents(rows: OverviewStudent[]) {
  const current = rows.filter((row) => !row.archived_at);
  return {
    students: current.length,
    documentsToReview: current.reduce(
      (sum, row) =>
        sum +
        row.documents.filter(
          (doc) => doc.admin_review_status === "awaiting_admin_review",
        ).length,
      0,
    ),
  };
}
export const PIPELINE_GROUPS = [
  { label: "Draft", statuses: ["draft"], className: "bg-slate-400" },
  {
    label: "UniDoxia review",
    statuses: ["submitted", "screening"],
    className: "bg-blue-500",
  },
  {
    label: "Offers",
    statuses: ["conditional_offer", "unconditional_offer"],
    className: "bg-violet-500",
  },
  {
    label: "CAS / LOA & visa",
    statuses: ["cas_loa", "visa"],
    className: "bg-cyan-500",
  },
  { label: "Enrolled", statuses: ["enrolled"], className: "bg-emerald-500" },
] as const;
export function overviewApplications(
  rows: OverviewApplication[],
  today = londonDate(),
) {
  const attention = rows.filter((row) => applicationNeedsAttention(row, today));
  const priorities = attention.slice().sort((a, b) => {
    const overdue = (row: OverviewApplication) =>
      row.tasks.some(
        (task) => task.status === "blocked" || isFollowUpOverdue(task, today),
      );
    return (
      Number(overdue(b)) - Number(overdue(a)) ||
      (a.created_at || "9999").localeCompare(b.created_at || "9999") ||
      a.id.localeCompare(b.id)
    );
  });
  const pipeline = PIPELINE_GROUPS.map((group) => ({
    ...group,
    count: rows.filter((row) =>
      (group.statuses as readonly string[]).includes(row.status),
    ).length,
  }));
  return {
    active: rows.filter((row) => isActiveApplication(row.status)).length,
    attention: attention.length,
    priorities: priorities.slice(0, 4),
    pipeline,
    pipelineTotal: pipeline.reduce((sum, group) => sum + group.count, 0),
    total: rows.length,
  };
}
export function overviewTasks(rows: OverviewTask[], today = londonDate()) {
  const overdue = rows.filter((task) => isFollowUpOverdue(task, today));
  const actionable = openFollowUps(rows).filter(
    (task) => task.status === "blocked" || isFollowUpOverdue(task, today),
  ) as OverviewTask[];
  return {
    overdue: overdue.length,
    priorities: actionable.slice(0, 4),
    open: rows.filter((task) => task.status !== "done").length,
  };
}
export function overviewNextAction(row: OverviewApplication): string {
  return (
    openFollowUps(row.tasks)[0]?.title || getNextApplicationAction(row.status)
  );
}
