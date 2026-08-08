import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MailCheck, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildEmailRedirectUrl } from '@/lib/supabaseClientConfig';
import { getSafeAuthRedirect } from '@/lib/authRedirect';

const VerifyEmail = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const locationState = location.state as { email?: string; from?: string; message?: string } | null;
  const messageFromState = locationState?.message;
  const nextTarget = getSafeAuthRedirect(locationState?.from);

  const emailFromState = locationState?.email;
  const email = useMemo(() => emailFromState ?? user?.email ?? '', [emailFromState, user?.email]);

  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate(nextTarget, { replace: true });
    }
  }, [navigate, nextTarget, user?.email_confirmed_at]);

  const handleResend = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please return to signup and provide an email address first.',
      });
      return;
    }

    setResending(true);

    try {
      const callbackPath = `/auth/callback?next=${encodeURIComponent(nextTarget)}`;
      const emailRedirectTo = buildEmailRedirectUrl(callbackPath);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (error) {
        console.error('Error resending verification email:', error);
        toast({
          variant: 'destructive',
          title: 'Unable to resend email',
          description: error.message ?? 'Please try again in a moment.',
        });
      } else {
        toast({
          title: 'Verification email sent',
          description: `We sent another verification link to ${email}.`,
        });
      }
    } catch (err) {
      console.error('Unexpected error while resending verification email:', err);
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong while sending the verification email.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-lg text-center space-y-4">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">Verify your email</CardTitle>
          <CardDescription>
            {messageFromState ||
              (email
                ? `We sent a confirmation link to ${email}. Follow the link in your inbox to activate your account.`
                : 'We sent a confirmation link to your email address. Follow the link in your inbox to activate your account.')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            You need to verify your email address before you can sign in. Once you click the link in the
            verification email, return here and sign in with your credentials.
          </p>
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Didn&apos;t get the email?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your spam or promotions folder.</li>
              <li>Make sure you entered the correct email during signup.</li>
              <li>Use the button below to send another verification email.</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleResend}
            disabled={resending}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>

          <Button
            onClick={() => navigate('/auth/login', { state: { email, from: nextTarget } })}
            className="w-full"
          >
            Back to login
          </Button>

          <p className="text-xs text-muted-foreground">
            Already verified? Sign in to continue.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail;
