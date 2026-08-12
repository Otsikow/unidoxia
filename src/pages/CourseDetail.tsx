import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, CalendarDays, Clock, ExternalLink, GraduationCap, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/LoadingState";

const monthName = (month: number) => new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2000, month - 1, 1));

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("programs").select(`*, universities!inner(id,name,slug,city,country,logo_url,active), program_intakes(*), program_fees(*)`).eq("id", id).eq("active", true).eq("catalogue_status", "active").maybeSingle();
      if (!cancelled) { setCourse(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingState message="Loading course details…" />;
  if (!course) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Course not available</h1><p className="mt-2 text-muted-foreground">This course may be archived or awaiting verification.</p><Button className="mt-6" onClick={() => navigate("/courses")}>Browse active courses</Button></div>;

  const university = course.universities;
  const intakes = (course.program_intakes ?? []).filter((intake: any) => intake.status === "available").sort((a: any, b: any) => a.intake_year - b.intake_year || a.intake_month - b.intake_month);
  const internationalFee = (course.program_fees ?? []).find((fee: any) => fee.applicant_type === "international" && fee.resolution_status === "verified");
  const feeText = internationalFee?.amount != null ? `${internationalFee.currency} ${Number(internationalFee.amount).toLocaleString("en-GB")} ${internationalFee.fee_basis === "total" ? "total" : "per year"}` : "Check official tuition fee";
  const checked = course.source_last_checked_at ? new Date(course.source_last_checked_at).toLocaleDateString("en-GB") : "Awaiting source review";

  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
    <SEO title={`${course.name} | ${university.name}`} description={course.overview || `Official-source course information for ${course.name} at ${university.name}.`} />
    <div className="space-y-4">
      <Link className="text-sm text-primary hover:underline" to={`/universities/${university.id}`}>{university.name}</Link>
      <div className="flex flex-wrap gap-2"><Badge>{course.level}</Badge>{course.qualification && <Badge variant="outline">{course.qualification}</Badge>}<Badge variant="secondary">{course.discipline}</Badge></div>
      <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{course.name}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="inline-flex gap-2"><MapPin className="h-4 w-4" />{course.campus || university.city}, {university.country}</span><span className="inline-flex gap-2"><Clock className="h-4 w-4" />{course.duration_months ? `${course.duration_months} months` : "Check official duration"}</span></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Course overview</CardTitle></CardHeader><CardContent><p className="leading-7 text-muted-foreground">{course.overview || course.description || "A detailed factual summary is awaiting review. Use the official course page for the latest information."}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Entry requirements</CardTitle></CardHeader><CardContent className="space-y-3 text-muted-foreground"><p>{typeof course.entry_requirements === "string" ? course.entry_requirements : course.entry_requirements?.summary || "Check the official course page for academic entry requirements."}</p><p>{course.english_requirements?.summary || "English-language requirements vary by course and applicant background."}</p></CardContent></Card>
        {Array.isArray(course.modules) && course.modules.length > 0 && <Card><CardHeader><CardTitle>Key modules</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5">{course.modules.map((module: any) => <li key={typeof module === "string" ? module : module.name}>{typeof module === "string" ? module : module.name}</li>)}</ul></CardContent></Card>}
      </div>
      <aside className="space-y-4">
        <Card><CardHeader><CardTitle>Course facts</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="text-xs uppercase text-muted-foreground">International tuition</p><p className="font-semibold">{feeText}</p></div><div><p className="text-xs uppercase text-muted-foreground">Available intakes</p>{intakes.length ? <div className="mt-2 flex flex-wrap gap-2">{intakes.map((intake: any) => <Badge variant="outline" key={`${intake.intake_year}-${intake.intake_month}`}><CalendarDays className="mr-1 h-3 w-3" />{monthName(intake.intake_month)} {intake.intake_year}</Badge>)}</div> : <p className="font-semibold">Check official intake availability</p>}</div><Button className="w-full" asChild><Link to={`/student/applications/new?program=${course.id}`}>Apply Through UniDoxia</Link></Button><Button variant="outline" className="w-full" asChild><Link to={`/contact?course=${course.id}`}>Ask About This Course</Link></Button></CardContent></Card>
        <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Source and freshness</AlertTitle><AlertDescription>Last checked: {checked}. University information can change; verify before applying.</AlertDescription></Alert>
        {course.official_url && <Button variant="ghost" className="w-full" asChild><a href={course.official_url} target="_blank" rel="noreferrer">Official course page <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
        <Button variant="ghost" className="w-full" asChild><Link to={`/universities/${university.id}`}><GraduationCap className="mr-2 h-4 w-4" />University profile</Link></Button>
      </aside>
    </div>
  </div>;
}
