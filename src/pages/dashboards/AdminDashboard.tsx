import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Download,
  TrendingUp,
  GraduationCap,
  Building2,
  UserCog,
  Wallet,
  ShieldAlert
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OverviewTab from '@/components/dashboard/OverviewTab';
import UsersTab from '@/components/dashboard/UsersTab';
import ApplicationsTab from '@/components/dashboard/ApplicationsTab';
import PaymentsTab from '@/components/dashboard/PaymentsTab';
import ReportsTab from '@/components/dashboard/ReportsTab';
import { AIPerformanceDashboardSection } from "@/components/landing/AIPerformanceDashboardSection";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createNotification } from "@/lib/notifications";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DashboardMetrics {
  totalStudents: number;
  totalApplications: number;
  partnerUniversities: number;
  agents: number;
  revenue: number;
}

type StudentPreview = {
  id: string;
  profile_id: string | null;
  tenant_id: string | null;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type AdminDocumentReview = {
  id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  verified_status: string | null;
  verification_notes: string | null;
  created_at: string | null;
  students?: StudentPreview | null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    totalApplications: 0,
    partnerUniversities: 0,
    agents: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<AdminDocumentReview[]>([]);
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({});
  const [documentMessages, setDocumentMessages] = useState<Record<string, string>>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [updatingDocumentId, setUpdatingDocumentId] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);

  const metricCards = [
    {
      key: 'students',
      label: 'Total Students',
      value: metrics.totalStudents,
      icon: Users,
      iconClassName: 'text-blue-500',
      destination: '/admin/users',
    },
    {
      key: 'applications',
      label: 'Total Applications',
      value: metrics.totalApplications,
      icon: FileText,
      iconClassName: 'text-green-500',
      destination: '/admin/admissions',
    },
    {
      key: 'universities',
      label: 'Partner Universities',
      value: metrics.partnerUniversities,
      icon: Building2,
      iconClassName: 'text-purple-500',
      destination: '/admin/universities',
    },
    {
      key: 'agents',
      label: 'Agents',
      value: metrics.agents,
      icon: UserCog,
      iconClassName: 'text-orange-500',
      destination: '/admin/agents',
    },
    {
      key: 'revenue',
      label: 'Revenue',
      value: metrics.revenue,
      icon: Wallet,
      iconClassName: 'text-emerald-500',
      prefix: '$',
      destination: '/admin/payments',
    },
  ];

  const fetchPendingDocuments = useCallback(async () => {
    if (!isAdminUser) {
      setPendingDocuments([]);
      return;
    }

    try {
      setLoadingDocuments(true);
      // Fetch documents awaiting admin review
      // Include documents that are:
      // 1. verified_status = 'pending' (new documents)
      // 2. admin_review_status = 'awaiting_admin_review' (in review workflow)
      // Exclude documents that have already been approved (verified_status = 'verified')
      const { data, error } = await supabase
        .from('student_documents')
        .select(`
          id,
          document_type,
          file_name,
          storage_path,
          verified_status,
          verification_notes,
          admin_review_status,
          university_access_approved,
          created_at,
          students:student_id (id, profile_id, tenant_id, legal_name, preferred_name, contact_email, contact_phone)
        `)
        .or('verified_status.eq.pending,admin_review_status.eq.awaiting_admin_review')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter out already approved documents (in case of OR matching)
      const pendingDocs = (data ?? []).filter((doc: any) => 
        doc.verified_status !== 'verified' && 
        doc.admin_review_status !== 'ready_for_university_review' &&
        !doc.university_access_approved
      );

      setPendingDocuments((pendingDocs as unknown as AdminDocumentReview[]) ?? []);
    } catch (error) {
      console.error('Error loading pending documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [isAdminUser]);

  const updateDocumentStatus = useCallback(
    async (doc: AdminDocumentReview, status: 'verified' | 'rejected') => {
      try {
        setUpdatingDocumentId(doc.id);
        const note = (documentNotes[doc.id] ?? '').trim() || null;

        // Build update payload with all required fields for document workflow
        // When admin approves a document:
        // - verified_status = 'verified' (for backward compatibility)
        // - admin_review_status = 'ready_for_university_review' (for the gated RPC)
        // - university_access_approved = true (for RLS policies and edge function)
        const updatePayload: Record<string, unknown> = {
          verified_status: status,
          verification_notes: note,
          verified_by: profile?.id ?? null,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (status === 'verified') {
          // When approving, also enable university access
          updatePayload.admin_review_status = 'ready_for_university_review';
          updatePayload.university_access_approved = true;
          updatePayload.university_access_approved_at = new Date().toISOString();
          updatePayload.university_access_approved_by = profile?.id ?? null;
        } else if (status === 'rejected') {
          // When rejecting, revoke university access
          updatePayload.admin_review_status = 'admin_rejected';
          updatePayload.university_access_approved = false;
          updatePayload.university_access_approved_at = null;
          updatePayload.university_access_approved_by = null;
        }

        const { error } = await supabase
          .from('student_documents')
          .update(updatePayload)
          .eq('id', doc.id);

        if (error) throw error;

        if (status === 'rejected' && doc.students?.profile_id && doc.students?.tenant_id) {
          await createNotification({
            userId: doc.students.profile_id,
            tenantId: doc.students.tenant_id,
            type: 'document_review',
            title: 'Document rejected by admin',
            content: note
              ? `Your document "${doc.file_name}" was rejected. Note: ${note}`
              : `Your document "${doc.file_name}" was rejected. Please upload a new version.`,
            actionUrl: '/student/documents',
          });
        }

        await fetchPendingDocuments();
      } catch (error) {
        console.error('Error updating document status:', error);
      } finally {
        setUpdatingDocumentId(null);
      }
    },
    [documentNotes, fetchPendingDocuments, profile?.id]
  );

  const handleViewDocument = async (doc: AdminDocumentReview) => {
    try {
      setOpeningDocumentId(doc.id);
      const { data, error } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(doc.storage_path, 60 * 60);

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const handleDownloadDocument = async (doc: AdminDocumentReview) => {
    try {
      setDownloadingDocumentId(doc.id);
      const { data, error } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(doc.storage_path, 60 * 60, { download: doc.file_name });

      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = doc.file_name;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const sendDocumentMessage = async (doc: AdminDocumentReview) => {
    const message = (documentMessages[doc.id] ?? '').trim();
    if (!message || !doc.students?.profile_id || !doc.students?.tenant_id) return;

    try {
      setUpdatingDocumentId(doc.id);
      await createNotification({
        userId: doc.students.profile_id,
        tenantId: doc.students.tenant_id,
        type: 'document_review',
        title: 'Update on your document',
        content: `${message} (File: ${doc.file_name})`,
        actionUrl: '/student/documents',
      });

      setDocumentMessages((prev) => ({ ...prev, [doc.id]: '' }));
    } catch (error) {
      console.error('Error sending document message:', error);
    } finally {
      setUpdatingDocumentId(null);
    }
  };

  const handleMetricNavigation = (path: string) => navigate(path);

  const handleMetricKeyDown = (event: KeyboardEvent<HTMLDivElement>, path: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMetricNavigation(path);
    }
  };

  // Check if user has admin privileges
  useEffect(() => {
    const checkAccess = async () => {
      if (!profile) return;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);

      const hasAdminRole = userRoles?.some((ur) => ur.role === 'admin');
      const hasAdminAccess = hasAdminRole || userRoles?.some((ur) => ur.role === 'staff');

      setIsAdminUser(Boolean(hasAdminRole));

      if (!hasAdminAccess) {
        navigate('/dashboard');
      }
    };

    checkAccess();
  }, [profile, navigate]);

  // Fetch dashboard metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);

        // Fetch total students
        const { count: studentsCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        // Fetch total applications
        const { count: applicationsCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true });

        // Fetch partner universities
        const { count: universitiesCount } = await supabase
          .from('universities')
          .select('*', { count: 'exact', head: true })
          .eq('active', true);

        // Fetch agents
        const { count: agentsCount } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('active', true);

        // Fetch revenue from payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount_cents')
          .eq('status', 'succeeded');

        const totalRevenue = paymentsData?.reduce(
          (sum, payment) => sum + (payment.amount_cents || 0),
          0
        ) || 0;

        setMetrics({
          totalStudents: studentsCount || 0,
          totalApplications: applicationsCount || 0,
          partnerUniversities: universitiesCount || 0,
          agents: agentsCount || 0,
          revenue: totalRevenue / 100, // Convert cents to dollars
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  useEffect(() => {
    void fetchPendingDocuments();
  }, [fetchPendingDocuments]);

  const groupedDocuments = useMemo(() => {
    const groups = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        contactEmail: string | null | undefined;
        contactPhone: string | null | undefined;
        documents: AdminDocumentReview[];
      }
    >();

    pendingDocuments.forEach((doc) => {
      const studentId = doc.students?.id || `unknown-${doc.id}`;
      const studentName =
        doc.students?.preferred_name ||
        doc.students?.legal_name ||
        'Unknown student';

      if (!groups.has(studentId)) {
        groups.set(studentId, {
          studentId,
          studentName,
          contactEmail: doc.students?.contact_email,
          contactPhone: doc.students?.contact_phone,
          documents: [],
        });
      }

      groups.get(studentId)?.documents.push(doc);
    });

    return Array.from(groups.values());
  }, [pendingDocuments]);

  return (
    <div className="space-y-8">
      <BackButton variant="ghost" size="sm" fallback="/admin" />
        
        {/* Header */}
        <div className="space-y-1.5 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Manage the UniDoxia platform
          </p>
        </div>

        {/* Quick Stats - Metrics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metricCards.map(({ key, label, value, icon: Icon, iconClassName, prefix, destination }) => {
            const displayValue = loading ? '...' : `${prefix ?? ''}${value.toLocaleString()}`;
            return (
              <Card
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${label}`}
                onClick={() => handleMetricNavigation(destination)}
                onKeyDown={(event) => handleMetricKeyDown(event, destination)}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold">{displayValue}</p>
                    </div>
                    <Icon className={cn('h-8 w-8', iconClassName)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isAdminUser && (
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-amber-500" /> Admin Document Reviews
                <Badge variant="secondary">{pendingDocuments.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Approve documents before universities or agents can view them. Admin-only items remain hidden elsewhere.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDocuments ? (
                <div className="text-sm text-muted-foreground">Loading documents...</div>
              ) : pendingDocuments.length === 0 ? (
                <div className="text-sm text-muted-foreground">No documents are awaiting admin review.</div>
              ) : (
                <Accordion type="multiple" className="space-y-3">
                  {groupedDocuments.map((group) => (
                    <AccordionItem key={group.studentId} value={group.studentId} className="rounded-lg border px-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex w-full items-center justify-between gap-2 text-left">
                          <div className="space-y-0.5">
                            <div className="font-semibold leading-tight">{group.studentName}</div>
                            {(group.contactEmail || group.contactPhone) && (
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {group.contactEmail && <div>{group.contactEmail}</div>}
                                {group.contactPhone && <div>{group.contactPhone}</div>}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {group.documents.length} document{group.documents.length === 1 ? '' : 's'}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        {group.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="rounded-lg border bg-card p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="capitalize">
                                    {doc.document_type.replace(/_/g, ' ')}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(doc.created_at || '').toLocaleString()}</span>
                                </div>
                                <div className="font-medium break-words">{doc.file_name}</div>
                                {doc.verification_notes && (
                                  <div className="text-xs text-muted-foreground">Last note: {doc.verification_notes}</div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 md:items-end md:min-w-[260px]">
                                <div className="flex flex-wrap gap-2 justify-end w-full">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full md:w-auto"
                                    disabled={openingDocumentId === doc.id}
                                    onClick={() => handleViewDocument(doc)}
                                  >
                                    {openingDocumentId === doc.id ? 'Opening...' : 'View document'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full md:w-auto"
                                    disabled={downloadingDocumentId === doc.id}
                                    onClick={() => handleDownloadDocument(doc)}
                                  >
                                    {downloadingDocumentId === doc.id ? 'Preparing...' : 'Download'}
                                  </Button>
                                </div>
                                <Textarea
                                  placeholder="Add internal review notes"
                                  value={documentNotes[doc.id] ?? ''}
                                  onChange={(e) => setDocumentNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                                  className="min-h-[60px]"
                                />
                                <Textarea
                                  placeholder="Send a message to the student"
                                  value={documentMessages[doc.id] ?? ''}
                                  onChange={(e) => setDocumentMessages((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                                  className="min-h-[60px]"
                                />
                                <div className="flex flex-wrap gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="md:w-auto"
                                    disabled={updatingDocumentId === doc.id || !(documentMessages[doc.id] ?? '').trim()}
                                    onClick={() => sendDocumentMessage(doc)}
                                  >
                                    {updatingDocumentId === doc.id ? 'Sending...' : 'Send message'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={updatingDocumentId === doc.id}
                                    onClick={() => updateDocumentStatus(doc, 'rejected')}
                                  >
                                    {updatingDocumentId === doc.id ? 'Saving...' : 'Reject'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={updatingDocumentId === doc.id}
                                    onClick={() => updateDocumentStatus(doc, 'verified')}
                                  >
                                    {updatingDocumentId === doc.id ? 'Saving...' : 'Approve'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}

        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <AIPerformanceDashboardSection />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full flex-col gap-2 overflow-x-auto rounded-xl sm:flex-row sm:flex-wrap lg:flex-nowrap">
            <TabsTrigger value="overview" className="flex min-w-[140px] flex-1 items-center justify-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex min-w-[140px] flex-1 items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex min-w-[140px] flex-1 items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex min-w-[140px] flex-1 items-center justify-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex min-w-[140px] flex-1 items-center justify-center gap-2">
              <Download className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab metrics={metrics} loading={loading} />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsTab />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
    </div>
  );
}
