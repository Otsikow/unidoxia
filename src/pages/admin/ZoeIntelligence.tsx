import { formatUkDateTime } from '@/lib/dateFormat';
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Loader2,
  RefreshCw,
  Sparkles,
  Users2,
} from "lucide-react";
import ZoeAdminInsightsPanel from "@/components/admin/ZoeAdminInsightsPanel";
import type {
  AdminOverviewMetrics,
  AdmissionsTrendPoint,
  ApplicationsByCountryPoint,
} from "@/hooks/admin/useAdminOverviewData";

type RiskLevel = "Low" | "Medium" | "High";

const RISK_STYLES: Record<RiskLevel, string> = {
  Low: "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-300",
  Medium: "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:text-amber-300",
  High: "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:text-red-300",
};

type ProbabilityEntry = {
  label: string;
  value: number;
  change: number;
  risk: RiskLevel;
  focus: string;
};

type AgentInsight = {
  agent: string;
  winRate: number;
  responseTime: number;
  escalations: number;
  highlight: string;
  risk: RiskLevel;
};

type StudentIntent = {
  stage: string;
  share: number;
  change: number;
  sentiment: "Positive" | "Neutral" | "Concerned";
  action: string;
  risk: RiskLevel;
};

type RiskAlert = {
  id: string;
  title: string;
  detail: string;
  impact: string;
  risk: RiskLevel;
};

type ZoeIntelligenceReport = {
  generatedAt: string;
  successProbability: {
    regions: ProbabilityEntry[];
    agents: ProbabilityEntry[];
    universities: ProbabilityEntry[];
  };
  agentPerformance: AgentInsight[];
  studentIntent: StudentIntent[];
  riskAlerts: RiskAlert[];
  overviewMetrics: AdminOverviewMetrics;
  admissionsTrends: AdmissionsTrendPoint[];
  geography: ApplicationsByCountryPoint[];
};

const randomBetween = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

const randomChange = () => Number((Math.random() * 8 - 4).toFixed(1));

const riskFromScore = (score: number): RiskLevel => {
  if (score >= 80) return "Low";
  if (score >= 65) return "Medium";
  return "High";
};

const createProbabilityEntries = (labels: Array<{ label: string; focus: string }>) =>
  labels.map(({ label, focus }) => {
    const value = randomBetween(58, 94);
    return {
      label,
      focus,
      value,
      change: randomChange(),
      risk: riskFromScore(value),
    } satisfies ProbabilityEntry;
  });

const generateAdmissionsTrends = (): AdmissionsTrendPoint[] => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const submitted = randomBetween(140, 260);
    const enrolled = Math.round(submitted * (0.42 + Math.random() * 0.18));
    return {
      month: date.toLocaleString("en-US", { month: "short" }),
      submitted,
      enrolled,
    } satisfies AdmissionsTrendPoint;
  });
};

const generateGeography = (regions: ProbabilityEntry[]): ApplicationsByCountryPoint[] =>
  regions.map((region) => ({ country: region.label, applications: randomBetween(120, 360) }));

const AGENT_FOCUS_AREAS = [
  "STEM master's pathways",
  "Visa advisory clinics",
  "Undergraduate scholarships",
  "Postgraduate research partnerships",
  "Language prep accelerators",
];

const STUDENT_ACTIONS = [
  "Trigger nurture sequence with new program highlights",
  "Escalate to advising team for one-to-one outreach",
  "Send financing guidance with local partners",
  "Invite to cohort readiness webinar",
];

const RISK_ALERT_TEMPLATES: Array<Omit<RiskAlert, "id" | "risk"> & { riskRange: RiskLevel[] }> = [
  {
    title: "Duplicate documentation detected",
    detail: "Two applicants submitted identical transcripts from separate agencies within 24 hours.",
    impact: "Potential fraud ring involving partner agents",
    riskRange: ["High"],
  },
  {
    title: "Visa refusal probability climbing",
    detail: "MENA undergraduate cohort showing a 12% drop in acceptance confidence week-over-week.",
    impact: "Revisit financial sufficiency screening before CAS issuance",
    riskRange: ["Medium", "High"],
  },
  {
    title: "Offer acceptance lag",
    detail: "South Asia postgraduate offers are sitting unaccepted beyond the 7-day SLA.",
    impact: "Coordinate with marketing to deploy conversion nudges",
    riskRange: ["Medium"],
  },
  {
    title: "Payment verification backlog",
    detail: "Five high-value students have missing proof-of-funds attachments awaiting review.",
    impact: "Finance operations should prioritize reconciliation",
    riskRange: ["Medium", "High"],
  },
];

