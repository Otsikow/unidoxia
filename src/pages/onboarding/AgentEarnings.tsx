"use client";

import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, DollarSign, TrendingUp, Clock, Shield } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markOnboardingSeen } from "@/lib/onboardingStorage";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

/* -------------------------- STATIC DATA -------------------------- */

const earningsTiers = [
  { tier: "Starter", enrollments: "1-5", commission: "10%", highlight: false },
  { tier: "Growth", enrollments: "6-15", commission: "12%", highlight: false },
  { tier: "Pro", enrollments: "16-30", commission: "15%", highlight: true },
  { tier: "Elite", enrollments: "31+", commission: "18%", highlight: false },
];

const payoutFeatures = [
  {
    icon: Clock,
    title: "Weekly Payouts",
    description: "Get paid every Friday, no delays.",
  },
  {
    icon: Shield,
    title: "Protected Earnings",
    description: "Commission locked in at enrollment.",
  },
  {
    icon: TrendingUp,
    title: "Performance Bonuses",
    description: "Extra rewards for top performers.",
  },
];

const commissionHighlights = [
  "Transparent rate structure",
  "No hidden fees or deductions",
  "Multi-currency support",
];

/* =====================================================================
   AGENT ONBOARDING — EARNINGS OVERVIEW
   ===================================================================== */

const AgentEarnings = () => {
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextTarget = nextParam ? decodeURIComponent(nextParam) : "/auth/signup?role=agent";
  const backHref = `/agents/onboarding?next=${encodeURIComponent(nextTarget)}`;

  useEffect(() => {
    markOnboardingSeen("agent");
  }, []);

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

          <Button size="default" className="gap-2" asChild>
            <Link to={nextTarget}>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
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
              Earn More as You Grow
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our tiered commission structure rewards your success. 
              The more students you enroll, the higher your earnings.
            </p>
          </div>

          {/* Commission Tiers */}
          <Card className="border-border/50">
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Commission Tiers</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {earningsTiers.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`rounded-xl p-4 text-center transition-all ${
                      tier.highlight
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                        : "bg-muted"
                    }`}
                  >
                    <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                      tier.highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}>
                      {tier.tier}
                    </p>
                    <p className={`text-2xl font-bold mb-1 ${
                      tier.highlight ? "text-primary-foreground" : "text-foreground"
                    }`}>
                      {tier.commission}
                    </p>
                    <p className={`text-sm ${
                      tier.highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}>
                      {tier.enrollments} enrollments
                    </p>
                    {tier.highlight && (
                      <span className="inline-block mt-2 text-xs bg-primary-foreground/20 rounded-full px-2 py-0.5">
                        Most Popular
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                <p className="font-medium text-foreground shrink-0">What you get:</p>
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
              Ready to start earning? Create your account in less than 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
                <Link to={nextTarget}>
                  Create Your Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
