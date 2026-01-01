import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import CommissionTracker from "@/components/agent/CommissionTracker";
import CommissionManagement from "@/components/commission/CommissionManagement";
import AgentAnalyticsDashboard from "@/components/agent/AgentAnalyticsDashboard";

export default function AgentCommissionsPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Commissions</h1>
          <p className="text-sm text-muted-foreground">
            Monitor payouts, review earnings history, and track upcoming commission milestones.
          </p>
        </div>

        <CommissionTracker />

        {/* Analytics Dashboard */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Analytics & Insights</h2>
          <AgentAnalyticsDashboard />
        </section>

        <CommissionManagement />
      </div>
    </DashboardLayout>
  );
}
