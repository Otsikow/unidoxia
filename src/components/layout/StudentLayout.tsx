import { Navigate, Outlet, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompleteProfilePrompt } from "@/components/student/CompleteProfilePrompt";
import { SharingAuthorisationPrompt } from "@/components/student/SharingAuthorisationPrompt";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStudentRecord } from "@/hooks/useStudentRecord";
import { buildStudentRegistrationPath } from "@/lib/authRedirect";
import { isStrictStudent } from "@/lib/studentRegistrationSchema";

const StudentLayout = () => {
  const { profile, signOut } = useAuth();
  const { pathname, search, hash } = useLocation();
  const checkRegistration = profile?.role === "student" && profile.onboarded !== true;
  const student = useStudentRecord({ enabled: checkRegistration });

  if (checkRegistration) {
    if (student.isPending) return <LoadingState message="Checking your registration…" />;
    if (student.isError) return (
      <div role="alert" className="mx-auto max-w-lg space-y-4 px-4 py-12">
        <p>We couldn’t load your student profile. Please try again.</p>
        <Button onClick={() => void student.refetch()}>Try again</Button>{" "}
        <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
      </div>
    );
    if (!student.data || isStrictStudent(student.data)) {
      return <Navigate to={buildStudentRegistrationPath(`${pathname}${search}${hash}`)} replace />;
    }
  }

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="min-h-full w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <SharingAuthorisationPrompt />
        <CompleteProfilePrompt />
        <Outlet />
      </div>
    </DashboardLayout>
  );
};

export default StudentLayout;
