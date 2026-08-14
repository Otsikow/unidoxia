import BackButton from '@/components/BackButton';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Users, Building2, Globe, DollarSign, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalyticsQuickStats, useKPIMetrics } from '@/hooks/admin/useAdminAnalyticsData';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

const formatCurrency = (value: number, currency: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const formatChange = (change: number) =>
  `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;

export default function Analytics() {
  const [activeView, setActiveView] = useState<'overview' | 'detailed'>('overview');
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: statsData, isLoading: statsLoading } = useAnalyticsQuickStats(tenantId);
  const { data: kpiData, isLoading: kpiLoading } = useKPIMetrics(tenantId);

  const quickStats = useMemo(() => [
    {
      label: 'Total Users',
      value: statsData ? formatNumber(statsData.totalUsers) : '—',
      change: statsData ? formatChange(statsData.totalUsersChange) : '—',
      trend: (statsData?.totalUsersChange ?? 0) >= 0 ? 'up' as const : 'down' as const,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      label: 'Active Agents',
      value: statsData ? formatNumber(statsData.activeAgents) : '—',
      change: statsData ? formatChange(statsData.activeAgentsChange) : '—',
      trend: (statsData?.activeAgentsChange ?? 0) >= 0 ? 'up' as const : 'down' as const,
      icon: Building2,
      color: 'text-green-600',
    },
    {
      label: 'Listed Universities',
      value: statsData ? formatNumber(statsData.partnerUniversities) : '—',
      change: statsData ? formatChange(statsData.partnerUniversitiesChange) : '—',
      trend: (statsData?.partnerUniversitiesChange ?? 0) >= 0 ? 'up' as const : 'down' as const,
      icon: Globe,
      color: 'text-purple-600',
    },
    {
      label: 'Total Revenue',
      value: statsData ? formatCurrency(statsData.totalRevenue, statsData.currency) : '—',
      change: statsData ? formatChange(statsData.totalRevenueChange) : '—',
      trend: (statsData?.totalRevenueChange ?? 0) >= 0 ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'text-emerald-600',
    },
  ], [statsData]);

  return (
    <div className="space-y-6">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

        {/* Header */}
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Platform Analytics
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Comprehensive insights and performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            <div className="col-span-4 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading real-time stats...</span>
            </div>
          ) : (
            quickStats.map((stat) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
              return (
                <Card key={stat.label} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={stat.trend === 'up' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          <TrendIcon className="h-3 w-3 mr-1" />
                          {stat.change}
                        </Badge>
                        <span className="text-xs text-muted-foreground">vs last month</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* View Toggle */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
                <CardDescription>
                  High-level metrics for platform performance (real-time)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {kpiLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading KPIs...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Application Success Rate
                      </h4>
                      <div className="text-3xl font-bold">
                        {kpiData?.applicationSuccessRate ?? 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Applications resulting in enrollment
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Average Processing Time
                      </h4>
                      <div className="text-3xl font-bold">
                        {kpiData?.averageProcessingDays ?? 14} days
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From submission to decision
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Customer Satisfaction
                      </h4>
                      <div className="text-3xl font-bold">
                        {kpiData?.customerSatisfaction?.toFixed(1) ?? '4.5'}/5.0
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on {kpiData?.totalReviews ?? 0} reviews
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Metrics</CardTitle>
                <CardDescription>
                  Areas showing exceptional growth and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium">Student Retention Rate</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      95.2% (+3.1%)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-medium">Agent Productivity</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      12.3 apps/agent (+18%)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="font-medium">University Partnerships</span>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      342 partners (+8.3%)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
    </div>
  );
}
