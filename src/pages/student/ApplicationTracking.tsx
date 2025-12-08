import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { logError, formatErrorForToast } from '@/lib/errorUtils';
import {
  FileText,
  MessageCircle,
  Calendar,
  GraduationCap,
  MapPin,
  Search,
  Upload,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationProgressTimeline } from '@/components/student/ApplicationProgressTimeline';
import { DocumentUploadDialog } from '@/components/student/DocumentUploadDialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentRecord } from '@/hooks/useStudentRecord';
import ApplicationDeadlineNudges, {
  type ApplicationNudge,
} from '@/components/student/ApplicationDeadlineNudges';
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from 'date-fns';

interface Application {
  id: string;
  status: string;
  intake_year: number;
  intake_month: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
    program: {
      id: string;
      name: string;
      level: string;
      discipline: string;
      university: {
        name: string;
        city: string;
        country: string;
        logo_url: string | null;
      };
    };
    agent_id: string | null;
    intake?: {
      id: string;
      term: string | null;
      start_date: string | null;
      app_deadline: string | null;
    } | null;
}

interface MissingDocument {
  type: string;
  label: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'passport', label: 'Passport' },
  { type: 'transcript', label: 'Academic Transcripts' },
  { type: 'sop', label: 'Statement of Purpose' },
  { type: 'cv', label: 'CV/Resume' },
];

const NON_ACTIONABLE_STATUSES = new Set(['withdrawn', 'deferred', 'enrolled']);

