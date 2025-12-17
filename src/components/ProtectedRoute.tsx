import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { LoadingState } from '@/components/LoadingState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const loading = authLoading || rolesLoading;

  const isStudent = profile?.role === "student" || user?.user_metadata?.role === "student";
  const isAgent = profile?.role === "agent" || user?.user_metadata?.role === "agent";
  const isStudentOnboardingRoute = location.pathname.startsWith("/student/onboarding");
  const isAgentOnboardingRoute = location.pathname.startsWith("/agents/onboarding");

  /**
   * Attempts to repair the user's account using the server-side ensure_user_profile RPC.
   * This handles malformed accounts where profile/roles/university records are missing.
   */
  const handleRepairAccount = async () => {
    if (!user?.id) return;
    
    setIsRepairing(true);
    setRepairError(null);
    
    try {
      const { data, error } = await supabase.rpc('ensure_user_profile' as any, {
        p_user_id: user.id,
      });
      
      if (error) {
        console.error('Account repair failed:', error);
        setRepairError(error.message || 'Failed to repair account');
        return;
      }
      
      const result = data as { success?: boolean; error?: string } | null;
      if (result?.success) {
        console.log('Account repaired successfully:', result);
        // Refresh the profile to pick up the repaired state
        await refreshProfile();
        // Force a page reload to re-initialize auth state
        window.location.reload();
      } else {
        setRepairError(result?.error || 'Repair did not succeed');
      }
    } catch (err) {
      console.error('Account repair exception:', err);
      setRepairError(err instanceof Error ? err.message : 'Unexpected error during repair');
    } finally {
      setIsRepairing(false);
    }
  };

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

  // If a user has an active session but the app cannot load the associated profile,
  // sending them to /auth/login creates a redirect loop (login auto-redirects signed-in users).
  // Instead, provide a clear recovery path: try repair first, then sign out options.
  if (!profile) {
    const email = user.email ?? "";
    const resetTarget = email
      ? `/auth/forgot-password?email=${encodeURIComponent(email)}`
      : "/auth/forgot-password";

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center">
              <BackButton
                variant="ghost"
                size="sm"
                fallback="/auth/login"
                label="Back to login"
                className="px-0 text-muted-foreground hover:text-foreground"
                showHistoryMenu={false}
              />
            </div>
            <CardTitle className="text-2xl font-bold">Profile not found</CardTitle>
            <CardDescription>
              We couldn't load your account profile. Try repairing your account, or sign out and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {email ? (
              <p className="text-sm text-muted-foreground text-center">
                Signed in as <span className="font-medium text-foreground">{email}</span>
              </p>
            ) : null}
            
            {repairError && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">
                {repairError}
              </p>
            )}
            
            <Button
              className="w-full"
              onClick={handleRepairAccount}
              disabled={isRepairing}
            >
              {isRepairing ? 'Repairing account...' : 'Repair my account'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void signOut({ redirectTo: resetTarget })}
            >
              Reset password
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void signOut({ redirectTo: "/auth/login" })}
            >
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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