"use client";

import { type ComponentType } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  Plane,
  Route,
} from "lucide-react";

interface ServiceCard {
  key: string;
  title: string;
  description: string;
  capabilities: string[];
  icon: ComponentType<{ className?: string }>;
  accent: string;
}

const serviceCards: ServiceCard[] = [
  {
    key: "course-and-apply",
    title: "Choose your course and apply",
    description:
      "We help you find the right study option and submit a strong application.",
    capabilities: [
      "Discuss your goals with an experienced advisor.",
      "Shortlist courses and universities that match your profile.",
      "Prepare, check, and submit your application documents.",
      "Track your applications and respond to university requests.",
    ],
    icon: GraduationCap,
    accent: "from-sky-500 to-blue-500",
  },
  {
    key: "visa-prep",
    title: "Prepare for your visa",
    description:
      "Once you receive an offer, we guide you through the next requirements.",
    capabilities: [
      "Understand your offer conditions and important deadlines.",
      "Prepare the documents needed for your visa application.",
      "Get practical guidance for credibility interviews and proof of funds.",
      "Stay updated until your visa decision.",
    ],
    icon: FileCheck,
    accent: "from-amber-500 to-orange-500",
  },
  {
    key: "travel-arrival",
    title: "Plan your travel and arrival",
    description:
      "We help you prepare for departure and settle into your new study destination.",
    capabilities: [
      "Plan your accommodation and travel arrangements.",
      "Receive a pre-departure checklist for your destination.",
      "Know what to bring and what to expect on arrival.",
      "Stay connected to your advisor when you need support.",
    ],
    icon: Plane,
    accent: "from-emerald-500 to-teal-500",
  },
];

const journeyHighlights = [
  "Choose the right course and university with expert guidance.",
  "Prepare your visa application with clear, step-by-step support.",
  "Travel and arrive with confidence, knowing help is always available.",
];

export function ZoeExperienceSection() {
  return (
    <section className="relative overflow-hidden border-y border-primary/10 bg-muted/40 py-24">
      <div className="container mx-auto space-y-16 px-4">
        <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <Badge className="bg-primary/10 text-primary">
              Your UniDoxia journey
            </Badge>

            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                Personal guidance from application to arrival
              </h2>
              <p className="text-lg text-muted-foreground">
                We give you step-by-step support to choose the right course,
                prepare your visa application, and travel with confidence.
              </p>
            </div>

            <div className="space-y-6 rounded-[32px] border border-primary/20 bg-background/90 p-6 shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                How we support you
              </p>
              <ul className="space-y-3">
                {journeyHighlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="w-full rounded-2xl">
                <Link to="/free-consultation">
                  Start your free consultation
                </Link>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border border-primary/20 bg-background/95 shadow-2xl">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Route className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold">
                      Your study journey
                    </CardTitle>
                    <CardDescription>
                      From first question to final arrival
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  UniDoxia
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_55%)]" />
                  <div className="relative flex flex-col items-center gap-4 text-center">
                    <div className="flex h-40 w-40 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <BookOpen className="h-20 w-20" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-primary">
                        Guidance at every step
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Personal support for your course, visa, and travel decisions.
                      </p>
                    </div>
                    <Button asChild size="lg" className="mt-2 rounded-2xl shadow-lg">
                      <Link to="/free-consultation">
                        Start your free consultation
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                    What you can expect
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {journeyHighlights.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                Our student services
              </p>
              <h3 className="text-3xl font-semibold tracking-tight text-foreground">
                Support built around your goals
              </h3>
              <p className="text-base text-muted-foreground">
                Everything you need to move from application to arrival.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full shrink-0 rounded-2xl border-primary/30 px-6 text-foreground hover:border-primary hover:bg-primary/10 sm:w-auto md:self-auto"
            >
              <Link to="/free-consultation">Start your free consultation</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {serviceCards.map(
              ({ key, title, description, capabilities, icon: Icon, accent }) => (
                <Card
                  key={key}
                  className="flex h-full flex-col border border-border/60 bg-background shadow-lg"
                >
                  <CardHeader>
                    <div
                      className={cn(
                        "inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                        accent
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {capabilities.map((capability) => (
                      <div key={capability} className="rounded-xl bg-muted/40 p-3">
                        {capability}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ZoeExperienceSection;
