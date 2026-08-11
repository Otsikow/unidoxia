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

type CallbackState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; title: string; description: string };

const getParamFromHash = (hash: string, key: string) => {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(trimmed);
  return params.get(key);
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [state, setState] = useState<CallbackState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const hasFinished = useRef(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nextTarget = useMemo(() => getSafeAuthRedirect(params.get("next")), [params]);
  const type = params.get("type") ?? getParamFromHash(location.hash, "type");
  const code = params.get("code");

  const errorFromQuery = params.get("error") ?? getParamFromHash(location.hash, "error");
  const errorDescription =
    params.get("error_description") ?? getParamFromHash(location.hash, "error_description");

  useEffect(() => {
    if (hasFinished.current) return;
    let active = true;

    const goToApp = () => {
      hasFinished.current = true;
      setState({ status: "success" });
      // Clear the one-time token / error fragment so a refresh never replays it.
      window.history.replaceState({}, "", `${window.location.pathname}`);
      navigate(type === "recovery" ? "/auth/reset-password" : nextTarget, { replace: true });
    };

    // supabase-js processes the URL fragment asynchronously, so poll briefly
    // before deciding the link failed.
    const waitForSession = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return data.session;
        if (!active) return null;
        await wait(300);
      }
      return null;
    };

    const finish = async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn("Code exchange failed, falling back to session check", error);
        }

        // A link can be consumed more than once (email scanners, double clicks,
        // refreshes). If a session already exists, the sign-in actually worked —
        // never show an error in that case.
        const session = await waitForSession();
        if (!active) return;

        if (session) {
          goToApp();
          return;
        }

        if (errorFromQuery || errorDescription) {
          const message = (errorDescription || errorFromQuery || "").replace(/\+/g, " ").trim();
          setState({
            status: "error",
            title: "This sign-in link has expired",
            description:
              /expired|not found|invalid/i.test(message) || !message
                ? "Sign-in links can only be used once and expire quickly. Enter your email below and we'll send you a fresh one."
                : message,
          });
          return;
        }

        setState({
          status: "error",
          title: "Sign-in not completed",
          description:
            "We couldn't start a session from this link. Enter your email below and we'll send you a fresh one.",
        });
      } catch (err) {
        console.error("Auth callback failed", err);
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unexpected error";
        setState({
          status: "error",
          title: "Authentication error",
          description: `${message}. You can request a new link below or sign in with your email and password.`,
        });
      }
    };

    void finish();

    return () => {
      active = false;
    };
  }, [code, errorDescription, errorFromQuery, navigate, nextTarget, type]);

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
