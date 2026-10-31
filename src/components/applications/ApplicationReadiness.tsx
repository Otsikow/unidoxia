import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  applicationReadiness,
  type ReadinessInput,
} from "@/lib/applicationReadiness";

export function ApplicationReadiness({
  application,
  onOpenSection,
}: {
  application: ReadinessInput;
  onOpenSection: (section: string) => void;
}) {
  const checks = applicationReadiness(application);
  const complete = checks.filter((check) => check.complete).length;
  return (
    <section
      className="space-y-3 rounded-lg border p-4"
      aria-label="Application readiness"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Application readiness</h3>
        <Badge variant="secondary">
          {complete} of {checks.length} checks complete
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {complete === checks.length
          ? "Recorded checks are complete. Confirm the institution’s requirements and the student’s sharing authorisation before submitting."
          : "Complete the checks below, then confirm the institution’s requirements and the student’s sharing authorisation."}
      </p>
      <ul className="divide-y">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span>
              {check.label}
              <span
                className={
                  check.complete
                    ? "ml-2 text-green-700 dark:text-green-400"
                    : "ml-2 text-amber-800 dark:text-amber-400"
                }
              >
                {check.complete ? "Complete" : "Needs attention"}
              </span>
            </span>
            {check.section !== "overview" && (
              <Button
                variant="link"
                size="sm"
                onClick={() => onOpenSection(check.section)}
              >
                Review
                <span className="sr-only"> {check.label.toLowerCase()}</span>
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        These checks use this application’s saved records. They do not confirm
        admission eligibility, file availability or university submission.
      </p>
    </section>
  );
}
