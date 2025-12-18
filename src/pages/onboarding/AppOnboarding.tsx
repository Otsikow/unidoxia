"use client";

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, HeartHandshake, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OnboardingOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface OnboardingStep {
  id: string;
  title: string;
  question: string;
  helper: string;
  options: OnboardingOption[];
  calmingCopy: string;
}

const steps: OnboardingStep[] = [
  {
    id: "profile",
    title: "Start your profile",
    question: "What brings you to UniDoxia?",
    helper: "We’ll use this to find universities that fit you.",
    calmingCopy: "We only ask what’s needed to tailor your journey—no spam or pressure.",
    options: [
      {
        value: "undergraduate",
        label: "An undergraduate degree",
        description: "Bachelor’s programs with clear entry requirements and visa guidance.",
        icon: Sparkles,
      },
      {
        value: "postgraduate",
        label: "A postgraduate or masters",
        description: "Specialized masters or research-led programs with scholarship options.",
        icon: ShieldCheck,
      },
      {
        value: "pathway",
        label: "A pathway or foundation year",
        description: "University-ready courses that build language and academic confidence.",
        icon: MapPin,
      },
    ],
  },
  {
    id: "support",
    title: "Get matched and supported",
    question: "Where do you want the most support first?",
    helper: "Tell us your priorities so your advisor can focus on what matters to you.",
    calmingCopy: "A real person reviews your picks and checks in with simple, friendly updates.",
    options: [
      {
        value: "course",
        label: "Finding the right courses",
        description: "Shortlist universities that match your grades, budget, and goals.",
        icon: HeartHandshake,
      },
      {
        value: "documents",
        label: "Getting documents ready",
        description: "Know exactly which transcripts, tests, or recommendations to upload.",
        icon: ShieldCheck,
      },
      {
        value: "scholarships",
        label: "Unlocking scholarships",
        description: "Spot funding you’re eligible for and plan applications on time.",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "offers",
    title: "Receive offers and visa guidance",
    question: "When do you want to start studying abroad?",
    helper: "We’ll pace your offers, payments, and visa coaching around your timeline.",
    calmingCopy: "We’ll nudge you gently—no overwhelm—so you always know the next small step.",
    options: [
      {
        value: "next_intake",
        label: "Next intake (in 3-6 months)",
        description: "Fast-track offers and early visa prep so nothing slips.",
        icon: MapPin,
      },
      {
        value: "later_this_year",
        label: "Later this year",
        description: "Plan applications calmly with checkpoints and reminders.",
        icon: HeartHandshake,
      },
      {
        value: "exploring",
        label: "I’m still exploring",
        description: "We’ll share options and keep things light until you’re ready.",
        icon: ShieldCheck,
      },
    ],
  },
];

const AppOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextParam = searchParams.get("next");
  const nextTarget = nextParam ? decodeURIComponent(nextParam) : "/auth/signup?role=student";

  const progress = useMemo(() => Math.round(((currentStep + 1) / steps.length) * 100), [currentStep]);
  const activeStep = steps[currentStep];
  const selectedValue = answers[activeStep.id];

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [activeStep.id]: value }));
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    setCurrentStep((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!selectedValue) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    navigate(nextTarget, {
      replace: false,
      state: { onboardingAnswers: answers },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3 text-center">
            <Badge variant="outline" className="px-3 py-1 text-primary border-primary/30 bg-white/70">
              Guided onboarding • 3 simple steps
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground">
              Let’s map your 3-step UniDoxia journey
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              We’ll ask one question at a time, keep you in control, and pair you with a team that answers quickly in plain language.
            </p>
          </div>

          <Card className="border border-border/70 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <CardContent className="p-6 sm:p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
                    <p className="text-lg font-semibold text-foreground">{activeStep.title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Calm, human onboarding
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">{activeStep.question}</h2>
                <p className="text-sm text-muted-foreground">{activeStep.helper}</p>
                <p className="text-sm text-muted-foreground/90">{activeStep.calmingCopy}</p>
              </div>

              <div className="grid gap-3">
                {activeStep.options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedValue === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                        "bg-white/60 hover:bg-white border-border/70 hover:border-primary/30",
                        isSelected && "border-primary bg-primary/5 shadow-sm"
                      )}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 rounded-xl p-2 text-primary bg-primary/10",
                          isSelected && "bg-primary text-primary-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-foreground">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        <div
                          className={cn(
                            "mt-1 h-5 w-5 rounded-full border",
                            isSelected ? "border-primary bg-primary/20" : "border-border"
                          )}
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" className="gap-2" onClick={handleBack} disabled={currentStep === 0}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="gap-2"
                  onClick={handleNext}
                  disabled={!selectedValue}
                >
                  {currentStep === steps.length - 1 ? "Complete onboarding" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Your answers help us personalize guidance. You can update them with your advisor anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppOnboarding;
