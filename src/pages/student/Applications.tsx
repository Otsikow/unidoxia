import { useEffect, useState, useCallback, type HTMLDivElement, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { logError, formatErrorForToast } from '@/lib/errorUtils';
import { LoadingState } from '@/components/LoadingState';
import {
  FileText,
  Plus,
  Calendar,
  GraduationCap,
  MapPin,
  Timer,
  XCircle,
  Clock,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useErrorHandler, ErrorDisplay } from '@/hooks/useErrorHandler';
import { formatDistanceToNow } from 'date-fns';

interface Application {
  id: string;
  app_number?: string | null;
  status: string;
  intake_year: number;
  intake_month: number;
  created_at: string;
  submitted_at: string | null;
  program: {
    name: string;
    level: string;
    discipline: string;
    university: {
      name: string;
      city: string;
      country: string;
    } | null;
  } | null;
}

interface ApplicationDraft {
  id: string;
  last_step: number | null;
  updated_at: string;
  program: {
    name: string;
    level: string;
    discipline: string;
    university: {
      name: string;
      city: string;
      country: string;
    } | null;
  } | null;
}

export default function Applications() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const {
    clearError,
    handleError,
    hasError,
    error: currentError,
    retry,
  } = useErrorHandler({ context: 'Applications' });

  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<ApplicationDraft[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allCountries, setAllCountries] = useState<string[]>([]);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setDataLoading(true);
      clearError();

      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (studentError) throw studentError;
      const studentId = studentRecord?.id;
      if (!studentId) {
        throw new Error('Student record not found');
      }

      const [applicationsResponse, draftsResponse] = await Promise.all([
        supabase
          .from('applications')
          .select(`
            id,
            app_number,
            status,
            intake_year,
            intake_month,
            created_at,
            submitted_at,
            program:programs (
              name,
              level,
              discipline,
              university:universities (
                name,
                city,
                country
              )
            ),
            student:students!inner (
              profile_id
            )
          `)
          .eq('student.profile_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('application_drafts')
          .select(`
            id,
            last_step,
            updated_at,
            program:programs (
              name,
              level,
              discipline,
              university:universities (
                name,
                city,
                country
              )
            )
          `)
          .eq('student_id', studentId)
          .order('updated_at', { ascending: false }),
      ]);

      if (applicationsResponse.error) throw applicationsResponse.error;
      if (draftsResponse.error) throw draftsResponse.error;

      const applicationList = (applicationsResponse.data ?? []) as Application[];
      const draftList = (draftsResponse.data ?? []) as ApplicationDraft[];

      setApplications(applicationList);
      setDrafts(draftList);

      const countries = Array.from(
        new Set(
          [
            ...applicationList
              .map((a) => a.program?.university?.country)
              .filter((country): country is string => Boolean(country)),
            ...draftList
              .map((draft) => draft.program?.university?.country)
              .filter((country): country is string => Boolean(country)),
          ].filter(Boolean)
        )
      ).sort();
      setAllCountries(countries);
    } catch (error) {
      logError(error, 'Applications.fetchApplications');
      handleError(error, 'Failed to load applications');
      toast(formatErrorForToast(error, 'Failed to load applications'));
    } finally {
      setDataLoading(false);
    }
  }, [user?.id, clearError, handleError, toast]);

  useEffect(() => {
    if (user?.id) {
      void fetchApplications();
    } else if (!authLoading) {
      setApplications([]);
      setDrafts([]);
      setAllCountries([]);
    }
  }, [user?.id, authLoading, fetchApplications]);

  const isLoading = authLoading || dataLoading;

  const getIntakeLabel = (month: number, year: number) => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const filtered = applications.filter((a) => {
    const program = a.program;
    const university = program?.university;

    const matchesStatus = (() => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'in_progress') return ['draft', 'screening'].includes(a.status);
      if (statusFilter === 'offers')
        return ['conditional_offer', 'unconditional_offer'].includes(a.status);
      if (statusFilter === 'submitted') return Boolean(a.submitted_at) || a.status === 'submitted';
      return a.status === statusFilter;
    })();

    const matchesCountry =
      countryFilter === 'all' || !university || university.country === countryFilter;
    const term = searchTerm.toLowerCase();
    const programName = program?.name?.toLowerCase() ?? '';
    const universityName = university?.name?.toLowerCase() ?? '';
    const matchesSearch =
      !term ||
      (a.app_number && a.app_number.toLowerCase().includes(term)) ||
      programName.includes(term) ||
      universityName.includes(term);
    return matchesStatus && matchesCountry && matchesSearch;
  });

  const filteredDrafts = drafts.filter((draft) => {
    const program = draft.program;
    const university = program?.university;

    const matchesStatus =
      statusFilter === 'all' || statusFilter === 'draft' || statusFilter === 'in_progress';
    const matchesCountry =
      countryFilter === 'all' || university?.country === countryFilter;
    const term = searchTerm.toLowerCase();
    const programName = program?.name?.toLowerCase() ?? '';
    const universityName = university?.name?.toLowerCase() ?? '';
    const matchesSearch =
      !term || programName.includes(term) || universityName.includes(term);

    return matchesStatus && matchesCountry && matchesSearch;
  });

  const totalCount = applications.length + drafts.length;
  const submittedCount = applications.filter((a) => a.submitted_at).length;
  const inProgressCount =
    applications.filter((a) => ['draft', 'screening'].includes(a.status)).length + drafts.length;
  const offersCount = applications.filter((a) =>
    ['conditional_offer', 'unconditional_offer'].includes(a.status)
  ).length;

  const handleSummaryCardClick = (filter: string) => {
    setStatusFilter(filter);
    setCountryFilter('all');
    setSearchTerm('');
  };

  const handleSummaryCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, filter: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSummaryCardClick(filter);
    }
  };

  const etaFor = (status: string) => {
    const map: Record<string, string> = {
      draft: '1–2w prep',
      submitted: '2–6w decision',
      screening: '1–2w screening',
      conditional_offer: '1–3w conditions',
      unconditional_offer: '2–4w CAS/LOA',
      cas_loa: '2–6w visa',
      visa: '2–6w enroll',
      enrolled: 'Done',
    };
    return map[status] || 'Varies';
  };

  const cancelDraft = async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn' })
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Cancelled',
        description: 'Application moved to Withdrawn',
      });
      await fetchApplications();
    } catch (err) {
      logError(err, 'Applications.cancelDraft');
      handleError(err, 'Could not cancel application');
      toast(formatErrorForToast(err, 'Could not cancel application'));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState message="Loading your applications..." size="lg" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        <BackButton variant="ghost" size="sm" wrapperClassName="mb-2 sm:mb-4" fallback="/dashboard" />
        <ErrorDisplay
          error={currentError}
          onRetry={() => retry(fetchApplications)}
          onClear={clearError}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
      <BackButton variant="ghost" size="sm" wrapperClassName="mb-2 sm:mb-4" fallback="/dashboard" />

      {/* Header and Filters */}
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              My Applications
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track and manage your university applications
            </p>
          </div>

          <Button asChild className="w-full sm:w-auto">
            <Link to="/courses?view=programs">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="sm:col-span-2">
            <input
              className="w-full border rounded-md h-9 px-3 text-sm bg-background"
              placeholder="Search program or university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full border rounded-md h-9 text-sm px-2 bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress (Draft + Screening)</option>
              <option value="screening">Screening</option>
              <option value="conditional_offer">Conditional Offer</option>
              <option value="unconditional_offer">Unconditional Offer</option>
              <option value="offers">Offers (Conditional + Unconditional)</option>
              <option value="cas_loa">CAS/LOA</option>
              <option value="visa">Visa</option>
              <option value="enrolled">Enrolled</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <select
              className="w-full border rounded-md h-9 text-sm px-2 bg-background"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="all">All Countries</option>
              {allCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card
          className={`min-w-0 transition cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            statusFilter === 'all' ? 'ring-2 ring-primary/40 border-primary/30' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryCardClick('all')}
          onKeyDown={(event) => handleSummaryCardKeyDown(event, 'all')}
        >
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Applications</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card
          className={`min-w-0 transition cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            statusFilter === 'submitted' ? 'ring-2 ring-primary/40 border-primary/30' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryCardClick('submitted')}
          onKeyDown={(event) => handleSummaryCardKeyDown(event, 'submitted')}
        >
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Submitted</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{submittedCount}</div>
          </CardContent>
        </Card>
        <Card
          className={`min-w-0 transition cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            statusFilter === 'in_progress' ? 'ring-2 ring-primary/40 border-primary/30' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryCardClick('in_progress')}
          onKeyDown={(event) => handleSummaryCardKeyDown(event, 'in_progress')}
        >
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card
          className={`min-w-0 transition cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            statusFilter === 'offers' ? 'ring-2 ring-primary/40 border-primary/30' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryCardClick('offers')}
          onKeyDown={(event) => handleSummaryCardKeyDown(event, 'offers')}
        >
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Offers</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{offersCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" /> Draft Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {filteredDrafts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No drafts match your current filters.
                </p>
              )}

              {filteredDrafts.map((draft) => (
                <Card key={draft.id} className="bg-muted/40">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                            <span className="truncate">{draft.program?.name || 'New Application Draft'}</span>
                          </h3>
                          {draft.program ? (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {draft.program.level} • {draft.program.discipline}
                            </p>
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Continue where you left off to choose a program.
                            </p>
                          )}
                        </div>

                        {draft.program?.university && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                            <span className="break-words">
                              {draft.program.university.name}
                              {draft.program.university.city
                                ? ` • ${draft.program.university.city}`
                                : ''}
                              {draft.program.university.country
                                ? `, ${draft.program.university.country}`
                                : ''}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              {draft.last_step
                                ? `Step ${draft.last_step}/5`
                                : 'Not started'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 pt-3 sm:pt-0 border-t sm:border-t-0">
                        <StatusBadge status="draft" />
                        <Button asChild size="sm" className="sm:w-auto">
                          <Link to="/student/applications/new">Continue</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" /> All Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {applications.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No applications yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-4">
                Start your journey by browsing programs and submitting your first
                application
              </p>
              <Button asChild size="sm" className="sm:size-default">
                <Link to="/courses?view=programs">
                  <Plus className="mr-2 h-4 w-4" />
                  Browse Courses
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filtered.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                            <span className="truncate">{app.program?.name ?? 'Application'}</span>
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {app.program?.level ?? 'N/A'} • {app.program?.discipline ?? 'N/A'}
                          </p>
                        </div>

                        <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">
                            {app.program?.university?.name ?? 'University'} •{' '}
                            {app.program?.university?.city ?? 'N/A'}, {app.program?.university?.country ?? 'N/A'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            <span>
                              Intake: {getIntakeLabel(app.intake_month, app.intake_year)}
                            </span>
                          </div>
                          <div>Applied: {new Date(app.created_at).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Timer className="h-3 w-3 sm:h-4 sm:w-4" /> {etaFor(app.status)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
                        <StatusBadge status={app.status} />
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/student/applications/${app.id}`}>View Details</Link>
                          </Button>
                          {app.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelDraft(app.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
