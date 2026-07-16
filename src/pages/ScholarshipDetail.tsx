"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO, { SITE_ORIGIN } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, ExternalLink, Globe2, GraduationCap, ShieldCheck, Users } from "lucide-react";

const db = supabase as any;

export default function ScholarshipDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["scholarship-detail", slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("scholarships")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 space-y-4">
        <Skeleton className="h-10 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-3xl mx-auto py-16 text-center">
        <SEO title="Scholarship not found — UniDoxia" description="This scholarship page is unavailable." robots="noindex,follow" canonicalPath={`/scholarships/${slug ?? ""}`} />
        <h1 className="text-2xl font-semibold mb-2">Scholarship not found</h1>
        <p className="text-muted-foreground mb-6">This scholarship may have been archived or the link is incorrect.</p>
        <Button asChild><Link to="/scholarships">Browse scholarships</Link></Button>
      </div>
    );
  }

  const s = data as any;
  const title = s.title ?? s.name;
  const isLive = ["Published","Closing Soon","Upcoming"].includes(s.status);
  const isClosed = ["Closed","Archived"].includes(s.status);
  const description = s.summary
    ?? `${title} — ${s.funding_type ?? "scholarship"} at ${s.institution_name ?? "a UK institution"} for ${s.academic_year ?? "the upcoming academic year"}.`;
  const canonicalPath = `/scholarships/${s.slug ?? slug}`;
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  const applyUrl = s.official_application_url ?? s.official_source_url;
  const nationalities: string[] = Array.isArray(s.eligible_nationalities) ? s.eligible_nationalities : [];
  const steps: string[] = Array.isArray(s.application_steps) ? s.application_steps : [];

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOccupationalProgram",
      name: title,
      description,
      url: canonicalUrl,
      provider: {
        "@type": "CollegeOrUniversity",
        name: s.institution_name ?? s.sponsor_name ?? "UniDoxia partner",
      },
      educationalCredentialAwarded: s.study_level,
      applicationDeadline: s.deadline ?? undefined,
      applicationStartDate: s.opening_date ?? undefined,
      offers: s.scholarship_value ? {
        "@type": "Offer",
        description: s.scholarship_value,
      } : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Scholarships", item: `${SITE_ORIGIN}/scholarships` },
        { "@type": "ListItem", position: 3, name: title, item: canonicalUrl },
      ],
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <SEO
        title={`${title} — UniDoxia`}
        description={description.slice(0, 155)}
        canonicalPath={canonicalPath}
        ogType="article"
        ogImage={s.featured_image ?? s.og_image ?? undefined}
        publishedTime={s.published_at ?? undefined}
        modifiedTime={s.updated_at ?? undefined}
        robots={isClosed ? "noindex,follow" : undefined}
        jsonLd={jsonLd}
      />

      <nav className="text-sm text-muted-foreground">
        <Link to="/scholarships" className="hover:underline">← All scholarships</Link>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {s.status && <Badge variant={isLive ? "default" : "outline"}>{s.status}</Badge>}
          {s.verification_status === "Fully Verified" && (
            <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Verified</Badge>
          )}
          {s.funding_type && <Badge variant="outline">{s.funding_type}</Badge>}
          {s.academic_year && <Badge variant="outline">{s.academic_year}</Badge>}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">{title}</h1>
        {s.institution_name && (
          <p className="text-lg text-muted-foreground">
            {s.institution_name}{s.sponsor_name && s.sponsor_name !== s.institution_name ? ` · ${s.sponsor_name}` : ""}
          </p>
        )}
        {s.summary && <p className="text-base text-muted-foreground max-w-3xl">{s.summary}</p>}
      </header>

      {isClosed && (
        <div className="rounded-md border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          This scholarship is currently <strong>{s.status.toLowerCase()}</strong>. Check the official source for future rounds.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <KeyFact icon={<Globe2 className="h-4 w-4" />} label="Country" value={s.country} />
        <KeyFact icon={<GraduationCap className="h-4 w-4" />} label="Study level" value={s.study_level} />
        <KeyFact icon={<CalendarDays className="h-4 w-4" />} label="Deadline" value={s.deadline ? format(new Date(s.deadline), "d MMMM yyyy") : "Rolling / not specified"} />
        <KeyFact icon={<ShieldCheck className="h-4 w-4" />} label="Funding" value={s.scholarship_value ?? s.funding_type} />
        <KeyFact icon={<Users className="h-4 w-4" />} label="Awards available" value={s.number_of_awards ? String(s.number_of_awards) : "Not specified"} />
        <KeyFact icon={<ShieldCheck className="h-4 w-4" />} label="Last verified" value={s.last_verified_at ? format(new Date(s.last_verified_at), "d MMM yyyy") : "Not specified"} />
      </div>

      {applyUrl && !isClosed && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Ready to apply?</div>
              <div className="text-sm text-muted-foreground">Verify all details on the official source before submitting.</div>
            </div>
            <Button asChild size="lg">
              <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                Official application <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {s.full_description && (
        <Card>
          <CardHeader><CardTitle>About this scholarship</CardTitle></CardHeader>
          <CardContent className="prose prose-sm max-w-none whitespace-pre-line">{s.full_description}</CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {(s.academic_requirements || s.english_requirements || s.work_experience_requirements || s.age_requirements || nationalities.length > 0) && (
          <Card>
            <CardHeader><CardTitle>Eligibility</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {nationalities.length > 0 && <div><strong>Eligible applicants:</strong> {nationalities.join(", ")}</div>}
              {s.academic_requirements && <div><strong>Academic:</strong> {s.academic_requirements}</div>}
              {s.english_requirements && <div><strong>English:</strong> {s.english_requirements}</div>}
              {s.work_experience_requirements && <div><strong>Experience:</strong> {s.work_experience_requirements}</div>}
              {s.age_requirements && <div><strong>Age:</strong> {s.age_requirements}</div>}
            </CardContent>
          </Card>
        )}

        {steps.length > 0 && (
          <Card>
            <CardHeader><CardTitle>How to apply</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                {steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      {s.important_conditions && (
        <div className="rounded-md border bg-muted/40 p-4 text-sm flex gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div><strong>Important:</strong> {s.important_conditions}</div>
        </div>
      )}

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <div>
          Official source:{" "}
          {s.official_source_url ? (
            <a className="underline hover:text-foreground" href={s.official_source_url} target="_blank" rel="noopener noreferrer">
              {s.official_source_url}
            </a>
          ) : "Not specified"}
        </div>
        <p>UniDoxia curates this information from the official source. We do not guarantee admission, scholarships or visas. Always confirm details with the awarding institution before applying.</p>
      </div>
    </div>
  );
}

function KeyFact({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 font-medium">{value ?? "Not specified"}</div>
      </CardContent>
    </Card>
  );
}
