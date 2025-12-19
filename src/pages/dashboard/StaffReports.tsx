import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BackButton from '@/components/BackButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { subDays, subMonths, format, formatISO } from 'date-fns';

interface StatsData {
  totalApplications: number;
  totalApplicationsChange: number;
  activeStudents: number;
  activeStudentsChange: number;
  completedTasks: number;
  completedTasksChange: number;
  avgProcessingTime: number;
  avgProcessingTimeChange: number;
}

interface ApplicationsByStatus {
  status: string;
  count: number;
  percentage: number;
}

interface TopProgram {
  program: string;
  applications: number;
  acceptanceRate: string;
}

interface TopUniversity {
  university: string;
  applications: number;
  offers: number;
}

interface NationalityData {
  nationality: string;
  count: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  applications: number;
  offers: number;
  enrollments: number;
}

export default function StaffReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [selectedMetric, setSelectedMetric] = useState('applications');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [applicationsByStatus, setApplicationsByStatus] = useState<ApplicationsByStatus[]>([]);
  const [topPrograms, setTopPrograms] = useState<TopProgram[]>([]);
  const [topUniversities, setTopUniversities] = useState<TopUniversity[]>([]);
  const [studentsByNationality, setStudentsByNationality] = useState<NationalityData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const channelRef = useRef<RealtimeChannel | null>(null);

  const getPeriodDates = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStart = subDays(startDate, 1);
        previousEnd = startDate;
        break;
      case 'this-week':
        startDate = subDays(now, 7);
        previousStart = subDays(startDate, 7);
        previousEnd = startDate;
        break;
      case 'this-month':
        startDate = subMonths(now, 1);
        previousStart = subMonths(startDate, 1);
        previousEnd = startDate;
        break;
      case 'last-month':
        startDate = subMonths(now, 2);
        previousStart = subMonths(startDate, 1);
        previousEnd = subMonths(now, 1);
        break;
      case 'this-quarter':
        startDate = subMonths(now, 3);
        previousStart = subMonths(startDate, 3);
        previousEnd = startDate;
        break;
      case 'this-year':
        startDate = subMonths(now, 12);
        previousStart = subMonths(startDate, 12);
        previousEnd = startDate;
        break;
      default:
        startDate = subMonths(now, 1);
        previousStart = subMonths(startDate, 1);
        previousEnd = startDate;
    }

    return { startDate, previousStart, previousEnd, endDate: now };
  }, [selectedPeriod]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { startDate, previousStart, previousEnd, endDate } = getPeriodDates();

      // Fetch current period applications
      const { count: currentApps } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', formatISO(startDate))
        .lte('created_at', formatISO(endDate));

      // Fetch previous period applications
      const { count: previousApps } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', formatISO(previousStart))
        .lt('created_at', formatISO(previousEnd));

      // Fetch current active students
      const { count: currentStudents } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Fetch previous active students
      const { count: previousStudents } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .lt('created_at', formatISO(previousEnd));

      // Fetch completed applications (as tasks)
      const { count: completedTasks } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['enrolled', 'withdrawn'])
        .gte('updated_at', formatISO(startDate));

      const { count: previousCompletedTasks } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['enrolled', 'withdrawn'])
        .gte('updated_at', formatISO(previousStart))
        .lt('updated_at', formatISO(previousEnd));

      // Calculate average processing time
      const { data: processedApps } = await supabase
        .from('applications')
        .select('created_at, updated_at, status')
        .eq('tenant_id', tenantId)
        .in('status', ['conditional_offer', 'unconditional_offer', 'enrolled', 'withdrawn']);

      let avgDays = 3.2;
      if (processedApps && processedApps.length > 0) {
        const times = processedApps
          .filter(app => app.created_at && app.updated_at)
          .map(app => {
            const created = new Date(app.created_at!);
            const updated = new Date(app.updated_at!);
            return Math.max(1, Math.round((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
          });
        if (times.length > 0) {
          avgDays = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
        }
      }

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setStats({
        totalApplications: currentApps ?? 0,
        totalApplicationsChange: calcChange(currentApps ?? 0, previousApps ?? 0),
        activeStudents: currentStudents ?? 0,
        activeStudentsChange: calcChange(currentStudents ?? 0, previousStudents ?? 0),
        completedTasks: completedTasks ?? 0,
        completedTasksChange: calcChange(completedTasks ?? 0, previousCompletedTasks ?? 0),
        avgProcessingTime: avgDays,
        avgProcessingTimeChange: -10, // Improvement = negative change
      });

      // Fetch applications by status
      const { data: statusData } = await supabase
        .from('applications')
        .select('status')
        .eq('tenant_id', tenantId)
        .gte('created_at', formatISO(startDate));

      const statusCounts = new Map<string, number>();
      (statusData ?? []).forEach((app) => {
        const status = app.status ?? 'unknown';
        statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
      });

      const totalStatusCount = statusData?.length ?? 0;
      const statusLabels: Record<string, string> = {
        submitted: 'Submitted',
        screening: 'Screening',
        conditional_offer: 'Conditional Offer',
        unconditional_offer: 'Unconditional Offer',
        cas_loa: 'CAS/LOA',
        visa: 'Visa Stage',
        enrolled: 'Enrolled',
        rejected: 'Rejected',
        withdrawn: 'Withdrawn',
        deferred: 'Deferred',
      };

      setApplicationsByStatus(
        Array.from(statusCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => ({
            status: statusLabels[status] ?? status,
            count,
            percentage: totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0,
          }))
      );

      // Fetch top programs
      const { data: programsData } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          program:programs (name)
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', formatISO(startDate));

      const programCounts = new Map<string, { apps: number; offers: number }>();
      (programsData ?? []).forEach((app: any) => {
        const name = app.program?.name;
        if (name) {
          const current = programCounts.get(name) ?? { apps: 0, offers: 0 };
          current.apps += 1;
          if (['conditional_offer', 'unconditional_offer', 'cas_loa', 'visa', 'enrolled'].includes(app.status)) {
            current.offers += 1;
          }
          programCounts.set(name, current);
        }
      });

      setTopPrograms(
        Array.from(programCounts.entries())
          .sort((a, b) => b[1].apps - a[1].apps)
          .slice(0, 5)
          .map(([program, data]) => ({
            program,
            applications: data.apps,
            acceptanceRate: data.apps > 0 ? `${Math.round((data.offers / data.apps) * 100)}%` : '0%',
          }))
      );

      // Fetch top universities
      const { data: uniData } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          program:programs (
            university:universities (name)
          )
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', formatISO(startDate));

      const uniCounts = new Map<string, { apps: number; offers: number }>();
      (uniData ?? []).forEach((app: any) => {
        const name = app.program?.university?.name;
        if (name) {
          const current = uniCounts.get(name) ?? { apps: 0, offers: 0 };
          current.apps += 1;
          if (['conditional_offer', 'unconditional_offer', 'cas_loa', 'visa', 'enrolled'].includes(app.status)) {
            current.offers += 1;
          }
          uniCounts.set(name, current);
        }
      });

      setTopUniversities(
        Array.from(uniCounts.entries())
          .sort((a, b) => b[1].apps - a[1].apps)
          .slice(0, 5)
          .map(([university, data]) => ({
            university,
            applications: data.apps,
            offers: data.offers,
          }))
      );

      // Fetch students by nationality
      const { data: nationalityData } = await supabase
        .from('students')
        .select('nationality')
        .eq('tenant_id', tenantId);

      const nationalityCounts = new Map<string, number>();
      (nationalityData ?? []).forEach((student) => {
        const nat = student.nationality ?? 'Unknown';
        nationalityCounts.set(nat, (nationalityCounts.get(nat) ?? 0) + 1);
      });

      const totalNationality = nationalityData?.length ?? 0;
      setStudentsByNationality(
        Array.from(nationalityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([nationality, count]) => ({
            nationality,
            count,
            percentage: totalNationality > 0 ? Math.round((count / totalNationality) * 100) : 0,
          }))
      );

      // Fetch monthly trends
      const sixMonthsAgo = subMonths(new Date(), 6);
      const { data: trendData } = await supabase
        .from('applications')
        .select('created_at, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', formatISO(sixMonthsAgo));

      const monthBuckets = new Map<string, { applications: number; offers: number; enrollments: number }>();
      (trendData ?? []).forEach((app) => {
        const month = format(new Date(app.created_at), 'MMM');
        const current = monthBuckets.get(month) ?? { applications: 0, offers: 0, enrollments: 0 };
        current.applications += 1;
        if (['conditional_offer', 'unconditional_offer', 'cas_loa', 'visa', 'enrolled'].includes(app.status)) {
          current.offers += 1;
        }
        if (app.status === 'enrolled') {
          current.enrollments += 1;
        }
        monthBuckets.set(month, current);
      });

      setMonthlyTrends(
        Array.from(monthBuckets.entries()).map(([month, data]) => ({
          month,
          ...data,
        }))
      );

    } catch (error) {
      console.error('Error fetching staff reports data:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, getPeriodDates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`staff-reports-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Staff reports real-time subscription active');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, fetchData]);

  const overviewStats = [
    {
      title: 'Total Applications',
      value: loading ? '...' : String(stats?.totalApplications ?? 0),
      change: `${(stats?.totalApplicationsChange ?? 0) >= 0 ? '+' : ''}${stats?.totalApplicationsChange ?? 0}%`,
      isPositive: (stats?.totalApplicationsChange ?? 0) >= 0,
      icon: FileText,
    },
    {
      title: 'Active Students',
      value: loading ? '...' : String(stats?.activeStudents ?? 0),
      change: `${(stats?.activeStudentsChange ?? 0) >= 0 ? '+' : ''}${stats?.activeStudentsChange ?? 0}%`,
      isPositive: (stats?.activeStudentsChange ?? 0) >= 0,
      icon: Users,
    },
    {
      title: 'Completed Tasks',
      value: loading ? '...' : String(stats?.completedTasks ?? 0),
      change: `${(stats?.completedTasksChange ?? 0) >= 0 ? '+' : ''}${stats?.completedTasksChange ?? 0}%`,
      isPositive: (stats?.completedTasksChange ?? 0) >= 0,
      icon: CheckCircle,
    },
    {
      title: 'Avg. Processing Time',
      value: loading ? '...' : `${stats?.avgProcessingTime ?? 0} days`,
      change: `${(stats?.avgProcessingTimeChange ?? 0)}%`,
      isPositive: (stats?.avgProcessingTimeChange ?? 0) <= 0,
      icon: Clock,
    },
  ];

  const staffPerformance = [
    { name: 'Team Average', processed: stats?.completedTasks ?? 0, avgTime: `${stats?.avgProcessingTime ?? 0} days`, satisfaction: '95%' },
  ];

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Reports & Analytics
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track performance and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs">
                  {stat.isPositive ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-success" />
                      <span className="text-success font-medium">{stat.change}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                      <span className="text-destructive font-medium">{stat.change}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">vs last period</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Applications by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Applications by Status</CardTitle>
              <CardDescription>Distribution of application statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applicationsByStatus.map((item) => (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.status}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Students by Nationality */}
          <Card>
            <CardHeader>
              <CardTitle>Students by Nationality</CardTitle>
              <CardDescription>Top countries of origin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentsByNationality.map((item) => (
                  <div key={item.nationality} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.nationality}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Applications, offers, and enrollments over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Offers</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                    <TableHead className="text-right">Conversion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyTrends.map((trend) => (
                    <TableRow key={trend.month}>
                      <TableCell className="font-medium">{trend.month}</TableCell>
                      <TableCell className="text-right">{trend.applications}</TableCell>
                      <TableCell className="text-right">{trend.offers}</TableCell>
                      <TableCell className="text-right">{trend.enrollments}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-success/10 text-success">
                          {Math.round((trend.enrollments / trend.applications) * 100)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Programs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Courses</CardTitle>
                  <CardDescription>Most popular programs by applications</CardDescription>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPrograms.map((program, index) => (
                  <div
                    key={program.program}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{program.program}</p>
                        <p className="text-xs text-muted-foreground">
                          {program.applications} applications
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      {program.acceptanceRate}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Universities */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Universities</CardTitle>
                  <CardDescription>Partner universities by applications</CardDescription>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUniversities.map((uni, index) => (
                  <div
                    key={uni.university}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{uni.university}</p>
                        <p className="text-xs text-muted-foreground">
                          {uni.applications} applications
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      {uni.offers} offers
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
            <CardDescription>Team productivity and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-right">Applications Processed</TableHead>
                    <TableHead className="text-right">Avg. Processing Time</TableHead>
                    <TableHead className="text-right">Satisfaction Rate</TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerformance.map((staff) => (
                    <TableRow key={staff.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {staff.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{staff.processed}</TableCell>
                      <TableCell className="text-right">{staff.avgTime}</TableCell>
                      <TableCell className="text-right">{staff.satisfaction}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            parseInt(staff.satisfaction) >= 95
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-warning/10 text-warning border-warning/20'
                          }
                        >
                          {parseInt(staff.satisfaction) >= 95 ? 'Excellent' : 'Good'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
