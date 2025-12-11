import { Navigate } from "react-router-dom";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

const roleRedirects: Record<string, string> = {
  admin: "/admin/dashboard",
  staff: "/dashboard/tasks",
  partner: "/university/overview",
  agent: "/dashboard/leads",
  counselor: "/dashboard/tasks",
  verifier: "/dashboard/tasks",
  finance: "/dashboard/payments",
  school_rep: "/dashboard/tasks",
  student: "/student/dashboard",
};

export const DashboardRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const { primaryRole, loading: rolesLoading } = useUserRoles();

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading your dashboard..." size="md" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const target = (primaryRole && roleRedirects[primaryRole]) || "/student/dashboard";
  return <Navigate to={target} replace />;
};

export default DashboardRedirect;
