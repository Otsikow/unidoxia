import { useEffect, useState, useCallback } from 'react';
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
    };
  };
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
          ]
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

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesCountry =
      countryFilter === 'all' || university?.country === countryFilter;
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

    const matchesStatus = statusFilter === 'all' || statusFilter === 'draft';
    const matchesCountry =
      countryFilter === 'all' || university?.country === countryFilter;
    const term = searchTerm.toLowerCase();
    const programName = program?.name?.toLowerCase() ?? '';
    const universityName = university?.name?.toLowerCase() ?? '';
    const matchesSearch =
      !term || programName.includes(term) || universityName.includes(term);

    return matchesStatus && matchesCountry && matchesSearch;
  });

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
      <div className="container mx-auto py-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState message="Loading your applications..." size="lg" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <BackButton variant="ghost" size="sm" wrapperClassName="mb-4" fallback="/dashboard" />
        <ErrorDisplay
          error={currentError}
          onRetry={() => retry(fetchApplications)}
          onClear={clearError}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <BackButton variant="ghost" size="sm" wrapperClassName="mb-4" fallback="/dashboard" />

      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 flex-wrap animate-fade-in">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words">
            My Applications
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Track and manage your university applications
          </p>
        </div>

        <div className="w-full lg:flex-1 lg:max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="col-span-1 md:col-span-2">
              <input
                className="w-full border rounded-md h-9 px-3 text-sm"
                placeholder="Search program or university..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full border rounded-md h-9 text-sm px-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="screening">Screening</option>
                <option value="conditional_offer">Conditional Offer</option>
                <option value="unconditional_offer">Unconditional Offer</option>
                <option value="cas_loa">CAS/LOA</option>
                <option value="visa">Visa</option>
                <option value="enrolled">Enrolled</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div>
              <select
                className="w-full border rounded-md h-9 text-sm px-2"
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

        <Button asChild>
          <Link to="/courses?view=programs">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length + drafts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter((a) => a.submitted_at).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                applications.filter(
                  (a) => a.status === 'draft' || a.status === 'screening'
                ).length + drafts.length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                applications.filter(
                  (a) =>
                    a.status === 'conditional_offer' ||
                    a.status === 'unconditional_offer'
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Draft Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredDrafts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No drafts match your current filters.
                </p>
              )}

              {filteredDrafts.map((draft) => (
                <Card key={draft.id} className="bg-muted/40">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                      <div className="space-y-3 flex-1">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            {draft.program?.name || 'New Application Draft'}
                          </h3>
                          {draft.program ? (
                            <p className="text-sm text-muted-foreground">
                              {draft.program.level} • {draft.program.discipline}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Continue where you left off to choose a program.
                            </p>
                          )}
                        </div>

                        {draft.program?.university && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {draft.program.university.name}
                            {draft.program.university.city
                              ? ` • ${draft.program.university.city}`
                              : ''}
                            {draft.program.university.country
                              ? `, ${draft.program.university.country}`
                              : ''}
                          </div>
                        )}

                        <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            <span>
                              {draft.last_step
                                ? `Progress: Step ${draft.last_step} of 5`
                                : 'Progress: Not started'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Last saved {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
                        <StatusBadge status="draft" />
                        <Button asChild>
                          <Link to="/student/applications/new">Continue Application</Link>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> All Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your journey by browsing programs and submitting your first
                application
              </p>
              <Button asChild>
                <Link to="/courses?view=programs">
                  <Plus className="mr-2 h-4 w-4" />
                  Browse Courses
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            {app.program.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {app.program.level} • {app.program.discipline}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {app.program.university.name} •{' '}
                          {app.program.university.city}, {app.program.university.country}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Intake: {getIntakeLabel(app.intake_month, app.intake_year)}
                            </span>
                          </div>
                          <div>Applied: {new Date(app.created_at).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Timer className="h-4 w-4" /> {etaFor(app.status)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <StatusBadge status={app.status} />
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
