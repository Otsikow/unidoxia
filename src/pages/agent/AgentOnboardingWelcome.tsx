"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Globe2, GraduationCap } from "lucide-react";
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
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Lerato Moyo",
    title: "Lead Recruiter, Nairobi",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
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
    description: "Earn more with performance tiers, real-time commission tracking, and on-time settlements every intake.",
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
    description: "Meet verified agents and review the premium workspace overview.",
    status: "current" as const,
  },
  {
    title: "Earnings setup",
    description: "Activate commissions, compliance-ready kits, and payout preferences.",
    status: "next" as const,
  },
  {
    title: "Pipeline launch",
    description: "Import students, match programs, and share pre-approved options.",
    status: "upcoming" as const,
  },
  {
    title: "Go live",
    description: "Track conversions, monitor visas, and report outcomes confidently.",
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

  /* --------------------- Handle ?next redirect param --------------------- */
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextTarget = nextParam ? decodeURIComponent(nextParam) : "/dashboard/leads";
  const earningsHref = `/agents/earnings?next=${encodeURIComponent(nextTarget)}`;

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/auth/login");
  }, [navigate]);

  /* --------------------- Auto-redirect if already onboarded --------------------- */
  useEffect(() => {
    if (profile?.role === "agent" && profile?.onboarded) {
      navigate("/dashboard/leads");
    }
  }, [profile?.role, profile?.onboarded, navigate]);

  /* --------------------- Mark onboarding as complete --------------------- */
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
      console.error("Unable to mark agent onboarding complete", error);
      toast({
        title: "Could not finish onboarding",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setMarkingOnboarded(false);
    }
  }, [profile?.role, profile?.onboarded, user?.id, refreshProfile, navigate, toast]);

  /* ===================================================================== */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-full border border-slate-200">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Agent onboarding</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Premium Onboarding</Badge>
                <span className="text-sm text-slate-600">Designed for UniDoxia Agents</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/auth/login">Preview dashboard</Link>
            </Button>
            <Button size="lg" className="gap-2 bg-primary text-white hover:bg-primary/90" asChild>
              <Link to={earningsHref}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <OnboardingProgress
          currentStep={1}
          totalSteps={4}
          stepCompletion={0.55}
          label="See what happens before you launch"
        />

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
          {/* LEFT PANEL */}
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary inline-flex items-center gap-2 bg-primary/5 rounded-full px-3 py-1">
                <Globe2 className="h-4 w-4" />
                Welcome to UniDoxia Agent Portal
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
                A focused onboarding for modern recruitment teams
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Run a premium student journey with verified programs, transparent commissions,
                and compliance-ready media kits. Each step keeps you on brand and on schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Verified programs", value: "2,400+" },
                { label: "Top destinations", value: "18" },
                { label: "Agent satisfaction", value: "4.9/5" },
              ].map((item) => (
                <Card key={item.label} className="bg-white/90 backdrop-blur border-slate-200 shadow-sm">
                  <CardContent className="py-4 px-5 space-y-1">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-slate-200 bg-white/90 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Navigation</p>
                    <p className="text-lg font-semibold text-slate-900">Follow the onboarding path</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">In progress</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {onboardingSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className={`rounded-2xl border px-4 py-3 transition-all ${
                        step.status === "current"
                          ? "border-primary/60 bg-primary/5 shadow-sm"
                          : step.status === "next"
                            ? "border-slate-200 bg-white"
                            : "border-dashed border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            step.status === "current"
                              ? "bg-primary text-white"
                              : step.status === "next"
                                ? "bg-slate-900 text-white"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {index + 1}
                        </div>
                        {step.title}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                      {step.status === "next" && (
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-primary font-medium">Up next</span>
                          <Link to={earningsHref} className="inline-flex items-center gap-1 text-primary hover:underline">
                            Go to step
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3 items-center">
              {quickBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-primary/15 px-4 py-2 shadow-sm text-sm text-slate-700"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL – PORTRAITS + HIGHLIGHTS */}
          <div className="space-y-6">
            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-white to-indigo-50" />
              <CardContent className="relative p-6 space-y-6">
                <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Live onboarding spotlight
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portraits.map((portrait) => (
                    <div
                      key={portrait.name}
                      className="relative rounded-2xl overflow-hidden border border-white/60 shadow-md bg-slate-900/80"
                    >
                      <img src={portrait.image} alt={portrait.name} className="h-60 w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-transparent" />

                      <div className="absolute top-3 right-3 flex items-center gap-2 bg-white/85 text-primary text-xs font-medium rounded-full px-3 py-1 shadow-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Verified Agent
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-white">
                        <div className="bg-white/15 backdrop-blur rounded-full p-2">
                          <LaptopGlyph />
                        </div>
                        <div>
                          <p className="font-semibold text-lg leading-tight">{portrait.name}</p>
                          <p className="text-sm text-white/80">{portrait.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-white/90 p-4 flex items-center gap-4 shadow-sm">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-indigo-100 flex items-center justify-center text-primary">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">Education-first storytelling</p>
                      <p className="text-sm text-slate-600">Compliance-ready program features ready to share with students.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-indigo-50 p-4 shadow-sm sm:col-span-3">
                    <p className="text-sm text-slate-500">Featured destinations</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["UK", "Canada", "USA", "Australia", "Ireland", "Germany"].map((country) => (
                        <span
                          key={country}
                          className="text-xs font-medium text-primary bg-white/80 border border-primary/20 rounded-full px-3 py-1"
                        >
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 text-white border-slate-800 shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80">Why UniDoxia</p>
                    <p className="text-lg font-semibold">A clear path to launch</p>
                  </div>
                  <IconOrb icon={Globe2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {featureHighlights.map((feature) => (
                    <div key={feature.title} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                      <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <SparkleGlyph />
                      </div>
                      <p className="font-semibold text-white">{feature.title}</p>
                      <p className="text-sm text-white/70">{feature.description}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-white/80">Need to pause? You can always return to this step.</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-white text-slate-900" asChild>
                      <Link to="/auth/login">Preview dashboard</Link>
                    </Button>
                    <Button className="gap-2 bg-primary hover:bg-primary/90" asChild>
                      <Link to={earningsHref}>
                        Continue to earnings
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------- ICONS -------------------------- */

const LaptopGlyph = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-white">
    <path
      fill="currentColor"
      d="M5 6.75A1.75 1.75 0 0 1 6.75 5h10.5A1.75 1.75 0 0 1 19 6.75v7.5A1.75 1.75 0 0 1 17.25 16h-10.5A1.75 1.75 0 0 1 5 14.25z"
      opacity="0.8"
    />
    <path
      fill="currentColor"
      d="M3 17.25A1.75 1.75 0 0 1 4.75 15.5h14.5A1.75 1.75 0 0 1 21 17.25c0 .966-.784 1.75-1.75 1.75H4.75A1.75 1.75 0 0 1 3 17.25Zm8.25-1.75a.75.75 0 1 0 0 1.5h1.5a.75.75 0 1 0 0-1.5z"
    />
  </svg>
);

const SparkleGlyph = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-primary">
    <path
      fill="currentColor"
      d="M12 2c.552 0 1 .448 1 1v2.5c0 .828.672 1.5 1.5 1.5H17c.552 0 1 .448 1 1s-.448 1-1 1h-2.5c-.828 0-1.5.672-1.5 1.5V14c0 .552-.448 1-1 1s-1-.448-1-1v-2.5c0-.828-.672-1.5-1.5-1.5H7c-.552 0-1-.448-1-1s.448-1 1-1h2.5C10.328 7 11 6.328 11 5.5V3c0-.552.448-1 1-1Z"
      opacity="0.9"
    />
    <path
      fill="currentColor"
      d="M6 17a.75.75 0 0 1 .75-.75h.5c.414 0 .75-.336.75-.75v-.5a.75.75 0 0 1 .75-.75.75.75 0 0 1 .75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75.75.75.75 0 0 1-.75-.75v-.5a.75.75 0 0 1-.75-.75h-.5A.75.75 0 0 1 6 17Zm9.5-8.25a.75.75 0 0 1 .75-.75h.25a.75.75 0 0 1 .75.75v.25a.75.75 0 0 1-.75.75h-.25a.75.75 0 0 1-.75-.75Z"
    />
  </svg>
);

export default AgentOnboardingWelcome;
