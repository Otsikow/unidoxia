import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPlacementQueue } from "@/components/placement/AdminPlacementQueue";
import AdminStudentDetail from "@/pages/admin/AdminStudentDetail";
export default function PlacementWorkspace() {
  const { studentId } = useParams();
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {studentId ? (
          <AdminStudentDetail key={studentId} />
        ) : (
          <>
            <h1 className="text-3xl font-semibold">
              Adviser university matching
            </h1>
            <p>
              Open a submitted study plan to review qualifications, documents,
              budget and recommended options.
            </p>
            <AdminPlacementQueue />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
