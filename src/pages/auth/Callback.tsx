import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw, LogIn } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [state, setState] = useState<CallbackState>({ status: "loading" });

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const type = params.get("type") ?? getParamFromHash(location.hash, "type");
  const code = params.get("code");

  const errorFromQuery = params.get("error") ?? getParamFromHash(location.hash, "error");
  const errorDescription =
    params.get("error_description") ??
    getParamFromHash(location.hash, "error_description") ??
    params.get("error_description".replace(/_/g, "")); // defensive

  useEffect(() => {
    let active = true;

    const finish = async () => {
      try {
        if (errorFromQuery || errorDescription) {
          const message = (errorDescription || errorFromQuery || "").replace(/\+/g, " ").trim();
          if (!active) return;
          setState({
            status: "error",
            title: "Unable to complete sign-in",
            description:
              message ||
              "This link may have expired or already been used. Please request a new link or sign in again.",
          });
          return;
        }

        // PKCE flow (code in query)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        if (!session) {
          if (!active) return;
          setState({
            status: "error",
            title: "Sign-in not completed",
            description:
              "We couldn't find an active session from this link. Please request a new invite/verification email and try again.",
          });
          return;
        }

        if (!active) return;
        setState({ status: "success" });

        if (type === "recovery") {
          navigate("/auth/reset-password", { replace: true });
          return;
        }

        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auth callback failed", err);
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unexpected error";
        setState({
          status: "error",
          title: "Authentication error",
          description: `${message}. Please try again, or sign in with your email and password.`,
        });
      }
    };

    void finish();

    return () => {
      active = false;
    };
  }, [code, errorDescription, errorFromQuery, location.hash, navigate, type]);

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
        <CardContent className="text-sm text-muted-foreground">
          If this keeps happening, check your internet connection and request a new invite link.
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Reload
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

