import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useUserActivityData,
  useApplicationTrends,
  useConversionFunnel,
  useTopSegments,
  useEngagementHighlights,
} from "@/hooks/admin/useAdminAnalyticsData";

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#f97316", "#10b981", "#0ea5e9"];

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: userActivityData, isLoading: activityLoading } = useUserActivityData(tenantId);
  const { data: applicationTrends, isLoading: trendsLoading } = useApplicationTrends(tenantId);
  const { data: conversionFunnel, isLoading: funnelLoading } = useConversionFunnel(tenantId);
  const { data: topSegments, isLoading: segmentsLoading } = useTopSegments(tenantId);
  const { data: engagementHighlights, isLoading: engagementLoading } = useEngagementHighlights(tenantId);

  // Calculate summary metrics from real data
  const latestActivity = userActivityData?.[userActivityData.length - 1];
  const previousActivity = userActivityData?.[userActivityData.length - 2];
  const activeUsersChange = latestActivity && previousActivity
    ? Math.round(((latestActivity.active - previousActivity.active) / (previousActivity.active || 1)) * 100 * 10) / 10
    : 0;

  const latestTrend = applicationTrends?.[applicationTrends.length - 1];
  const approvedCount = latestTrend?.approved ?? 0;
  const enrolledCount = latestTrend?.enrolled ?? 0;
  const conversionPercent = approvedCount > 0 ? Math.round((enrolledCount / approvedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active users</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {activityLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (latestActivity?.active ?? 0).toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>vs last week</span>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30">
                {activeUsersChange >= 0 ? '+' : ''}{activeUsersChange}%
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New users this week</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {activityLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (latestActivity?.newUsers ?? 0).toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>week over week</span>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30">
                {latestActivity && previousActivity
                  ? `${latestActivity.newUsers >= previousActivity.newUsers ? '+' : ''}${Math.round(((latestActivity.newUsers - previousActivity.newUsers) / (previousActivity.newUsers || 1)) * 100)}%`
                  : '—'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Applications approved</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {trendsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                approvedCount.toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>conversion to enrollment</span>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950/30">
                {conversionPercent}%
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total enrollments</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {funnelLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (conversionFunnel?.find(f => f.name === 'Enrollments')?.count ?? 0).toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>all time</span>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30">
                Live data
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User activity overview</CardTitle>
            <CardDescription>Active, returning, and new users over the past 7 weeks (real-time)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {activityLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userActivityData && userActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--foreground))" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip cursor={{ strokeDasharray: "4 4" }} />
                  <Legend />
                  <Area type="monotone" dataKey="active" stroke="#2563eb" fill="#2563eb33" strokeWidth={2} />
                  <Area type="monotone" dataKey="returning" stroke="#7c3aed" fill="#7c3aed33" strokeWidth={2} />
                  <Area type="monotone" dataKey="newUsers" stroke="#f97316" fill="#f9731633" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No user activity data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement highlights</CardTitle>
            <CardDescription>Key behavioral signals (real-time)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {engagementLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              (engagementHighlights ?? []).map((item) => (
                <div key={item.title} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.tone}`}>
                      {item.change}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Application pipeline trends</CardTitle>
            <CardDescription>Monthly volume across key review stages (real-time)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {trendsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applicationTrends && applicationTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicationTrends}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submitted" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reviewed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enrolled" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No application data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion rate trend</CardTitle>
            <CardDescription>Week-over-week enrollment conversion (real-time)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {activityLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userActivityData && userActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Line type="monotone" dataKey="conversion" stroke="#db2777" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No conversion data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle conversion funnel</CardTitle>
            <CardDescription>Volume retained at every stage (real-time)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {funnelLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : conversionFunnel && conversionFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionFunnel} layout="vertical" margin={{ left: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={110} tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {conversionFunnel.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No funnel data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top growth segments</CardTitle>
            <CardDescription>Where user and application growth is accelerating (real-time)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {segmentsLoading ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topSegments && topSegments.length > 0 ? (
              topSegments.map((segment, index) => (
                <div key={segment.label} className="rounded-lg border p-4 space-y-2">
                  <Badge
                    variant="secondary"
                    className="w-fit border-transparent bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                  >
                    #{index + 1}
                  </Badge>
                  <p className="text-base font-semibold">{segment.label}</p>
                  <p className="text-sm text-muted-foreground">{segment.volume}</p>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30">
                    {segment.growth}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex items-center justify-center py-8 text-muted-foreground">
                No segment data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
