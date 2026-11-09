import { useRef, useState } from "react";
import {
  placementClient,
  placementCaseSchema,
  placementError,
  type PlacementCase,
} from "@/lib/placement";
import { STUDY_DESTINATIONS } from "@/lib/studyDestinations";
import { Button } from "@/components/ui/button";
export function StudyPlanForm({
  studentId,
  review,
  ready,
  onSaved,
  initialSubject = "",
  initialCountry = "",
}: {
  studentId: string;
  review: PlacementCase | null;
  ready: boolean;
  onSaved: () => Promise<unknown>;
  initialSubject?: string;
  initialCountry?: string;
}) {
  const [subject, setSubject] = useState(
    review?.intended_subject || initialSubject,
  );
  const [countries, setCountries] = useState(
    review?.preferred_countries || (initialCountry ? [initialCountry] : []),
  );
  const [otherDestination, setOtherDestination] = useState("");
  const [budget, setBudget] = useState(
    review?.tuition_budget?.toString() || "",
  );
  const [currency, setCurrency] = useState(review?.budget_currency || "USD");
  const [budgetNotes, setBudgetNotes] = useState(review?.budget_notes || "");
  const [scholarship, setScholarship] = useState(
    review?.scholarship_interest === null || !review
      ? ""
      : String(review.scholarship_interest),
  );
  const [background, setBackground] = useState(
    review?.scholarship_background || "",
  );
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function save(submit: boolean) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const preferredCountries = [
        ...new Set([
          ...countries,
          ...(otherDestination.trim() ? [otherDestination.trim()] : []),
        ]),
      ];
      if (!preferredCountries.length)
        throw Error("Choose at least one preferred destination.");
      const result = await placementClient.rpc("save_student_placement", {
        p_student_id: studentId,
        p_preferences: {
          intended_subject: subject.trim(),
          preferred_countries: preferredCountries,
          tuition_budget: budget ? Number(budget) : null,
          budget_currency: currency,
          budget_notes: budgetNotes.trim(),
          scholarship_interest: scholarship === "true",
          scholarship_background: background.trim(),
        },
        p_submit: submit,
        p_version: review?.version || 0,
      });
      if (result.error) throw result.error;
      placementCaseSchema.parse(result.data);
      await onSaved();
      setSuccess(
        submit
          ? "Your study plan has been submitted for UniDoxia review."
          : "Your study plan has been saved.",
      );
    } catch (e) {
      setError(placementError(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const button = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        void save(button?.value === "submit");
      }}
    >
      <div>
        <label className="block font-medium mb-2" htmlFor="placement-subject">
          Subject or course interests
        </label>
        <input
          id="placement-subject"
          required
          maxLength={300}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border rounded-md bg-background p-3"
          placeholder="For example, nursing, computing or business"
        />
      </div>
      <fieldset>
        <legend className="font-medium mb-2">
          Preferred study destinations
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ...new Set([...STUDY_DESTINATIONS, ...countries, "Open to advice"]),
          ].map((country) => (
            <label className="flex items-center gap-3 min-h-11" key={country}>
              <input
                type="checkbox"
                className="size-5"
                checked={countries.includes(country)}
                onChange={(e) =>
                  setCountries((current) =>
                    e.target.checked
                      ? [...current, country]
                      : current.filter((c) => c !== country),
                  )
                }
              />
              {country}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label
          htmlFor="placement-other-destination"
          className="block font-medium mb-2"
        >
          Another destination (optional)
        </label>
        <input
          id="placement-other-destination"
          maxLength={80}
          value={otherDestination}
          onChange={(e) => setOtherDestination(e.target.value)}
          className="w-full border rounded-md bg-background p-3"
        />
        <p className="text-sm text-muted-foreground">
          Your adviser will confirm current course and application options for
          each destination.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-2" htmlFor="placement-budget">
            Annual tuition budget (optional)
          </label>
          <input
            id="placement-budget"
            type="number"
            min="1"
            max="10000000"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full border rounded-md bg-background p-3"
          />
        </div>
        <div>
          <label
            className="block font-medium mb-2"
            htmlFor="placement-currency"
          >
            Budget currency
          </label>
          <select
            id="placement-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full border rounded-md bg-background p-3"
          >
            {["USD", "GBP", "EUR", "CAD", "AUD", "NZD", "GHS", "NGN"].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </div>
      </div>
      <div>
        <label
          className="block font-medium mb-2"
          htmlFor="placement-budget-notes"
        >
          Funding constraints or advice needed{budget ? " (optional)" : ""}
        </label>
        <textarea
          id="placement-budget-notes"
          required={!budget}
          maxLength={4000}
          rows={3}
          value={budgetNotes}
          onChange={(e) => setBudgetNotes(e.target.value)}
          className="w-full border rounded-md bg-background p-3"
          placeholder="Tell us what is affordable, who will fund your studies, or if you need help setting a budget."
        />
        <p className="text-sm text-muted-foreground">
          This is a planning budget for tuition, not proof that funds or a visa
          are approved. Living costs are separate.
        </p>
      </div>
      <div>
        <label
          className="block font-medium mb-2"
          htmlFor="placement-scholarship"
        >
          Would you like us to research potential scholarships?
        </label>
        <select
          id="placement-scholarship"
          required
          value={scholarship}
          onChange={(e) => setScholarship(e.target.value)}
          className="w-full border rounded-md bg-background p-3"
        >
          <option value="">Choose an answer</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div>
        <label
          className="block font-medium mb-2"
          htmlFor="placement-background"
        >
          Scholarship background or other priorities (optional)
        </label>
        <textarea
          id="placement-background"
          maxLength={4000}
          rows={3}
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          className="w-full border rounded-md bg-background p-3"
          placeholder="Relevant grades, experience or funding circumstances. Eligibility needs to be checked against each provider’s rules."
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" value="save" variant="outline" disabled={busy}>
          Save study plan
        </Button>
        <Button type="submit" value="submit" disabled={busy || !ready}>
          {busy ? "Saving…" : "Submit for UniDoxia review"}
        </Button>
      </div>
      {!ready && (
        <p className="text-sm">
          Before requesting an initial review, add your name, email, nationality
          and education history, and upload an academic transcript or
          qualification certificate. Save your study plan while you prepare
          these.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Free for students. UniDoxia never charges students a fee.
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
    </form>
  );
}
