import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import BackButton from '@/components/BackButton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { formatErrorForToast, getErrorMessage, logError } from '@/lib/errorUtils';
import { parseUniversityProfileDetails } from '@/lib/universityProfile';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  TrendingUp,
  Award,
  Globe,
} from 'lucide-react';
import type { ChangeEvent } from 'react';

type StatusFilter = 'all' | 'draft' | 'submitted' | 'in_progress' | 'offers' | 'completed';

interface ApplicationRow {
  id: string;
  app_number?: string | null;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
  created_at: string;
  intake_month?: number | null;
  intake_year?: number | null;
  notes?: string | null;
  internal_notes?: string | null;
  timeline_json?: TimelineItem[] | null;
  student?: {
    legal_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    profile?: {
      full_name?: string | null;
      email?: string | null;
    } | null;
  } | null;
  program?: {
    name?: string | null;
    level?: string | null;
    discipline?: string | null;
    university?: {
      id?: string | null;
      name?: string | null;
      country?: string | null;
      city?: string | null;
      website?: string | null;
      submission_config_json?: unknown;
      ranking?: {
        accreditation?: string;
        accreditation_summary?: string;
      } | null;
    } | null;
  } | null;
}

interface TimelineItem {
  title?: string;
  description?: string;
  date?: string;
  status?: string;
}

interface UniversityOption {
  id: string;
  name: string;
}

interface ApplicationStats {
  total: number;
  draft: number;
  submitted: number;
  inProgress: number;
  offers: number;
  completed: number;
}

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Applications' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'offers', label: 'Offers' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_FILTER_MAP: Record<StatusFilter, string[]> = {
  all: [],
  draft: ['draft'],
  submitted: ['submitted'],
  in_progress: ['screening', 'visa'],
  offers: ['conditional_offer', 'unconditional_offer'],
  completed: ['enrolled', 'withdrawn', 'rejected'],
};

const formatDate = (value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
  } catch {
    return value;
  }
};

const formatIntake = (month?: number | null, year?: number | null) => {
  if (!month || !year) return '—';
  try {
    const intakeDate = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(intakeDate);
  } catch {
    return `${month}/${year}`;
  }
};

const getStudentName = (application: ApplicationRow) =>
  application.student?.legal_name ||
  application.student?.profile?.full_name ||
  'Unknown student';

const getStudentEmail = (application: ApplicationRow) =>
  application.student?.contact_email ||
  application.student?.profile?.email ||
  null;

const getStudentPhone = (application: ApplicationRow) =>
  application.student?.contact_phone || null;

const getUniversityName = (application: ApplicationRow) =>
  application.program?.university?.name || '—';

const getUniversityLocation = (application: ApplicationRow) => {
  const city = application.program?.university?.city;
  const country = application.program?.university?.country;
  if (city && country) return `${city}, ${country}`;
  return country || city || null;
};

const getAccreditation = (application: ApplicationRow) => {
  const ranking = application.program?.university?.ranking;
  if (!ranking) return null;
  return ranking.accreditation_summary || ranking.accreditation || null;
};

const getProgramName = (application: ApplicationRow) =>
  application.program?.name || '—';

const getProgramLevel = (application: ApplicationRow) =>
  application.program?.level || null;

