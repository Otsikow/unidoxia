"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/BackButton";
import { OnboardingProgressNav } from "@/components/onboarding/OnboardingProgressNav";
import { FileCheck, CheckCircle2, ArrowRight } from "lucide-react";

const visaCountries = [
  { code: "UK", flag: "🇬🇧", accent: "border-blue-500/40 bg-blue-500/5" },
  { code: "USA", flag: "🇺🇸", accent: "border-red-500/40 bg-red-500/5" },
  { code: "CAN", flag: "🇨🇦", accent: "border-red-500/40 bg-red-500/5" },
  { code: "DEU", flag: "🇩🇪", accent: "border-yellow-500/40 bg-yellow-500/5" },
  { code: "IRL", flag: "🇮🇪", accent: "border-emerald-500/40 bg-emerald-500/5" },
  { code: "AUS", flag: "🇦🇺", accent: "border-blue-500/40 bg-blue-500/5" },
];

const featureChips = [
  "Personalized checklists",
  "Step-by-step guidance",
  "Document tracking",
];

export default function OnboardingVisaRequirements() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-10 transition-opacity duration-700 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}>
        <div className="container mx-auto max-w-5xl">
          <BackButton fallback="/onboarding/welcome" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-5xl">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/70 shadow-2xl backdrop-blur-md px-6 py-8 sm:px-10 sm:py-12">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Visa guidance, simplified</p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                    Navigate Visa Requirements <span className="text-primary">Easily</span>
                  </h1>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Get personalized checklists and step-by-step guidance tailored to your destination. Stay on track with documents, appointments, and approvals.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl">
                  {visaCountries.map((country, index) => (
                    <div
                      key={country.code}
                      className={`relative flex items-center justify-between rounded-2xl border bg-muted/40 px-4 py-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${country.accent}`}
                      style={{ animationDelay: `${index * 80}ms`, animationDuration: "500ms" }}
                    >
                      <span className="text-2xl drop-shadow-sm">{country.flag}</span>
                      <span className="text-sm font-semibold text-muted-foreground">{country.code}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {featureChips.map((feature) => (
                    <Badge key={feature} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {feature}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-lg">💬</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Live student success squad</p>
                      <p className="text-xs text-muted-foreground">Real experts ready to help, 24/7</p>
                    </div>
                  </div>
                  <Button className="gap-2" size="lg" onClick={() => navigate("/onboarding/success-stories")}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Visa-ready support for UK, USA, Canada, Germany, Ireland, and Australia</span>
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 border border-border/60">
              <FileCheck className="h-4 w-4 text-primary" />
              <span>Organized visa documentation in one place</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 border border-border/60">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Trusted by thousands of students</span>
            </div>
          </div>

          <OnboardingProgressNav
            previousHref="/onboarding/welcome"
            previousLabel="Back to welcome"
            nextHref="/onboarding/success-stories"
            nextLabel="Next: Success stories"
            steps={[
              { label: "Welcome", href: "/onboarding/welcome" },
              { label: "Visa requirements", href: "/onboarding/visa-requirements", active: true },
              { label: "Student success", href: "/onboarding/success-stories" },
              { label: "Destinations", href: "/onboarding/destinations" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
