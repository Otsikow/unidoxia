import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompleteProfilePrompt } from "@/components/student/CompleteProfilePrompt";

const StudentLayout = () => {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="min-h-full w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <CompleteProfilePrompt />
        <Outlet />
      </div>
    </DashboardLayout>
  );
};

export default StudentLayout;
