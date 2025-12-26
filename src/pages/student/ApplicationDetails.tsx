import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, logError, formatErrorForToast } from '@/lib/errorUtils';
import { isValidUuid } from '@/lib/validation';
import { getApplicationStatusProgress, getApplicationStatusLabel } from '@/lib/applicationStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { Calendar, DollarSign, Download, FileText, GraduationCap, MapPin, Timer, MessageSquare, Mail, Phone, Globe, Upload, AlertCircle } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { parseUniversityProfileDetails } from '@/lib/universityProfile';
import { DocumentUploadDialog } from '@/components/student/DocumentUploadDialog';

interface University {
  name: string;
  city: string | null;
  country: string;
  website?: string | null;
  submission_config_json?: unknown;
}

interface Program {
  id: string;
  name: string;
  level: string;
  discipline: string;
  app_fee: number | null;
  university: University | null;
}

interface TimelineItem {
  title?: string;
  description?: string;
  date?: string;
  [key: string]: unknown;
}

interface Application {
  id: string;
  app_number?: string | null;
  status: string;
  intake_year: number;
  intake_month: number;
  created_at: string;
  submitted_at: string | null;
  student_id?: string;
  program: Program | null;
  timeline_json?: TimelineItem[];
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'blocked';
  priority: string | null;
  due_at: string | null;
}

interface Offer {
  id: string;
  offer_type: 'conditional' | 'unconditional';
  letter_url: string;
  expiry_date: string | null;
  accepted: boolean | null;
}

interface AppDocument {
  id: string;
  document_type: string;
  storage_path: string;
  mime_type: string;
  verified: boolean;
  verification_notes: string | null;
  uploaded_at: string;
}

// Enhanced offer with signed URL for viewing/downloading
interface OfferWithSignedUrl extends Offer {
  signedUrl?: string | null;
  isLoading?: boolean;
}

// Offer documents from application_documents table (uploaded by university)
interface OfferDocument {
  id: string;
  document_type: string;
  storage_path: string;
  mime_type: string;
  uploaded_at: string;
  signedUrl?: string | null;
}

interface DocumentRequest {
  id: string;
  document_type: string;
  request_type?: string | null;
  status: string | null;
  requested_at: string | null;
  due_date?: string | null;
  description?: string | null;
  notes?: string | null;
  document_url?: string | null;
  file_url?: string | null;
  uploaded_file_url?: string | null;
  storage_path?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
}

