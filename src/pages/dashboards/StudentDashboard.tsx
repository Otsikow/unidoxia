import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  FileText,
  Upload,
  MessageCircle,
  Bell,
  TrendingUp,
  Calendar,
  DollarSign,
  Award,
  BookOpen,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowRight,
  Activity,
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useStudentRecord } from '@/hooks/useStudentRecord';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatErrorForToast, logError } from '@/lib/errorUtils';
import type { Tables } from '@/integrations/supabase/types';

interface ApplicationWithDetails {
  id: string;
  status: string | null;
  intake_year: number | null;
  intake_month: number | null;
  created_at: string;
  updated_at: string | null;
  program: {
    id: string;
    name: string;
    level: string | null;
    discipline: string | null;
    tuition_amount: number | null;
    tuition_currency: string | null;
    university: {
      name: string;
      city: string | null;
      country: string | null;
      logo_url: string | null;
    };
  };
  intake?: {
    app_deadline: string | null;
  };
}

interface RecommendedProgram {
  id: string;
  name: string;
  level: string | null;
  discipline: string | null;
  tuition_amount: number | null;
  tuition_currency: string | null;
  duration_months: number | null;
  university: {
    name: string;
    city: string | null;
    country: string | null;
    logo_url: string | null;
  };
}

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: string;
}

