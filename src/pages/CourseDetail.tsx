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
import { navigationStateFromCurrentPage, type MarketplaceNavigationState } from "@/lib/marketplacePresentation";
import { buildCourseSections, INTAKE_FALLBACK, REQUIREMENTS_FALLBACK } from "@/lib/courseDetailSections";

const monthName = (month: number) => new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2000, month - 1, 1));

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-sm font-semibold leading-snug">{children}</dd>
  </div>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{children}</h2>
);

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
      const { data } = await supabase
        .from("programs")
        .select(`*, universities!inner(id,name,slug,city,country,logo_url,active), program_intakes(*), program_fees(*)`)
        .eq("id", id)
        .eq("active", true)
        .eq("catalogue_status", "active")
        // Courses attached to an inactive university must not be publicly reachable,
        // matching what course search already returns.
        .eq("universities.active", true)
        .maybeSingle();
      if (!cancelled) {
        setCourse(data);
        setLoading(false);
        if (data?.id && trackedCourseId.current !== data.id) {
          trackedCourseId.current = data.id;
          void logAnalyticsEvent("course_view", {
            source: "course_detail",
            properties: { programme_id: data.id, university_id: data.university_id },
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <LoadingState message="Loading course details…" />;
  if (!course)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Course not available</h1>
        <p className="mt-2 text-muted-foreground">This course may be archived or awaiting verification.</p>
        <Button className="mt-6" onClick={() => navigate("/courses")}>
          Browse active courses
        </Button>
      </div>
    );

  const university = course.universities;
  const sections = buildCourseSections(course);
  const duration = course.duration_months ? `${course.duration_months} months` : "Check official duration";
  const checked = course.source_last_checked_at
    ? new Date(course.source_last_checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Awaiting source review";
  const currentHref = `${location.pathname}${location.search}`;
  const universityState = navigationStateFromCurrentPage(
    currentHref,
    "Back to course",
    (location.state as MarketplaceNavigationState | null) ?? null,
    typeof window === "undefined" ? 0 : window.scrollY,
  );
  const backState = (location.state as MarketplaceNavigationState | null)?.marketplaceBack;
  const enquiry = new URLSearchParams({ course: course.id, title: course.name, university: university.name });

  const factsCard = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Course facts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Fact label="Qualification">{course.qualification || course.level}</Fact>
          <Fact label="Study level">{course.level}</Fact>
          <Fact label="Duration">{duration}</Fact>
          <Fact label="Study mode">{course.study_mode || "Check official study mode"}</Fact>
          <Fact label="Campus">{course.campus || university.city || "Check official campus"}</Fact>
          <Fact label="International tuition">{sections.tuition}</Fact>
          <div className="col-span-2">
            <Fact label="Intake months">
              {sections.intakeMonths.length ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {sections.intakeMonths.map(monthName).join(" · ")}
                </span>
              ) : (
                INTAKE_FALLBACK
              )}
            </Fact>
          </div>
        </dl>
        <div className="space-y-2">
          <Button className="w-full" asChild>
            <Link to={`/student/applications/new?program=${course.id}`}>Apply Through UniDoxia</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/contact?${enquiry.toString()}`}>Ask About This Course</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const sourceCard = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Source &amp; freshness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Checked {checked}</p>
        <p>Course information may change. Verify key details before applying.</p>
        {sections.officialUrl && (
          <a
            className="inline-flex items-center font-medium text-primary hover:underline"
            href={sections.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            View official course page <ExternalLink className="ml-1 h-4 w-4 shrink-0" />
          </a>
        )}
      </CardContent>
    </Card>
  );

  const mainSections = (
    <>
      {sections.hasOverview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Course overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{sections.summary}</p>
          </CardContent>
        </Card>
      )}

      {sections.hasRequirements && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entry requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-1.5">
              <SubHeading>Academic requirements</SubHeading>
              <p className="leading-7">{sections.requirements || REQUIREMENTS_FALLBACK}</p>
            </div>
            {sections.english && (
              <div className="space-y-1.5">
                <SubHeading>English language requirements</SubHeading>
                <p className="leading-7">{sections.english}</p>
              </div>
            )}
            {sections.officialUrl && (
              <a
                className="inline-flex items-center font-medium text-primary hover:underline"
                href={sections.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                View official requirements <ExternalLink className="ml-1 h-4 w-4 shrink-0" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {sections.hasModules && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key modules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {sections.modules.map((module) => (
                <li key={module}>{module}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {sections.hasScholarships && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scholarships</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {sections.scholarships.map((scholarship) => (
                <li key={scholarship}>{scholarship}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {sections.hasPlacement && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Placement &amp; work experience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">{sections.placement}</p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:py-10">
      <SEO
        title={`${course.name} | ${university.name}`}
        description={sections.summary || `Official-source course information for ${course.name} at ${university.name}.`}
      />
      <BackButton fallback="/courses" label={backState?.label || "Browse courses"} showHistoryMenu={false} />
      <header className="max-w-4xl space-y-4">
        <Link
          state={universityState}
          className="text-sm font-medium text-primary hover:underline"
          to={`/universities/${university.slug || university.id}`}
        >
          {university.name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{course.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge>{course.level}</Badge>
          {course.qualification && <Badge variant="outline">{course.qualification}</Badge>}
          {course.discipline && <Badge variant="secondary">{course.discipline}</Badge>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            {[course.campus || university.city, university.country].filter(Boolean).join(", ")}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            {duration}
          </span>
        </div>
      </header>

      {sections.isSparse ? (
        // Nothing meaningful for the main column: use one narrow column so the
        // page never renders a tall empty content area beside the facts card.
        <div className="grid w-full max-w-2xl gap-6">
          {factsCard}
          {sourceCard}
        </div>
      ) : (
        <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">{mainSections}</div>
          <aside className="min-w-0 space-y-4 self-start lg:sticky lg:top-24">
            {factsCard}
            {sourceCard}
          </aside>
        </div>
      )}
    </main>
  );
}
