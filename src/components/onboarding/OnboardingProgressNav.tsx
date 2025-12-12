import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
    <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-primary/10 bg-white/70 p-4 shadow-lg shadow-primary/10 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link to={previousHref} aria-label={`Go back to ${previousLabel}`}>
            <ArrowLeft className="h-4 w-4" />
            {previousLabel}
          </Link>
        </Button>
        <Button asChild className="gap-2 shadow-md">
          <Link to={nextHref} aria-label={`Continue to ${nextLabel}`}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {steps && steps.length > 0 && (
        <div className="flex items-center gap-2" aria-label="Onboarding progress">
          {steps.map((step) => (
            <Link
              key={step.href}
              to={step.href}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${step.active ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
              aria-label={step.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
