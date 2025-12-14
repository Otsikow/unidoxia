import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProgressStep {
  label: string;
  href: string;
  active?: boolean;
}

interface OnboardingProgressNavProps {
  previousHref: string;
  previousLabel: string;
  nextHref: string;
  nextLabel: string;
  steps?: ProgressStep[];
}

export function OnboardingProgressNav({
  previousHref,
  previousLabel,
  nextHref,
  nextLabel,
  steps,
}: OnboardingProgressNavProps) {
  return (
    <div className="mt-10 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Button asChild variant="outline" className="w-full justify-center gap-2 rounded-xl sm:w-auto">
          <Link to={previousHref} aria-label={`Go back to ${previousLabel}`}>
            <ArrowLeft className="h-4 w-4" />
            {previousLabel}
          </Link>
        </Button>
        <Button asChild className="w-full justify-center gap-2 rounded-xl shadow-md sm:w-auto">
          <Link to={nextHref} aria-label={`Continue to ${nextLabel}`}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        </div>

        {steps && steps.length > 0 ? (
          <div
            className="flex items-center justify-center gap-2 sm:justify-end"
            aria-label="Onboarding progress"
          >
            {steps.map((step) => (
              <Link
                key={step.href}
                to={step.href}
                aria-label={step.label}
                aria-current={step.active ? "step" : undefined}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                  step.active
                    ? "bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
