import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AgentResourceCenter from "@/components/agent/AgentResourceCenter";

export default function AgentResourcesPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <AgentResourceCenter />
      </div>
    </DashboardLayout>
  );
}
