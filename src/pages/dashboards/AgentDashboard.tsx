import { useNavigate, useLocation, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import AgentDashboardOverview from "@/components/agent/AgentDashboardOverview";
import AgentStudentsManager from "@/components/agent/AgentStudentsManager";
import LeadsList from "@/components/agent/LeadsList";
import ResourceHub from "@/components/agent/ResourceHub";
import CommissionTracker from "@/components/agent/CommissionTracker";
import { AgentPartnerDiscovery } from "@/components/agent/AgentPartnerDiscovery";
import TaskManager from "@/components/ai/TaskManager";
import BulkImport from "@/components/agent/BulkImport";
import ApplicationTrackingSystem from "@/components/ats/ApplicationTrackingSystem";
import TaskManagement from "@/components/tasks/TaskManagement";
import PreferenceRanking from "@/components/ranking/PreferenceRanking";
import CommissionManagement from "@/components/commission/CommissionManagement";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAgentProfileCompletion } from "@/hooks/useAgentProfileCompletion";
import { useAuth } from "@/hooks/useAuth";

import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BarChart3,
  ClipboardList,
  Star,
  DollarSign,
  Upload,
  GraduationCap,
  Handshake,
  Building2,
  Search,
  ShieldCheck,
} from "lucide-react";

import BackButton from "@/components/BackButton";
import { cn } from "@/lib/utils";

const tabItems = [
  { value: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { value: "applications" as const, label: "Applications", icon: BarChart3 },
  { value: "leads" as const, label: "Leads", icon: Users },
  { value: "students" as const, label: "Students", icon: GraduationCap },
  { value: "tasks" as const, label: "Tasks", icon: ClipboardList },
  { value: "ranking" as const, label: "Ranking", icon: Star },
  { value: "commissions" as const, label: "Commissions", icon: DollarSign },
  { value: "import" as const, label: "Import", icon: Upload },
  { value: "partners" as const, label: "Partners", icon: Handshake },
  { value: "resources" as const, label: "Resources", icon: FolderOpen },
];

export default function AgentDashboard() {
  const { profile } = useAuth();
  const isAgent = profile?.role === "agent";
  const {
    completion: agentCompletion,
    checklist: agentChecklist,
    isLoading: agentCompletionLoading,
  } = useAgentProfileCompletion();

  const navigate = useNavigate();
  const location = useLocation();

  const validTabs = [
    "overview",
    "applications",
    "leads",
    "students",
    "tasks",
    "ranking",
    "commissions",
    "import",
    "partners",
    "resources",
  ] as const;

  const tabToPath: Record<(typeof validTabs)[number], string> = {
    overview: "/dashboard",
    applications: "/dashboard/applications",
    leads: "/dashboard/leads",
    students: "/dashboard/students",
    tasks: "/dashboard/tasks",
    ranking: "/dashboard/ranking",
    commissions: "/dashboard/commissions",
    import: "/dashboard/import",
    partners: "/dashboard/partners",
    resources: "/dashboard/resources",
  };

  const pathToTab: Record<string, (typeof validTabs)[number]> = {
    overview: "overview",
    applications: "applications",
    leads: "leads",
    "my-leads": "leads",
    students: "students",
    "my-students": "students",
    tasks: "tasks",
    ranking: "ranking",
    "my-ranking": "ranking",
    commissions: "commissions",
    import: "import",
    partners: "partners",
    resources: "resources",
  };

  const pathSegment = location.pathname.split("/")[2] || "overview";
  const currentTab = pathToTab[pathSegment] ?? "overview";

  const handleTabChange = (value: (typeof validTabs)[number]) => {
    const targetPath = tabToPath[value] ?? `/dashboard/${value}`;
    navigate(targetPath);
  };

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-4">
            <BackButton variant="ghost" size="sm" fallback="/dashboard" className="shrink-0 h-8 w-8 sm:h-9 sm:w-9" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">
                Agent Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Manage students, track performance, and access resources
              </p>
            </div>
          </div>

          {isAgent && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Complete your agent profile
                  </CardTitle>
                  <CardDescription>
                    Finish your details to unlock applications and commissions.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-2 h-9">
                  <Link to="/agent/settings">Update profile</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {agentCompletionLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-2 rounded bg-muted animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Profile completeness</span>
                      <span>{agentCompletion.percentage}%</span>
                    </div>
                    <Progress value={agentCompletion.percentage} className="h-2" />
                    {agentCompletion.percentage < 100 && (
                      <p className="text-xs text-muted-foreground">
                        Next steps: {agentChecklist.filter((item) => !item.isComplete).map((item) => item.label).slice(0, 2).join(', ') || 'Add your agent details'}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Tabs */}
          <TooltipProvider delayDuration={200}>
            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
              <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
                <div className="overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8">
                  <TabsList className="inline-flex h-auto min-w-full gap-1 rounded-xl bg-muted/50 p-1.5 backdrop-blur-sm">
                    {tabItems.map(({ value, label, icon: Icon }) => (
                      <Tooltip key={value}>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value={value}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                              "text-muted-foreground hover:text-foreground hover:bg-background/60",
                              "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                              "whitespace-nowrap"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                            <span className="hidden sm:inline">{label}</span>
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="sm:hidden">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TabsList>
                </div>
              </div>

              {/* Overview */}
              <TabsContent value="overview">
                <AgentDashboardOverview />
              </TabsContent>

              {/* Applications */}
              <TabsContent value="applications">
                <ApplicationTrackingSystem />
              </TabsContent>

              {/* Leads */}
              <TabsContent value="leads">
                <LeadsList />
              </TabsContent>

              {/* Students */}
              <TabsContent value="students">
                <AgentStudentsManager />
              </TabsContent>

              {/* Tasks */}
              <TabsContent value="tasks">
                <TaskManager />
                <TaskManagement />
              </TabsContent>

              {/* Ranking */}
              <TabsContent value="ranking">
                <PreferenceRanking />
              </TabsContent>

              {/* Commissions */}
              <TabsContent value="commissions">
                <CommissionTracker />
                <CommissionManagement />
              </TabsContent>

              {/* Import */}
              <TabsContent value="import">
                <BulkImport />
              </TabsContent>

              {/* Partners */}
              <TabsContent value="partners">
                <AgentPartnerDiscovery />
              </TabsContent>

              {/* Resources */}
              <TabsContent value="resources">
                <ResourceHub />
              </TabsContent>
            </Tabs>
          </TooltipProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
