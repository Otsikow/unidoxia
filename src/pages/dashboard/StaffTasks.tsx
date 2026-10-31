"use client";

import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import StaffTasksBoard from "@/components/staff/StaffTasksBoard";
import StaffTaskOverview from "@/components/staff/StaffTaskOverview";
import StaffTaskAutomationPanel from "@/components/staff/StaffTaskAutomationPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffTaskComposerProvider } from "@/components/staff/StaffTaskComposerProvider";

export default function StaffTasks() {
  return (
    <DashboardLayout>
      <StaffTaskComposerProvider>
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6">
            <StaffTaskOverview />
            <StaffTaskAutomationPanel />
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
              <StaffTasksBoard />
            </Suspense>
          </div>
        </div>
      </StaffTaskComposerProvider>
    </DashboardLayout>
  );
}

