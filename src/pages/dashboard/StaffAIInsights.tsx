import StaffZoeInsightsTab from "@/components/staff/StaffZoeInsightsTab";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import BackButton from "@/components/BackButton";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffAIInsights() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <BackButton fallback="/dashboard" label="Back" />
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          <StaffZoeInsightsTab />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
