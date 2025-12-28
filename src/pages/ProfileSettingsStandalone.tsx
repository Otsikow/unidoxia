import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ProfileSettings from "@/pages/ProfileSettings";

export default function ProfileSettingsStandalone() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <ProfileSettings />
      </div>
    </DashboardLayout>
  );
}
