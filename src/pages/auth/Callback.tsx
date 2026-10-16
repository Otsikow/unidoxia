import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, LogIn, Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSafeAuthRedirect } from "@/lib/authRedirect";
import { completeAuthCallback } from "@/lib/completeAuthCallback";

type CallbackState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; title: string; description: string };

const getParamFromHash = (hash: string, key: string) => {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(trimmed);
  return params.get(key);
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [state, setState] = useState<CallbackState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const hasFinished = useRef(false);
  // Share the one-time exchange across effect replays (including StrictMode).
  const completion = useRef<ReturnType<typeof completeAuthCallback> | null>(null);
  const callbackUrl = useRef(new URL(window.location.href));

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nextTarget = useMemo(() => getSafeAuthRedirect(params.get("next")), [params]);
  const type = params.get("type") ?? getParamFromHash(location.hash, "type");
  useEffect(() => {
    if (hasFinished.current) return;
    let active = true;

    const goToApp = () => {
      hasFinished.current = true;
      setState({ status: "success" });
      // Clear the one-time token / error fragment so a refresh never replays it.
      window.history.replaceState(window.history.state, "", window.location.pathname);
      navigate(type === "recovery" ? "/auth/reset-password" : nextTarget, { replace: true });
    };

    const finish = async () => {
      try {
        completion.current ??= completeAuthCallback(supabase.auth, callbackUrl.current);
        await completion.current;
        if (active) goToApp();
      } catch (err) {
        if (!active) return;
        // Never log callback credentials or leave them in browser history.
        window.history.replaceState(window.history.state, "", window.location.pathname);
        const message = err instanceof Error ? err.message : "Please try signing in again.";
        setState({
          status: "error",
          title: "Sign-in not completed",
          description: `${message} Return to login to retry Google sign-in, or request a new email link below.`,
        });
      }
    };

    void finish();

    return () => {
      active = false;
    };
  }, [navigate, nextTarget, type]);

  const handleRequestNewLink = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Enter a valid email",
        description: "Please use the email address your invitation was sent to.",
        variant: "destructive",
      });
      return;
    }

    setSendingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        message?: string;
        error?: string;
      }>("request-activation-link", { body: { email: trimmed } });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLinkSent(true);
      toast({
        title: "Check your inbox",
        description: data?.message ?? "If an account exists for that email, a new link is on its way.",
      });
    } catch (err) {
      console.error("Failed to request a new activation link", err);
      toast({
        title: "Could not send a new link",
        description: err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSendingLink(false);
    }
  }, [email, toast]);

  if (state.status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <LoadingState message="Completing sign-in..." size="lg" />
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <LoadingState message="Redirecting..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>{state.title}</CardTitle>
          </div>
          <CardDescription>{state.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="activation-email">Email address</Label>
          <Input
            id="activation-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={sendingLink}
          />
          {linkSent ? (
            <p className="text-sm text-muted-foreground">
              We've sent a fresh link. Open it on this device, and remember it can only be used once.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full gap-2" onClick={handleRequestNewLink} disabled={sendingLink}>
            <Mail className="h-4 w-4" />
            {sendingLink ? "Sending..." : "Email me a new link"}
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/auth/login")}>
            <LogIn className="h-4 w-4" />
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthCallback;
