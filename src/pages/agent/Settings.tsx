import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ProfileSettings from "@/pages/ProfileSettings";

export default function AgentSettingsPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />
        <ProfileSettings />
      </div>
    </DashboardLayout>
  );
}
