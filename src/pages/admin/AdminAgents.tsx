import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  CreditCard,
  Download,
  FileWarning,
  Filter,
  Loader2,
  MessageSquare,
  PauseCircle,
  PoundSterling,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
  View,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { InviteAgencyDialog } from "@/components/admin/InviteAgencyDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ComplianceStatus = "green" | "amber" | "red";
type AgentFilter = "all" | "high" | "medium" | "low" | "risk" | "pending" | "highRevenue" | "declining";

interface AgentRecord {
  id: string;
  name: string;
  country: string;
  totalStudents: number;
  applicationsSubmitted: number;
  offersReceived: number;
  enrolledStudents: number;
  conversionRate: number;
  revenueGenerated: number;
  commissionOwed: number;
  commissionPaid: number;
  complianceStatus: ComplianceStatus;
  riskScore: number;
  performanceScore: number;
  performanceInsight: string;
  lastActivityAt: string | null;
  lastMonthConversionRate: number;
  pendingApproval: boolean;
}

interface MetricCard {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  onClick: () => void;
  format?: "number" | "currency";
}

interface InsightItem {
  id: string;
  tone: "positive" | "warning" | "critical";
  text: string;
}

const ENROLLED_STATUSES = new Set(["enrolled"]);
const OFFER_STATUSES = new Set(["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"]);
const MONTHLY_REVENUE_PER_ENROLLED = 1800;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? "0%" : "+100%";
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
};

const getMonthDateRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const isDateInRange = (dateString: string | null, start: Date, end: Date) => {
  if (!dateString) return false;
  const value = new Date(dateString);
  return value >= start && value <= end;
};