const SEVERITY_ORDER: Record<ApplicationNudge['severity'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const safeParseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const summarizeDocuments = (docs: MissingDocument[]) => {
  if (docs.length === 0) return '';
  if (docs.length === 1) return docs[0].label;
  if (docs.length === 2) return `${docs[0].label} and ${docs[1].label}`;
  return `${docs[0].label}, ${docs[1].label} +${docs.length - 2} more`;
};

const formatApplicationLabel = (app: Application) => {
  const programName = app.program?.name ?? 'Application';
  const universityName = app.program?.university?.name ?? '';
  return universityName ? `${programName} • ${universityName}` : programName;
};

const buildFingerprint = (
  id: string,
  severity: ApplicationNudge['severity'],
  description: string,
  dueDateLabel?: string
) => `${id}|${severity}|${dueDateLabel ?? 'none'}|${description}`;

const generateApplicationNudges = (
  applications: Application[],
  missingDocsMap: Record<string, MissingDocument[]>
): ApplicationNudge[] => {
  const now = new Date();
  const nudges: ApplicationNudge[] = [];

  applications.forEach((app) => {
    const label = formatApplicationLabel(app);
    const missingDocs = missingDocsMap[app.id] ?? [];
    const deadlineDate = safeParseDate(app.intake?.app_deadline);
    const daysUntilDeadline = deadlineDate ? differenceInCalendarDays(deadlineDate, now) : null;
    const dueDateLabel = deadlineDate ? format(deadlineDate, 'MMM d, yyyy') : undefined;
    const deadlineDistance = deadlineDate ? formatDistanceToNowStrict(deadlineDate, { addSuffix: true }) : null;
    const approximateIntakeDate =
      app.intake_year && app.intake_month
        ? new Date(app.intake_year, app.intake_month - 1, 1)
        : null;

    if (deadlineDate) {
      if (daysUntilDeadline === null || daysUntilDeadline <= 60 || daysUntilDeadline < 0) {
        const severity =
          daysUntilDeadline !== null && daysUntilDeadline < 0
            ? 'high'
            : daysUntilDeadline !== null && daysUntilDeadline <= 7
            ? 'high'
            : daysUntilDeadline !== null && daysUntilDeadline <= 21
            ? 'medium'
            : 'low';

        const baseId = `${app.id}-deadline`;
        const description =
          daysUntilDeadline !== null && daysUntilDeadline < 0
            ? `The submission deadline (${dueDateLabel}) was ${deadlineDistance}. Contact your advisor immediately to explore next steps.`
            : `Submit all requirements by ${dueDateLabel} (${deadlineDistance}).`;

        nudges.push({
          id: baseId,
          fingerprint: buildFingerprint(baseId, severity, description, dueDateLabel),
          applicationId: app.id,
          type: 'deadline',
          severity,
          title:
            daysUntilDeadline !== null && daysUntilDeadline < 0
              ? `Deadline missed for ${label}`
              : `Deadline approaching for ${label}`,
          description,
          actionLabel: app.status === 'draft' ? 'Submit Application' : 'Review Details',
          actionHref: `/student/applications/${app.id}`,
          dueDateLabel,
          daysRemaining: daysUntilDeadline,
        });
      }
    } else if (approximateIntakeDate && !Number.isNaN(approximateIntakeDate.getTime())) {
      const baseId = `${app.id}-deadline-confirm`;
      const description = `We couldn't locate the official submission deadline for the ${format(
        approximateIntakeDate,
        'MMM yyyy'
      )} intake. Confirm the date with your advisor so nothing slips.`;

      nudges.push({
        id: baseId,
        fingerprint: buildFingerprint(baseId, 'low', description),
        applicationId: app.id,
        type: 'deadline',
        severity: 'low',
        title: `Confirm deadline for ${label}`,
        description,
        actionLabel: 'Message Advisor',
        actionHref: `/student/messages?application_id=${app.id}`,
        daysRemaining: null,
      });
    }

    if (missingDocs.length > 0) {
      const severity =
        deadlineDate && daysUntilDeadline !== null && daysUntilDeadline <= 7 ? 'high' : 'medium';
      const docsSummary = summarizeDocuments(missingDocs);
      const baseId = `${app.id}-documents`;
      const description =
        deadlineDate && daysUntilDeadline !== null && daysUntilDeadline >= 0
          ? `${docsSummary} still outstanding. Upload them before ${dueDateLabel} to keep your application moving.`
          : `${docsSummary} still outstanding. Upload them to keep your momentum.`;

      nudges.push({
        id: baseId,
        fingerprint: buildFingerprint(baseId, severity, description, dueDateLabel),
        applicationId: app.id,
        type: 'documents',
        severity,
        title: `Upload pending documents for ${label}`,
        description,
        actionLabel: 'Upload Documents',
        actionHref: `/student/documents?application_id=${app.id}`,
        dueDateLabel,
        daysRemaining: daysUntilDeadline,
      });
    }

    if (app.status === 'draft' && !app.submitted_at) {
      const severity =
        deadlineDate && daysUntilDeadline !== null && daysUntilDeadline <= 7 ? 'high' : 'medium';
      const baseId = `${app.id}-submission`;
      const description =
        deadlineDate && daysUntilDeadline !== null && daysUntilDeadline >= 0
          ? `Finish the last steps so your submission is in before ${dueDateLabel}.`
          : `You've started the application—complete and submit it to stay on track.`;

      nudges.push({
        id: baseId,
        fingerprint: buildFingerprint(baseId, severity, description, dueDateLabel),
        applicationId: app.id,
        type: 'submission',
        severity,
        title: `Submit your ${label} application`,
        description,
        actionLabel: 'Review & Submit',
        actionHref: `/student/applications/${app.id}`,
        dueDateLabel,
        daysRemaining: daysUntilDeadline,
      });
    }

    const lastUpdated = safeParseDate(app.updated_at ?? app.created_at);
    const daysSinceUpdate = lastUpdated ? differenceInCalendarDays(now, lastUpdated) : null;
    if (
      daysSinceUpdate !== null &&
      daysSinceUpdate >= 10 &&
      !NON_ACTIONABLE_STATUSES.has(app.status)
    ) {
      const dormantDuration = formatDistanceToNowStrict(lastUpdated);
      const baseId = `${app.id}-checkin`;
      const description = `No progress logged for ${dormantDuration}. Touch base with your advisor to keep momentum.`;

      nudges.push({
        id: baseId,
        fingerprint: buildFingerprint(baseId, 'low', description, dueDateLabel),
        applicationId: app.id,
        type: 'stalled',
        severity: 'low',
        title: `Check in on ${label}`,
        description,
        actionLabel: 'Message Advisor',
        actionHref: `/student/messages?application_id=${app.id}`,
        dueDateLabel,
        daysRemaining: daysUntilDeadline,
      });
    }
  });

  const deduped = Array.from(
    nudges.reduce((acc, nudge) => {
      const existing = acc.get(nudge.id);
      if (!existing || SEVERITY_ORDER[nudge.severity] < SEVERITY_ORDER[existing.severity]) {
        acc.set(nudge.id, nudge);
      }
      return acc;
    }, new Map<string, ApplicationNudge>()).values()
  );

  return deduped.sort((a, b) => {
    const severityCompare = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityCompare !== 0) return severityCompare;

    if (a.daysRemaining != null && b.daysRemaining != null) {
      return a.daysRemaining - b.daysRemaining;
    }

    if (a.daysRemaining != null) return -1;
    if (b.daysRemaining != null) return 1;
    return 0;
  });
};

