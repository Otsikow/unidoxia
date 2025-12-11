import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CallbackStatus = 'processing' | 'success' | 'error';

/**
 * AuthCallback handles the OAuth/email verification callback from Supabase.
 * 
 * When users click email verification links or complete OAuth flows,
 * Supabase redirects them here with tokens in the URL hash or query params.
 * This component:
 * 1. Extracts and exchanges the tokens for a session
 * 2. Waits for the session to be established
 * 3. Redirects to the appropriate dashboard
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (processedRef.current) return;
    processedRef.current = true;

    const handleAuthCallback = async () => {
      try {
        // Check for error in URL params (OAuth errors)
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('Auth callback error from URL:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || error || 'Authentication failed');
          return;
        }

        // Check if there's a hash fragment with tokens (email verification flow)
        // Supabase puts access_token and refresh_token in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Also check for code in query params (OAuth PKCE flow)
        const code = searchParams.get('code');

        console.log('Auth callback - Processing authentication...', {
          hasAccessToken: !!accessToken,
          hasCode: !!code,
          type,
          hash: window.location.hash ? '[present]' : '[empty]',
        });

        if (accessToken && refreshToken) {
          // Token-based flow (email verification, magic link, password recovery)
          console.log('Setting session from URL tokens...', { type });
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Failed to set session from tokens:', sessionError);
            setStatus('error');
            setErrorMessage(sessionError.message || 'Failed to verify your email. Please try again.');
            return;
          }

          if (data.session) {
            console.log('Session established successfully from tokens', { type });
            setStatus('success');
            
            // Clear the hash from the URL for security
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect based on the type of auth callback
            const redirectPath = type === 'recovery' ? '/auth/reset-password' : '/dashboard';
            
            // Give the auth state time to propagate
            setTimeout(() => {
              navigate(redirectPath, { replace: true });
            }, 1000);
            return;
          }
        }

        if (code) {
          // OAuth PKCE flow - exchange code for session
          console.log('Exchanging OAuth code for session...');
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Failed to exchange code for session:', exchangeError);
            setStatus('error');
            setErrorMessage(exchangeError.message || 'Failed to complete sign in. Please try again.');
            return;
          }

          if (data.session) {
            console.log('Session established successfully from OAuth code');
            setStatus('success');
            
            // Clear the code from the URL for security
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            window.history.replaceState(null, '', url.pathname);
            
            // Give the auth state time to propagate
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1000);
            return;
          }
        }

        // No tokens or code found - check if there's already an active session
        console.log('No tokens in URL, checking for existing session...');
        
        const { data: { session }, error: sessionCheckError } = await supabase.auth.getSession();

        if (sessionCheckError) {
          console.error('Error checking session:', sessionCheckError);
          setStatus('error');
          setErrorMessage('Failed to verify authentication status.');
          return;
        }

        if (session) {
          console.log('Found existing session, redirecting to dashboard');
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
          return;
        }

        // No session and no tokens - something went wrong
        console.warn('Auth callback reached without tokens or session');
        setStatus('error');
        setErrorMessage('Authentication verification expired or invalid. Please try signing in again.');

      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  // Processing state
  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">Verifying your account...</CardTitle>
            <CardDescription>
              Please wait while we complete the authentication process.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-semibold">Verification successful!</CardTitle>
            <CardDescription>
              Your account has been verified. Redirecting you to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-semibold">Verification failed</CardTitle>
          <CardDescription>
            {errorMessage || 'Something went wrong during authentication.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This can happen if the verification link has expired or was already used.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/auth/login')} className="w-full">
              Go to Login
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth/signup')} 
              className="w-full"
            >
              Create New Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