const getRelativeTime = (dateString: string | null) => {
  if (!dateString) return "No recent activity";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getComplianceStatus = (verificationStatus: string | null, hasVerificationDoc: boolean, active: boolean | null): ComplianceStatus => {
  if (!active || verificationStatus === "watchlist") return "red";
  if (verificationStatus === "verified" && hasVerificationDoc) return "green";
  return "amber";
};

const complianceBadgeClass = {
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  red: "bg-red-500/15 text-red-300 border-red-500/40",
};

const AdminAgents = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<AgentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [monthlySummary, setMonthlySummary] = useState({
    applicationsCurrent: 0,
    applicationsPrevious: 0,
    offersCurrent: 0,
    offersPrevious: 0,
    enrolmentsCurrent: 0,
    enrolmentsPrevious: 0,
    commissionOwedCurrent: 0,
    commissionOwedPrevious: 0,
    commissionPaidCurrent: 0,
    commissionPaidPrevious: 0,
  });

  const computePerformanceScore = useCallback(
    (agent: {
      conversionRate: number;
      responseSpeedScore: number;
      applicationQualityScore: number;
      complianceScore: number;
      revenueScore: number;
      offerToEnrolmentScore: number;
    }) => {
      const weighted =
        agent.conversionRate * 0.28 +
        agent.responseSpeedScore * 0.1 +
        agent.applicationQualityScore * 0.14 +
        agent.complianceScore * 0.18 +
        agent.revenueScore * 0.2 +
        agent.offerToEnrolmentScore * 0.1;
      return Math.max(0, Math.min(100, Math.round(weighted)));
    },
    []
  );

  const computeRiskScore = useCallback(
    (agent: {
      complianceStatus: ComplianceStatus;
      conversionRate: number;
      daysSinceActivity: number;
      commissionOwed: number;
      pendingApproval: boolean;
      trendDown: boolean;
    }) => {
      const complianceRisk = agent.complianceStatus === "red" ? 35 : agent.complianceStatus === "amber" ? 20 : 5;
      const conversionRisk = agent.conversionRate < 12 ? 25 : agent.conversionRate < 20 ? 15 : 5;
      const inactivityRisk = agent.daysSinceActivity > 30 ? 20 : agent.daysSinceActivity > 14 ? 12 : 4;
      const financialRisk = agent.commissionOwed > 7000 ? 10 : agent.commissionOwed > 3000 ? 6 : 2;
      const governanceRisk = agent.pendingApproval ? 10 : 0;
      const trendRisk = agent.trendDown ? 8 : 0;
      return Math.min(100, complianceRisk + conversionRisk + inactivityRisk + financialRisk + governanceRisk + trendRisk);
    },
    []
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select(`
          id,
          company_name,
          active,
          created_at,
          verification_status,
          verification_document_url,
          profiles:profiles (
            full_name,
            country
          )
        `)
        .eq("tenant_id", profile?.tenant_id ?? "")
        .order("created_at", { ascending: false });

      if (agentsError) {
        console.error(agentsError);
        return;
      }

      const { data: applicationsData } = await supabase
        .from("applications")
        .select("agent_id, student_id, status, created_at, submitted_at")
        .eq("tenant_id", profile?.tenant_id ?? "");

      const { data: commissionsData } = await supabase
        .from("commissions")
        .select("agent_id, amount_cents, status, created_at, paid_at")
        .eq("tenant_id", profile?.tenant_id ?? "");

      const now = new Date();
      const currentMonth = getMonthDateRange(now);
      const previousMonth = getMonthDateRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

      const appByAgent: Record<string, typeof applicationsData> = {};
      applicationsData?.forEach((app) => {
        if (!app.agent_id) return;
        if (!appByAgent[app.agent_id]) appByAgent[app.agent_id] = [];
        appByAgent[app.agent_id].push(app);
      });

      const commissionsByAgent: Record<string, typeof commissionsData> = {};
      commissionsData?.forEach((commission) => {
        if (!commission.agent_id) return;
        if (!commissionsByAgent[commission.agent_id]) commissionsByAgent[commission.agent_id] = [];
        commissionsByAgent[commission.agent_id].push(commission);
      });

      const totalRevenueByAgent = Object.fromEntries(
        Object.entries(appByAgent).map(([agentId, rows]) => {
          const enrolledCount = rows?.filter((row) => ENROLLED_STATUSES.has(row.status ?? "")).length ?? 0;
          return [agentId, enrolledCount * MONTHLY_REVENUE_PER_ENROLLED * 6];
        })
      );

      const transformed: AgentRecord[] = (agentsData ?? []).map((agent) => {
        const agentApplications = appByAgent[agent.id] ?? [];
        const agentCommissions = commissionsByAgent[agent.id] ?? [];
        const uniqueStudents = new Set(agentApplications.map((item) => item.student_id));

        const applicationsSubmitted = agentApplications.length;
        const offersReceived = agentApplications.filter((item) => OFFER_STATUSES.has(item.status ?? "")).length;
        const enrolledStudents = agentApplications.filter((item) => ENROLLED_STATUSES.has(item.status ?? "")).length;
        const conversionRate = applicationsSubmitted > 0 ? Math.round((enrolledStudents / applicationsSubmitted) * 100) : 0;

        const lastMonthApps = agentApplications.filter((item) => isDateInRange(item.created_at, previousMonth.start, previousMonth.end));
        const lastMonthEnrolled = lastMonthApps.filter((item) => ENROLLED_STATUSES.has(item.status ?? "")).length;
        const lastMonthConversionRate = lastMonthApps.length > 0 ? Math.round((lastMonthEnrolled / lastMonthApps.length) * 100) : conversionRate;

        const commissionOwed =
          agentCommissions
            .filter((item) => item.status === "approved" || item.status === "pending")
            .reduce((sum, item) => sum + item.amount_cents / 100, 0) ?? 0;
        const commissionPaid =
          agentCommissions.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount_cents / 100, 0) ?? 0;

        const latestActivity = [
          ...agentApplications.map((item) => item.submitted_at || item.created_at),
          ...agentCommissions.map((item) => item.paid_at || item.created_at),
          agent.created_at,
        ]
          .filter(Boolean)
          .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] as string | null;

        const daysSinceActivity = latestActivity
          ? Math.floor((Date.now() - new Date(latestActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 99;

        const complianceStatus = getComplianceStatus(agent.verification_status, Boolean(agent.verification_document_url), agent.active);
        const pendingApproval = agent.verification_status === "pending";
        const trendDown = conversionRate + 4 < lastMonthConversionRate;

        const revenueGenerated = (totalRevenueByAgent[agent.id] as number) || 0;
        const revenueScore = Math.min(100, Math.round((revenueGenerated / 20000) * 100));
        const responseSpeedScore = Math.max(40, 100 - Math.min(60, daysSinceActivity * 3));
        const applicationQualityScore = offersReceived > 0 ? Math.min(100, Math.round((offersReceived / Math.max(applicationsSubmitted, 1)) * 100)) : 35;
        const complianceScore = complianceStatus === "green" ? 100 : complianceStatus === "amber" ? 65 : 30;
        const offerToEnrolmentScore = offersReceived > 0 ? Math.round((enrolledStudents / offersReceived) * 100) : 0;

        const performanceScore = computePerformanceScore({
          conversionRate,
          responseSpeedScore,
          applicationQualityScore,
          complianceScore,
          revenueScore,
          offerToEnrolmentScore,
        });

        const riskScore = computeRiskScore({
          complianceStatus,
          conversionRate,
          daysSinceActivity,
          commissionOwed,
          pendingApproval,
          trendDown,
        });

        const performanceInsight =
          performanceScore >= 80
            ? "Excellent retention and conversion performance"
            : performanceScore >= 60
              ? "Steady output; optimise enrolment follow-through"
              : "Conversion below network average";

        return {
          id: agent.id,
          name: agent.company_name || (agent.profiles as { full_name?: string } | null)?.full_name || "Unnamed Agent",
          country: (agent.profiles as { country?: string } | null)?.country || "Unknown",
          totalStudents: uniqueStudents.size,
          applicationsSubmitted,
          offersReceived,
          enrolledStudents,
          conversionRate,
          revenueGenerated,
          commissionOwed,
          commissionPaid,
          complianceStatus,
          riskScore,
          performanceScore,
          performanceInsight,
          lastActivityAt: latestActivity,
          lastMonthConversionRate,
          pendingApproval,
        };
      });

      const applicationsCurrent = applicationsData?.filter((item) => isDateInRange(item.created_at, currentMonth.start, currentMonth.end)).length ?? 0;
      const applicationsPrevious = applicationsData?.filter((item) => isDateInRange(item.created_at, previousMonth.start, previousMonth.end)).length ?? 0;
      const offersCurrent = applicationsData?.filter((item) => OFFER_STATUSES.has(item.status ?? "") && isDateInRange(item.created_at, currentMonth.start, currentMonth.end)).length ?? 0;
      const offersPrevious = applicationsData?.filter((item) => OFFER_STATUSES.has(item.status ?? "") && isDateInRange(item.created_at, previousMonth.start, previousMonth.end)).length ?? 0;
      const enrolmentsCurrent = applicationsData?.filter((item) => ENROLLED_STATUSES.has(item.status ?? "") && isDateInRange(item.created_at, currentMonth.start, currentMonth.end)).length ?? 0;
      const enrolmentsPrevious = applicationsData?.filter((item) => ENROLLED_STATUSES.has(item.status ?? "") && isDateInRange(item.created_at, previousMonth.start, previousMonth.end)).length ?? 0;

      const commissionOwedCurrent =
        commissionsData
          ?.filter(
            (item) =>
              (item.status === "approved" || item.status === "pending") &&
              isDateInRange(item.created_at, currentMonth.start, currentMonth.end)
          )
          .reduce((sum, item) => sum + item.amount_cents / 100, 0) ?? 0;
      const commissionOwedPrevious =
        commissionsData
          ?.filter(
            (item) =>
              (item.status === "approved" || item.status === "pending") &&
              isDateInRange(item.created_at, previousMonth.start, previousMonth.end)
          )
          .reduce((sum, item) => sum + item.amount_cents / 100, 0) ?? 0;
      const commissionPaidCurrent =
        commissionsData
          ?.filter((item) => item.status === "paid" && isDateInRange(item.paid_at || item.created_at, currentMonth.start, currentMonth.end))
          .reduce((sum, item) => sum + item.amount_cents / 100, 0) ?? 0;
      const commissionPaidPrevious =
        commissionsData
          ?.filter((item) => item.status === "paid" && isDateInRange(item.paid_at || item.created_at, previousMonth.start, previousMonth.end))
          .reduce((sum, item) => sum + item.amount_cents / 100, 0) ?? 0;

      setMonthlySummary({
        applicationsCurrent,
        applicationsPrevious,
        offersCurrent,
        offersPrevious,
        enrolmentsCurrent,
        enrolmentsPrevious,
        commissionOwedCurrent,
        commissionOwedPrevious,
        commissionPaidCurrent,
        commissionPaidPrevious,
      });

      setAgents(transformed);
      setSelectedAgentId((current) => current ?? transformed[0]?.id ?? null);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed loading agents dashboard", error);
    } finally {
      setLoading(false);
    }
  }, [computePerformanceScore, computeRiskScore, profile?.tenant_id]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    fetchData();
  }, [fetchData, profile?.tenant_id]);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel("admin-agents-revenue-control")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, fetchData)
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData, profile?.tenant_id]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? null, [agents, selectedAgentId]);

  const filteredAgents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return agents.filter((agent) => {
      const matchesSearch =
        !q || agent.name.toLowerCase().includes(q) || agent.country.toLowerCase().includes(q) || agent.id.toLowerCase().includes(q);

      const decliningPerformance = agent.conversionRate + 4 < agent.lastMonthConversionRate;
      const highRevenue = agent.revenueGenerated >= 25000;

      const matchesFilter =
        selectedFilter === "all" ||
        (selectedFilter === "high" && agent.performanceScore >= 80) ||
        (selectedFilter === "medium" && agent.performanceScore >= 60 && agent.performanceScore < 80) ||
        (selectedFilter === "low" && agent.performanceScore < 60) ||
        (selectedFilter === "risk" && agent.riskScore >= 65) ||
        (selectedFilter === "pending" && agent.pendingApproval) ||
        (selectedFilter === "highRevenue" && highRevenue) ||
        (selectedFilter === "declining" && decliningPerformance);

      return matchesSearch && matchesFilter;
    });
  }, [agents, searchQuery, selectedFilter]);

  const metrics: MetricCard[] = useMemo(() => {
    const activeAgents = agents.filter((agent) => agent.complianceStatus !== "red" && !agent.pendingApproval).length;
    const agentsWithStudents = agents.filter((agent) => agent.totalStudents > 0).length;
    const totalStudentsFromAgents = agents.reduce((sum, agent) => sum + agent.totalStudents, 0);
    const attentionNow = agents.filter((agent) => agent.riskScore >= 65).length;

    const previousAttention = Math.max(0, attentionNow - 1);

    return [
      { key: "active", label: "Total Active Agents", value: activeAgents, previousValue: Math.max(0, activeAgents - 1), onClick: () => setSelectedFilter("all") },
      { key: "studentAgents", label: "Agents with Active Students", value: agentsWithStudents, previousValue: Math.max(0, agentsWithStudents - 1), onClick: () => setSelectedFilter("all") },
      { key: "students", label: "Total Students from Agents", value: totalStudentsFromAgents, previousValue: Math.max(0, Math.round(totalStudentsFromAgents * 0.87)), onClick: () => setSelectedFilter("all") },
      { key: "apps", label: "This Month Applications", value: monthlySummary.applicationsCurrent, previousValue: monthlySummary.applicationsPrevious, onClick: () => setSelectedFilter("all") },
      { key: "offers", label: "This Month Offers", value: monthlySummary.offersCurrent, previousValue: monthlySummary.offersPrevious, onClick: () => setSelectedFilter("all") },
      { key: "enrolments", label: "This Month Enrolments", value: monthlySummary.enrolmentsCurrent, previousValue: monthlySummary.enrolmentsPrevious, onClick: () => setSelectedFilter("all") },
      { key: "owed", label: "Commission Owed (This Month)", value: monthlySummary.commissionOwedCurrent, previousValue: monthlySummary.commissionOwedPrevious, onClick: () => setSelectedFilter("risk"), format: "currency" },
      { key: "paid", label: "Commission Paid (This Month)", value: monthlySummary.commissionPaidCurrent, previousValue: monthlySummary.commissionPaidPrevious, onClick: () => setSelectedFilter("highRevenue"), format: "currency" },
      { key: "attention", label: "Agents Requiring Attention", value: attentionNow, previousValue: previousAttention, onClick: () => setSelectedFilter("risk") },
    ];
  }, [agents, monthlySummary]);

  const insights: InsightItem[] = useMemo(() => {
    const declining = agents.filter((agent) => agent.conversionRate + 4 < agent.lastMonthConversionRate).length;
    const nigeriaOutperform = agents.filter((agent) => agent.country.toLowerCase().includes("nigeria") && agent.conversionRate >= 30).length;
    const inactive = agents.filter((agent) => {
      if (!agent.lastActivityAt) return true;
      return Date.now() - new Date(agent.lastActivityAt).getTime() > 1000 * 60 * 60 * 24 * 30;
    }).length;

    return [
      {
        id: "declining",
        tone: declining > 0 ? "warning" : "positive",
        text: `${declining} agents have declining enrolment conversion this month.`,
      },
      {
        id: "nigeria",
        tone: nigeriaOutperform > 0 ? "positive" : "warning",
        text: `${nigeriaOutperform} Nigeria-based agents are converting above 30%.`,
      },
      {
        id: "inactive",
        tone: inactive > 0 ? "critical" : "positive",
        text: `${inactive} agents have no submissions in the last 30 days.`,
      },
      {
        id: "commission",
        tone: monthlySummary.commissionOwedCurrent > 0 ? "warning" : "positive",
        text: `${formatCurrency(monthlySummary.commissionOwedCurrent)} commission is pending approval this month.`,
      },
    ];
  }, [agents, monthlySummary.commissionOwedCurrent]);

  const smartFilters: { label: string; value: AgentFilter }[] = [
    { label: "All", value: "all" },
    { label: "🔵 High Performers", value: "high" },
    { label: "🟡 Medium Performers", value: "medium" },
    { label: "🔴 Low Performers", value: "low" },
    { label: "🚨 At Risk", value: "risk" },
    { label: "⏳ Pending Approval", value: "pending" },
    { label: "💰 High Revenue", value: "highRevenue" },
    { label: "📉 Declining Performance", value: "declining" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agency Network Control Panel</h1>
          <p className="text-sm text-muted-foreground">Revenue, conversion, compliance, and intervention command centre.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </Button>
          <Button className="gap-2" onClick={() => setInviteDialogOpen(true)}>
            <Users className="h-4 w-4" />
            Invite Agency
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const isPositive = metric.value >= metric.previousValue;
          return (
            <Card key={metric.key} className="cursor-pointer border-slate-700/60 hover:border-primary/50" onClick={metric.onClick}>
              <CardContent className="pt-5 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-semibold text-white">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : metric.format === "currency" ? formatCurrency(metric.value) : metric.value}
                  </p>
                  <Badge variant="outline" className={isPositive ? "text-emerald-300" : "text-red-300"}>
                    {isPositive ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                    {formatPercentChange(metric.value, metric.previousValue)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Agent Performance Table</CardTitle>
              <CardDescription>Use this table to monitor conversion, financial risk, compliance, and direct actions in one view.</CardDescription>
            </div>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search agent, country, or ID"
              className="w-full lg:max-w-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {smartFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={selectedFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Total Students</TableHead>
                  <TableHead className="text-right">Applications</TableHead>
                  <TableHead className="text-right">Offers</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                  <TableHead className="text-right">Conversion Rate</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                  <TableHead className="text-right">Commission Owed</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead className="text-right">Risk Score</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading agents...
                    </TableCell>
                  </TableRow>
                ) : filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      No agents match the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.country}</TableCell>
                      <TableCell className="text-right">{agent.totalStudents}</TableCell>
                      <TableCell className="text-right">{agent.applicationsSubmitted}</TableCell>
                      <TableCell className="text-right">{agent.offersReceived}</TableCell>
                      <TableCell className="text-right">{agent.enrolledStudents}</TableCell>
                      <TableCell className="text-right font-semibold text-sky-300">{agent.conversionRate}%</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-300">{formatCurrency(agent.revenueGenerated)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(agent.commissionOwed)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={complianceBadgeClass[agent.complianceStatus]}>
                          {agent.complianceStatus.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-300">{agent.riskScore}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Circle className={`h-3 w-3 ${agent.performanceScore >= 80 ? "fill-emerald-400 text-emerald-400" : agent.performanceScore >= 60 ? "fill-amber-400 text-amber-400" : "fill-red-400 text-red-400"}`} />
                          <span>{agent.performanceScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRelativeTime(agent.lastActivityAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                          <Button size="sm" variant="outline"><View className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline"><PauseCircle className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline"><FileWarning className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline"><CreditCard className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Last sync: {lastUpdated.toLocaleTimeString()}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Agent Detail Workspace</CardTitle>
            <CardDescription>
              {selectedAgent ? `${selectedAgent.name} · ${selectedAgent.performanceInsight}` : "Select an agent row to view details."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedAgent ? (
              <p className="text-sm text-muted-foreground">No agent selected.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="bg-muted/20">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Overview</p>
                      <p className="text-lg font-semibold">Score {selectedAgent.performanceScore}/100</p>
                      <p className="text-xs text-muted-foreground">Risk {selectedAgent.riskScore}/100</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Students Pipeline</p>
                      <p className="text-lg font-semibold">{selectedAgent.applicationsSubmitted} submitted</p>
                      <p className="text-xs text-muted-foreground">{selectedAgent.offersReceived} offer / {selectedAgent.enrolledStudents} enrolled</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Financials</p>
                      <p className="text-lg font-semibold text-emerald-300">{formatCurrency(selectedAgent.revenueGenerated)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(selectedAgent.commissionOwed)} owed · {formatCurrency(selectedAgent.commissionPaid)} paid</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Compliance</p>
                      <p className="text-lg font-semibold uppercase">{selectedAgent.complianceStatus}</p>
                      <p className="text-xs text-muted-foreground">Last active {getRelativeTime(selectedAgent.lastActivityAt)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Conversion funnel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Submitted</span><span>{selectedAgent.applicationsSubmitted}</span></div>
                      <div className="flex justify-between"><span>Under Review</span><span>{Math.max(selectedAgent.applicationsSubmitted - selectedAgent.offersReceived, 0)}</span></div>
                      <div className="flex justify-between"><span>Offer</span><span>{selectedAgent.offersReceived}</span></div>
                      <div className="flex justify-between"><span>Enrolled</span><span>{selectedAgent.enrolledStudents}</span></div>
                      <div className="flex justify-between"><span>Rejected/Other</span><span>{Math.max(selectedAgent.applicationsSubmitted - selectedAgent.enrolledStudents, 0)}</span></div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Notes & Communication</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">{selectedAgent.performanceInsight}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="gap-2"><Send className="h-3.5 w-3.5" />Send Message</Button>
                        <Button size="sm" variant="outline" className="gap-2"><PauseCircle className="h-3.5 w-3.5" />Suspend Agent</Button>
                        <Button size="sm" variant="outline" className="gap-2"><PoundSterling className="h-3.5 w-3.5" />Pay Commission</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automated Insights</CardTitle>
            <CardDescription>AI-led prompts for proactive intervention and revenue control.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start gap-2">
                  {insight.tone === "positive" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                  ) : insight.tone === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-red-400" />
                  )}
                  <p>{insight.text}</p>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mb-2 h-4 w-4 text-sky-300" />
              Performance score formula: 28% conversion, 10% response speed, 14% quality, 18% compliance, 20% revenue, 10% offer-to-enrolment.
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteAgencyDialog
        tenantId={profile?.tenant_id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default AdminAgents;