type StudentProfile = Tables<'students'>;

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const {
    data: studentRecord,
    isLoading: studentRecordLoading,
    error: studentRecordError,
  } = useStudentRecord();

  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [recommendedPrograms, setRecommendedPrograms] = useState<RecommendedProgram[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const studentProfile = studentRecord;
  const studentId = studentProfile?.id ?? null;

  const educationHistory = useMemo<Record<string, unknown> | null>(() => {
    const raw = studentProfile?.education_history;
    if (!raw) return null;

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (error) {
        logError(error, 'StudentDashboard.parseEducationHistory');
        return null;
      }
    }

    if (typeof raw === 'object') {
      return raw as Record<string, unknown>;
    }

    return null;
  }, [studentProfile?.education_history]);

  const preferredProgramLevel = useMemo(() => {
    const candidate =
      (educationHistory?.preferred_level as string | undefined) ??
      (educationHistory?.highest_level as string | undefined) ??
      (educationHistory?.current_level as string | undefined);

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.toLowerCase();
    }

    return 'bachelors';
  }, [educationHistory]);

  useEffect(() => {
    if (studentRecordError) {
      toast(formatErrorForToast(studentRecordError, 'Failed to load student profile'));
    }
  }, [studentRecordError, toast]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setApplications([]);
      setRecommendedPrograms([]);
      setNotifications([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    try {
      const applicationsPromise = studentId
        ? supabase
            .from('applications')
            .select(`
              id,
              status,
              intake_year,
              intake_month,
              created_at,
              updated_at,
              program:programs (
                id,
                name,
                level,
                discipline,
                tuition_amount,
                tuition_currency,
                university:universities (
                  name,
                  city,
                  country,
                  logo_url
                )
              ),
              intake:intakes (
                app_deadline
              )
            `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as ApplicationWithDetails[], error: null });

      const programsPromise = supabase
        .from('programs')
        .select(`
          id,
          name,
          level,
          discipline,
          tuition_amount,
          tuition_currency,
          duration_months,
          university:universities (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('active', true)
        .eq('level', preferredProgramLevel)
        .order('created_at', { ascending: false })
        .limit(5);

      const notificationsPromise = supabase
        .from('notifications')
        .select('id, title, content, type, created_at, read')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const [appsResult, programsResult, notificationsResult] = await Promise.allSettled([
        applicationsPromise,
        programsPromise,
        notificationsPromise,
      ]);

      if (appsResult.status === 'fulfilled') {
        const { data, error } = appsResult.value as {
          data: ApplicationWithDetails[] | null;
          error: unknown;
        };

        if (error) {
          logError(error, 'StudentDashboard.fetchApplications');
          toast(formatErrorForToast(error, 'Failed to load applications'));
          setApplications([]);
        } else {
          const sanitized = (data ?? []).filter(
            (app): app is ApplicationWithDetails =>
              Boolean(app?.program && app.program?.university && app.created_at)
          );
          setApplications(sanitized);
        }
      } else {
        logError(appsResult.reason, 'StudentDashboard.fetchApplications');
        toast(formatErrorForToast(appsResult.reason, 'Failed to load applications'));
        setApplications([]);
      }

      if (programsResult.status === 'fulfilled') {
        const { data, error } = programsResult.value as {
          data: RecommendedProgram[] | null;
          error: unknown;
        };

        if (error) {
          logError(error, 'StudentDashboard.fetchPrograms');
          toast(formatErrorForToast(error, 'Failed to load recommended programs'));
          setRecommendedPrograms([]);
        } else {
          const sanitized = (data ?? []).filter((program) => program?.university);
          setRecommendedPrograms(sanitized as RecommendedProgram[]);
        }
      } else {
        logError(programsResult.reason, 'StudentDashboard.fetchPrograms');
        toast(formatErrorForToast(programsResult.reason, 'Failed to load recommended programs'));
        setRecommendedPrograms([]);
      }

      if (notificationsResult.status === 'fulfilled') {
        const { data, error } = notificationsResult.value as {
          data: (Notification & { metadata?: Record<string, unknown> })[] | null;
          error: unknown;
        };

        if (error) {
          logError(error, 'StudentDashboard.fetchNotifications');
          toast(formatErrorForToast(error, 'Failed to load notifications'));
          setNotifications([]);
        } else {
          const mapped = (data ?? []).map((item) => ({
            id: item.id,
            title: item.title || 'Notification',
            content: item.content || '',
            created_at: item.created_at,
            read: !!item.read,
            type: item.type || 'general',
          }));
          setNotifications(mapped);
        }
      } else {
        logError(notificationsResult.reason, 'StudentDashboard.fetchNotifications');
        toast(formatErrorForToast(notificationsResult.reason, 'Failed to load notifications'));
        setNotifications([]);
      }
    } catch (error) {
      logError(error, 'StudentDashboard.fetchDashboardData');
      toast(formatErrorForToast(error, 'Failed to load dashboard data'));
    } finally {
      setDataLoading(false);
    }
  }, [user?.id, studentId, preferredProgramLevel, toast]);

  useEffect(() => {
    if (studentRecordLoading) return;
    fetchDashboardData();
  }, [fetchDashboardData, studentRecordLoading]);

  const profileCompleteness = useMemo(() => {
    if (!studentProfile) return 0;

    const fields = [
      studentProfile.nationality,
      studentProfile.date_of_birth,
      studentProfile.passport_number,
      studentProfile.education_history,
      studentProfile.test_scores,
    ];

    const computed = fields.reduce((acc, field) => (field ? (acc as number) + 20 : acc), 0) as number;
    const stored = typeof studentProfile.profile_completeness === 'number' ? studentProfile.profile_completeness : null;

    return Math.min(100, stored ?? computed);
  }, [studentProfile]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatCurrency = (amount?: number | null, currency: string = 'USD') => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      logError(error, 'StudentDashboard.formatCurrency');
      return `${amount}`;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDeadline = (year?: number | null, month?: number | null) => {
    if (!year || !month || month < 1 || month > 12) return 'TBD';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
  };

  const getRelativeTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';

    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const isLoading = studentRecordLoading || dataLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8 space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
        {/* Greeting */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-12 w-12 sm:h-14 md:h-16 sm:w-14 md:w-16 border-2 border-primary shadow-lg shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
              <AvatarFallback className="text-sm sm:text-lg font-semibold bg-primary/70 text-white">
                {profile?.full_name ? getInitials(profile.full_name) : 'ST'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight truncate">
                Welcome, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">Track your journey and explore opportunities</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" asChild className="relative h-9 w-9 sm:h-10 sm:w-10">
              <Link to="/student/notifications">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] sm:text-xs flex items-center justify-center font-semibold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hover-scale whitespace-nowrap text-xs sm:text-sm">
              <Link to="/student/application-tracking" className="flex items-center gap-1.5 sm:gap-2">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Track Apps</span>
                <span className="sm:hidden">Track</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="hover-scale whitespace-nowrap text-xs sm:text-sm">
              <Link to="/courses?view=programs" className="flex items-center gap-1.5 sm:gap-2">
                <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Find Programs</span>
                <span className="sm:hidden">Find</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Profile Progress */}
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex items-start gap-3 sm:items-center">
                <div className="p-2 rounded-full bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg leading-tight">Profile Completion</h3>
                  <p className="text-sm text-muted-foreground">
                    Your profile is {profileCompleteness}% complete
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-center whitespace-nowrap sm:w-auto"
              >
                <Link to="/student/profile">
                  <span>Complete Profile</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Progress value={profileCompleteness} className="mt-4 h-3" />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { to: '/courses', icon: Search, label: 'Discover Programmes' },
            { to: '/student/applications', icon: FileText, label: 'Track Applications' },
            { to: '/scholarships', icon: Award, label: 'Find Scholarships' },
            { to: '/student/documents', icon: Upload, label: 'Upload Documents' },
            { to: '/student/messages', icon: MessageCircle, label: 'Chat with Agent' },
          ].map(({ to, icon: Icon, label }) => (
            <Button
              key={to}
              asChild
              size="lg"
              className="h-auto flex-col gap-3 py-6 transition-transform shadow-lg hover:scale-105"
              variant="secondary"
            >
              <Link to={to}>
                <Icon className="h-8 w-8" />
                <span className="font-semibold">{label}</span>
              </Link>
            </Button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Applications + Recommendations */}
          <div className="xl:col-span-2 space-y-6">
            {/* Applications Table */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">My Applications</CardTitle>
                    <CardDescription>Track all your university applications</CardDescription>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/student/applications">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                    <p className="text-muted-foreground mb-4">Start by applying to programs</p>
                    <Button asChild>
                      <Link to="/courses?view=programs">
                        <Search className="mr-2 h-4 w-4" /> Search Programmes
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Programme</TableHead>
                          <TableHead>University</TableHead>
                          <TableHead className="text-right">Tuition</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Intake</TableHead>
                          <TableHead>Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Link to={`/student/applications/${app.id}`} className="hover:underline">
                                <div className="font-semibold truncate">{app.program.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {app.program.level} • {app.program.discipline}
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {app.program.university.logo_url && (
                                  <img
                                    src={app.program.university.logo_url}
                                    alt={app.program.university.name}
                                    className="h-8 w-8 rounded object-contain"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{app.program.university.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {app.program.university.city}, {app.program.university.country}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(app.program.tuition_amount, app.program.tuition_currency)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={app.status} />
                            </TableCell>
                            <TableCell className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDeadline(app.intake_year, app.intake_month)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {app.updated_at ? getRelativeTime(app.updated_at) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Programs */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-2xl">Recommended Programs</CardTitle>
                </div>
                <CardDescription>Programs that match your interests</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendedPrograms.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recommendations yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendedPrograms.map((program) => (
                      <Link
                        key={program.id}
                        to={`/courses?view=programs&program=${program.id}`}
                        className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{program.name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3" />
                              {program.university.name}, {program.university.country}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{program.level}</Badge>
                              <Badge variant="secondary">{program.discipline}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatCurrency(program.tuition_amount, program.tuition_currency)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {program.duration_months} months
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Notifications */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Recent Activity</CardTitle>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/student/notifications">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">No notifications</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            notification.read ? 'bg-background' : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {getRelativeTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
