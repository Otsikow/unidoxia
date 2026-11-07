import { useAuth } from "@/hooks/useAuth";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  placementClient,
  placementError,
  placementRecommendationSchema,
  recommendationFee,
  type PlacementRecommendation,
} from "@/lib/placement";
import { Button } from "@/components/ui/button";
export function Recommendation({
  rec,
  staff = false,
  onSaved,
}: {
  rec: PlacementRecommendation;
  staff?: boolean;
  onSaved: () => Promise<unknown>;
}) {
  const { profile } = useAuth();
  const [response, setResponse] = useState<string>(rec.response || "");
  const [feedback, setFeedback] = useState(rec.student_feedback);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  async function save(withdraw = false) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = withdraw
        ? await placementClient.rpc(
            "withdraw_student_placement_recommendation",
            { p_recommendation_id: rec.id, p_version: rec.version },
          )
        : await placementClient.rpc("respond_student_placement", {
            p_recommendation_id: rec.id,
            p_response: response,
            p_feedback: feedback.trim(),
            p_version: rec.version,
          });
      if (result.error) throw result.error;
      placementRecommendationSchema.parse(result.data);
      await onSaved();
      setSuccess(
        withdraw
          ? "Recommendation withdrawn."
          : "Your preference has been saved for your adviser.",
      );
    } catch (e) {
      setError(placementError(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <article
      className="rounded-lg border p-4 sm:p-6 space-y-4 break-words"
      aria-labelledby={`recommendation-${rec.id}`}
    >
      <div>
        <p className="text-sm text-muted-foreground">
          {rec.country}
          {rec.withdrawn ? " · Withdrawn" : ""}
        </p>
        <h3 id={`recommendation-${rec.id}`} className="text-xl font-semibold">
          {rec.program_name}
        </h3>
        <p>{rec.university_name}</p>
      </div>
      <p className="whitespace-pre-wrap">{rec.rationale}</p>
      <div className="text-sm space-y-1">
        <p className="font-semibold">{recommendationFee(rec)}</p>
        {rec.tuition_source_url && (
          <p>
            <a
              className="underline"
              href={rec.tuition_source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tuition source (opens in a new tab)
            </a>
            {rec.tuition_checked_on && ` · Checked ${rec.tuition_checked_on}`}
          </p>
        )}
        <p>
          Confirm the applicable intake, fees and entry requirements before
          applying. Living costs and other charges are separate.
        </p>
      </div>
      {rec.scholarship_notes && (
        <div className="text-sm space-y-1">
          <h4 className="font-semibold">Potential scholarship information</h4>
          <p className="whitespace-pre-wrap">{rec.scholarship_notes}</p>
          {rec.scholarship_source_url && (
            <a
              className="underline"
              href={rec.scholarship_source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Scholarship source (opens in a new tab)
            </a>
          )}
          <p>
            Checked {rec.scholarship_checked_on}. Eligibility and awards require
            confirmation by the provider.
          </p>
        </div>
      )}
      {rec.program_id ? (
        <Link className="underline text-sm" to={`/courses/${rec.program_id}`}>
          View course listing
        </Link>
      ) : (
        <p className="text-sm">
          This catalogue listing is no longer available. Ask your adviser to
          review the option.
        </p>
      )}
      {staff ? (
        <div className="space-y-3 text-sm">
          <p>
            <strong>Student preference:</strong>{" "}
            {(
              {
                interested: "Wants to pursue this option",
                not_suitable: "Not suitable",
                question: "Has a question",
              } as Record<string, string>
            )[rec.response || ""] || "Awaiting student response"}
          </p>
          {rec.student_feedback && (
            <p className="whitespace-pre-wrap">{rec.student_feedback}</p>
          )}
          {!rec.withdrawn && (
            <div className="flex flex-wrap gap-4 items-center">
              {rec.response === "interested" && rec.program_id && (
                <Link
                  className="underline"
                  to={`${profile?.role === "admin" ? "/admin/applications/new" : "/dashboard/applications/new"}?student=${rec.student_id}&program=${rec.program_id}`}
                >
                  Prepare this application
                </Link>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void save(true)}
              >
                Withdraw recommendation
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label
            className="block text-sm font-medium"
            htmlFor={`response-${rec.id}`}
          >
            Your preference
          </label>
          <select
            id={`response-${rec.id}`}
            required
            className="w-full border rounded-md bg-background p-3"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          >
            <option value="">Choose your preference</option>
            <option value="interested">
              I would like to pursue this option
            </option>
            <option value="question">I have a question</option>
            <option value="not_suitable">This option is not suitable</option>
          </select>
          <label
            className="block text-sm font-medium"
            htmlFor={`feedback-${rec.id}`}
          >
            Questions or feedback
            {response === "interested" ? " (optional)" : ""}
          </label>
          <textarea
            id={`feedback-${rec.id}`}
            maxLength={4000}
            required={response !== "interested"}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full border rounded-md bg-background p-3"
            rows={3}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Share my preference"}
          </Button>
          <p className="text-xs text-muted-foreground">
            This records your preferred option. It does not submit an
            application, accept an offer or make a payment.
          </p>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm">
          {success}
        </p>
      )}
    </article>
  );
}
