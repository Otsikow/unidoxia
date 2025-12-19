import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TaskManager from "@/components/ai/TaskManager";
import TaskManagement from "@/components/tasks/TaskManagement";

export default function AgentTasksPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Task Centre</h1>
          <p className="text-sm text-muted-foreground">
            Plan priorities, track follow-ups, and keep your recruiting pipeline moving forward.
          </p>
        </div>

        <TaskManager />
        <TaskManagement />
      </div>
    </DashboardLayout>
  );
}
