import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2 } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import AdminTrackingPanel from '@/components/admin/AdminTrackingPanel';

interface OverviewTabProps {
  metrics: {
    totalStudents: number;
    totalApplications: number;
    partnerUniversities: number;
    agents: number;
    revenue: number;
  };
  loading: boolean;
}

interface CountryData {
  name: string;
  count: number;
}

interface AgentData {
  name: string;
  applications: number;
}

interface ProgramData {
  name: string;
  applications: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function OverviewTab({ metrics, loading }: OverviewTabProps) {
  const [topCountries, setTopCountries] = useState<CountryData[]>([]);
  const [topAgents, setTopAgents] = useState<AgentData[]>([]);
  const [topPrograms, setTopPrograms] = useState<ProgramData[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showcaseStats, setShowcaseStats] = useState<{ count: number; lastUpdated: string | null }>({
    count: 0,
    lastUpdated: null,
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const queueRefreshRef = useRef(false);
  const hasLoadedInitialRef = useRef(false);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAnalytics = useCallback(async (options: { background?: boolean } = {}) => {
    if (isFetchingRef.current) {
      queueRefreshRef.current = true;
      return;
    }

    isFetchingRef.current = true;

    const shouldShowLoading = !options.background || !hasLoadedInitialRef.current;

    try {
      if (shouldShowLoading && isMountedRef.current) {
        setAnalyticsLoading(true);
      }

      const [
        { data: studentsData, error: studentsError },
        { data: applicationsData, error: applicationsError },
        { count: featuredCount, error: featuredCountError },
        { data: featuredUpdated, error: featuredUpdatedError },
      ] = await Promise.all([
        supabase
          .from('students')
          .select('nationality'),
        supabase
          .from('applications')
          .select(`
            agent_id,
            program_id,
            agents (
              profiles (
                full_name
              )
            ),
            programs (
              name
            )
          `),
        supabase
          .from('universities')
          .select('*', { count: 'exact', head: true })
          .eq('featured', true),
        supabase
          .from('universities')
          .select('updated_at')
          .eq('featured', true)
          .order('updated_at', { ascending: false })
          .limit(1),
      ]);

      if (studentsError) throw studentsError;
      if (applicationsError) throw applicationsError;
      if (featuredCountError) throw featuredCountError;
      if (featuredUpdatedError) throw featuredUpdatedError;

      const countryCounts = studentsData?.reduce((acc: { [key: string]: number }, student) => {
        if (student.nationality) {
          acc[student.nationality] = (acc[student.nationality] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const topCountriesData = Object.entries(countryCounts)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const agentCounts = applicationsData?.reduce((acc: { [key: string]: { name: string, count: number } }, app: any) => {
        if (app.agent_id && app.agents?.profiles?.full_name) {
          const agentName = app.agents.profiles.full_name;
          if (!acc[app.agent_id]) {
            acc[app.agent_id] = { name: agentName, count: 0 };
          }
          acc[app.agent_id].count++;
        }
        return acc;
      }, {}) || {};

      const topAgentsData = Object.values(agentCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(agent => ({ name: agent.name, applications: agent.count }));

      const programCounts = applicationsData?.reduce((acc: { [key: string]: { name: string, count: number } }, app: any) => {
        if (app.program_id && app.programs?.name) {
          const programName = app.programs.name;
          if (!acc[app.program_id]) {
            acc[app.program_id] = { name: programName, count: 0 };
          }
          acc[app.program_id].count++;
        }
        return acc;
      }, {}) || {};

      const topProgramsData = Object.values(programCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(program => ({ name: program.name, applications: program.count }));

      if (!isMountedRef.current) return;

      setTopCountries(topCountriesData);
      setTopAgents(topAgentsData);
      setTopPrograms(topProgramsData);
      setShowcaseStats({
        count: featuredCount || 0,
        lastUpdated: featuredUpdated?.[0]?.updated_at ?? null,
      });
      hasLoadedInitialRef.current = true;

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      if (isMountedRef.current) {
        setAnalyticsLoading(false);
      }

      isFetchingRef.current = false;

      if (queueRefreshRef.current && isMountedRef.current) {
        queueRefreshRef.current = false;
        void fetchAnalytics({ background: true });
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchAnalytics();

    return () => {
      isMountedRef.current = false;
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }
    };
  }, [fetchAnalytics]);

  // Real-time subscriptions
  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }

      refreshDebounceRef.current = setTimeout(() => {
        void fetchAnalytics({ background: true });
      }, 800);
    };

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('overview-analytics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'universities' },
        scheduleRefresh
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Overview analytics real-time subscription active');
        }
      });

    channelRef.current = channel;

    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      {/* Platform Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Students</span>
                <span className="font-medium">{loading ? '...' : metrics.totalStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Applications</span>
                <span className="font-medium">{loading ? '...' : metrics.totalApplications}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Partner Universities</span>
                <span className="font-medium">{loading ? '...' : metrics.partnerUniversities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Agents</span>
                <span className="font-medium">{loading ? '...' : metrics.agents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="font-medium text-success">
                  ${loading ? '...' : metrics.revenue.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Application Status Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Draft", color: "bg-yellow-500" },
                { label: "Submitted", color: "bg-blue-500" },
                { label: "Approved", color: "bg-green-500" },
                { label: "Enrolled", color: "bg-purple-500" }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="font-medium">-</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Featured Universities */}
        <Card className="md:col-span-2 border-dashed">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Featured university showcase
              </CardTitle>
              <CardDescription>
                Control the carousel content that appears on the marketing site.
              </CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link to="/admin/featured-universities">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active spotlights</p>
              <Badge className="text-lg px-3 py-1">
                {analyticsLoading ? '...' : showcaseStats.count}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last curated</p>
              <p className="text-sm font-medium">
                {analyticsLoading
                  ? 'Loading...'
                  : showcaseStats.lastUpdated
                  ? new Date(showcaseStats.lastUpdated).toLocaleString()
                  : 'Not available'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Widgets */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : topCountries.length > 0 ? (
              <div className="space-y-3">
                {topCountries.map((country, index) => (
                  <div key={country.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm">{country.name}</span>
                    </div>
                    <span className="font-medium">{country.count} students</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : topAgents.length > 0 ? (
              <div className="space-y-3">
                {topAgents.map((agent, index) => (
                  <div key={agent.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm">{agent.name}</span>
                    </div>
                    <span className="font-medium">{agent.applications} apps</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Top Programs */}
        <Card>
          <CardHeader>
            <CardTitle>Top Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : topPrograms.length > 0 ? (
              <div className="space-y-3">
                {topPrograms.map((program, index) => (
                  <div key={program.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[150px]" title={program.name}>
                        {program.name}
                      </span>
                    </div>
                    <span className="font-medium">{program.applications} apps</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Top Countries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {topCountries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCountries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-16">No data to display</div>
            )}
          </CardContent>
        </Card>

        {/* Top Agents Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Agents Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {topAgents.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topAgents}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, applications, cx, cy, midAngle, outerRadius }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius * 1.35;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="hsl(var(--foreground))"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          style={{ fontSize: '12px' }}
                        >
                          {`${name}: ${applications}`}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="applications"
                  >
                    {topAgents.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-16">No data to display</div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Tracking Dashboard Section */}
      <Separator className="my-8" />
      <AdminTrackingPanel />
    </div>
  );
}
