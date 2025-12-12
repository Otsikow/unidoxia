import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import unidoxiaLogo from '@/assets/unidoxia-logo.png';
import BackButton from '@/components/BackButton';
import { useEffect } from 'react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializingSession, setInitializingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeRecoverySession = async () => {
      // If a session already exists (e.g., user is logged in), proceed
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setInitializingSession(false);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, '?'));
      const searchParams = new URLSearchParams(window.location.search);

      const type = hashParams.get('type') ?? searchParams.get('type');
      const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') ?? searchParams.get('refresh_token');

      if (type === 'recovery' && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          toast({
            variant: 'destructive',
            title: 'Session error',
            description: 'We could not validate your reset link. Please request a new one.',
          });
          navigate('/auth/forgot-password', { replace: true });
          return;
        }

        // Clean the URL to avoid exposing tokens
        window.history.replaceState({}, document.title, '/auth/reset-password');
        setInitializingSession(false);
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Invalid or expired link',
        description: 'Please request a new password reset link to continue.',
      });
      navigate('/auth/forgot-password', { replace: true });
    };

    void initializeRecoverySession();
  }, [navigate, toast]);

  if (initializingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img src={unidoxiaLogo} alt="UniDoxia Logo" className="h-20 w-20 rounded-lg object-contain dark:brightness-0 dark:invert" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying reset link</CardTitle>
            <CardDescription>One moment while we prepare your password reset.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pb-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      setLoading(false);
    } else {
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully reset.',
      });
      navigate('/auth/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <BackButton
              variant="ghost"
              size="sm"
              fallback="/auth/login"
              label="Back to login"
              className="px-0 text-muted-foreground hover:text-foreground"
            />
          </div>
          <div className="flex justify-center mb-4">
            <img src={unidoxiaLogo} alt="UniDoxia Logo" className="h-20 w-20 rounded-lg object-contain dark:brightness-0 dark:invert" />
          </div>
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || initializingSession}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
