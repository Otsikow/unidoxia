import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStudentRecord } from "@/hooks/useStudentRecord";
import { usePlacement } from "@/hooks/usePlacement";
import { supabase } from "@/integrations/supabase/client";
import {
  initialReviewReadiness,
  placementError,
  placementStatuses,
} from "@/lib/placement";
import { getCourseFinderProfileSections } from "@/lib/coursefinderProfile";
import { areRequiredStudentDocumentsComplete } from "@/lib/studentDocuments";
import { StudyPlanForm } from "@/components/placement/StudyPlanForm";
import { Recommendation } from "@/components/placement/Recommendation";
import { Button } from "@/components/ui/button";

export default function PlacementDashboard() {
  const student = useStudentRecord();
  const placement = usePlacement(student.data?.id);
  const progress = useQuery({
    queryKey: ["placement-readiness", student.data?.id],
    enabled: Boolean(student.data?.id),
    retry: false,
    queryFn: async () => {
      const id = student.data!.id;
      const [education, tests, documents, applications] = await Promise.all([
        supabase.from("education_records").select("*").eq("student_id", id),
        supabase
          .from("test_scores")
          .select("test_type,total_score,test_date")
          .eq("student_id", id),
        supabase
          .from("student_documents")
          .select("document_type,storage_path,admin_review_status")
          .eq("student_id", id),
        supabase.from("applications").select("id,status").eq("student_id", id),
      ]);
      for (const result of [education, tests, documents, applications])
        if (result.error) throw result.error;
      return {
        education: education.data || [],
        tests: tests.data || [],
        documents: documents.data || [],
        applications: applications.data || [],
      };
    },
  });
  if (student.isLoading)
    return <p role="status">Loading your student journey…</p>;
  if (student.error)
    return (
      <div role="alert">
        Your student profile could not be loaded.{" "}
        <Button onClick={() => void student.refetch()}>Try again</Button>
      </div>
    );
  if (!student.data)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Your study abroad journey</h1>
        <p>
          Your student profile needs to be created before you share your study
          plans.
        </p>
        <Link className="underline" to="/student/profile">
          Create or recover your student profile
        </Link>
      </div>
    );
  const c = placement.data?.review;
  const recs = (placement.data?.recommendations || []).filter(
    (r) => !r.withdrawn,
  );
  const ready = progress.data
    ? initialReviewReadiness(
        student.data,
        progress.data.education.length,
        progress.data.documents,
      )
    : null;
  const sections = progress.data
    ? getCourseFinderProfileSections(
        student.data,
        progress.data.education.filter((e) => e.level !== "high_school"),
        progress.data.tests,
        areRequiredStudentDocumentsComplete(progress.data.documents),
      )
    : [];
  const personal =
    sections.length > 0 &&
    sections
      .filter((s) =>
        [
          "personal",
          "passport",
          "addresses",
          "emergency",
          "background",
        ].includes(s.id),
      )
      .every((s) => s.completed);
  const education =
    sections.length > 0 &&
    sections
      .filter((s) => ["academic", "history"].includes(s.id))
      .every((s) => s.completed);
  const applications = progress.data?.applications || [];
  const milestones = [
    {
      label: "Account registered",
      done: true,
      active: false,
      href: "/student/profile",
      detail: "Your student account is available.",
    },
    {
      label: "Personal profile completed",
      done: personal,
      active: false,
      href: "/student/profile#personal",
      detail:
        "Keep your personal, passport, address and background details up to date.",
    },
    {
      label: "Education history completed",
      done: education,
      active: false,
      href: "/student/profile#education",
      detail: "Add your qualifications, grades and study or work history.",
    },
    {
      label: "Documents uploaded",
      done: Boolean(ready?.documents),
      active: false,
      href: "/student/documents",
      detail:
        "Start with academic evidence. Staff still need to review each document.",
    },
    {
      label: "Submitted for UniDoxia review",
      done: Boolean(c?.submitted_at),
      active: false,
      href: "#study-plan",
      detail:
        "Submit your study plan when your initial academic evidence is available.",
    },
    {
      label: "University matching in progress",
      done: recs.length > 0,
      active: c?.status === "reviewing",
      href: "#study-plan",
      detail:
        "Your adviser researches academic suitability, costs and potential funding.",
    },
    {
      label: "Recommended options ready",
      done: recs.length > 0,
      active: false,
      href: "#recommendations",
      detail:
        "Read the recommendations and share your preferred options or questions.",
    },
    {
      label: "Applications and admissions progress",
      done: applications.some((a) => a.status === "enrolled"),
      active: applications.length > 0,
      href: "/student/applications",
      detail: applications.length
        ? `${applications.length} application record(s). Check each application for its current status.`
        : "After you choose suitable options, your adviser can help prepare your applications.",
    },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {student.data.reference_code}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Your study abroad journey
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Tell us about your ambitions and qualifications. UniDoxia researches
          suitable courses, university costs and potential scholarships. You
          decide which options to pursue.
        </p>
        <p className="font-medium" role="status">
          {c
            ? placementStatuses[c.status]
            : "Start with your profile and study plans"}
        </p>
        <Link to="/student/messages" className="underline">
          Speak to your adviser
        </Link>
      </header>
      <section
        aria-labelledby="journey-checklist"
        className="border rounded-lg p-4 sm:p-6"
      >
        <h2 id="journey-checklist" className="text-xl font-semibold mb-4">
          Your progress checklist
        </h2>
        {progress.isLoading ? (
          <p role="status">Checking your saved progress…</p>
        ) : progress.error ? (
          <div role="alert">
            <p>
              We could not check your progress. No completion status has been
              assumed.
            </p>
            <Button variant="outline" onClick={() => void progress.refetch()}>
              Check progress again
            </Button>
          </div>
        ) : (
          <ol className="grid md:grid-cols-2 gap-x-8">
            {milestones.map((m, i) => (
              <li key={m.label} className="py-4 border-b">
                <div className="flex gap-3">
                  <span
                    className="text-sm text-muted-foreground pt-1"
                    aria-hidden="true"
                  >
                    0{i + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-medium">
                      {m.href.startsWith("#") ? (
                        <a
                          className="underline underline-offset-4"
                          href={m.href}
                        >
                          {m.label}
                        </a>
                      ) : (
                        <Link
                          className="underline underline-offset-4"
                          to={m.href}
                        >
                          {m.label}
                        </Link>
                      )}
                    </h3>
                    <p className="text-sm font-medium">
                      {m.done
                        ? "Complete"
                        : m.active
                          ? "In progress"
                          : "Pending"}
                    </p>
                    <p className="text-sm text-muted-foreground">{m.detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      {placement.isLoading ? (
        <p role="status">Loading your adviser review…</p>
      ) : placement.error ? (
        <section role="alert" className="border rounded-lg p-6 space-y-3">
          <h2 className="text-xl font-semibold">
            Your adviser review could not be loaded
          </h2>
          <p>{placementError(placement.error)}</p>
          <Button onClick={() => void placement.refetch()}>
            Try loading the review again
          </Button>
          <p>
            <Link to="/student/profile" className="underline">
              Continue your profile
            </Link>{" "}
            or{" "}
            <Link to="/student/documents" className="underline">
              upload documents
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <section
            id="study-plan"
            className="border rounded-lg p-4 sm:p-6 space-y-5 scroll-mt-8"
            aria-labelledby="study-plan-title"
          >
            <h2 id="study-plan-title" className="text-2xl font-semibold">
              Your study plans
            </h2>
            {c?.review_notes && (
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold">A note from your adviser</h3>
                <p className="whitespace-pre-wrap">{c.review_notes}</p>
              </div>
            )}
            {!c || ["draft", "changes_requested"].includes(c.status) ? (
              <StudyPlanForm
                key={student.data.id}
                studentId={student.data.id}
                initialSubject={
                  student.data.preferred_course ||
                  student.data.preferred_study_area ||
                  ""
                }
                initialCountry={student.data.preferred_country || ""}
                review={c || null}
                ready={Boolean(
                  ready?.personal && ready.education && ready.documents,
                )}
                onSaved={() => placement.refetch()}
              />
            ) : (
              <div className="space-y-3">
                <p>
                  <strong>Subject:</strong> {c.intended_subject}
                </p>
                <p>
                  <strong>Destinations:</strong>{" "}
                  {c.preferred_countries.join(", ")}
                </p>
                <p>
                  <strong>Annual tuition budget:</strong>{" "}
                  {c.tuition_budget === null
                    ? "Advice requested"
                    : `${c.budget_currency} ${c.tuition_budget.toLocaleString("en-GB")}`}
                </p>
                {c.budget_notes && (
                  <p className="whitespace-pre-wrap">{c.budget_notes}</p>
                )}
                <p>
                  <strong>Scholarship research:</strong>{" "}
                  {c.scholarship_interest ? "Requested" : "Not requested"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your plan is with UniDoxia. Message your adviser if your
                  preferences change. Initial matching is separate from the
                  complete profile and documents needed for university
                  submission.
                </p>
                <Link className="underline" to="/student/messages">
                  Discuss your study plan
                </Link>
              </div>
            )}
          </section>
          <section
            id="recommendations"
            className="space-y-5 scroll-mt-8"
            aria-labelledby="recommendations-title"
          >
            <h2 id="recommendations-title" className="text-2xl font-semibold">
              Your adviser’s recommendations
            </h2>
            <p className="text-muted-foreground">
              These options are researched by UniDoxia. They do not guarantee
              admission, affordability or a scholarship award.
            </p>
            {recs.length ? (
              recs.map((r) => (
                <Recommendation
                  key={r.id}
                  rec={r}
                  onSaved={() => placement.refetch()}
                />
              ))
            ) : (
              <p className="border rounded-lg p-6">
                No adviser recommendations have been shared yet.{" "}
                {c?.status === "reviewing"
                  ? "University research is in progress."
                  : "Complete your study plan and request a review to get started."}
              </p>
            )}
          </section>
        </>
      )}
      <footer className="text-sm text-muted-foreground space-y-2">
        <p>
          Free for students. UniDoxia never charges students a fee.
        </p>
        <p>
          Optional resources:{" "}
          <Link className="underline" to="/courses">
            course finder
          </Link>
          ,{" "}
          <Link className="underline" to="/universities">
            university directory
          </Link>{" "}
          and{" "}
          <Link className="underline" to="/scholarships">
            scholarship information
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
