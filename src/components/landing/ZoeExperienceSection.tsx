"use client";

import { Link } from "react-router-dom";
import { Bot, FileSearch, ListTodo, SearchCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const capabilities = [
  {
    icon: SearchCheck,
    title: "Programme discovery",
    description: "Explore possible courses using the preferences and information you provide.",
  },
  {
    icon: FileSearch,
    title: "Document guidance",
    description: "Understand common document requirements and identify information to review.",
  },
  {
    icon: ListTodo,
    title: "Clear next steps",
    description: "Get help navigating the platform and preparing questions for an adviser or institution.",
  },
];

export function ZoeExperienceSection() {
  return (
    <section className="border-y border-primary/10 bg-muted/40 py-20" aria-labelledby="zoe-heading">
      <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="space-y-5">
          <Badge className="gap-2 bg-primary/10 text-primary">
            <Bot className="h-4 w-4" aria-hidden="true" /> Zoe AI-assisted guidance
          </Badge>
          <h2 id="zoe-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find your way through the study journey
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Zoe helps you navigate UniDoxia, explore study options and understand possible next steps using the information available to the platform.
          </p>
          <p className="text-sm text-muted-foreground">
            Zoe provides general guidance, not a guarantee of admission, funding or a visa. Always confirm current requirements with the relevant university or official authority.
          </p>
          <Button asChild size="lg">
            <Link to="/auth/signup?role=student">Start Your Application</Link>
          </Button>
        </div>

        <div
          className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"
          data-testid="zoe-capabilities-grid"
        >
          {capabilities.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="h-full border-primary/15 bg-background/90">
              <CardContent className="min-w-0 p-5 xl:p-6">
                <Icon className="h-9 w-9 text-primary" aria-hidden="true" />
                <h3 className="mt-4 break-normal text-lg font-semibold leading-snug [hyphens:none] [overflow-wrap:normal]">
                  {title}
                </h3>
                <p className="mt-2 break-normal text-sm leading-relaxed text-muted-foreground [hyphens:none] [overflow-wrap:normal]">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ZoeExperienceSection;
