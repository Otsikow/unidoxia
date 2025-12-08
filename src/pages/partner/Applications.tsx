import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
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
import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  Search,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'submitted' | 'offer' | 'rejected';

interface ApplicationRow {
  id: string;
  app_number?: string | null;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
  created_at: string;
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
    universities?: {
      name?: string | null;
      country?: string | null;
      city?: string | null;
    } | null;
  } | null;
}

interface ApplicationDocument {
  id: string;
  document_type: string | null;
  storage_path: string | null;
  mime_type?: string | null;
  verified: boolean | null;
  verification_notes?: string | null;
  uploaded_at: string | null;
}

interface TimelineItem {
  title?: string;
  description?: string;
  date?: string;
  status?: string;
}

interface DetailedApplication extends ApplicationRow {
  documents?: ApplicationDocument[];
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

const Applications = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null);
  const [detailedApplication, setDetailedApplication] = useState<DetailedApplication | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const detailsCacheRef = useRef<Record<string, DetailedApplication>>({});

  const debouncedSearch = useDebounce(searchTerm.trim(), 300);

  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);
  const endIndex = useMemo(() => startIndex + PAGE_SIZE - 1, [startIndex]);
  const totalPages = useMemo(() => (totalCount === 0 ? 1 : Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

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
        logError(error, 'PartnerApplications.fetchAgent');
        toast(formatErrorForToast(error, 'Failed to identify partner record'));
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
                universities:universities!inner (
                  name,
                  country,
                  city
                )
              )
            `,
            { count: 'exact' },
          )
          .eq('agent_id', agentId);

        if (statuses.length > 0) {
          // @ts-expect-error - Status types mismatch
          query = query.in('status', statuses);
        }

        if (searchValue) {
          query = query.or(
            [
              `app_number.ilike.${searchValue}`,
              `student.legal_name.ilike.${searchValue}`,
              `student.profile.full_name.ilike.${searchValue}`,
              `student.contact_email.ilike.${searchValue}`,
              `program.name.ilike.${searchValue}`,
              `program.universities.name.ilike.${searchValue}`,
            ].join(','),
          );
        }

        const { data, error, count } = await query
          // @ts-expect-error - nullsLast option not in type
          .order('submitted_at', { ascending: false, nullsLast: true })
          .order('created_at', { ascending: false })
          .range(startIndex, endIndex);

        if (options?.signal?.aborted) {
          return;
        }

        if (error) {
          throw error;
        }

        if ((count ?? 0) <= startIndex && page > 1) {
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
        const message = getErrorMessage(error);
        setErrorMessage(message);
        toast(formatErrorForToast(error, 'Failed to load applications'));
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [agentId, debouncedSearch, endIndex, page, startIndex, statusFilter, toast],
  );

  useEffect(() => {
    if (authLoading || agentLoading) {
      return;
    }

    const controller = new AbortController();
    void fetchApplications({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [authLoading, agentLoading, fetchApplications]);

  const loadApplicationDetails = useCallback(
    async (applicationId: string) => {
      if (detailsCacheRef.current[applicationId]) {
        setDetailedApplication(detailsCacheRef.current[applicationId]);
        setDetailsError(null);
        setDetailsLoading(false);
        return;
      }

      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const { data, error } = await supabase
          .from('applications')
          .select(
            `
              id,
              app_number,
              status,
              submitted_at,
              updated_at,
              created_at,
              notes,
              internal_notes,
              timeline_json,
              student:students (
                legal_name,
                contact_email,
                contact_phone,
                profile:profiles (
                  full_name,
                  email
                )
              ),
              program:programs (
                name,
                level,
                universities:universities (
                  name,
                  country,
                  city
                )
              )
            `,
          )
          .eq('id', applicationId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Application details not found');

        const [{ data: documentsData, error: documentsError }] = await Promise.all([
          supabase
            .from('application_documents')
            .select('id, document_type, storage_path, mime_type, verified, verification_notes, uploaded_at')
            .eq('application_id', applicationId)
            .order('uploaded_at', { ascending: false }),
        ]);

        if (documentsError) throw documentsError;

        const detailed: DetailedApplication = {
          ...(data as ApplicationRow),
          documents: (documentsData ?? []) as ApplicationDocument[],
        };

        detailsCacheRef.current[applicationId] = detailed;
        setDetailedApplication(detailed);
      } catch (error) {
        logError(error, 'PartnerApplications.loadApplicationDetails');
        const message = getErrorMessage(error);
        setDetailsError(message);
        toast(formatErrorForToast(error, 'Failed to load application details'));
      } finally {
        setDetailsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    const applicationId = selectedApplication?.id;

    if (!applicationId) {
      setDetailedApplication(null);
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    void loadApplicationDetails(applicationId);
  }, [loadApplicationDetails, selectedApplication?.id]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
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
        {items.map((item, index) => (
          <div key={`${item.title ?? 'item'}-${index}`} className="flex gap-3">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              {index !== items.length - 1 && <div className="w-px bg-border h-full ml-1" />}
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

  const renderDocuments = (documents?: ApplicationDocument[]) => {
    if (!documents || documents.length === 0) {
      return <p className="text-sm text-muted-foreground">No documents uploaded for this application yet.</p>;
    }

    return (
      <div className="space-y-3">
        {documents.map((document) => (
          <div key={document.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {document.document_type ? document.document_type.replace(/_/g, ' ') : 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDate(document.uploaded_at, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {document.storage_path && (
                <p className="text-xs text-muted-foreground break-all">Path: {document.storage_path}</p>
              )}
              {document.verification_notes && (
                <p className="text-xs text-muted-foreground">Notes: {document.verification_notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={document.verified ? 'default' : 'outline'}>
                {document.verified ? 'Verified' : 'Pending Review'}
              </Badge>
              {document.mime_type && (
                <Badge variant="secondary" className="text-xs">
                  {document.mime_type}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderNotes = (application?: DetailedApplication | null) => {
    if (!application?.notes && !application?.internal_notes) {
      return <p className="text-sm text-muted-foreground">No notes have been added yet.</p>;
    }

    return (
      <div className="space-y-4">
        {application.notes && (
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Partner Notes</p>
            <p className="text-sm leading-relaxed whitespace-pre-line">{application.notes}</p>
          </div>
        )}
        {application.internal_notes && (
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Internal Notes</p>
            <p className="text-sm leading-relaxed whitespace-pre-line">{application.internal_notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Partner Applications</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Review and manage applications submitted through your partner network, track their progress, and drill into the details.
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
              <CardTitle>No partner record found</CardTitle>
              <CardDescription>
                We were unable to locate a partner agent profile linked to your account. Contact the administrator if you believe this is an error.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {agentId && (
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <CardTitle>Applications</CardTitle>
                  <CardDescription>
                    {loading
                      ? 'Fetching latest applications...'
                      : `Showing ${showingRangeStart}-${showingRangeEnd} of ${totalCount} applications`}
                  </CardDescription>
                </div>
                <div className="flex flex-col w-full gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="Search student, university, or programme..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-44">
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
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                      Refresh
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/partner/applications/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Application
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.label}</span>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted Date</TableHead>
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
                              <Eye className="mr-2 h-4 w-4" />
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
        )}

        <Dialog open={Boolean(selectedApplication)} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-4xl">
            {selectedApplication && (
              <>
                <DialogHeader>
                  <DialogTitle>{getProgramName(selectedApplication)}</DialogTitle>
                  <DialogDescription>
                    {getUniversityName(selectedApplication)} • {getStudentName(selectedApplication)}
                  </DialogDescription>
                </DialogHeader>

                {detailsLoading ? (
                  <div className="py-10">
                    <LoadingState message="Loading application details..." />
                  </div>
                ) : detailsError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {detailsError}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                          <GraduationCap className="h-4 w-4" />
                          Course
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
                              {formatDate(selectedApplication.submitted_at)} submission • Updated{' '}
                              {formatDate(selectedApplication.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                          <ClipboardList className="h-4 w-4" />
                          Application
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <StatusBadge status={selectedApplication.status} />
                          {selectedApplication.app_number && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              #{selectedApplication.app_number}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            Created {formatDate(selectedApplication.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted {formatDate(selectedApplication.submitted_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              Last updated {formatDate(selectedApplication.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <FileText className="h-4 w-4" />
                        Student
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-base font-medium">{getStudentName(selectedApplication)}</p>
                        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
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

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                          <FileText className="h-4 w-4" />
                          Documents
                        </div>
                        {renderDocuments(detailedApplication?.documents)}
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                          <FileText className="h-4 w-4" />
                          Notes
                        </div>
                        {renderNotes(detailedApplication)}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                        <Clock className="h-4 w-4" />
                        Timeline
                      </div>
                      {renderTimeline(detailedApplication?.timeline_json ?? selectedApplication.timeline_json)}
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Applications;
