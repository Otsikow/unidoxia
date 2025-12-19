import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgentPartnerDiscovery } from "@/components/agent/AgentPartnerDiscovery";

export default function AgentPartnersPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />
        <AgentPartnerDiscovery />
      </div>
    </DashboardLayout>
  );
}
