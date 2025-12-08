import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import BackButton from '@/components/BackButton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatErrorForToast, getErrorMessage, logError } from '@/lib/errorUtils';
import { Calendar, Eye, Filter, GraduationCap, Building2, FileText, Phone, Mail, Clock } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'submitted' | 'offer' | 'rejected';

interface ApplicationRow {
  id: string;
  app_number?: string | null;
  status: string;
  submitted_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  intake_month?: number | null;
  intake_year?: number | null;
  notes?: string | null;
  internal_notes?: string | null;
  submission_channel?: string | null;
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
    universities?: {
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
}

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_FILTER_MAP: Record<StatusFilter, string[]> = {
  all: [],
  pending: ['draft', 'screening'],
  submitted: ['submitted'],
  offer: ['conditional_offer', 'unconditional_offer'],
  rejected: ['withdrawn', 'deferred'],
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
  application.program?.universities?.name || '—';

const getProgramName = (application: ApplicationRow) =>
  application.program?.name || '—';

const getProgramLevel = (application: ApplicationRow) =>
  application.program?.level || null;

const getStatusGroupLabel = (filter: StatusFilter) =>
  STATUS_FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? 'All statuses';

const PartnerApplications = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null);

  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);
  const endIndex = useMemo(() => startIndex + PAGE_SIZE - 1, [startIndex]);
  const totalPages = useMemo(() => (totalCount === 0 ? 1 : Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  const activeFilterLabel = useMemo(() => getStatusGroupLabel(statusFilter), [statusFilter]);

  const fetchApplications = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!profile?.tenant_id) return;

      setLoading(true);
      setErrorMessage(null);

      try {
        const statuses = STATUS_FILTER_MAP[statusFilter];

        let query = supabase
          .from('applications')
          .select(
            `
              id,
              app_number,
              status,
              submitted_at,
              created_at,
              updated_at,
              intake_month,
              intake_year,
              notes,
              internal_notes,
              submission_channel,
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
                universities:universities!inner (
                  name,
                  country
                )
              )
            `,
            { count: 'exact' },
          )
          .eq('tenant_id', profile.tenant_id);

        if (statuses.length > 0) {
          query = query.in('status', statuses as any);
        }

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(startIndex, endIndex);

        if (options?.signal?.aborted) {
          return;
        }

        if (error) {
          throw error;
        }

        if (count !== null && count <= startIndex && page > 1) {
          setPage(1);
          setLoading(false);
          return;
        }

        setApplications((data ?? []) as ApplicationRow[]);
        setTotalCount(count ?? data?.length ?? 0);
      } catch (error) {
        if (options?.signal?.aborted) {
          return;
        }

        logError(error, 'PartnerApplications.fetchApplications');
        setErrorMessage(getErrorMessage(error));
        toast(formatErrorForToast(error, 'Failed to load applications'));
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [profile?.tenant_id, statusFilter, startIndex, endIndex, page, toast],
  );

  useEffect(() => {
    if (authLoading || !profile?.tenant_id) {
      return;
    }

    const controller = new AbortController();
    void fetchApplications({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [authLoading, profile?.tenant_id, fetchApplications]);

  const handleViewDetails = (application: ApplicationRow) => {
    setSelectedApplication(application);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedApplication(null);
    }
  };

  const handleRefresh = () => {
    void fetchApplications();
  };

  const showingRangeStart = totalCount === 0 ? 0 : startIndex + 1;
  const showingRangeEnd = totalCount === 0 ? 0 : Math.min(totalCount, startIndex + applications.length);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Partner Applications
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Review applications submitted through your partnership, track their progress, and drill into the details.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  {loading
                    ? 'Fetching latest applications...'
                    : `Showing ${showingRangeStart}-${showingRangeEnd} of ${totalCount} applications`}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>{activeFilterLabel}</span>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
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
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Submitted</TableHead>
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
                            Applications matching your current filters will appear here once available.
                          </p>
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
                        <TableCell>{getUniversityName(application)}</TableCell>
                        <TableCell>{getProgramName(application)}</TableCell>
                        <TableCell>
                          <StatusBadge status={application.status} />
                        </TableCell>
                        <TableCell>{formatDate(application.submitted_at)}</TableCell>
                        <TableCell>{formatDate(application.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(application)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {applications.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground">
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

        <Dialog open={Boolean(selectedApplication)} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-3xl">
            {selectedApplication && (
              <>
                <DialogHeader>
                  <DialogTitle>{getProgramName(selectedApplication)}</DialogTitle>
                  <DialogDescription>
                    {getUniversityName(selectedApplication)} • {getStudentName(selectedApplication)}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <GraduationCap className="h-4 w-4" />
                        Programme
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium">{getProgramName(selectedApplication)}</p>
                        {getProgramLevel(selectedApplication) && (
                          <p className="text-sm text-muted-foreground">{getProgramLevel(selectedApplication)}</p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{getUniversityName(selectedApplication)}</p>
                          <p className="text-muted-foreground">
                            Intake {formatIntake(selectedApplication.intake_month, selectedApplication.intake_year)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <FileText className="h-4 w-4" />
                        Application
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedApplication.status} />
                        {selectedApplication.app_number && (
                          <Badge variant="secondary">#{selectedApplication.app_number}</Badge>
                        )}
                        {selectedApplication.submission_channel && (
                          <Badge variant="default">Source: {selectedApplication.submission_channel}</Badge>
                        )}
                        {selectedApplication.submission_channel && (
                          <Badge variant="outline">{selectedApplication.submission_channel}</Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Created {formatDate(selectedApplication.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Updated {formatDate(selectedApplication.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Submitted {formatDate(selectedApplication.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                      <FileText className="h-4 w-4" />
                      Student
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-medium">{getStudentName(selectedApplication)}</p>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {getStudentEmail(selectedApplication) && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{getStudentEmail(selectedApplication)}</span>
                          </div>
                        )}
                        {getStudentPhone(selectedApplication) && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{getStudentPhone(selectedApplication)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(selectedApplication.notes || selectedApplication.internal_notes) && (
                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <FileText className="h-4 w-4" />
                        Notes
                      </div>
                      {selectedApplication.notes && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-1">Partner Notes</p>
                          <p className="text-sm leading-relaxed">{selectedApplication.notes}</p>
                        </div>
                      )}
                      {selectedApplication.internal_notes && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-1">Internal Notes</p>
                          <p className="text-sm leading-relaxed">{selectedApplication.internal_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PartnerApplications;