export default function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const downloadDoc = async (doc: AppDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(doc.storage_path, 3600);
      
      if (error) throw error;
      if (data?.signedUrl) {
         window.open(data.signedUrl, '_blank');
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Could not download document', variant: 'destructive' });
    }
  };

  // Helper to get signed URL for a storage path
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    try {
      // Normalize path - remove bucket prefix if present
      const normalizedPath = storagePath.replace(/^application-documents\//, '');
      
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(normalizedPath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Failed to get signed URL:', error);
        return null;
      }
      return data?.signedUrl ?? null;
    } catch (e) {
      console.error('Error getting signed URL:', e);
      return null;
    }
  };

  // Check if a URL is a storage path that needs a signed URL
  const isStoragePath = (url: string): boolean => {
    if (!url) return false;
    // Direct URLs start with http:// or https://
    // Storage paths are relative paths without protocol
    return !url.startsWith('http://') && !url.startsWith('https://');
  };

  // View/Download offer document
  const viewOfferDocument = async (url: string | undefined, signedUrl: string | null | undefined) => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
      return;
    }
    
    if (url) {
      if (isStoragePath(url)) {
        // Try to get a signed URL
        const signed = await getSignedUrl(url);
        if (signed) {
          window.open(signed, '_blank');
          return;
        }
      } else {
        // It's a direct URL
        window.open(url, '_blank');
        return;
      }
    }
    
    toast({ title: 'Error', description: 'Could not access document', variant: 'destructive' });
  };

  // Download offer document with proper handling
  const downloadOfferDocument = async (url: string | undefined, signedUrl: string | null | undefined, filename?: string) => {
    try {
      let downloadUrl = signedUrl;
      
      if (!downloadUrl && url) {
        if (isStoragePath(url)) {
          downloadUrl = await getSignedUrl(url);
        } else {
          downloadUrl = url;
        }
      }
      
      if (!downloadUrl) {
        toast({ title: 'Error', description: 'Document not available', variant: 'destructive' });
        return;
      }
      
      // Fetch and download
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'offer-document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
      toast({ title: 'Error', description: 'Could not download document', variant: 'destructive' });
    }
  };

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [offers, setOffers] = useState<OfferWithSignedUrl[]>([]);
  const [docs, setDocs] = useState<AppDocument[]>([]);
  const [offerDocs, setOfferDocs] = useState<OfferDocument[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [loadingOfferUrls, setLoadingOfferUrls] = useState(false);

  const getIntakeLabel = (month: number, year: number) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
  };

  const processingEta = useMemo(() => {
    if (!app) return null;
    const map: Record<string, string> = {
      draft: '1–2 weeks to prepare',
      submitted: '2–6 weeks for decision',
      screening: '1–2 weeks screening',
      conditional_offer: '1–3 weeks to clear conditions',
      unconditional_offer: '2–4 weeks to CAS/LOA',
      cas_loa: '2–6 weeks for visa decision',
      visa: '2–6 weeks to enrollment',
      enrolled: 'Completed',
    };
    return map[app.status] || 'Varies by university';
  }, [app]);

  // Load signed URLs for offers that have storage paths
  const loadOfferSignedUrls = async (offersToProcess: OfferWithSignedUrl[]) => {
    setLoadingOfferUrls(true);
    const updatedOffers: OfferWithSignedUrl[] = await Promise.all(
      offersToProcess.map(async (offer) => {
        if (offer.letter_url && isStoragePath(offer.letter_url)) {
          const signedUrl = await getSignedUrl(offer.letter_url);
          return { ...offer, signedUrl, isLoading: false };
        }
        return { ...offer, isLoading: false };
      })
    );
    setOffers(updatedOffers);
    setLoadingOfferUrls(false);
  };

  // Load signed URLs for offer documents
  const loadOfferDocumentUrls = async (docsToProcess: any[]) => {
    const updatedDocs: OfferDocument[] = await Promise.all(
      docsToProcess.map(async (doc) => {
        const signedUrl = await getSignedUrl(doc.storage_path);
        return {
          id: doc.id,
          document_type: doc.document_type,
          storage_path: doc.storage_path,
          mime_type: doc.mime_type,
          uploaded_at: doc.uploaded_at,
          signedUrl,
        };
      })
    );
    setOfferDocs(updatedDocs);
  };

  useEffect(() => {
    if (!id || !user) return;
    void loadAll();
  }, [id, user]);

  const loadAll = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const baseQuery = supabase
        .from('applications')
        .select(`
          id,
          app_number,
          status,
          intake_year,
          intake_month,
          created_at,
          submitted_at,
          student_id,
          timeline_json,
          program:programs (
            id,
            name,
            level,
            discipline,
            app_fee,
            university:universities (
              name,
              city,
              country,
              website,
              submission_config_json
            )
          )
        `);

      const query = isValidUuid(id)
        ? baseQuery.eq('id', id)
        : baseQuery.eq('app_number', id);

      const { data: appData, error: appErr } = await query.maybeSingle();
      if (appErr) throw appErr;
      if (!appData) {
        toast({ title: 'Not found', description: 'Application not found', variant: 'destructive' });
        navigate('/student/applications', { replace: true });
        return;
      }
      const applicationId = (appData as { id: string }).id;
      setApp(appData as unknown as Application);

      // Tasks assigned to the current user for this application
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('id,title,description,status,priority,due_at')
        .eq('application_id', applicationId)
        .order('due_at', { ascending: true });
      if (taskErr) throw taskErr;
      setTasks(taskData as unknown as TaskItem[]);

      // Offers for this application
      const { data: offerData, error: offerErr } = await supabase
        .from('offers')
        .select('id,offer_type,letter_url,expiry_date,accepted')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
      if (offerErr) throw offerErr;
      
      // Process offers and get signed URLs if needed
      const offersWithUrls: OfferWithSignedUrl[] = (offerData || []).map((o: any) => ({
        ...o,
        signedUrl: null,
        isLoading: isStoragePath(o.letter_url),
      }));
      setOffers(offersWithUrls);

      // Documents linked to this application
      const { data: docData, error: docErr } = await supabase
        .from('application_documents')
        .select('id,document_type,storage_path,mime_type,verified,verification_notes,uploaded_at')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });
      if (docErr) throw docErr;
      setDocs(docData as unknown as AppDocument[]);

      // Filter for offer-related documents from application_documents
      // These are documents uploaded by universities (e.g., offer letters, CAS letters)
      const offerRelatedTypes = ['offer_letter', 'conditional_offer', 'unconditional_offer', 'cas', 'cas_letter', 'loa', 'other'];
      const offerDocuments = (docData || []).filter((d: any) =>
        offerRelatedTypes.includes(d.document_type?.toLowerCase()) ||
        d.document_type?.toLowerCase()?.includes('offer') ||
        d.document_type?.toLowerCase()?.includes('cas')
      );
      setOfferDocs(offerDocuments.map((d: any) => ({
        id: d.id,
        document_type: d.document_type,
        storage_path: d.storage_path,
        mime_type: d.mime_type,
        uploaded_at: d.uploaded_at,
        signedUrl: null,
      })));

      // Load signed URLs for offers with storage paths (async, after initial render)
      if (offersWithUrls.some(o => isStoragePath(o.letter_url))) {
        void loadOfferSignedUrls(offersWithUrls);
      }

      // Load signed URLs for offer documents
      if (offerDocuments.length > 0) {
        void loadOfferDocumentUrls(offerDocuments);
      }

      // Load document requests for this student/application
      if (appData.student_id) {
        const documentRequestQuery: any = supabase
          .from('document_requests')
          .select('id,document_type,request_type,status,requested_at,due_date,description,notes,document_url,file_url,uploaded_file_url,storage_path,submitted_at,created_at')
          .eq('student_id', appData.student_id)
          .order('requested_at', { ascending: false });

        let requestResult: any = await documentRequestQuery.eq('application_id' as any, applicationId);

        if (requestResult.error) {
          const message = (requestResult.error.message || '').toLowerCase();
          if (message.includes('application_id')) {
            requestResult = await documentRequestQuery;
          } else {
            throw requestResult.error;
          }
        }

        setDocumentRequests((requestResult.data ?? []) as DocumentRequest[]);
      }
    } catch (error) {
      logError(error, 'ApplicationDetails.loadAll');
      toast(formatErrorForToast(error, 'Failed to load application details'));
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskDone = async (task: TaskItem, checked: boolean) => {
    try {
      const newStatus = checked ? 'done' : 'open';
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);
      if (error) throw error;
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus as TaskItem['status'] } : t)));
    } catch (error) {
      logError(error, 'ApplicationDetails.toggleTaskDone');
      toast(formatErrorForToast(error, 'Could not update task'));
    }
  };

  const cancelDraft = async () => {
    if (!app || app.status !== 'draft') return;
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn' })
        .eq('id', app.id);
      if (error) throw error;
      toast({ title: 'Application cancelled', description: 'Your draft application was cancelled.' });
      void loadAll();
    } catch (error) {
      console.error('Cancel application error', error);
      toast({ title: 'Error', description: 'Failed to cancel application', variant: 'destructive' });
    }
  };

  const universityContact = useMemo(() => {
    const uni = app?.program?.university;
    const parsed = parseUniversityProfileDetails((uni as any)?.submission_config_json ?? null);
    const primary = parsed?.contacts?.primary ?? null;
    return {
      email: primary?.email ?? null,
      phone: primary?.phone ?? null,
      website: (uni as any)?.website ?? null,
    };
  }, [app?.program?.university]);

  if (loading || !app) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState message="Loading application details..." size="lg" />
        </div>
      </div>
    );
  }

  const taskProgress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
  const statusProgress = getApplicationStatusProgress(app.status);
  const statusLabel = getApplicationStatusLabel(app.status);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <BackButton variant="ghost" size="sm" wrapperClassName="mb-2" fallback="/dashboard" />

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-6 w-6 text-primary mt-1" />
              <div>
                <div className="text-xl font-semibold">{app.program?.name ?? 'Application'}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {app.program?.university?.name ?? 'University'} • {app.program?.university?.city && `${app.program.university.city}, `}
                  {app.program?.university?.country ?? 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {app.app_number && (
                <Badge variant="outline" className="font-mono text-xs">
                  {app.app_number}
                </Badge>
              )}
              <StatusBadge status={app.status} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Intake</div>
            <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /> {getIntakeLabel(app.intake_month, app.intake_year)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Processing time</div>
            <div className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4" /> {processingEta}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Application fee</div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              {app.program?.app_fee ? `${app.program.app_fee.toLocaleString()} USD` : 'N/A'}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Application progress</span>
                  <span className="text-muted-foreground">{statusLabel}</span>
                </div>
                <Progress value={statusProgress} />
              </div>
              <div className="flex gap-2">
                {app.status === 'draft' && (
                  <Button variant="outline" onClick={cancelDraft}>Cancel Application</Button>
                )}
                <Button variant="outline" onClick={() => navigate('/courses?view=programs')}>Find More Courses</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* University contact (available once submitted) */}
      {app.submitted_at && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">University contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{app.program?.university?.name ?? 'University'}</div>
              <div className="flex flex-col gap-1">
                {universityContact.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a className="underline underline-offset-4" href={`mailto:${universityContact.email}`}>
                      {universityContact.email}
                    </a>
                  </div>
                ) : null}
                {universityContact.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a className="underline underline-offset-4" href={`tel:${universityContact.phone}`}>
                      {universityContact.phone}
                    </a>
                  </div>
                ) : null}
                {universityContact.website ? (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a
                      className="underline underline-offset-4"
                      href={universityContact.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Website
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
            <Button
              className="gap-2"
              onClick={() => navigate(`/student/messages?applicationId=${app.id}`)}
            >
              <MessageSquare className="h-4 w-4" />
              Message university
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {app.timeline_json && Array.isArray(app.timeline_json) && app.timeline_json.length > 0 ? (
                <div className="space-y-3">
                  {app.timeline_json.map((item: TimelineItem, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div className="text-sm">
                        <div className="font-medium">{item.title || 'Update'}</div>
                        {item.description && <div className="text-muted-foreground">{item.description}</div>}
                        {item.date && (
                          <div className="text-xs text-muted-foreground mt-1">{new Date(item.date).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No timeline entries yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No tasks yet. Tasks are generated automatically based on your application stage.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Done</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={t.status === 'done'}
                            onCheckedChange={(checked) => toggleTaskDone(t, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{t.title}</div>
                          {t.description && (
                            <div className="text-xs text-muted-foreground">{t.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {t.due_at ? new Date(t.due_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{(t.priority || 'medium').toUpperCase()}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentRequests.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No pending document requests from your university.
                </div>
              ) : (
                <div className="space-y-3">
                  {documentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-lg border bg-muted/30 flex flex-col gap-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{request.status ?? 'pending'}</Badge>
                          <span className="font-medium capitalize">
                            {request.document_type?.replace(/_/g, ' ') || 'Document'}
                          </span>
                          {request.request_type && (
                            <span className="text-xs text-muted-foreground">({request.request_type})</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {request.requested_at && (
                            <Badge variant="outline">Requested {new Date(request.requested_at).toLocaleDateString()}</Badge>
                          )}
                          {request.due_date && (
                            <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
                              Due {new Date(request.due_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {request.description && (
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      )}
                      {request.notes && (
                        <p className="text-xs text-muted-foreground">Notes: {request.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <DocumentUploadDialog
                          applicationId={app.id}
                          onUploadComplete={loadAll}
                          trigger={
                            <Button size="sm" variant="outline" className="gap-2">
                              <Upload className="h-4 w-4" />
                              Upload response
                            </Button>
                          }
                        />
                        {(request.document_url || request.file_url || request.uploaded_file_url || request.storage_path) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              const url = request.document_url || request.file_url || request.uploaded_file_url || request.storage_path;
                              if (url) window.open(url, '_blank');
                            }}
                          >
                            <FileText className="h-4 w-4" />
                            View instructions
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm capitalize">{d.document_type.replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1 text-sm">
                            <FileText className="h-4 w-4" />
                            <span className="truncate max-w-[220px]" title={d.storage_path}>{d.storage_path.split('/').pop()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.verified ? 'secondary' : 'outline'}>
                            {d.verified ? 'Verified' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(d.uploaded_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => downloadDoc(d)}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Offers</CardTitle>
            </CardHeader>
            <CardContent>
              {offers.length === 0 && offerDocs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No offers yet.</div>
              ) : (
                <div className="space-y-4">
                  {/* Offers from offers table */}
                  {offers.length > 0 && (
                    <div className="space-y-3">
                      {offers.map((o) => (
                        <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="space-y-1 mb-3 sm:mb-0">
                            <div className="text-sm font-medium capitalize">{o.offer_type.replace('_', ' ')} Offer</div>
                            {o.expiry_date && (
                              <div className="text-xs text-muted-foreground">Expires {new Date(o.expiry_date).toLocaleDateString()}</div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={o.accepted ? 'secondary' : 'outline'}>{o.accepted ? 'Accepted' : 'Pending'}</Badge>
                            {o.letter_url && (
                              <>
                                {o.isLoading ? (
                                  <Button variant="outline" size="sm" disabled>
                                    <span className="animate-pulse">Loading...</span>
                                  </Button>
                                ) : (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => viewOfferDocument(o.letter_url, o.signedUrl)}
                                    >
                                      <FileText className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => downloadOfferDocument(o.letter_url, o.signedUrl, `${o.offer_type}_offer_letter.pdf`)}
                                    >
                                      <Download className="mr-2 h-4 w-4" /> Download
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Offer documents from application_documents table */}
                  {offerDocs.length > 0 && (
                    <div className="space-y-3">
                      {offers.length > 0 && (
                        <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium pt-2">
                          Additional Documents
                        </div>
                      )}
                      {offerDocs.map((doc) => (
                        <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="space-y-1 mb-3 sm:mb-0">
                            <div className="text-sm font-medium capitalize flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              {doc.document_type?.replace(/_/g, ' ') || 'Document'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {doc.signedUrl ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(doc.signedUrl!, '_blank')}
                                >
                                  <FileText className="mr-2 h-4 w-4" /> View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => downloadOfferDocument(doc.storage_path, doc.signedUrl, doc.storage_path.split('/').pop())}
                                >
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  const url = await getSignedUrl(doc.storage_path);
                                  if (url) {
                                    window.open(url, '_blank');
                                  } else {
                                    toast({ title: 'Error', description: 'Could not access document', variant: 'destructive' });
                                  }
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" /> View Document
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
