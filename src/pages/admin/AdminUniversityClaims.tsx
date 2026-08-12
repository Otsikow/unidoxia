import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Claim = {
  id: string; first_name: string; last_name: string; job_title: string; department: string;
  institutional_email: string; phone: string | null; status: string; email_verified_at: string | null;
  created_at: string; university: { name: string; city: string | null; country: string } | null;
};

export default function AdminUniversityClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const { toast } = useToast();
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("university_claims") as any)
      .select("id,first_name,last_name,job_title,department,institutional_email,phone,status,email_verified_at,created_at,university:universities(name,city,country)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Unable to load claims", description: error.message, variant: "destructive" });
    setClaims((data || []) as Claim[]); setLoading(false);
  }, [toast]);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, decision: "approved" | "rejected") => {
    setReviewing(id);
    const { error } = await (supabase.rpc as any)("review_university_claim", { p_claim_id: id, p_decision: decision, p_admin_notes: null });
    if (error) toast({ title: "Claim review failed", description: error.message, variant: "destructive" });
    else { toast({ title: decision === "approved" ? "Claim approved" : "Claim rejected" }); await load(); }
    setReviewing(null);
  };
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold">University claim review</h1><p className="text-muted-foreground">Email verification confirms control of an address. Approval confirms profile ownership.</p></div>{loading ? <p>Loading claims…</p> : claims.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No university claims have been submitted.</CardContent></Card> : <div className="space-y-4">{claims.map((claim) => <Card key={claim.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{claim.university?.name || "University"}</CardTitle><CardDescription>{claim.university ? [claim.university.city, claim.university.country].filter(Boolean).join(", ") : ""}</CardDescription></div><Badge variant={claim.status === "approved" ? "default" : "secondary"}>{claim.status.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-muted-foreground">Claimant</span><p className="font-medium">{claim.first_name} {claim.last_name}</p></div><div><span className="text-muted-foreground">Role</span><p className="font-medium">{claim.job_title}, {claim.department}</p></div><div><span className="text-muted-foreground">Institutional email</span><p className="font-medium break-all">{claim.institutional_email}</p></div><div><span className="text-muted-foreground">Email check</span><p className="flex items-center gap-1 font-medium">{claim.email_verified_at ? <><ShieldCheck className="h-4 w-4 text-emerald-600" />Verified</> : <><Clock3 className="h-4 w-4" />Pending</>}</p></div></div>{claim.status === "awaiting_admin_review" && <div className="flex gap-2 border-t pt-4"><Button onClick={() => review(claim.id, "approved")} disabled={reviewing === claim.id}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button><Button variant="destructive" onClick={() => review(claim.id, "rejected")} disabled={reviewing === claim.id}><XCircle className="mr-2 h-4 w-4" />Reject</Button></div>}</CardContent></Card>)}</div>}</div>;
}
