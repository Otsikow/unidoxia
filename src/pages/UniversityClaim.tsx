import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";

type UniversitySummary = { id: string; name: string; city: string | null; country: string; listing_status?: string };

export default function UniversityClaim() {
  const { id } = useParams<{ id: string }>();
  const [university, setUniversity] = useState<UniversitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return setLoading(false);
      const query = supabase.from("universities").select("id,name,city,country,listing_status");
      const { data } = await (id.includes("-") && id.length !== 36 ? query.eq("slug", id) : query.eq("id", id)).maybeSingle();
      setUniversity(data as UniversitySummary | null);
      setLoading(false);
    };
    void load();
  }, [id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!university) return;
    setSubmitting(true); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const { data, error: functionError } = await supabase.functions.invoke("submit-university-claim", {
      body: {
        universityId: university.id,
        firstName: form.get("firstName"), lastName: form.get("lastName"),
        jobTitle: form.get("jobTitle"), department: form.get("department"),
        institutionalEmail: form.get("institutionalEmail"), phone: form.get("phone"),
      },
    });
    if (functionError || data?.error) setError(data?.error || "Unable to submit the claim right now.");
    else { setMessage(data?.message || "Check your institutional email."); event.currentTarget.reset(); }
    setSubmitting(false);
  };

  if (loading) return <div className="mx-auto max-w-3xl p-8">Loading university…</div>;
  if (!university) return <div className="mx-auto max-w-3xl p-8">University not found.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <SEO title={`Claim ${university.name} - UniDoxia`} description={`Request verified management access to the ${university.name} profile on UniDoxia.`} />
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Building2 className="h-7 w-7 text-primary" /></div>
        <h1 className="text-3xl font-bold">Claim {university.name}</h1>
        <p className="mt-2 text-muted-foreground">{[university.city, university.country].filter(Boolean).join(", ")}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Verify your institutional role</CardTitle><CardDescription>Use your official university email. Email verification is followed by UniDoxia admin review and does not automatically grant ownership.</CardDescription></CardHeader>
        <CardContent>
          {university.listing_status === "claimed" ? (
            <div className="rounded-lg border bg-muted p-5 text-center"><ShieldCheck className="mx-auto mb-2 h-6 w-6" /><p>This profile has already been claimed.</p></div>
          ) : message ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mb-2 h-6 w-6" /><p className="font-medium">{message}</p><p className="mt-2 text-sm">The link expires in 30 minutes.</p></div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="firstName">First name</Label><Input id="firstName" name="firstName" required autoComplete="given-name" /></div>
                <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" name="lastName" required autoComplete="family-name" /></div>
                <div><Label htmlFor="jobTitle">Job title</Label><Input id="jobTitle" name="jobTitle" required /></div>
                <div><Label htmlFor="department">Department</Label><Input id="department" name="department" required /></div>
              </div>
              <div><Label htmlFor="institutionalEmail">Institutional email</Label><Input id="institutionalEmail" name="institutionalEmail" type="email" required autoComplete="email" /><p className="mt-1 text-xs text-muted-foreground">Personal email providers are not accepted.</p></div>
              <div><Label htmlFor="phone">Telephone (optional)</Label><Input id="phone" name="phone" type="tel" autoComplete="tel" /></div>
              {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting ? "Submitting…" : "Send verification email"}</Button>
            </form>
          )}
          <Button asChild variant="ghost" className="mt-4 w-full"><Link to={`/universities/${id}`}>Back to university profile</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
