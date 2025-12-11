import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { LoadingState } from '@/components/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const loading = authLoading || rolesLoading;

  const isStudent = profile?.role === "student" || user?.user_metadata?.role === "student";
  const isAgent = profile?.role === "agent" || user?.user_metadata?.role === "agent";
  const isStudentOnboardingRoute = location.pathname.startsWith("/student/onboarding");
  const isAgentOnboardingRoute = location.pathname.startsWith("/agents/onboarding");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Authenticating..." size="md" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />;
  }

  if (isStudent && profile && profile.onboarded === false && !isStudentOnboardingRoute) {
    return <Navigate to="/student/onboarding" replace state={{ from: location.pathname }} />;
  }

  if (isAgent && profile && profile.onboarded === false && !isAgentOnboardingRoute) {
    return <Navigate to="/agents/onboarding" replace state={{ from: location.pathname }} />;
  }

  // Map 'university' role to 'partner' for backward compatibility
  const isPartner =
    profile?.role === 'partner' ||
    profile?.role === 'university' || 
    user.user_metadata?.role === 'partner' ||
    user.user_metadata?.role === 'university';

  if (isPartner && profile && !profile.partner_email_verified) {
    return (
      <Navigate
        to="/verify-email"
        replace
        state={{
          from: location.pathname,
          message: 'Verify your email to proceed.',
        }}
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = roles.some((role) => allowedRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};