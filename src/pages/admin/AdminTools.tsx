"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  ListChecks,
  Grid,
  Wrench,
  Megaphone,
  MessageSquare,
  BarChart3,
} from "lucide-react";

// ✅ Zoe Chat trigger
const openZoe = (prompt: string) => {
  window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt } }));
};

/* -------------------------------------------------------------------------- */
/* ✅ Admin Utilities (Zoe Orchestrated Tools)                                */
/* -------------------------------------------------------------------------- */
const adminUtilities = [
  {
    title: "Automation Studio",
    description:
      "Build, test, and deploy automation recipes for your admissions and finance workflows.",
    icon: Workflow,
    actions: [
      {
        label: "Blueprint library",
        prompt: "Show recommended automation blueprints for admissions triage.",
      },
      {
        label: "Detect blockers",
        prompt: "Audit failed automations blocking student onboarding this week.",
      },
    ],
  },
  {
    title: "Quality Toolkit",
    description:
      "Standardize QA reviews, audits, and compliance sweeps across the admin workspace.",
    icon: ListChecks,
    actions: [
      {
        label: "Launch QA checklist",
        prompt: "Generate a QA checklist for newly onboarded partners.",
      },
      {
        label: "Escalate with Zoe",
        prompt:
          "Summarize outstanding compliance items that require executive review.",
      },
    ],
  },
  {
    title: "Workspace Catalog",
    description:
      "Curate dashboards, partner spaces, and shared resources for privileged staff.",
    icon: Grid,
    actions: [
      {
        label: "Provision space",
        prompt:
          "Outline the steps to provision a partner success workspace for the APAC region.",
      },
      {
        label: "Content audit",
        prompt:
          "Evaluate content freshness for the global admissions workspace.",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* ✅ Admin Navigation Tools (Page Links)                                     */
/* -------------------------------------------------------------------------- */
const navigationTools = [
  {
    title: "Broadcast Centre",
    description:
      "Send urgent or scheduled announcements to every audience in a single workflow.",
    to: "/admin/tools/broadcast-center",
    icon: Megaphone,
    badge: "Global",
    badgeTone: "bg-primary/10 text-primary",
  },
  {
    title: "Admin Chat Console",
    description:
      "Coordinate with staff and agents through internal, auditable chat rooms.",
    to: "/admin/tools/chat-console",
    icon: MessageSquare,
    badge: "Internal",
    badgeTone:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
  },
  {
    title: "Performance Reports",
    description:
      "Generate polished PDF summaries of monthly activity for leadership reviews.",
    to: "/admin/tools/performance-reports",
    icon: BarChart3,
    badge: "Automated",
    badgeTone:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
];

/* -------------------------------------------------------------------------- */
/* ✅ Main Component                                                          */
/* -------------------------------------------------------------------------- */
const AdminTools = () => {
  return (
    <div className="space-y-12">
      {/* Zoe-Integrated Utilities Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="gap-1 text-xs uppercase tracking-wide"
          >
            <Wrench className="h-3.5 w-3.5" /> Tools Command Centre
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Operations Toolkit
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Launch automation blueprints, coordinate audits, and manage curated
            workspaces for your global admin team.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {adminUtilities.map((utility) => {
            const Icon = utility.icon;
            return (
              <Card key={utility.title} className="flex flex-col">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-xl font-semibold">
                        {utility.title}
                      </CardTitle>
                      <CardDescription>{utility.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <Separator />
                  <div className="space-y-2">
                    {utility.actions.map((action) => (
                      <Button
                        key={action.label}
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => openZoe(action.prompt)}
                      >
                        <Wrench className="h-4 w-4" />
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium">
                            {action.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Tap Zoe to orchestrate this workflow.
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Navigation Tools Section */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Admin Extensions
            </h2>
            <p className="text-sm text-muted-foreground">
              Extend the control center with broadcast messaging, collaboration,
              and performance insights.
            </p>
          </div>
          <Button asChild className="gap-2 shadow-sm" variant="default">
            <Link to="/admin/insights">
              <BarChart3 className="h-4 w-4" />
              View automation insights
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Workspace Integrations</CardTitle>
            <CardDescription>
              Launch dedicated consoles tailored for communication, coordination,
              and performance reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {navigationTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className="group block h-full rounded-lg border p-5 transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className={tool.badgeTone}>
                        {tool.badge}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{tool.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                      Open console
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How teams use these add-ons</CardTitle>
            <CardDescription>
              Activate only the tools your organization needs while maintaining a
              consistent governance model.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold">University Relations</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Share accreditation updates and recruiting pushes with one-click
                broadcast templates.
              </p>
            </div>
            <Separator className="md:hidden" />
            <div>
              <p className="text-sm font-semibold">Global Support</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Resolve escalations faster with dedicated chat channels and saved
                responses.
              </p>
            </div>
            <Separator className="md:hidden" />
            <div>
              <p className="text-sm font-semibold">Executive Leadership</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Deliver board-ready PDF summaries highlighting key pipelines and
                performance metrics.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminTools;
