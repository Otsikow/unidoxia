import { Suspense, lazy, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { EmptyState } from '@/components/EmptyState';
import { LogIn, HelpCircle } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PageSkeleton } from '@/components/performance/SkeletonLoaders';

// NOTE: Keep dashboards lazy to avoid pulling them into the initial bundle.
const StudentDashboard = lazy(() => import('@/pages/dashboards/StudentDashboard'));
const AgentDashboard = lazy(() => import('@/pages/dashboards/AgentDashboard'));
const StaffDashboard = lazy(() => import('@/pages/dashboards/StaffDashboard'));

const ROLE_PRIORITY: AppRole[] = ['admin', 'staff', 'partner', 'agent', 'student'];

const getUniversityRouteForPartnerView = (viewParam: string | null) => {
  switch (viewParam) {
    case 'applications':
      return '/university/applications';
    case 'documents':
      return '/university/documents';
    case 'offers':
      return '/university/offers';
    case 'messages':
      return '/university/messages';
    case 'analytics':
      return '/university/analytics';
    case 'programs':
      return '/university/programs';
    case 'overview':
    case null:
    default:
      return '/university';
  }
};

// Skeleton loader for dashboard - instant visual feedback
const DashboardSkeleton = memo(() => (
  <div className="min-h-screen">
    <PageSkeleton />
  </div>
));

const Dashboard = memo(function Dashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { roles, loading: rolesLoading, error: rolesError } = useUserRoles();
  const navigate = useNavigate();
  const location = useLocation();

  const loading = authLoading || rolesLoading;

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={<LogIn className="h-8 w-8" />}
          title="Sign in to view your dashboard"
          description="Access personalized tasks, applications, and recommendations after signing in."
          action={{ label: 'Go to login', onClick: () => navigate('/auth/login') }}
        />
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={<HelpCircle className="h-8 w-8" />}
          title="Unable to verify permissions"
          description="We couldn't load your access rights. Please refresh the page or contact support if the issue persists."
        />
      </div>
    );
  }

  if (!profile) {
    const email = user?.email ?? '';
    const resetTarget = email ? `/auth/forgot-password?email=${encodeURIComponent(email)}` : '/auth/forgot-password';
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={<HelpCircle className="h-8 w-8" />}
          title="Profile not found"
          description="We couldn't load your profile information. To avoid getting stuck, we’ll take you back to login — or you can reset your password."
          action={{
            label: 'Reset password',
            onClick: () => void signOut({ redirectTo: resetTarget }),
          }}
        />
        <div className="mt-3 text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            onClick={() => void signOut({ redirectTo: '/auth/login' })}
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  const resolvedRole = ROLE_PRIORITY.find((role) => roles.includes(role));

  if (resolvedRole === 'student')
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <StudentDashboard />
      </Suspense>
    );

  if (resolvedRole === 'agent')
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <AgentDashboard />
      </Suspense>
    );

  if (resolvedRole === 'partner') {
    const params = new URLSearchParams(location.search);
    const target = getUniversityRouteForPartnerView(params.get('view'));
    return <Navigate to={target} replace />;
  }
  if (resolvedRole === 'staff' || resolvedRole === 'admin')
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <StaffDashboard />
      </Suspense>
    );

  const fallbackDescription = roles.length === 0
    ? "We couldn't find any roles associated with your account. Please contact support for assistance."
    : "We couldn't determine which dashboard to show for your account. Please contact support for assistance.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <EmptyState
        icon={<HelpCircle className="h-8 w-8" />}
        title="Role not supported yet"
        description={fallbackDescription}
      />
    </div>
  );
});

export default Dashboard;