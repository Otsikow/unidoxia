import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function UniversityClaimVerify() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your institutional email…");
  useEffect(() => {
    const verify = async () => {
      const token = params.get("token");
      if (!token) { setState("error"); setMessage("This verification link is incomplete."); return; }
      const { data, error } = await supabase.functions.invoke("verify-university-claim", { body: { token } });
      if (error || data?.error) { setState("error"); setMessage(data?.error || "Unable to verify this claim."); }
      else { setState("success"); setMessage(data?.message || "Email verified. UniDoxia will review the claim."); }
    };
    void verify();
  }, [params]);
  return <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12"><Card className="w-full"><CardContent className="p-8 text-center">{state === "success" ? <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" /> : state === "error" ? <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" /> : <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />}<h1 className="text-2xl font-bold">{state === "success" ? "Email verified" : state === "error" ? "Verification unsuccessful" : "Verifying claim"}</h1><p className="mt-3 text-muted-foreground">{message}</p><Button asChild className="mt-6"><Link to="/universities">Browse universities</Link></Button></CardContent></Card></div>;
}
