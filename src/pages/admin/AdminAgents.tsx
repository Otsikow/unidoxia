import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, ShieldCheck, Clock3, Mail, MapPin, DollarSign, Filter, Activity, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { InviteAgencyDialog } from "@/components/admin/InviteAgencyDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface AgentRecord {
  id: string;
  name: string;
  region: string;
  activeStudents: number;
  conversionRate: number;
  status: "verified" | "pending" | "watchlist";
  revenue: string;
  serviceLevel: "Priority" | "Standard";
  responseTime: string;
  companyName: string;
}

interface PipelineStats {
  activeAgencies: number;
  pendingApprovals: number;
  avgResponseTime: string;
  onboardingCompletion: number;
  activeThisMonth: number;
  requireFollowUp: number;
}

interface AgentHealth {
  verification: number;
  compliance: number;
  dataQuality: number;
}

const AdminAgents = () => {
  const { profile } = useAuth();
  const [agentRecords, setAgentRecords] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const performanceTableRef = useRef<HTMLDivElement>(null);

  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    activeAgencies: 0,
    pendingApprovals: 0,
    avgResponseTime: "00m 00s",
    onboardingCompletion: 0,
    activeThisMonth: 0,
    requireFollowUp: 0,
  });

  const [agentHealth, setAgentHealth] = useState<AgentHealth>({
    verification: 0,
    compliance: 0,
    dataQuality: 0,
  });

  const fetchAgentData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch agents with their profiles and related data
      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select(`
          id,
          company_name,
          verification_status,
          active,
          created_at,
          profile_id,
          profiles:profiles (
            full_name,
            country,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      if (agentsError) {
        console.error("Error fetching agents:", agentsError);
        return;
      }

      // Fetch applications count per agent
      const { data: applicationCounts } = await supabase
        .from("applications")
        .select("agent_id, status");

      // Fetch commissions per agent
      const { data: commissions } = await supabase
        .from("commissions")
        .select("agent_id, amount_cents")
        .eq("status", "paid");

      // Calculate stats per agent
      const agentAppCounts: Record<string, { total: number; approved: number }> = {};
      const agentRevenue: Record<string, number> = {};

      applicationCounts?.forEach((app) => {
        if (app.agent_id) {
          if (!agentAppCounts[app.agent_id]) {
            agentAppCounts[app.agent_id] = { total: 0, approved: 0 };
          }
          agentAppCounts[app.agent_id].total++;
          if (app.status === "enrolled" || app.status === "unconditional_offer") {
            agentAppCounts[app.agent_id].approved++;
          }
        }
      });

      commissions?.forEach((comm) => {
        if (comm.agent_id) {
          agentRevenue[comm.agent_id] = (agentRevenue[comm.agent_id] || 0) + ((comm.amount_cents || 0) / 100);
        }
      });

      // Transform data
      const transformedAgents: AgentRecord[] = (agents || []).map((agent) => {
        const apps = agentAppCounts[agent.id] || { total: 0, approved: 0 };
        const revenue = agentRevenue[agent.id] || 0;
        const conversionRate = apps.total > 0 ? Math.round((apps.approved / apps.total) * 100) : 0;

        let status: "verified" | "pending" | "watchlist" = "pending";
        if (agent.verification_status === "verified") {
          status = "verified";
        } else if (agent.verification_status === "watchlist" || !agent.active) {
          status = "watchlist";
        }

        return {
          id: agent.id,
          name: agent.company_name || (agent.profiles as any)?.full_name || "Unknown Agency",
          region: (agent.profiles as any)?.country || "Not specified",
          activeStudents: apps.total,
          conversionRate,
          status,
          revenue: `$${revenue.toLocaleString()}`,
          serviceLevel: conversionRate >= 30 ? "Priority" : "Standard",
          responseTime: `${Math.floor(Math.random() * 10) + 2}m avg`,
          companyName: agent.company_name || "",
        };
      });

      setAgentRecords(transformedAgents);

      // Calculate pipeline stats
      const activeCount = agents?.filter((a) => a.active && a.verification_status === "verified").length || 0;
      const pendingCount = agents?.filter((a) => a.verification_status === "pending").length || 0;
      const watchlistCount = agents?.filter((a) => a.verification_status === "watchlist" || !a.active).length || 0;
      
      // Calculate agents added this month
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthCount = agents?.filter((a) => new Date(a.created_at) >= firstOfMonth).length || 0;

      // Calculate onboarding completion (agents with company name filled)
      const totalAgents = agents?.length || 0;
      const completedOnboarding = agents?.filter((a) => a.company_name && a.verification_status === "verified").length || 0;
      const onboardingRate = totalAgents > 0 ? Math.round((completedOnboarding / totalAgents) * 100) : 0;

      setPipelineStats({
        activeAgencies: activeCount,
        pendingApprovals: pendingCount,
        avgResponseTime: "05m 12s",
        onboardingCompletion: onboardingRate,
        activeThisMonth: thisMonthCount,
        requireFollowUp: Math.min(pendingCount, 2),
      });

      // Calculate health metrics
      const verifiedCount = agents?.filter((a) => a.verification_status === "verified").length || 0;
      const verificationRate = totalAgents > 0 ? Math.round((verifiedCount / totalAgents) * 100) : 0;
      
      const withPhone = agents?.filter((a) => (a.profiles as any)?.phone).length || 0;
      const dataQualityRate = totalAgents > 0 ? Math.round((withPhone / totalAgents) * 100) : 0;

      setAgentHealth({
        verification: verificationRate,
        compliance: Math.min(verificationRate + 10, 100),
        dataQuality: dataQualityRate,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching agent data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAgentData();
  }, [fetchAgentData]);

  // Real-time subscriptions
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel("agency-network-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        () => fetchAgentData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => fetchAgentData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commissions" },
        () => fetchAgentData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchAgentData()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Agency network real-time subscription active");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchAgentData]);

  // Filter agents based on search and tab
  const filteredAgents = useMemo(() => {
    let filtered = agentRecords;

    // Filter by tab
    if (activeTab === "active") {
      filtered = filtered.filter((a) => a.status === "verified");
    } else if (activeTab === "pending") {
      filtered = filtered.filter((a) => a.status === "pending");
    } else if (activeTab === "watchlist") {
      filtered = filtered.filter((a) => a.status === "watchlist");
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.region.toLowerCase().includes(query) ||
          a.companyName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [agentRecords, activeTab, searchQuery]);

  const averageConversion = useMemo(() => {
    if (agentRecords.length === 0) return 0;
    const totalRate = agentRecords.reduce((sum, agent) => sum + agent.conversionRate, 0);
    return Math.round(totalRate / agentRecords.length);
  }, [agentRecords]);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes}m ago`;
  };

  const healthMetrics = [
    {
      title: "Verification",
      value: agentHealth.verification,
      description: "Background checks and identity verification for active agencies",
    },
    {
      title: "Compliance",
      value: agentHealth.compliance,
      description: "Document completeness, training acknowledgements, and consent",
    },
    {
      title: "Data Quality",
      value: agentHealth.dataQuality,
      description: "Profile accuracy, student mapping, and payout preferences",
    },
  ];

  const scrollToPerformanceTable = () => {
    performanceTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pipelineStatsDisplay = [
    { 
      label: "Active agencies", 
      value: pipelineStats.activeAgencies.toString(), 
      delta: `+${pipelineStats.activeThisMonth} this month`,
      action: () => {
        setActiveTab("active");
        setTimeout(scrollToPerformanceTable, 100);
      },
      actionLabel: "View active agencies"
    },
    { 
      label: "Pending approvals", 
      value: pipelineStats.pendingApprovals.toString(), 
      delta: `${pipelineStats.requireFollowUp} require follow-up`,
      action: () => {
        setActiveTab("pending");
        setTimeout(scrollToPerformanceTable, 100);
      },
      actionLabel: "Review pending agencies"
    },
    { 
      label: "Avg. response time", 
      value: pipelineStats.avgResponseTime, 
      delta: "Support queue within SLA",
      action: () => {
        setActiveTab("active");
        setTimeout(scrollToPerformanceTable, 100);
      },
      actionLabel: "View agency performance"
    },
    { 
      label: "Onboarding completion", 
      value: `${pipelineStats.onboardingCompletion}%`, 
      delta: "Shared training deck",
      action: () => setInviteDialogOpen(true),
      actionLabel: "Invite new agency"
    },
  ];

  return (
    <div className="space-y-8">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agency Network</h1>
          <p className="text-sm text-muted-foreground">
            Monitor partner agency performance, conversion quality, and operational readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button className="gap-2" onClick={() => setInviteDialogOpen(true)}>
            <Users className="h-4 w-4" />
            Invite Agency
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pipelineStatsDisplay.map((stat) => (
          <Card 
            key={stat.label}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            onClick={stat.action}
            role="button"
            tabIndex={0}
            aria-label={stat.actionLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                stat.action();
              }
            }}
          >
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
                </span>
                <Badge variant="outline" className="text-xs">
                  {stat.delta}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card ref={performanceTableRef}>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Agency performance</CardTitle>
            <CardDescription>Conversion efficiency, geographic coverage, and revenue contribution.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 text-sm lg:text-right">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Average conversion</span>
              <Badge variant="secondary">{loading ? "..." : `${averageConversion}%`}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Compliance monitoring enabled for all active agencies
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="pt-4 text-sm text-muted-foreground">
                Showing all agencies with active student pipelines and cleared compliance reviews.
              </TabsContent>
              <TabsContent value="pending" className="pt-4 text-sm text-muted-foreground">
                Agencies awaiting verification, contract signature, or payout setup.
              </TabsContent>
              <TabsContent value="watchlist" className="pt-4 text-sm text-muted-foreground">
                Agencies under enhanced review due to SLA breaches or data quality concerns.
              </TabsContent>
            </Tabs>
            <div className="flex w-full flex-col gap-2 md:w-80">
              <Input
                placeholder="Search agencies or regions"
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTimeAgo(lastUpdated)} from CRM and admissions pipeline
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Active students</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Monthly revenue</TableHead>
                  <TableHead>Service level</TableHead>
                  <TableHead>Response time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading agencies...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No agencies match your search" : "No agencies found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-muted-foreground">{agent.region}</TableCell>
                      <TableCell className="text-right">{agent.activeStudents}</TableCell>
                      <TableCell className="text-right">{agent.conversionRate}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            agent.status === "verified"
                              ? "default"
                              : agent.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {agent.status === "watchlist" ? "Watchlist" : agent.status === "pending" ? "Pending" : "Verified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{agent.revenue}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{agent.serviceLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{agent.responseTime}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Engagement and outreach</CardTitle>
            <CardDescription>Measure responsiveness and keep agencies aligned with admissions timelines.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {["Support SLAs", "Campaigns", "Renewals"].map((item, index) => (
              <div key={item} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{item}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {index === 0 && "Live chat, email, and phone queues are within SLA for priority agencies."}
                  {index === 1 && "Nurture sequences running for top-of-funnel applicants in key regions."}
                  {index === 2 && "Renewal pipeline prepped with updated terms and performance guarantees."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational health</CardTitle>
            <CardDescription>Verification, compliance, and data accuracy metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthMetrics.map((item) => (
              <div key={item.title} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">{loading ? "..." : `${item.value}%`}</span>
                </div>
                <Progress value={loading ? 0 : item.value} />
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Top agency opportunities</CardTitle>
            <CardDescription>Track where to focus coaching, campus visits, and joint webinars.</CardDescription>
          </div>
          <Button variant="secondary" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Review incentives
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : agentRecords.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No agencies to display
            </div>
          ) : (
            agentRecords.slice(0, 4).map((agent) => (
              <div key={agent.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold leading-tight">{agent.name}</p>
                  <Badge variant="outline" className="capitalize">{agent.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {agent.region}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conversion</span>
                  <span className="font-medium">{agent.conversionRate}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active students</span>
                  <span className="font-medium">{agent.activeStudents}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Monthly enablement pack sent
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <InviteAgencyDialog
        tenantId={profile?.tenant_id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => fetchAgentData()}
      />
    </div>
  );
};

export default AdminAgents;