const AgentApplications = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [allApplications, setAllApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [universityFilter, setUniversityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);

  const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchTerm.trim(), 300);

  const selectedUniversityContact = useMemo(() => {
    const uni = selectedApplication?.program?.university ?? null;
    const parsed = parseUniversityProfileDetails((uni as any)?.submission_config_json ?? null);
    const primary = parsed?.contacts?.primary ?? null;
    return {
      email: primary?.email ?? null,
      phone: primary?.phone ?? null,
      website: (uni as any)?.website ?? null,
    };
  }, [selectedApplication]);

  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);
  const endIndex = useMemo(() => startIndex + PAGE_SIZE - 1, [startIndex]);
  const totalPages = useMemo(() => (totalCount === 0 ? 1 : Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  // Calculate stats from all applications
  const stats: ApplicationStats = useMemo(() => {
    const result = {
      total: allApplications.length,
      draft: 0,
      submitted: 0,
      inProgress: 0,
      offers: 0,
      completed: 0,
    };

    allApplications.forEach((app) => {
      if (app.status === 'draft') result.draft++;
      else if (app.status === 'submitted') result.submitted++;
      else if (['screening', 'visa'].includes(app.status)) result.inProgress++;
      else if (['conditional_offer', 'unconditional_offer'].includes(app.status)) result.offers++;
      else if (['enrolled', 'withdrawn', 'rejected'].includes(app.status)) result.completed++;
    });

    return result;
  }, [allApplications]);

  // Fetch agent ID
  useEffect(() => {
    if (!profile?.id) {
      setAgentId(null);
      setAgentLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchAgent = async () => {
      try {
        setAgentLoading(true);
        const { data, error } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (controller.signal.aborted) return;
        if (error) throw error;

        if (isMounted) {
          setAgentId(data?.id ?? null);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        logError(error, 'AgentApplications.fetchAgent');
        toast(formatErrorForToast(error, 'Failed to identify agent record'));
        setAgentId(null);
      } finally {
        if (!controller.signal.aborted && isMounted) {
          setAgentLoading(false);
        }
      }
    };

    void fetchAgent();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [profile?.id, toast]);

  // Fetch all applications for stats and university list
  const fetchAllApplications = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!agentId) return;

      try {
        const { data, error } = await supabase
          .from('applications')
          .select(
            `
              id,
              status,
              program:programs (
                university:universities (
                  id,
                  name,
                  website,
                  submission_config_json
                )
              )
            `
          )
          .eq('agent_id', agentId);

        if (options?.signal?.aborted) return;
        if (error) throw error;

        const apps = (data ?? []) as ApplicationRow[];
        setAllApplications(apps);

        // Extract unique universities
        const universityMap = new Map<string, string>();
        apps.forEach((app) => {
          const uni = app.program?.university;
          if (uni?.id && uni?.name) {
            universityMap.set(uni.id, uni.name);
          }
        });
        const uniqueUniversities = Array.from(universityMap.entries()).map(([id, name]) => ({
          id,
          name,
        }));
        uniqueUniversities.sort((a, b) => a.name.localeCompare(b.name));
        setUniversities(uniqueUniversities);
      } catch (error) {
        if (options?.signal?.aborted) return;
        logError(error, 'AgentApplications.fetchAllApplications');
      }
    },
    [agentId]
  );

  // Fetch paginated applications
  const fetchApplications = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!agentId) {
        setApplications([]);
        setTotalCount(0);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const statuses = STATUS_FILTER_MAP[statusFilter];
        const searchValue = debouncedSearch ? `%${debouncedSearch}%` : null;

        let query = supabase
          .from('applications')
          .select(
            `
              id,
              app_number,
              status,
              submitted_at,
              updated_at,
              created_at,
              intake_month,
              intake_year,
              notes,
              internal_notes,
              timeline_json,
              student:students!inner (
                legal_name,
                contact_email,
                contact_phone,
                profile:profiles (
                  full_name,
                  email
                )
              ),
              program:programs!inner (
                name,
                level,
                discipline,
                university:universities!inner (
                  id,
                  name,
                  country,
                  city,
                  website,
                  submission_config_json,
                  ranking
                )
              )
            `,
            { count: 'exact' }
          )
          .eq('agent_id', agentId);

        if (statuses.length > 0) {
          query = query.in('status', statuses as any);
        }

        if (universityFilter !== 'all') {
          query = query.eq('program.university.id', universityFilter);
        }

        if (searchValue) {
          query = query.or(
            [
              `app_number.ilike.${searchValue}`,
              `student.legal_name.ilike.${searchValue}`,
              `program.name.ilike.${searchValue}`,
            ].join(',')
          );
        }

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(startIndex, endIndex);

        if (options?.signal?.aborted) return;

        if (error) throw error;

        if ((count ?? 0) <= startIndex && page > 1) {
          setPage(1);
          setLoading(false);
          return;
        }

        setApplications((data ?? []) as ApplicationRow[]);
        setTotalCount(count ?? data?.length ?? 0);
      } catch (error) {
        if (options?.signal?.aborted) return;

        logError(error, 'AgentApplications.fetchApplications');
        const message = getErrorMessage(error);
        setErrorMessage(message);
        toast(formatErrorForToast(error, 'Failed to load applications'));
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [agentId, debouncedSearch, endIndex, page, startIndex, statusFilter, universityFilter, toast]
  );

  useEffect(() => {
    if (authLoading || agentLoading) return;

    const controller = new AbortController();
    void fetchAllApplications({ signal: controller.signal });
    void fetchApplications({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [authLoading, agentLoading, fetchAllApplications, fetchApplications]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const handleUniversityChange = (value: string) => {
    setUniversityFilter(value);
    setPage(1);
  };

  const handleViewDetails = (application: ApplicationRow) => {
    setSelectedApplication(application);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedApplication(null);
    }
  };

  const handleRefresh = () => {
    void fetchAllApplications();
    void fetchApplications();
  };

  const showingRangeStart = totalCount === 0 ? 0 : startIndex + 1;
  const showingRangeEnd = totalCount === 0 ? 0 : Math.min(totalCount, startIndex + applications.length);

  const renderTimeline = (items?: TimelineItem[] | null) => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-muted-foreground">No timeline entries yet.</p>;
    }

    return (
      <div className="space-y-4">
        {items.slice(0, 5).map((item, index) => (
          <div key={`${item.title ?? 'item'}-${index}`} className="flex gap-3">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              {index !== Math.min(items.length, 5) - 1 && <div className="w-px bg-border h-full ml-1" />}
            </div>
            <div className="space-y-1 text-sm">
              <div className="font-medium text-foreground">{item.title ?? 'Update'}</div>
              {item.description && <p className="text-muted-foreground">{item.description}</p>}
              {item.date && <p className="text-xs text-muted-foreground">{formatDate(item.date, { dateStyle: 'medium', timeStyle: 'short' })}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Application Tracking
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track and manage all applications submitted for your students
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {!agentLoading && !agentId && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>No Agent Profile Found</CardTitle>
              <CardDescription>
                We could not locate an agent profile linked to your account. Please contact an administrator if you believe this is an error.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {agentId && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                  <div className="rounded-full bg-primary/10 p-2">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All applications</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
                  <div className="rounded-full bg-info/10 p-2">
                    <Send className="h-4 w-4 text-info" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.submitted}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                  <div className="rounded-full bg-warning/10 p-2">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">Under processing</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Offers</CardTitle>
                  <div className="rounded-full bg-success/10 p-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{stats.offers}</div>
                  <p className="text-xs text-muted-foreground">Received offers</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
                  <div className="rounded-full bg-muted p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draft}</div>
                  <p className="text-xs text-muted-foreground">Not yet submitted</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Table */}
            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Applications</CardTitle>
                    <CardDescription>
                      {loading
                        ? 'Fetching applications...'
                        : `Showing ${showingRangeStart}-${showingRangeEnd} of ${totalCount} applications`}
                    </CardDescription>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="relative w-full min-w-[220px] sm:min-w-[260px] sm:flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Search student or program..."
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-full sm:w-44 md:w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FILTER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={universityFilter} onValueChange={handleUniversityChange}>
                      <SelectTrigger className="w-full sm:w-52 md:w-48">
                        <SelectValue placeholder="Filter by university" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Universities</SelectItem>
                        {universities.map((uni) => (
                          <SelectItem key={uni.id} value={uni.id}>
                            {uni.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={handleRefresh}
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button size="sm" className="w-full sm:w-auto" asChild>
                        <Link to="/dashboard/applications/new">
                          <Plus className="h-4 w-4 mr-2" />
                          New
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {(statusFilter !== 'all' || universityFilter !== 'all') && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>
                      {statusFilter !== 'all' && `Status: ${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}`}
                      {statusFilter !== 'all' && universityFilter !== 'all' && ' • '}
                      {universityFilter !== 'all' && `University: ${universities.find((u) => u.id === universityFilter)?.name}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setStatusFilter('all');
                        setUniversityFilter('all');
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>University</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10">
                            <LoadingState message="Loading applications..." />
                          </TableCell>
                        </TableRow>
                      ) : applications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                              <p className="font-medium text-foreground">No applications found</p>
                              <p className="max-w-md text-xs sm:text-sm text-muted-foreground/80">
                                {searchTerm || statusFilter !== 'all' || universityFilter !== 'all'
                                  ? 'No applications match your current filters. Try adjusting your search criteria.'
                                  : 'Start by browsing programs and submitting applications for your students.'}
                              </p>
                              {!searchTerm && statusFilter === 'all' && universityFilter === 'all' && (
                                <Button asChild className="mt-2">
                                  <Link to="/courses?view=programs">
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    Browse Programs
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        applications.map((application) => (
                          <TableRow key={application.id} className="hover:bg-muted/50">
                            <TableCell className="space-y-1">
                              <div className="font-medium">{getStudentName(application)}</div>
                              {getStudentEmail(application) && (
                                <div className="text-xs text-muted-foreground">{getStudentEmail(application)}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{getUniversityName(application)}</div>
                                {getUniversityLocation(application) && (
                                  <div className="text-xs text-muted-foreground">{getUniversityLocation(application)}</div>
                                )}
                                {getAccreditation(application) && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Award className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]" title={getAccreditation(application) ?? undefined}>
                                      {getAccreditation(application)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium max-w-[200px] truncate" title={getProgramName(application)}>
                                  {getProgramName(application)}
                                </div>
                                {getProgramLevel(application) && (
                                  <Badge variant="secondary" className="text-xs">
                                    {getProgramLevel(application)}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={application.status} />
                            </TableCell>
                            <TableCell>{formatDate(application.submitted_at)}</TableCell>
                            <TableCell>{formatDate(application.updated_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/dashboard/messages?applicationId=${application.id}`)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Message
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(application)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {applications.length > 0 && (
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Application Details Dialog */}
        <Dialog open={Boolean(selectedApplication)} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedApplication && (
              <>
                <DialogHeader>
                  <DialogTitle>{getProgramName(selectedApplication)}</DialogTitle>
                  <DialogDescription>
                    {getUniversityName(selectedApplication)} • {getStudentName(selectedApplication)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Course Info */}
                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <GraduationCap className="h-4 w-4" />
                        Course
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium">{getProgramName(selectedApplication)}</p>
                        {getProgramLevel(selectedApplication) && (
                          <Badge variant="secondary">{getProgramLevel(selectedApplication)}</Badge>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{getUniversityName(selectedApplication)}</p>
                          {getUniversityLocation(selectedApplication) && (
                            <p className="text-muted-foreground">{getUniversityLocation(selectedApplication)}</p>
                          )}
                          {getAccreditation(selectedApplication) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Award className="h-3 w-3" />
                              <span>{getAccreditation(selectedApplication)}</span>
                            </div>
                          )}
                          {selectedApplication.submitted_at &&
                          (selectedUniversityContact.email ||
                            selectedUniversityContact.phone ||
                            selectedUniversityContact.website) ? (
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {selectedUniversityContact.email ? (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5" />
                                  <a
                                    className="underline underline-offset-4"
                                    href={`mailto:${selectedUniversityContact.email}`}
                                  >
                                    {selectedUniversityContact.email}
                                  </a>
                                </div>
                              ) : null}
                              {selectedUniversityContact.phone ? (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5" />
                                  <a
                                    className="underline underline-offset-4"
                                    href={`tel:${selectedUniversityContact.phone}`}
                                  >
                                    {selectedUniversityContact.phone}
                                  </a>
                                </div>
                              ) : null}
                              {selectedUniversityContact.website ? (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-3.5 w-3.5" />
                                  <a
                                    className="underline underline-offset-4"
                                    href={selectedUniversityContact.website}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Website
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {(selectedApplication.intake_month || selectedApplication.intake_year) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Intake: {formatIntake(selectedApplication.intake_month, selectedApplication.intake_year)}</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center gap-2"
                        onClick={() => navigate(`/dashboard/messages?applicationId=${selectedApplication.id}`)}
                      >
                        <Send className="h-4 w-4" />
                        Message university
                      </Button>
                    </div>

                    {/* Application Info */}
                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <FileText className="h-4 w-4" />
                        Application
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedApplication.status} />
                        {selectedApplication.app_number && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            #{selectedApplication.app_number}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Created {formatDate(selectedApplication.created_at)}</span>
                        </div>
                        {selectedApplication.submitted_at && (
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            <span>Submitted {formatDate(selectedApplication.submitted_at)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Updated {formatDate(selectedApplication.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                      <TrendingUp className="h-4 w-4" />
                      Student
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-medium">{getStudentName(selectedApplication)}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {getStudentEmail(selectedApplication) && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {getStudentEmail(selectedApplication)}
                          </span>
                        )}
                        {getStudentPhone(selectedApplication) && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {getStudentPhone(selectedApplication)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {(selectedApplication.notes || selectedApplication.internal_notes) && (
                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <FileText className="h-4 w-4" />
                        Notes
                      </div>
                      {selectedApplication.notes && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-1">Application Notes</p>
                          <p className="text-sm leading-relaxed whitespace-pre-line">{selectedApplication.notes}</p>
                        </div>
                      )}
                      {selectedApplication.internal_notes && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-1">Internal Notes</p>
                          <p className="text-sm leading-relaxed whitespace-pre-line">{selectedApplication.internal_notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                      <Clock className="h-4 w-4" />
                      Status Updates
                    </div>
                    {renderTimeline(selectedApplication.timeline_json)}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleDialogChange(false)}>
                      Close
                    </Button>
                    <Button onClick={() => navigate(`/student/applications/${selectedApplication.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Full Details
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AgentApplications;
