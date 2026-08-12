import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import BackButton from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/LoadingState";
import { logAnalyticsEvent } from "@/lib/analytics";
import { completeVerifiedSummary, formatCourseFee, navigationStateFromCurrentPage, type MarketplaceNavigationState } from "@/lib/marketplacePresentation";

const monthName = (month: number) => new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2000, month - 1, 1));
const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{children}</dd></div>;

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const trackedCourseId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("programs").select(`*, universities!inner(id,name,slug,city,country,logo_url,active), program_intakes(*), program_fees(*)`).eq("id", id).eq("active", true).eq("catalogue_status", "active").maybeSingle();
      if (!cancelled) {
        setCourse(data); setLoading(false);
        if (data?.id && trackedCourseId.current !== data.id) {
          trackedCourseId.current = data.id;
          void logAnalyticsEvent("course_view", { source: "course_detail", properties: { programme_id: data.id, university_id: data.university_id } });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingState message="Loading course details…" />;
  if (!course) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Course not available</h1><p className="mt-2 text-muted-foreground">This course may be archived or awaiting verification.</p><Button className="mt-6" onClick={() => navigate("/courses")}>Browse active courses</Button></div>;

  const university = course.universities;
  const intakes = (course.program_intakes ?? []).filter((intake: any) => ["available", "recruitable"].includes(intake.status) && intake.intake_year >= 2027).sort((a: any, b: any) => a.intake_year - b.intake_year || a.intake_month - b.intake_month);
  const internationalFee = (course.program_fees ?? []).find((fee: any) => fee.applicant_type === "international" && fee.resolution_status === "verified");
  const summary = completeVerifiedSummary(course.overview || course.description);
  const requirements = typeof course.entry_requirements === "string" ? course.entry_requirements : course.entry_requirements?.summary;
  const english = course.english_requirements?.summary;
  const checked = course.source_last_checked_at ? new Date(course.source_last_checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Awaiting source review";
  const currentHref = `${location.pathname}${location.search}`;
  const universityState = navigationStateFromCurrentPage(currentHref, "Back to course", (location.state as MarketplaceNavigationState | null) ?? null, window.scrollY);
  const backState = (location.state as MarketplaceNavigationState | null)?.marketplaceBack;
  const enquiry = new URLSearchParams({ course: course.id, title: course.name, university: university.name });

  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:py-10">
    <SEO title={`${course.name} | ${university.name}`} description={summary || `Official-source course information for ${course.name} at ${university.name}.`} />
    <BackButton fallback="/courses" label={backState?.label || "Browse courses"} showHistoryMenu={false} />
    <header className="max-w-4xl space-y-4">
      <Link state={universityState} className="text-sm font-medium text-primary hover:underline" to={`/universities/${university.slug || university.id}`}>{university.name}</Link>
      <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{course.name}</h1>
      <div className="flex flex-wrap gap-2"><Badge>{course.level}</Badge>{course.qualification && <Badge variant="outline">{course.qualification}</Badge>}<Badge variant="secondary">{course.discipline}</Badge></div>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{course.campus || university.city}, {university.country}</span><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{course.duration_months ? `${course.duration_months} months` : "Check official duration"}</span></div>
    </header>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6 lg:order-1">
        <Card><CardHeader className="pb-3"><CardTitle>Course overview</CardTitle></CardHeader><CardContent><p className="max-w-3xl leading-7 text-muted-foreground">{summary || "A complete factual summary is awaiting review. Use the official course page for the latest information."}</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle>Entry requirements</CardTitle></CardHeader><CardContent className="space-y-4 text-muted-foreground"><div><h2 className="font-semibold text-foreground">Academic requirements</h2><p>{requirements || "Check the university's official entry requirements for the latest course-specific criteria."}</p></div>{english && <div><h2 className="font-semibold text-foreground">English language requirements</h2><p>{english}</p></div>}{course.official_url && <a className="inline-flex items-center text-sm font-medium text-primary hover:underline" href={course.official_url} target="_blank" rel="noreferrer">View official requirements <ExternalLink className="ml-1 h-4 w-4" /></a>}</CardContent></Card>
        {Array.isArray(course.modules) && course.modules.length > 0 && <Card><CardHeader><CardTitle>Key modules</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5">{course.modules.map((module: any) => <li key={typeof module === "string" ? module : module.name}>{typeof module === "string" ? module : module.name}</li>)}</ul></CardContent></Card>}
      </div>
      <aside className="space-y-4 self-start lg:sticky lg:top-24">
        <Card><CardHeader className="pb-3"><CardTitle>Course facts</CardTitle></CardHeader><CardContent className="space-y-5"><dl className="grid grid-cols-2 gap-4"><Fact label="Qualification">{course.qualification || course.level}</Fact><Fact label="Study level">{course.level}</Fact><Fact label="Duration">{course.duration_months ? `${course.duration_months} months` : "Check official duration"}</Fact><Fact label="Study mode">{course.study_mode || "Check official study mode"}</Fact><Fact label="Campus">{course.campus || university.city || "Check official campus"}</Fact><Fact label="International tuition">{formatCourseFee(internationalFee)}</Fact><div className="col-span-2"><Fact label="Next verified intake">{intakes.length ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{monthName(intakes[0].intake_month)} {intakes[0].intake_year}</span> : "Future intake to be confirmed"}</Fact></div></dl><Button className="w-full" asChild><Link to={`/student/applications/new?program=${course.id}`}>Apply Through UniDoxia</Link></Button><Button variant="outline" className="w-full" asChild><Link to={`/contact?${enquiry.toString()}`}>Ask About This Course</Link></Button></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Source &amp; freshness</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>Checked {checked}</p><p>Course information may change. Verify key details before applying.</p>{course.official_url && <a className="inline-flex items-center font-medium text-primary hover:underline" href={course.official_url} target="_blank" rel="noreferrer">View official course page <ExternalLink className="ml-1 h-4 w-4" /></a>}</CardContent></Card>
      </aside>
    </div>
  </main>;
}
