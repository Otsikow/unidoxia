"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  DollarSign,
  Target,
  Activity,
  Globe,
  Timer,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  useApplicationPipeline,
  useAttributionMetrics,
  useUniversityCodeMetrics,
  useCommissionReadiness,
  useApplicationVelocity,
} from "@/hooks/admin/useAdminTrackingData";
import { useAuth } from "@/hooks/useAuth";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STATUS_COLORS: Record<string, string> = {
  Draft: "hsl(var(--muted))",
  Submitted: "hsl(217, 91%, 60%)",
  Screening: "hsl(38, 92%, 50%)",
  "Conditional Offer": "hsl(142, 71%, 45%)",
  "Unconditional Offer": "hsl(142, 76%, 36%)",
  "Cas Loa": "hsl(262, 83%, 58%)",
  Visa: "hsl(199, 89%, 48%)",
  Enrolled: "hsl(142, 71%, 45%)",
  Withdrawn: "hsl(0, 84%, 60%)",
  Deferred: "hsl(45, 93%, 47%)",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(142, 71%, 45%)",
];

const formatCurrency = (value: number, currency: string = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, trend, loading }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-xl font-semibold">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
            {trend && !loading && (
              <div className={`flex items-center gap-0.5 text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

interface AdminTrackingPanelProps {
  className?: string;
}

export default function AdminTrackingPanel({ className }: AdminTrackingPanelProps) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const pipelineQuery = useApplicationPipeline(tenantId);
  const attributionQuery = useAttributionMetrics(tenantId);
  const universityQuery = useUniversityCodeMetrics(tenantId);
  const commissionQuery = useCommissionReadiness(tenantId);
  const velocityQuery = useApplicationVelocity(tenantId);

  const isLoading =
    pipelineQuery.isLoading ||
    attributionQuery.isLoading ||
    universityQuery.isLoading ||
    commissionQuery.isLoading;

  /* ------------------------------------------------------------------------ */
  /* Memoized Chart Data                                                      */
  /* ------------------------------------------------------------------------ */

  const pipelineChartData = useMemo(() => {
    if (!pipelineQuery.data?.byStatus) return [];
    return pipelineQuery.data.byStatus.slice(0, 6).map((item) => ({
      ...item,
      fill: STATUS_COLORS[item.status] || CHART_COLORS[0],
    }));
  }, [pipelineQuery.data]);

  const sourceChartData = useMemo(() => {
    if (!attributionQuery.data?.bySource) return [];
    return attributionQuery.data.bySource.map((item, idx) => ({
      ...item,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [attributionQuery.data]);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Tracking Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Applications, attribution, university codes, and commission readiness at a glance
        </p>
      </div>

      {/* Quick Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          title="Total Applications"
          value={pipelineQuery.data?.total?.toLocaleString() ?? 0}
          subtitle={`${pipelineQuery.data?.submittedThisWeek ?? 0} this week`}
          icon={<FileText className="h-4 w-4 text-blue-500" />}
          trend={
            pipelineQuery.data?.weeklyChange !== undefined
              ? { value: pipelineQuery.data.weeklyChange, isPositive: pipelineQuery.data.weeklyChange >= 0 }
              : undefined
          }
          loading={pipelineQuery.isLoading}
        />
        <MetricCard
          title="Avg. Decision Time"
          value={`${pipelineQuery.data?.averageTimeToDecision ?? 14} days`}
          subtitle="From submission"
          icon={<Timer className="h-4 w-4 text-orange-500" />}
          loading={pipelineQuery.isLoading}
        />
        <MetricCard
          title="Active Universities"
          value={universityQuery.data?.totalActiveUniversities?.toLocaleString() ?? 0}
          subtitle={`${universityQuery.data?.averageApplicationsPerUniversity ?? 0} avg apps each`}
          icon={<Building2 className="h-4 w-4 text-purple-500" />}
          loading={universityQuery.isLoading}
        />
        <MetricCard
          title="Commission Pipeline"
          value={formatCurrency(
            (commissionQuery.data?.pendingValue ?? 0) + (commissionQuery.data?.approvedValue ?? 0),
            commissionQuery.data?.currency
          )}
          subtitle={`${commissionQuery.data?.readinessScore ?? 0}% processed`}
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          loading={commissionQuery.isLoading}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Application Pipeline Distribution */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Application Pipeline</CardTitle>
            <CardDescription className="text-xs">Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {pipelineQuery.isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pipelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={100}
                    tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Applications"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No application data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attribution Sources */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Attribution Sources
            </CardTitle>
            <CardDescription className="text-xs">Where students are coming from</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {attributionQuery.isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sourceChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {sourceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Students"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sourceChartData.map((item, idx) => (
                    <div key={item.source} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="truncate max-w-[100px]">{item.source}</span>
                      </div>
                      <span className="font-medium">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No attribution data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Data Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Application Velocity */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Application Velocity</CardTitle>
            <CardDescription className="text-xs">7-day submission trend</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {velocityQuery.isLoading ? (
              <div className="flex items-center justify-center h-[150px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : velocityQuery.data && velocityQuery.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={velocityQuery.data} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="submitted"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Submitted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[150px] text-sm text-muted-foreground">
                No velocity data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Readiness */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Commission Readiness
            </CardTitle>
            <CardDescription className="text-xs">Processing status overview</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {commissionQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Readiness Score</span>
                    <span className="font-medium">{commissionQuery.data?.readinessScore ?? 0}%</span>
                  </div>
                  <Progress value={commissionQuery.data?.readinessScore ?? 0} className="h-2" />
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Pending</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{commissionQuery.data?.totalPending ?? 0}</span>
                      <span className="text-muted-foreground ml-1">
                        ({formatCurrency(commissionQuery.data?.pendingValue ?? 0, commissionQuery.data?.currency)})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Approved</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{commissionQuery.data?.totalApproved ?? 0}</span>
                      <span className="text-muted-foreground ml-1">
                        ({formatCurrency(commissionQuery.data?.approvedValue ?? 0, commissionQuery.data?.currency)})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Paid</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{commissionQuery.data?.totalPaid ?? 0}</span>
                      <span className="text-muted-foreground ml-1">
                        ({formatCurrency(commissionQuery.data?.paidValue ?? 0, commissionQuery.data?.currency)})
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Universities Row */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Top Universities by Applications
          </CardTitle>
          <CardDescription className="text-xs">
            Partner performance and conversion rates
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {universityQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : universityQuery.data?.topUniversities && universityQuery.data.topUniversities.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {universityQuery.data.topUniversities.slice(0, 8).map((uni, idx) => (
                <div
                  key={uni.name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      #{idx + 1}
                    </Badge>
                    <span className="text-xs font-medium truncate">{uni.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{uni.applications} apps</span>
                    <Badge
                      variant={uni.conversionRate >= 50 ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {uni.conversionRate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No university data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
