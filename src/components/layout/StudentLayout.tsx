import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const StudentLayout = () => {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="min-h-full w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </DashboardLayout>
  );
};

export default StudentLayout;
