"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Globe2, GraduationCap, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const IconOrb = ({ icon: Icon }: { icon: typeof Globe2 }) => (
  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/30 shadow-lg shadow-primary/10 border border-primary/20 flex items-center justify-center text-primary">
    <Icon className="h-5 w-5" />
  </div>
);

const AgentOnboardingWelcome = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [markingOnboarded, setMarkingOnboarded] = useState(false);

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
        description: "Welcome aboard! Redirecting you to your leads dashboard.",
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
  }, [navigate, profile?.role, profile?.onboarded, refreshProfile, toast, user?.id]);

  useEffect(() => {
    if (profile?.role === "agent" && profile.onboarded) {
      navigate("/dashboard/leads");
    }
  }, [navigate, profile?.onboarded, profile?.role]);

  return (
    <div className="relative min-h-screen bg-white text-slate-900 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-indigo-100 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-50 via-primary/5 to-white blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-8 py-14 md:py-20 relative">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full bg-primary/5 px-4 py-2 shadow-sm shadow-primary/10 border border-primary/10">
              <Badge variant="outline" className="bg-white text-primary border-primary/30">
                Premium Onboarding
              </Badge>
              <span className="text-sm text-muted-foreground">Designed for high-performing UniDoxia Agents</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-slate-900">
                Welcome to UniDoxia Agent Portal
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Grow your recruitment business with verified programs, high commissions, and a powerful dashboard. Deliver a
                premium experience to students while keeping every intake on track.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/auth/signup" className="flex items-center gap-2">
                  Launch onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 border-slate-200" asChild>
                <Link to="/auth/login" className="flex items-center gap-2">
                  Preview dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {profile?.role === "agent" && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2"
                  onClick={markOnboarded}
                  disabled={markingOnboarded}
                >
                  {markingOnboarded ? "Saving..." : "Finish onboarding"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Verified programs", value: "2,400+" },
                { label: "Top destinations", value: "18" },
                { label: "Agent satisfaction", value: "4.9/5" },
              ].map((item) => (
                <Card key={item.label} className="bg-white/80 backdrop-blur border-slate-200 shadow-sm">
                  <CardContent className="py-4 px-5">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full max-w-xl lg:max-w-none relative">
            <div className="absolute -top-10 -right-6 hidden lg:block">
              <IconOrb icon={Globe2} />
            </div>
            <div className="absolute -bottom-6 -left-2 hidden lg:block">
              <IconOrb icon={GraduationCap} />
            </div>
            <div className="absolute -top-4 left-10 hidden lg:block">
              <IconOrb icon={MapPin} />
            </div>

            <Card className="relative overflow-hidden bg-white/80 border border-slate-200 shadow-2xl shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-indigo-50" />
              <CardContent className="relative p-6 md:p-8">
                <div className="flex flex-col gap-5">
                  <div className="inline-flex items-center gap-2 text-sm text-primary font-medium bg-primary/5 rounded-full px-3 py-1 self-start">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Live onboarding spotlight
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {portraits.map((portrait) => (
                      <div
                        key={portrait.name}
                        className="relative rounded-3xl overflow-hidden border border-white/60 shadow-xl shadow-primary/15 bg-white"
                      >
                        <img
                          src={portrait.image}
                          alt={`${portrait.name} holding a laptop`}
                          className="h-64 w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/65 via-slate-900/20 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-white">
                          <div className="bg-white/20 backdrop-blur rounded-full p-2">
                            <LaptopGlyph />
                          </div>
                          <div>
                            <p className="font-semibold text-lg leading-tight">{portrait.name}</p>
                            <p className="text-sm text-white/80">{portrait.title}</p>
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/80 text-primary text-xs font-medium rounded-full px-3 py-1 shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified Agent
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="sm:col-span-2 rounded-2xl border border-primary/15 bg-white/80 shadow-inner shadow-primary/5 p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-indigo-100 flex items-center justify-center text-primary">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">Education-first storytelling</p>
                        <p className="text-sm text-slate-600">
                          Showcasing global programs with compliance-ready media kits and destination spotlights.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-indigo-50 p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Featured destinations</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["UK", "Canada", "USA", "UAE", "Australia"].map((country) => (
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {featureHighlights.map((feature) => (
            <Card key={feature.title} className="h-full bg-white/90 border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <SparkleGlyph />
                  </div>
                  <p className="font-semibold text-lg text-slate-900">{feature.title}</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 items-center">
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
    </div>
  );
};

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
