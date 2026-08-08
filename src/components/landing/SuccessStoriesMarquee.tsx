"use client";

import { Link } from "react-router-dom";
import { BookOpenCheck, FileCheck2, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const trustPoints = [
  {
    icon: ListChecks,
    title: "One application workspace",
    description: "Create your profile, organise documents and keep application activity together.",
  },
  {
    icon: FileCheck2,
    title: "Clear progress tracking",
    description: "See outstanding information, document requests and application updates in one place.",
  },
  {
    icon: BookOpenCheck,
    title: "Source-conscious guidance",
    description: "Use practical study guidance while confirming current requirements with official institutions.",
  },
  {
    icon: ShieldCheck,
    title: "Honest expectations",
    description: "UniDoxia provides support and technology, but does not guarantee admission, scholarships or visas.",
  },
];

export function SuccessStoriesMarquee({ className }: { className?: string }) {
  return (
    <section className={cn("border-y bg-muted/30 py-20", className)} aria-labelledby="trust-heading">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Built for transparent applications</p>
          <h2 id="trust-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
            Practical support without invented success claims
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            UniDoxia helps students make informed study decisions and manage their application journey. Outcomes always depend on the institution, immigration authority and the student&apos;s circumstances.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="h-full border-primary/15 bg-background/90">
              <CardContent className="p-6">
                <Icon className="h-9 w-9 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/auth/signup?role=student">Start Your Application</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/courses?view=programs">Explore Universities</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