export default function ApplicationTracking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: studentRecord,
    isLoading: studentRecordLoading,
    error: studentRecordError,
  } = useStudentRecord();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [missingDocs, setMissingDocs] = useState<Record<string, MissingDocument[]>>({});
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

  const computedNudges = useMemo(
    () => generateApplicationNudges(applications, missingDocs),
    [applications, missingDocs]
  );

  const visibleNudges = useMemo(
    () => computedNudges.filter((nudge) => !dismissedNudges.has(nudge.fingerprint)),
    [computedNudges, dismissedNudges]
  );

  const fetchApplications = useCallback(async () => {
    const studentId = studentRecord?.id;

    if (!studentId) {
      setApplications([]);
      setMissingDocs({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          intake_year,
          intake_month,
          created_at,
          updated_at,
          submitted_at,
          agent_id,
          program:programs (
            id,
            name,
            level,
            discipline,
            university:universities (
              name,
              city,
              country,
              logo_url
            )
            ),
            intake:intakes (
              id,
              term,
              start_date,
              app_deadline
            )
        `)
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false });

      if (appsError) throw appsError;

      const list = (appsData ?? []) as Application[];
      setApplications(list);

      // Fetch missing documents for each application
      await fetchMissingDocuments(list);
    } catch (error) {
      logError(error, 'ApplicationTracking.fetchApplications');
      toast(formatErrorForToast(error, 'Failed to load applications'));
    } finally {
      setLoading(false);
    }
  }, [studentRecord?.id, toast]);

  const fetchMissingDocuments = async (apps: Application[]) => {
    if (apps.length === 0) {
      setMissingDocs({});
      return;
    }

    const results = await Promise.all(
      apps.map(async (app) => {
        try {
          const { data: existingDocs, error } = await supabase
            .from('application_documents')
            .select('document_type')
            .eq('application_id', app.id);

          if (error) throw error;

          const existingTypes = existingDocs?.map((d) => d.document_type) ?? [];
          const missing = REQUIRED_DOCUMENTS.filter(
            (doc) => !existingTypes.includes(doc.type as any)
          );

          return { appId: app.id, missing };
        } catch (error) {
          logError(error, `ApplicationTracking.fetchMissingDocuments.${app.id}`);
          return { appId: app.id, missing: [] as MissingDocument[] };
        }
      })
    );

    const missingDocsMap: Record<string, MissingDocument[]> = {};
    results.forEach(({ appId, missing }) => {
      if (missing.length > 0) {
        missingDocsMap[appId] = missing;
      }
    });

    setMissingDocs(missingDocsMap);
  };

  useEffect(() => {
    if (studentRecordLoading) return;

    if (studentRecordError) {
      logError(studentRecordError, 'ApplicationTracking.studentRecord');
      toast(formatErrorForToast(studentRecordError, 'Failed to load student information'));
      setLoading(false);
      return;
    }

    fetchApplications();
  }, [studentRecordLoading, studentRecordError, fetchApplications, toast]);

  useEffect(() => {
    if (computedNudges.length === 0) {
      setDismissedNudges((prev) => (prev.size === 0 ? prev : new Set<string>()));
      return;
    }

    const activeFingerprints = new Set(computedNudges.map((nudge) => nudge.fingerprint));

    setDismissedNudges((prev) => {
      let hasOrphan = false;
      prev.forEach((fingerprint) => {
        if (!activeFingerprints.has(fingerprint)) {
          hasOrphan = true;
        }
      });

      if (!hasOrphan) {
        return prev;
      }

      const next = new Set<string>();
      prev.forEach((fingerprint) => {
        if (activeFingerprints.has(fingerprint)) {
          next.add(fingerprint);
        }
      });
      return next;
    });
  }, [computedNudges]);

  const handleDismissNudge = useCallback((fingerprint: string) => {
    setDismissedNudges((prev) => {
      if (prev.has(fingerprint)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(fingerprint);
      return next;
    });
  }, []);

  const getIntakeLabel = (month: number, year: number) => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const handleChatWithAgent = (app: Application) => {
    if (!app.agent_id) {
      toast({
        title: 'No Agent Assigned',
        description: 'An agent has not been assigned to this application yet.',
        variant: 'destructive',
      });
      return;
    }
    // Navigate to messages page with application context
    navigate(`/student/messages?application_id=${app.id}`);
  };

  const filtered = applications.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      a.program.name.toLowerCase().includes(term) ||
      a.program.university.name.toLowerCase().includes(term) ||
      a.program.university.country.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const activeApps = applications.filter(
    (a) => !['withdrawn', 'deferred', 'enrolled'].includes(a.status)
  );
  const completedApps = applications.filter((a) => a.status === 'enrolled');
  const withOffers = applications.filter(
    (a) => a.status === 'conditional_offer' || a.status === 'unconditional_offer'
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <BackButton variant="ghost" size="sm" wrapperClassName="mb-4" fallback="/dashboard" />

      {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Application Tracking
          </h1>
          <p className="text-muted-foreground">
            Track your university applications and manage documents in real-time
          </p>
        </div>

        {visibleNudges.length > 0 && (
          <ApplicationDeadlineNudges
            nudges={visibleNudges}
            onDismiss={handleDismissNudge}
          />
        )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{activeApps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offers Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{withOffers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {completedApps.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by program, university, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="screening">Under Review</SelectItem>
                <SelectItem value="conditional_offer">Conditional Offer</SelectItem>
                <SelectItem value="unconditional_offer">Accepted</SelectItem>
                <SelectItem value="visa">Visa Stage</SelectItem>
                <SelectItem value="enrolled">Completed</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchApplications} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {applications.length === 0
                    ? 'No applications yet'
                    : 'No applications found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {applications.length === 0
                    ? 'Start your journey by browsing programs and submitting your first application'
                    : 'Try adjusting your filters or search term'}
                </p>
              </div>
              {applications.length === 0 && (
                <Button asChild>
                  <Link to="/courses?view=programs">Browse Courses</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((app) => (
            <Card key={app.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-6 w-6 text-primary mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-xl break-words">
                          {app.program.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="break-words">
                            {app.program.university.name} •{' '}
                            {app.program.university.city && `${app.program.university.city}, `}
                            {app.program.university.country}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Intake: {getIntakeLabel(app.intake_month, app.intake_year)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Updated: {new Date(app.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <DocumentUploadDialog
                      applicationId={app.id}
                      onUploadComplete={fetchApplications}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Docs
                        </Button>
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChatWithAgent(app)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with Agent
                    </Button>
                    <Button variant="default" size="sm" asChild>
                      <Link to={`/student/applications/${app.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Timeline */}
                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Application Progress
                  </h4>
                  <ApplicationProgressTimeline
                    currentStatus={app.status}
                    className="hidden md:block"
                  />
                  <ApplicationProgressTimeline
                    currentStatus={app.status}
                    className="md:hidden"
                  />
                </div>

                {/* Missing Documents Alert */}
                {missingDocs[app.id] && missingDocs[app.id].length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                          Missing Required Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {missingDocs[app.id].map((doc) => (
                            <Badge
                              key={doc.type}
                              variant="outline"
                              className="text-amber-700 dark:text-amber-300"
                            >
                              {doc.label}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                          Please upload these documents to proceed with your application.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Application ID */}
                <div className="text-xs text-muted-foreground">
                  Application ID: {app.id}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
