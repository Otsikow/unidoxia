"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe2,
  GraduationCap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

/* -------------------------- STATIC DATA -------------------------- */

const portraits = [
  {
    name: "Kwame Boateng",
    title: "Agency Director, Accra",
    image:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Lerato Moyo",
    title: "Lead Recruiter, Nairobi",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
];

const featureHighlights = [
  {
    title: "Verified programs, ready to promote",
    description:
      "Curated university partnerships across top destinations with compliance-ready program sheets and marketing kits.",
  },
  {
    title: "Powerful agent workspace",
    description:
      "Import leads, track documents, collaborate with universities, and launch applications from a single dashboard.",
  },
  {
    title: "High commissions, transparent payouts",
    description:
      "Earn more with performance tiers, real-time commission tracking, and on-time settlements every intake.",
  },
];

const quickBenefits = [
  "Personalized onboarding with live support",
  "Visa-ready documentation checklists",
  "Global student pipeline analytics",
];

const onboardingSteps = [
  {
    title: "Orientation",
    description:
      "Meet verified agents and review the premium workspace overview.",
    status: "current" as const,
  },
  {
    title: "Earnings setup",
    description:
      "Activate commissions, compliance-ready kits, and payout preferences.",
    status: "next" as const,
  },
  {
    title: "Pipeline launch",
    description:
      "Import students, match programs, and share pre-approved options.",
    status: "upcoming" as const,
  },
  {
    title: "Go live",
    description:
      "Track conversions, monitor visas, and report outcomes confidently.",
    status: "upcoming" as const,
  },
];

/* -------------------------- UI ICON ORB -------------------------- */

const IconOrb = ({ icon: Icon }: { icon: typeof Globe2 }) => (
  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/30 shadow-lg shadow-primary/10 border border-primary/20 flex items-center justify-center text-primary">
    <Icon className="h-5 w-5" />
  </div>
);

/* =====================================================================
   AGENT ONBOARDING — PROFESSIONAL FLOW
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
  const earningsHref = `/agents/earnings?next=${encodeURIComponent(
    nextTarget
  )}`;

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
        description:
          "Welcome aboard! Redirecting you to your dashboard.",
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
    <div className="relative min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-indigo-100 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-50 via-primary/5 to-white blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10 md:py-14 relative space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2 text-slate-600"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button size="lg" className="gap-2" asChild>
            <Link to={earningsHref}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <OnboardingProgress
          currentStep={1}
          totalSteps={4}
          stepCompletion={0.55}
          label="Step into the UniDoxia agent experience"
        />

        {/* Content */}
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10">
          {/* LEFT */}
          <div className="space-y-8">
            <Badge variant="outline" className="text-primary">
              Premium Agent Onboarding
            </Badge>

            <h1 className="text-4xl md:text-5xl font-semibold">
              Built for serious recruitment partners
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl">
              Everything you need to recruit, convert, and earn — without
              chaos, guesswork, or hidden rules.
            </p>

            <div className="flex flex-wrap gap-3">
              {quickBenefits.map((benefit) => (
                <span
                  key={benefit}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {benefit}
                </span>
              ))}
            </div>

            {profile?.role === "agent" && (
              <Button
                size="lg"
                variant="secondary"
                onClick={markOnboarded}
                disabled={markingOnboarded}
              >
                {markingOnboarded
                  ? "Saving…"
                  : "Finish onboarding"}
              </Button>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Why UniDoxia</h3>
                  <IconOrb icon={Globe2} />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {featureHighlights.map((f) => (
                    <div
                      key={f.title}
                      className="rounded-xl border p-4 space-y-2"
                    >
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <p className="font-medium">{f.title}</p>
                      <p className="text-sm text-slate-600">
                        {f.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 grid sm:grid-cols-2 gap-4">
                {portraits.map((p) => (
                  <div
                    key={p.name}
                    className="rounded-xl overflow-hidden border"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-3">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-slate-600">
                        {p.title}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentOnboardingWelcome;
