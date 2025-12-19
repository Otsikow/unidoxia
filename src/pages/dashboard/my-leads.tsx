import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LeadsList from "@/components/agent/LeadsList";

export default function MyLeadsPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            My Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage your student leads, track follow-ups, and stay
            organized.
          </p>
        </div>

        <LeadsList />
      </div>
    </DashboardLayout>
  );
}
