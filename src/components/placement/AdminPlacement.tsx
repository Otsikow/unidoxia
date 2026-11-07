import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePlacement } from "@/hooks/usePlacement";
import { supabase } from "@/integrations/supabase/client";
import {
  placementClient,
  placementError,
  placementStatuses,
  placementCaseSchema,
  placementRecommendationSchema,
} from "@/lib/placement";
import { Recommendation } from "./Recommendation";
import { Button } from "@/components/ui/button";
type Course = {
  id: string;
  name: string;
  university: { name: string; country: string };
};
export function AdminPlacement({ studentId }: { studentId: string }) {
  const query = usePlacement(studentId);
  const [notes, setNotes] = useState("");
  const [term, setTerm] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [program, setProgram] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  async function search(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError("");
    setCourses([]);
    setProgram("");
    setSearched(false);
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("id,name,university:universities!inner(name,country)")
        .eq("active", true)
        .ilike("name", `%${term.trim().replace(/[%_\\]/g, "\\$&")}%`)
        .order("name")
        .limit(30);
      if (error) throw error;
      setCourses((data || []) as Course[]);
      setSearched(true);
    } catch (e) {
      setError(placementError(e));
    } finally {
      setSearching(false);
    }
  }
  async function review(status: string) {
    if (!query.data?.review || guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await placementClient.rpc("review_student_placement", {
        p_student_id: studentId,
        p_status: status,
        p_notes: notes.trim(),
        p_version: query.data.review.version,
      });
      if (result.error) throw result.error;
      placementCaseSchema.parse(result.data);
      await query.refetch();
      setSuccess("Review progress saved.");
    } catch (e) {
      setError(placementError(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function share(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    const form = e.currentTarget;
    try {
      const fields = new FormData(form);
      const details = Object.fromEntries(
        [...fields.entries()].map(([k, v]) => [k, String(v).trim()]),
      );
      if (
        details.tuition_amount &&
        (!details.tuition_source_url || !details.tuition_checked_on)
      )
        throw Error(
          "Add the official tuition source and the date you checked it before sharing an amount.",
        );
      if (
        details.scholarship_notes &&
        (!details.scholarship_source_url || !details.scholarship_checked_on)
      )
        throw Error(
          "Add the official scholarship source and the date you checked its conditions.",
        );
      const payload = JSON.stringify({ program, details });
      if (!request.current || request.current.payload !== payload)
        request.current = { payload, id: crypto.randomUUID() };
      const result = await placementClient.rpc(
        "share_student_placement_recommendation",
        {
          p_student_id: studentId,
          p_program_id: program,
          p_details: details,
          p_id: request.current.id,
        },
      );
      if (result.error) throw result.error;
      placementRecommendationSchema.parse(result.data);
      await query.refetch();
      setSuccess("Recommendation shared with the student.");
      form.reset();
      request.current = null;
    } catch (e) {
      setError(placementError(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  if (query.isLoading) return <p role="status">Loading placement review…</p>;
  if (query.error)
    return (
      <div role="alert" className="space-y-3">
        <p>{placementError(query.error)}</p>
        <Button onClick={() => void query.refetch()}>
          Reload placement review
        </Button>
      </div>
    );
  const c = query.data?.review;
  return (
    <section className="space-y-6" aria-labelledby="admin-placement-title">
      <header className="space-y-2">
        <h2 id="admin-placement-title" className="text-2xl font-semibold">
          University matching and recommendations
        </h2>
        <p>
          Review the student’s qualifications and documents in the Education and
          Documents tabs before researching options. Share verified source
          information and explain any unresolved requirements.
        </p>
      </header>
      {!c ? (
        <p>
          No study plan has been saved yet. The student can add it from their
          dashboard.
        </p>
      ) : (
        <>
          <div className="border rounded-lg p-4 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">
              {placementStatuses[c.status]}
            </h3>
            <p>
              <strong>Subject:</strong> {c.intended_subject}
            </p>
            <p>
              <strong>Countries:</strong> {c.preferred_countries.join(", ")}
            </p>
            <p>
              <strong>Annual tuition budget:</strong>{" "}
              {c.tuition_budget === null
                ? "Advice requested"
                : `${c.budget_currency} ${c.tuition_budget.toLocaleString("en-GB")}`}
            </p>
            <p className="whitespace-pre-wrap">
              <strong>Funding constraints:</strong>{" "}
              {c.budget_notes || "Not supplied"}
            </p>
            <p>
              <strong>Scholarship research:</strong>{" "}
              {c.scholarship_interest ? "Requested" : "Not requested"}
            </p>
            <p className="whitespace-pre-wrap">{c.scholarship_background}</p>
            {c.review_notes && (
              <p className="whitespace-pre-wrap">
                <strong>Last shared adviser note:</strong> {c.review_notes}
              </p>
            )}
            {c.status !== "draft" && (
              <div className="space-y-3">
                <label
                  htmlFor="placement-review-note"
                  className="block font-medium"
                >
                  Note shared with the student
                </label>
                <textarea
                  id="placement-review-note"
                  value={notes}
                  maxLength={4000}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md bg-background p-3"
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={busy}
                    onClick={() => void review("reviewing")}
                  >
                    Start matching
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || notes.trim().length < 10}
                    onClick={() => void review("changes_requested")}
                  >
                    Request more information
                  </Button>
                </div>
              </div>
            )}
          </div>
          {["reviewing", "recommendations_ready"].includes(c.status) && (
            <div className="border rounded-lg p-4 sm:p-6 space-y-5">
              <h3 className="text-xl font-semibold">
                Research and share an option
              </h3>
              <form
                className="flex flex-col sm:flex-row gap-3"
                onSubmit={(e) => void search(e)}
              >
                <div className="flex-1">
                  <label
                    htmlFor="placement-course-search"
                    className="block text-sm font-medium mb-2"
                  >
                    Search catalogue courses
                  </label>
                  <input
                    id="placement-course-search"
                    required
                    minLength={2}
                    maxLength={100}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full border rounded-md bg-background p-3"
                    placeholder="For example, nursing or computing"
                  />
                </div>
                <Button
                  className="sm:self-end"
                  disabled={searching}
                  type="submit"
                >
                  {searching ? "Searching…" : "Search courses"}
                </Button>
              </form>
              {searched && !courses.length && (
                <p role="status">
                  No catalogue courses matched. Try another subject or arrange
                  verified catalogue research before sharing an option.
                </p>
              )}
              {courses.length > 0 && (
                <form onSubmit={(e) => void share(e)} className="space-y-4">
                  <label
                    className="block font-medium"
                    htmlFor="placement-course"
                  >
                    Course and university
                  </label>
                  <select
                    id="placement-course"
                    required
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full border rounded-md bg-background p-3"
                  >
                    <option value="">Choose a catalogue course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.university.name} · {c.university.country}
                      </option>
                    ))}
                  </select>
                  <label
                    className="block font-medium"
                    htmlFor="placement-rationale"
                  >
                    Why this option suits the student, including outstanding
                    requirements
                  </label>
                  <textarea
                    id="placement-rationale"
                    name="rationale"
                    required
                    minLength={20}
                    maxLength={4000}
                    rows={4}
                    className="w-full border rounded-md bg-background p-3"
                  />
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field
                      name="tuition_amount"
                      label="Verified tuition (leave blank if unknown)"
                      type="number"
                    />
                    <div>
                      <label
                        htmlFor="tuition_currency"
                        className="block text-sm font-medium mb-2"
                      >
                        Tuition currency
                      </label>
                      <select
                        name="tuition_currency"
                        id="tuition_currency"
                        className="w-full border rounded-md bg-background p-3"
                      >
                        {["USD", "GBP", "EUR", "CAD", "AUD", "NZD"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="tuition_period"
                        className="block text-sm font-medium mb-2"
                      >
                        Tuition period
                      </label>
                      <select
                        name="tuition_period"
                        id="tuition_period"
                        className="w-full border rounded-md bg-background p-3"
                      >
                        <option value="per_year">Per year</option>
                        <option value="per_semester">Per semester</option>
                        <option value="total_course">Total course</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      name="tuition_source_url"
                      label="Official tuition source, https URL"
                      type="url"
                    />
                    <Field
                      name="tuition_checked_on"
                      label="Tuition source checked on"
                      type="date"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A tuition amount requires its official source and the date
                    checked. Unknown fees remain unknown, not free. Confirm the
                    relevant intake and additional charges.
                  </p>
                  <label
                    htmlFor="placement-scholarship-notes"
                    className="block font-medium"
                  >
                    Potential scholarship and eligibility notes (optional)
                  </label>
                  <textarea
                    id="placement-scholarship-notes"
                    name="scholarship_notes"
                    maxLength={4000}
                    rows={3}
                    className="w-full border rounded-md bg-background p-3"
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      name="scholarship_source_url"
                      label="Official scholarship source, https URL"
                      type="url"
                    />
                    <Field
                      name="scholarship_checked_on"
                      label="Scholarship source checked on"
                      type="date"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scholarship information requires its source and date
                    checked. Explain conditions and deadlines. Do not promise
                    eligibility or an award.
                  </p>
                  <Button type="submit" disabled={busy || !program}>
                    {busy ? "Sharing…" : "Share recommendation with student"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-destructive">
          <p>{error}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Reload latest review
          </Button>
        </div>
      )}
      {success && <p role="status">{success}</p>}
      <div className="space-y-4">
        {query.data?.recommendations.map((r) => (
          <Recommendation
            key={r.id}
            rec={r}
            staff
            onSaved={() => query.refetch()}
          />
        ))}
      </div>
    </section>
  );
}
function Field({
  name,
  label,
  type,
}: {
  name: string;
  label: string;
  type: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        min={type === "number" ? "1" : undefined}
        max={
          type === "number"
            ? "10000000"
            : type === "date"
              ? new Date().toISOString().slice(0, 10)
              : undefined
        }
        step={type === "number" ? "0.01" : undefined}
        pattern={type === "url" ? "https://.*" : undefined}
        className="w-full border rounded-md bg-background p-3"
      />
    </div>
  );
}
