import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AgentStudentsManager from "@/components/agent/AgentStudentsManager";

export default function AgentStudentsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <AgentStudentsManager />
      </div>
    </DashboardLayout>
  );
}
