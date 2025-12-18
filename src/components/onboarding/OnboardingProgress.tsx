import { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";

type OnboardingProgressProps = {
  currentStep: number;
  totalSteps: number;
  stepCompletion?: number;
  label?: string;
};

export function OnboardingProgress({
  currentStep,
  totalSteps,
  stepCompletion = 1,
  label,
}: OnboardingProgressProps) {
  const stepPortion = 100 / totalSteps;

  const target = useMemo(() => {
    const clampedCompletion = Math.min(Math.max(stepCompletion, 0), 1);
    const rawValue = (currentStep - 1) * stepPortion + clampedCompletion * stepPortion;
    return Math.min(100, Math.max(0, rawValue));
  }, [currentStep, stepCompletion, stepPortion]);

  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    const animation = setInterval(() => {
      setDisplayValue((prev) => {
        const delta = target - prev;
        if (Math.abs(delta) < 0.4) {
          clearInterval(animation);
          return target;
        }
        return prev + delta * 0.15;
      });
    }, 30);

    return () => clearInterval(animation);
  }, [target]);

  return (
    <div className="w-full max-w-3xl mx-auto mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-medium mb-2">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] sm:text-xs font-semibold text-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="hidden sm:inline">{label ?? "Stay focused and finish your onboarding"}</span>
        </div>
        <span className="text-primary text-sm sm:text-base">
          You&apos;re {Math.round(displayValue)}% done
        </span>
      </div>
      <Progress value={displayValue} className="h-2" />
    </div>
  );
}
