import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import unidoxiaLogo from '@/assets/unidoxia-logo.png';
import BackButton from '@/components/BackButton';
import { buildEmailRedirectUrl, getSiteUrl } from '@/lib/supabaseClientConfig';
import { hasSeenOnboarding, markOnboardingSeen, type OnboardingRole } from '@/lib/onboardingStorage';
import { SEO } from "@/components/SEO";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const emailParam = new URLSearchParams(location.search).get('email');
    if (!emailParam) return;
    setEmail((prev) => (prev ? prev : emailParam));
  }, [location.search]);

  // Prefetch the dashboard route chunk while the user is on the login screen.
  // This reduces perceived latency right after successful sign-in.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefetch = () => {
      void import('@/pages/Dashboard').catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(prefetch, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    const w = window as Window & typeof globalThis;
    const timeoutId = w.setTimeout(prefetch, 300);
    return () => w.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');

    // Student onboarding flow has been removed; keep agent onboarding only.
    const onboardingRole = roleParam === 'agent' ? roleParam : null;

    if (onboardingRole && !authLoading && !user && typeof window !== 'undefined') {
      const hasSeen = hasSeenOnboarding(onboardingRole as OnboardingRole);
      if (!hasSeen) {
        markOnboardingSeen(onboardingRole as OnboardingRole);
        const nextTarget = encodeURIComponent(`${location.pathname}${location.search}`);
        navigate(`/agents/onboarding?next=${nextTarget}`, {
          replace: true,
        });
      }
    }
  }, [authLoading, location.pathname, location.search, navigate, user]);

  useEffect(() => {
    if (!authLoading && user) {
      setIsRedirecting(true);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, user, location.state, navigate]);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildEmailRedirectUrl('/dashboard') ?? `${getSiteUrl()}/dashboard`,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      error,
      requiresEmailVerification,
      email: blockedEmail,
      verificationEmailSent,
    } = await signIn(email, password);

    if (requiresEmailVerification) {
      const targetEmail = blockedEmail ?? email;
      toast({
        title: verificationEmailSent ? 'Verification email sent' : 'Check your inbox',
        description: verificationEmailSent
          ? `We just sent a verification link to ${targetEmail}. Please confirm your email to finish signing in.`
          : 'Please verify your email before signing in.',
      });
      navigate('/verify-email', {
        replace: true,
        state: {
          email: targetEmail,
          message: verificationEmailSent
            ? `We just sent a verification link to ${targetEmail}. Please confirm your email to finish signing in.`
            : 'We sent you a verification link. Please confirm your email to finish signing in.',
        },
      });
      setLoading(false);
      return;
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'An error occurred during login',
      });
      setLoading(false);
    } else {
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in. Redirecting...',
      });
      // Role-based redirect will be handled by useAuth hook
      // Just wait a moment for the profile to load
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    }
  };

    if (isRedirecting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">You are already signed in. Redirecting to your dashboard...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <SEO
          title="Login - UniDoxia"
          description="Access your UniDoxia account to manage your university applications, connect with agents, and track your progress."
          keywords="login, sign in, student account, agent portal, university partner login"
        />
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <BackButton
                variant="ghost"
                size="sm"
                fallback="/"
                label="Back to home"
                className="px-0 text-muted-foreground hover:text-foreground"
              />
            </div>
            <div className="flex justify-center mb-4">
              <img src={unidoxiaLogo} alt="UniDoxia Logo" className="h-24 w-24 rounded-lg object-contain dark:brightness-0 dark:invert" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to UniDoxia</CardTitle>
            <CardDescription>
              Sign in to your UniDoxia account
            </CardDescription>
          </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;