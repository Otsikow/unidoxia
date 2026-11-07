"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, DollarSign, TrendingUp, Clock, Shield } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markOnboardingSeen } from "@/lib/onboardingStorage";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* -------------------------- STATIC DATA -------------------------- */

const payoutFeatures = [
  {
    icon: Clock,
    title: "Payment Timing",
    description: "Check the agreed schedule and the conditions that must be met before payment.",
  },
  {
    icon: Shield,
    title: "Payment Conditions",
    description: "Confirm eligible applications, required evidence and any applicable adjustments.",
  },
  {
    icon: TrendingUp,
    title: "Written Agreement",
    description: "Review responsibilities and commercial terms with UniDoxia before you start.",
  },
];

const commissionHighlights = [
  "Confirm rates",
  "Check payment conditions",
  "Review currency and timing",
];

/* =====================================================================
   AGENT ONBOARDING — EARNINGS OVERVIEW
   ===================================================================== */

const AgentEarnings = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [finishing, setFinishing] = useState(false);

  const isAgent = profile?.role === "agent";
  const nextParam = searchParams.get("next");
  const defaultTarget = isAgent ? "/dashboard/leads" : "/auth/signup?role=agent";
  const rawTarget = nextParam ? decodeURIComponent(nextParam) : defaultTarget;
  // Never send a signed-in agent back into the onboarding flow (prevents a redirect loop).
  const nextTarget = isAgent && (rawTarget.startsWith("/agents/") || rawTarget.startsWith("/auth/")) ? "/dashboard/leads" : rawTarget;
  const backHref = `/agents/onboarding?next=${encodeURIComponent(nextTarget)}`;

  useEffect(() => {
    markOnboardingSeen("agent");
  }, []);

  // Finishing the flow must persist `onboarded`, otherwise the protected route
  // bounces the agent straight back to /agents/onboarding.
  const handleFinish = useCallback(async () => {
    if (!isAgent || !user?.id) {
      navigate(nextTarget);
      return;
    }

    if (profile?.onboarded) {
      navigate(nextTarget);
      return;
    }

    try {
      setFinishing(true);
      const { error } = await supabase
        .from("profiles")
        .update({ onboarded: true })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      navigate(nextTarget);
    } catch (error) {
      console.error("Unable to complete agent onboarding", error);
      toast({
        title: "Could not finish onboarding",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setFinishing(false);
    }
  }, [isAgent, user?.id, profile?.onboarded, navigate, nextTarget, refreshProfile, toast]);

  const ctaLabel = finishing ? "Finishing…" : isAgent ? "Go to Dashboard" : "Get Started";

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>

          <Button size="default" className="gap-2" onClick={handleFinish} disabled={finishing}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>


        {/* Progress */}
        <OnboardingProgress
          currentStep={2}
          totalSteps={2}
          stepCompletion={1}
          label="See how you earn"
        />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <DollarSign className="h-4 w-4" />
              Earnings Overview
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Understand Your Commission Terms
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discuss recruitment opportunities and confirm the terms that apply to your work with UniDoxia.
            </p>
          </div>

          <section className="border-y py-6 space-y-3">
            <h2 className="text-xl font-semibold">Confirm your commission terms</h2>
            <p className="text-muted-foreground">Before recruiting students, ask UniDoxia to confirm the applicable commission rate, payment conditions, currency and expected timing in writing. These depend on the agreed recruitment arrangement.</p>
            <Link to="/contact" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Discuss agent terms with UniDoxia</Link>
          </section>

          {/* Payout Features */}
          <div className="grid md:grid-cols-3 gap-4">
            {payoutFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Highlights */}
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <p className="font-medium text-foreground shrink-0">Discuss with UniDoxia:</p>
                <div className="flex flex-wrap gap-3">
                  {commissionHighlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center space-y-4 pt-4">
            <p className="text-muted-foreground">
              {isAgent
                ? "You're all set. Head to your dashboard and start adding students."
                : "Create an agent account to discuss the recruitment process with our team."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2"
                onClick={handleFinish}
                disabled={finishing}
              >
                {finishing ? "Finishing…" : isAgent ? "Go to Dashboard" : "Create Your Account"}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link to="/contact">Talk to Our Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentEarnings;
