"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Globe,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

/* -------------------------- STATIC DATA -------------------------- */

const benefits = [
  {
    icon: Globe,
    title: "Global University Network",
    description: "Access 500+ verified programs across top destinations worldwide.",
  },
  {
    icon: DollarSign,
    title: "High Commissions",
    description: "Earn competitive rates with transparent tracking and timely payouts.",
  },
  {
    icon: Users,
    title: "Powerful Tools",
    description: "Manage leads, track applications, and collaborate from one dashboard.",
  },
];

const highlights = [
  "Verified programs ready to promote",
  "Real-time commission tracking",
  "Dedicated partner support",
];

/* =====================================================================
   AGENT ONBOARDING — WELCOME SCREEN
   ===================================================================== */

const AgentOnboardingWelcome = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [markingOnboarded, setMarkingOnboarded] = useState(false);

  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextTarget = nextParam
    ? decodeURIComponent(nextParam)
    : "/dashboard/leads";
  const earningsHref = `/agents/earnings?next=${encodeURIComponent(nextTarget)}`;

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/auth/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (profile?.role === "agent" && profile?.onboarded) {
      navigate("/dashboard/leads");
    }
  }, [profile?.role, profile?.onboarded, navigate]);

  const markOnboarded = useCallback(async () => {
    if (!user?.id || profile?.role !== "agent") {
      navigate("/auth/signup?role=agent");
      return;
    }

    if (profile.onboarded) {
      navigate("/dashboard/leads");
      return;
    }

    try {
      setMarkingOnboarded(true);

      const { error } = await supabase
        .from("profiles")
        .update({ onboarded: true })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Onboarding complete",
        description: "Welcome aboard! Redirecting you to your dashboard.",
      });

      navigate("/dashboard/leads");
    } catch (error) {
      console.error("Unable to mark onboarding complete", error);
      toast({
        title: "Could not finish onboarding",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setMarkingOnboarded(false);
    }
  }, [
    profile?.role,
    profile?.onboarded,
    user?.id,
    refreshProfile,
    navigate,
    toast,
  ]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button size="default" className="gap-2" asChild>
            <Link to={earningsHref}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Progress */}
        <OnboardingProgress
          currentStep={1}
          totalSteps={2}
          stepCompletion={0.5}
          label="Welcome to UniDoxia"
        />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              Agent Partner Program
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Grow Your Recruitment Business
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of agents earning commissions by connecting students 
              with world-class universities. Simple tools, transparent payouts.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card key={benefit.title} className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Highlights */}
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <p className="font-medium text-foreground shrink-0">Why agents choose us:</p>
                <div className="flex flex-wrap gap-3">
                  {highlights.map((highlight) => (
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
              <Link to={earningsHref}>
                See How You Earn
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            
            {profile?.role === "agent" && (
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={markOnboarded}
                disabled={markingOnboarded}
              >
                {markingOnboarded ? "Saving…" : "Skip to Dashboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentOnboardingWelcome;