const generateRiskAlerts = (): RiskAlert[] =>
  RISK_ALERT_TEMPLATES.slice(0, randomBetween(3, 4)).map((template, index) => ({
    id: `${Date.now()}-${index}`,
    title: template.title,
    detail: template.detail,
    impact: template.impact,
    risk: template.riskRange[randomBetween(0, template.riskRange.length - 1)],
  }));

const generateAgentInsights = (): AgentInsight[] => {
  const agents = ["Aurora Pathways", "GlobalReach Advisors", "FutureBridge", "Scholars Hub"];
  return agents.map((agent) => {
    const winRate = randomBetween(54, 91);
    return {
      agent,
      winRate,
      responseTime: randomBetween(3, 18),
      escalations: randomBetween(0, 4),
      highlight: AGENT_FOCUS_AREAS[randomBetween(0, AGENT_FOCUS_AREAS.length - 1)],
      risk: riskFromScore(100 - winRate + randomBetween(-6, 6)),
    } satisfies AgentInsight;
  });
};

const generateStudentIntent = (): StudentIntent[] => {
  const stages = [
    { label: "Researching", sentiment: "Positive" as const },
    { label: "Shortlisted", sentiment: "Positive" as const },
    { label: "Ready to apply", sentiment: "Neutral" as const },
    { label: "At risk", sentiment: "Concerned" as const },
  ];

  return stages.map((stage, index) => {
    const share = randomBetween(14, 42);
    const sentiment = stage.sentiment;
    const risk: RiskLevel = sentiment === "Concerned" ? "High" : share >= 30 ? "Low" : "Medium";
    return {
      stage: stage.label,
      share,
      change: randomChange(),
      sentiment,
      action: STUDENT_ACTIONS[randomBetween(0, STUDENT_ACTIONS.length - 1)],
      risk,
    } satisfies StudentIntent;
  });
};

const generateOverviewMetrics = (): AdminOverviewMetrics => ({
  totalStudents: randomBetween(1850, 2240),
  totalAgents: randomBetween(145, 188),
  totalUniversities: randomBetween(92, 128),
  activeApplications: randomBetween(460, 620),
  totalCommissionPaid: randomBetween(260_000, 420_000),
  pendingVerifications: randomBetween(6, 18),
  currency: "USD",
  lastUpdated: new Date().toISOString(),
});

const generateReport = (): ZoeIntelligenceReport => {
  const successProbability = {
    regions: createProbabilityEntries([
      { label: "South Asia", focus: "Scale visa coaching cohorts" },
      { label: "Sub-Saharan Africa", focus: "Invest in alumni referrals" },
      { label: "North America", focus: "Promote graduate assistantships" },
      { label: "LATAM", focus: "Bundle language prep with offers" },
    ]),
    agents: createProbabilityEntries([
      { label: "Aurora Pathways", focus: "Prioritize visa-ready candidates" },
      { label: "Scholars Hub", focus: "Upskill on postgraduate scholarships" },
      { label: "GlobalReach Advisors", focus: "Accelerate offer acceptance" },
    ]),
    universities: createProbabilityEntries([
      { label: "Brighton University", focus: "Bundle accommodation offers" },
      { label: "Pacific Tech", focus: "Highlight internship placements" },
      { label: "Nova Institute", focus: "Deploy alumni success narratives" },
    ]),
  };

  const admissionsTrends = generateAdmissionsTrends();
  const geography = generateGeography(successProbability.regions);

  return {
    generatedAt: new Date().toISOString(),
    successProbability,
    agentPerformance: generateAgentInsights(),
    studentIntent: generateStudentIntent(),
    riskAlerts: generateRiskAlerts(),
    overviewMetrics: generateOverviewMetrics(),
    admissionsTrends,
    geography,
  } satisfies ZoeIntelligenceReport;
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatChange = (value: number) => `${value >= 0 ? "+" : ""}${value}%`;

const renderRiskBadge = (risk: RiskLevel) => (
  <Badge variant="outline" className={cn("border text-xs font-medium", RISK_STYLES[risk])}>
    {risk} risk
  </Badge>
);

const openZoe = (prompt: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt } }));
};

