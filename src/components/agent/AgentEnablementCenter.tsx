import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Megaphone,
  Headphones,
  Download,
  FileText,
  Image,
  Mail,
  Clock,
  Calendar,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface PipelineStage {
  key: string;
  label: string;
  description: string;
  count: number;
  color: string;
  icon: LucideIcon;
}

interface PipelineSummary {
  total: number;
  active: number;
  enrolled: number;
  conversionRate: number;
  recent: number;
}

interface AgentEnablementCenterProps {
  pipelineStages: PipelineStage[];
  summary: PipelineSummary;
}

const marketingCollateral = [
  {
    id: "program-playbook",
    title: "Global Course Match Playbook",
    description: "Co-branded brochure that highlights top-performing courses and includes talking points for parent calls.",
    format: "PDF",
    updated: "2 weeks ago",
    action: "Download Brochure",
    icon: FileText,
  },
  {
    id: "social-toolkit",
    title: "Student Recruitment Social Toolkit",
    description: "Editable Canva posts, Instagram stories, and short video scripts ready for local market promotion.",
    format: "Template",
    updated: "5 days ago",
    action: "Launch Toolkit",
    icon: Image,
  },
  {
    id: "nurture-sequence",
    title: "7-Day Nurture Email Sequence",
    description: "Personalized outreach templates segmented by study interest and application status.",
    format: "Email Copy",
    updated: "This week",
    action: "Copy Sequence",
    icon: Mail,
  },
];

const trainingModules = [
  {
    id: "matching",
    title: "Student Matching Masterclass",
    duration: "45 min",
    level: "Intermediate",
    nextSession: "Live lab: Apr 24",
    progress: 65,
    description: "Use the CRM to build shortlists and recommend best-fit courses using interest signals.",
  },
  {
    id: "conversion",
    title: "Closing Offers with Confidence",
    duration: "30 min",
    level: "Advanced",
    nextSession: "Replay available",
    progress: 20,
    description: "Follow proven frameworks for conditional offer follow-up and enrollment confirmation.",
  },
  {
    id: "marketing",
    title: "Marketing Accelerator Sprint",
    duration: "60 min",
    level: "Beginner",
    nextSession: "Next cohort: May 2",
    progress: 0,
    description: "Plan a 7-day promotional campaign using the collateral provided in your portal.",
  },
];

export default function AgentEnablementCenter({ pipelineStages, summary }: AgentEnablementCenterProps) {
  const safeTotal = summary.total || 1;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Dedicated CRM Workspace
          </CardTitle>
          <CardDescription>
            Monitor every student from first contact to enrollment with pipeline analytics and guided actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-primary/30 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-primary/70">Total in CRM</p>
              <p className="mt-2 text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Across all active pipelines</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-primary/70">Active Leads</p>
              <p className="mt-2 text-2xl font-bold">{summary.active}</p>
              <p className="text-xs text-muted-foreground">Students still moving through stages</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-primary/70">Conversion Rate</p>
              <p className="mt-2 text-2xl font-bold">{summary.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Enrolled vs. total pipeline</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-white/60 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-primary/70">Recent Updates</p>
              <p className="mt-2 text-2xl font-bold">{summary.recent}</p>
              <p className="text-xs text-muted-foreground">Status changes in the last 7 days</p>
            </div>
          </div>

          <div className="space-y-4">
            {pipelineStages.map((stage) => {
              const StageIcon = stage.icon;
              const progress = Math.round((stage.count / safeTotal) * 100);

              return (
                <div
                  key={stage.key}
                  className="rounded-xl border border-primary/30 bg-white/70 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r ${stage.color} text-white`}
                      >
                        <StageIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold">{stage.label}</h4>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {stage.count} students
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {progress}% of pipeline
                    </div>
                  </div>
                  <Progress value={progress} className="mt-4 h-2" />
                </div>
              );
            })}
          </div>

          <Button className="flex w-full items-center justify-center gap-2 sm:w-auto">
            Open CRM Workspace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Marketing Collateral Hub
          </CardTitle>
          <CardDescription>
            Download ready-to-use assets to promote courses and nurture leads across every channel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {marketingCollateral.map((resource) => {
            const ResourceIcon = resource.icon;
            return (
              <div
                key={resource.id}
                className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <ResourceIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{resource.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{resource.format}</Badge>
                      <Separator orientation="vertical" className="h-4" />
                      <span>Updated {resource.updated}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full md:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  {resource.action}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            On-Demand Training Library
          </CardTitle>
          <CardDescription>
            Stay sharp with micro-courses, live labs, and refreshers focused on faster student placements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {trainingModules.map((module) => (
            <div key={module.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold">{module.title}</h4>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {module.level}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                  {module.progress > 0 ? "Resume Module" : "Start Module"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {module.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {module.nextSession}
                </span>
              </div>
              <Progress value={module.progress} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