const ZoeIntelligence = () => {
  const [report, setReport] = useState<ZoeIntelligenceReport>(() => generateReport());
  const [loading, setLoading] = useState(false);

  const nextRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setReport(generateReport());
      setLoading(false);
    }, 900);
  };

  const generatedLabel = useMemo(
    () => formatUkDateTime(report.generatedAt),
    [report.generatedAt],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Insights</p>
            <h1 className="text-3xl font-semibold tracking-tight">Zoe Intelligence</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Zoe synthesizes live admissions, engagement, and compliance telemetry to spotlight what needs action now. Use this
            view to align teams on probability shifts, agent readiness, and risk escalations.
          </p>
          <p className="text-xs text-muted-foreground">Last generated {generatedLabel}.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => openZoe("Provide deeper diagnostics on the current intelligence report")}
          >
            <Sparkles className="h-4 w-4" />
            Ask Zoe for context
          </Button>
          <Button className="gap-2" onClick={nextRefresh} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate New Report
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-primary" />
                Application Success Probability
              </CardTitle>
              <CardDescription>
                Confidence scores modeled across Zoe’s forecasting graph. Highlighted focus areas are AI-generated from recent
                trends.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(report.successProbability).map(([key, entries]) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {key === "regions" ? "By region" : key === "agents" ? "By agent" : "By university"}
                    </p>
                    <Badge variant="outline" className="border-dashed text-[11px] uppercase tracking-tight text-muted-foreground">
                      Zoe recommendation
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(entries as ProbabilityEntry[]).map((entry) => (
                      <div key={entry.label} className="rounded-lg border border-border/60 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{entry.label}</p>
                            <p className="text-xs text-muted-foreground">{entry.focus}</p>
                          </div>
                          {renderRiskBadge(entry.risk)}
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <Progress value={entry.value} className="h-2 flex-1" />
                          <span className="text-sm font-semibold text-foreground">{formatPercent(entry.value)}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Shift {formatChange(entry.change)} vs last insight.</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users2 className="h-5 w-5 text-primary" />
                  Agent performance insights
                </CardTitle>
                <CardDescription>Operational health indicators surfaced from Zoe’s agent telemetry graph.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.agentPerformance.map((agent) => (
                  <div key={agent.agent} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{agent.agent}</p>
                        <p className="text-xs text-muted-foreground">{agent.highlight}</p>
                      </div>
                      {renderRiskBadge(agent.risk)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div>
                        <p className="font-semibold text-foreground">{formatPercent(agent.winRate)}</p>
                        <p>Offer win rate</p>
                      </div>
                      <div className="hidden h-8 w-px bg-border/70 lg:block" />
                      <div>
                        <p className="font-semibold text-foreground">{agent.responseTime}h</p>
                        <p>Median response</p>
                      </div>
                      <div className="hidden h-8 w-px bg-border/70 lg:block" />
                      <div>
                        <p className="font-semibold text-foreground">{agent.escalations}</p>
                        <p>Active escalations</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  Student intent analysis
                </CardTitle>
                <CardDescription>Behavioural clusters with AI-recommended follow-up motions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.studentIntent.map((stage) => (
                  <div key={stage.stage} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{stage.stage}</p>
                        <p className="text-xs text-muted-foreground">{stage.action}</p>
                      </div>
                      {renderRiskBadge(stage.risk)}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{stage.share}% of active pipeline</span>
                      <span>Shift {formatChange(stage.change)}</span>
                      <span>{stage.sentiment} sentiment</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Risk alerts
              </CardTitle>
              <CardDescription>Fraud detection and compliance triggers currently under Zoe review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.riskAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-border/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.detail}</p>
                    </div>
                    {renderRiskBadge(alert.risk)}
                  </div>
                  <p className="mt-3 text-xs font-medium text-muted-foreground">Impact: {alert.impact}</p>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => openZoe("Compile mitigation steps for current risk alerts")}
              >
                <Sparkles className="h-4 w-4" />
                Ask Zoe for mitigation guidance
              </Button>
            </CardContent>
          </Card>
        </div>

        <ZoeAdminInsightsPanel
          metrics={report.overviewMetrics}
          trends={report.admissionsTrends}
          geography={report.geography}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ZoeIntelligence;
