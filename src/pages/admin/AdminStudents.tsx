"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  AlertCircle,
  Ban,
  Eye,
  FileText,
  MessageCircle,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { logSecurityEvent } from "@/lib/securityLogger";
import {
  deriveStudentStatus,
  getStudentStatusMeta,
  STUDENT_STATUS_FILTER_OPTIONS,
  MANUAL_STATUS_OPTIONS,
  type StudentOperationalStatus,
} from "@/lib/studentStatus";

import { TablePagination } from "@/components/common/TablePagination";
import { formatIntakeLabel, getAcademicYearOptions } from "@/lib/intakeOptions";
import { studentQueueView, getStudentNextAction, studentDocumentsToReview, studentMatchesView, studentNeedsAttention, type StudentWorkspaceView } from '@/lib/studentWorkspace';
import { DuplicateStudentsPanel } from "@/components/admin/DuplicateStudentsPanel";

const STUDENTS_PAGE_SIZE = 20;

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface StudentWithDocuments {
  id: string;
  profile_id: string;
  reference_code: string | null;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  current_country: string | null;
  preferred_course: string | null;
  preferred_country: string | null;
  preferred_intake_year: number | null;
  preferred_intake_month: number | null;
  created_at: string | null;
  manual_status: string | null;
  referral_source: string | null;
  address: { whatsapp?: string } | null;
  /** Derived field – not a DB column */
  status: "active" | "archived" | null;
  /** Derived operational status */
  operationalStatus: StudentOperationalStatus;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  documents: {
    id: string;
    document_type: string;
    file_name: string;
    admin_review_status: string | null;
    verified_status: string | null;
    created_at: string;
    updated_at: string | null;
  }[];
  applications: {
    id: string;
    status: string | null;
    program: {
      level: string;
      name: string;
    } | null;
  }[];
  attribution_source: string | null;
}

const normalizeSearchValue = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

const AdminStudents = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const userRole = profile?.role ?? null;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [params, setParams] = useSearchParams();
  const view = studentQueueView(params.get('view'));
  const setView = (value: StudentWorkspaceView) => {
    const next = new URLSearchParams(params);
    next.set('view', studentQueueView(value));
    setParams(next, { replace: true });
  };
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [intakeYearFilter, setIntakeYearFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const loadVersion = useRef(0);
  const writing = useRef(false);

  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithDocuments | null>(null);

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudents = useMemo(() => {
    let result = students.filter(student => studentMatchesView(student, view));

    // Filter by operational status
    if (studentStatusFilter !== "all") {
      result = result.filter((s) => s.operationalStatus === studentStatusFilter);
    }

    // Filter by intake year
    if (intakeYearFilter !== "all") {
      const year = parseInt(intakeYearFilter, 10);
      result = result.filter((s) => s.preferred_intake_year === year);
    }

    // Search filter
    const normalizedQuery = normalizeSearchValue(searchTerm);
    const queryTerms = normalizedQuery.split(/[\s,]+/).filter(Boolean);

    if (queryTerms.length) {
      result = result.filter((student) => {
        const searchableText = normalizeSearchValue(
          [
            student.reference_code,
            student.preferred_name,
            student.legal_name,
            student.profile?.full_name,
            student.profile?.email,
            student.contact_email,
            student.current_country,
            student.preferred_course,
            student.preferred_country,
            student.preferred_intake_year ? String(student.preferred_intake_year) : null,
          ]
            .filter(Boolean)
            .join(" ")
        );
        return queryTerms.every((term) => searchableText.includes(term));
      });
    }

    return result;
  }, [searchTerm, students, studentStatusFilter, intakeYearFilter, view]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, studentStatusFilter, intakeYearFilter, view]);

  const paginatedStudents = useMemo(() => {
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PAGE_SIZE)));
    const start = (page - 1) * STUDENTS_PAGE_SIZE;
    return filteredStudents.slice(start, start + STUDENTS_PAGE_SIZE);
  }, [filteredStudents, currentPage]);




  /* ------------------------------------------------------------------------ */
  /*                                 Fetching                                 */
  /* ------------------------------------------------------------------------ */

  const fetchStudents = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);

    const buildStudentSelect = (includeAttributions: boolean) => `
          id,
          profile_id,
          reference_code,
          legal_name,
          preferred_name,
          contact_email,
          contact_phone,
          current_country,
          preferred_course,
          preferred_country,
          preferred_intake_year,
          preferred_intake_month,
          created_at,
          manual_status,
          referral_source,
          address,
          archived_at,
          archived_by,
          archive_reason,
          profile:profiles!students_profile_id_fkey (
            full_name,
            email,
            phone
          ),
          documents:student_documents (
            id,
            document_type,
            file_name,
            admin_review_status,
            verified_status,
            created_at,
            updated_at
          ),
          applications (
            id,
            status,
            program:programs (
              level,
              name
            )
          )${includeAttributions ? `, attributions ( source )` : ""}
        `;

    const fetchStudentRows = async (
      includeAttributions: boolean,
      scopeToTenant: boolean
    ) => {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = supabase.from('students').select(buildStudentSelect(includeAttributions));
        if (scopeToTenant && tenantId) query = query.eq('tenant_id', tenantId);
        const response = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (response.error) return { data: null, error: response.error };
        rows.push(...(response.data ?? []));
        if ((response.data?.length ?? 0) < 500) return { data: rows, error: null };
      }
    };

    try {
      let includeAttributions = true;
      const canUseUnscopedFallback = userRole === "admin" || userRole === "staff";
      const queryVariants = tenantId
        ? [true, ...(canUseUnscopedFallback ? [false] : [])]
        : [false];
      let response: Awaited<ReturnType<typeof fetchStudentRows>> | null = null;

      for (const scopeToTenant of queryVariants) {
        response = await fetchStudentRows(includeAttributions, scopeToTenant);
        if (response.error) {
          console.warn(
            "AdminStudents: attribution join failed, retrying without attributions",
            response.error
          );
          includeAttributions = false;
          response = await fetchStudentRows(includeAttributions, scopeToTenant);
        }

        if (response.error) throw response.error;

        if ((response.data?.length ?? 0) > 0 || !scopeToTenant) {
          if (tenantId && !scopeToTenant) {
            console.warn(
              "AdminStudents: tenant-scoped student query returned no rows; using unscoped fallback."
            );
          }
          break;
        }
      }

      if (!response) return;

      const mapped = (response.data ?? []).map((s: any) => {
        const referralSource =
          typeof s.referral_source === "string" ? s.referral_source.trim() : "";

        const attributionSource =
          Array.isArray(s.attributions)
            ? s.attributions
                .map((entry: { source?: string | null }) =>
                  typeof entry?.source === "string" ? entry.source.trim() : ""
                )
                .find(Boolean)
            : "";

        // Prefer explicit referral source, then attribution records.
        const attrSource =
          referralSource ||
          attributionSource;

        return {
          ...s,
          status: s.archived_at ? "archived" : "active",
          operationalStatus: deriveStudentStatus(s),
          attribution_source: attrSource || null,
        };
      });

      if (loadVersion.current === version) setStudents(mapped as StudentWithDocuments[]);
    } catch (err) {
      console.error(err);
      if (loadVersion.current === version) setError("Students could not be loaded. Refresh to try again.");
    } finally {
      if (loadVersion.current === version) setLoading(false);
    }
  }, [tenantId, userRole]);

  useEffect(() => {
    setStudents([]);
    void fetchStudents();
    return () => { loadVersion.current += 1; };
  }, [fetchStudents]);

  /* ------------------------------------------------------------------------ */
  /*                           Account Management                             */
  /* ------------------------------------------------------------------------ */

  const getStudentName = (s: StudentWithDocuments) =>
    s.preferred_name ||
    s.legal_name ||
    s.profile?.full_name ||
    "Unknown Student";

  const handleSuspendStudent = async () => {
    if (!selectedStudent || !profile?.id || writing.current) return;
    writing.current = true;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ active: false, updated_at: now })
        .eq("id", selectedStudent.profile_id).select('id').maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('No account was updated. Refresh and check your access.');

      toast({ title: "Student suspended" });

      setSuspendDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      fetchStudents();
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Change could not be saved', description: cause instanceof Error ? cause.message : 'Please refresh and check your access.' });
    } finally {
      writing.current = false;
      setActionLoading(false);
    }
  };

  const handleArchiveStudent = async () => {
    if (!selectedStudent || !profile?.id || writing.current) return;
    writing.current = true;
    setActionLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from("students")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: profile.id,
          archive_reason: actionReason || null,
        })
        .eq("id", selectedStudent.id).select('id').maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('No student was updated. Refresh and check your access.');

      toast({ title: "Student archived" });

      setArchiveDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      fetchStudents();
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Change could not be saved', description: cause instanceof Error ? cause.message : 'Please refresh and check your access.' });
    } finally {
      writing.current = false;
      setActionLoading(false);
    }
  };

  const handleRestoreStudent = async () => {
    if (!selectedStudent || !profile?.id || writing.current) return;
    writing.current = true;
    setActionLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from("students")
        .update({
          archived_at: null,
          archived_by: null,
          archive_reason: null,
        })
        .eq("id", selectedStudent.id).select('id').maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('No student was updated. Refresh and check your access.');

      toast({ title: "Student restored" });

      setRestoreDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Change could not be saved', description: cause instanceof Error ? cause.message : 'Please refresh and check your access.' });
    } finally {
      writing.current = false;
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent || writing.current) return;
    if (deleteConfirmText !== "DELETE") {
      toast({
        variant: "destructive",
        title: "Confirmation required",
        description: 'Type DELETE to confirm permanent deletion.',
      });
      return;
    }
    writing.current = true;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: selectedStudent.profile_id, hardDelete: true, reason: actionReason || "Admin permanent deletion" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      try {
        await logSecurityEvent({
          eventType: "custom",
          severity: "high",
          metadata: { action: "student_deleted", student_id: selectedStudent.id, profile_id: selectedStudent.profile_id, reason: actionReason || null },
        });
      } catch {
        /* non-blocking */
      }

      toast({ title: "Student deleted", description: "The account has been permanently removed." });
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      setDeleteConfirmText("");
      fetchStudents();
    } catch (err: any) {
      console.error("Delete student failed:", err);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err?.message ?? "Could not delete student. Please try again.",
      });
    } finally {
      writing.current = false;
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async (student: StudentWithDocuments, newStatus: string) => {
    if (writing.current) return;
    writing.current = true; setActionLoading(true);
    try {
      const valueToSave = newStatus === "auto" ? null : newStatus;
      const { data, error } = await supabase
        .from("students")
        .update({ manual_status: valueToSave })
        .eq("id", student.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Status was not updated.');
      toast({ title: "Status updated" });
      fetchStudents();
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally { writing.current = false; setActionLoading(false); }
  };

  const studentMenu = (student: StudentWithDocuments) => {
    const whatsapp = (student.address?.whatsapp || student.contact_phone || student.profile?.phone || '').replace(/\D/g, '');
    const isArchived = Boolean(student.archived_at);
    return (                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={actionLoading} aria-label={`Actions for ${getStudentName(student)}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            {whatsapp && <DropdownMenuItem asChild><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Open WhatsApp</a></DropdownMenuItem>}
                            {!isArchived && <DropdownMenuItem onClick={() => navigate(`/dashboard/applications/new?studentId=${student.id}`)}><FileText className="mr-2 h-4 w-4" />New application</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <div className="max-w-72 space-y-1 px-2 py-2 text-xs text-muted-foreground"><p className="break-words">{student.contact_email || student.profile?.email || 'Email not recorded'}</p><p>{student.contact_phone || student.profile?.phone || 'Phone not recorded'}</p><p>Referred by: {student.attribution_source || 'Not recorded'}</p><p>Joined: {student.created_at && !Number.isNaN(Date.parse(student.created_at)) ? format(new Date(student.created_at), 'd MMM yyyy') : 'Not recorded'}</p></div>
                            <DropdownMenuSeparator />
                            {isArchived ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setRestoreDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedStudent(student); setActionReason('');
                                    setSuspendDialogOpen(true);
                                  }}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedStudent(student); setActionReason('');
                                    setArchiveDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setDeleteConfirmText("");
                                    setActionReason("");
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>);
  };
  const studentStatus = (student: StudentWithDocuments) => (                        <Select
                          value={student.manual_status || "auto"}
                          disabled={actionLoading}
                          onValueChange={(val) => handleChangeStatus(student, val)}
                        >
                          <SelectTrigger aria-label={`Status for ${getStudentName(student)}`} className="w-[200px] h-8 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-1 p-1">
                            <SelectValue>
                              {(() => {
                                const meta = getStudentStatusMeta(student.operationalStatus);
                                return (
                                  <Badge variant={meta.variant} className={meta.className}>
                                    {student.operationalStatus === 'application_submitted' ? 'Received by UniDoxia' : meta.label}
                                  </Badge>
                                );
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">
                              <span className="text-muted-foreground">Auto-detect</span>
                            </SelectItem>
                            {MANUAL_STATUS_OPTIONS.map((opt) => {
                              const meta = getStudentStatusMeta(opt.value);
                              return (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <Badge variant={meta.variant} className={`${meta.className} text-xs`}>
                                    {meta.label}
                                  </Badge>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>);
  const studyPlans = (student: StudentWithDocuments) => <div className="text-sm"><p>{student.preferred_course || 'Course not selected'}</p><p className="text-xs text-muted-foreground">{student.preferred_country || 'Destination not selected'}{student.preferred_intake_year && student.preferred_intake_month ? ` · ${formatIntakeLabel(student.preferred_intake_year, student.preferred_intake_month)}` : ''}</p></div>;
  const openStudent = (student: StudentWithDocuments, tab = 'overview') => navigate(`/admin/students/${student.id}?tab=${tab}`);
  const resetFilters = () => { setView('active'); setSearchTerm(''); setStudentStatusFilter('all'); setIntakeYearFilter('all'); setCurrentPage(1); };
  const views: { value: StudentWorkspaceView; label: string; count: number }[] = [
    { value: 'active', label: 'Active students', count: students.filter(student => !student.archived_at).length },
    { value: 'attention', label: 'Needs attention', count: students.filter(studentNeedsAttention).length },
    { value: 'review', label: 'Documents to review', count: students.filter(student => !student.archived_at && studentDocumentsToReview(student) > 0).length },
    { value: 'applications', label: 'With applications', count: students.filter(student => !student.archived_at && student.applications.length > 0).length },
  ];
  const yearOptions = Array.from(new Set([...getAcademicYearOptions().map(year => year.startYear), ...students.map(student => student.preferred_intake_year).filter((year): year is number => Boolean(year))])).sort((a, b) => a - b);
  const hasFilters = view !== 'active' || Boolean(searchTerm) || studentStatusFilter !== 'all' || intakeYearFilter !== 'all';

  /* ------------------------------------------------------------------------ */
  /*                                  Render                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Students</h1><p className="text-sm text-muted-foreground">Find a student, check what is needed, then take the next step.</p></div><Button onClick={() => void fetchStudents()} disabled={loading} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Refresh students</Button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{views.map(item => <Button key={item.value} variant={view === item.value ? 'secondary' : 'outline'} aria-pressed={view === item.value} className="h-auto flex-col items-start whitespace-normal p-4 text-left" onClick={() => setView(item.value)}><span className="text-xs sm:text-sm">{item.label}</span><span className="text-2xl font-bold">{loading || error ? '—' : item.count}</span></Button>)}</div>
      <div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search name, UDX reference, email or course" className="pl-9" aria-label="Search students" /></div>
        <Select value={view} onValueChange={value => setView(value as StudentWorkspaceView)}><SelectTrigger className="lg:w-48" aria-label="Student queue"><SelectValue /></SelectTrigger><SelectContent>{[...views, { value: 'archived', label: 'Archived students' }, { value: 'all', label: 'All students' }].map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>{showFilters ? 'Hide filters' : studentStatusFilter !== 'all' || intakeYearFilter !== 'all' ? 'More filters (applied)' : 'More filters'}</Button>
        {hasFilters && <Button variant="ghost" onClick={resetFilters}>Clear filters</Button>}
      </div>
      {showFilters && <div className="flex flex-col gap-3 sm:flex-row">        <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}><SelectTrigger className="lg:w-48" aria-label="Student status"><SelectValue /></SelectTrigger><SelectContent>{STUDENT_STATUS_FILTER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
        <Select value={intakeYearFilter} onValueChange={setIntakeYearFilter}><SelectTrigger className="lg:w-48" aria-label="Intake year"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All intake years</SelectItem>{yearOptions.map(year => <SelectItem key={year} value={String(year)}>{year}/{year + 1} Academic Year</SelectItem>)}</SelectContent></Select>
</div>}
      {error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Unable to load students</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : loading ? <div role="status" aria-label="Loading students"><Skeleton className="h-32 w-full" /><p className="mt-2 text-sm text-muted-foreground">Loading students…</p></div> : <Card><CardContent className="p-0">
        <div className="hidden overflow-x-auto lg:block"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Study plans</TableHead><TableHead>Next step</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{paginatedStudents.map(student => {
          const next = getStudentNextAction(student);
          return <TableRow key={student.id} className={student.archived_at ? 'opacity-70' : ''}><TableCell className="min-w-48"><button className="font-medium text-primary hover:underline" onClick={() => openStudent(student)}>{getStudentName(student)}</button><p className="text-xs text-muted-foreground">{student.reference_code || 'No reference'} · {student.current_country || 'Country not recorded'}</p><p className="text-xs text-muted-foreground">{student.contact_email || student.profile?.email || 'Email not recorded'}</p><div className="mt-2">{studentStatus(student)}</div></TableCell><TableCell>{studyPlans(student)}</TableCell><TableCell><p className="text-sm">{next.label}</p><p className="mt-1 text-xs text-muted-foreground">Files awaiting review: {studentDocumentsToReview(student)} · Applications: {student.applications.length}</p></TableCell><TableCell><div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => openStudent(student, next.tab)} aria-label={`Open student ${getStudentName(student)}`}>Open student</Button>{studentMenu(student)}</div></TableCell></TableRow>;
        })}</TableBody></Table></div>
        <div className="divide-y lg:hidden">{paginatedStudents.map(student => { const next = getStudentNextAction(student); const whatsappNumber = student.address?.whatsapp || student.contact_phone || student.profile?.phone; const digits = whatsappNumber?.replace(/\D/g, ''); return <article key={student.id} className="space-y-3 p-4"><div className="flex justify-between gap-2"><div><h2 className="font-semibold">{getStudentName(student)}</h2><p className="text-xs text-muted-foreground">{student.reference_code || 'No reference'} · {student.current_country || 'Country not recorded'}</p></div>{studentMenu(student)}</div>{studyPlans(student)}{studentStatus(student)}<div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">Next step</p><p>{next.label}</p><p className="mt-1 text-xs text-muted-foreground">Files awaiting review: {studentDocumentsToReview(student)} · Applications: {student.applications.length}</p></div><Button className="w-full" variant="outline" onClick={() => openStudent(student, next.tab)} aria-label={`Open student ${getStudentName(student)}`}>Open student</Button>{digits && <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary"><MessageCircle className="h-4 w-4" />WhatsApp</a>}</article>; })}</div>
        {filteredStudents.length === 0 && <div className="space-y-3 p-8 text-center"><p className="text-sm text-muted-foreground">{students.length === 0 ? 'No students yet. Registered students will appear here.' : 'No students match this view. Change the filters or search again.'}</p>{students.length > 0 && <Button variant="outline" onClick={resetFilters}>Show active students</Button>}</div>}
        <div className="border-t px-4"><TablePagination currentPage={currentPage} totalItems={filteredStudents.length} pageSize={STUDENTS_PAGE_SIZE} onPageChange={setCurrentPage} itemLabel="students" /></div>
      </CardContent></Card>}
      <section className="space-y-3"><Button variant="ghost" aria-expanded={showDuplicates} onClick={() => setShowDuplicates(!showDuplicates)}>{showDuplicates ? 'Hide duplicate checks' : 'Check duplicate records'}</Button>{showDuplicates && <DuplicateStudentsPanel />}</section>

      <AlertDialog open={suspendDialogOpen || archiveDialogOpen || restoreDialogOpen} onOpenChange={open => { if (!open && !actionLoading) { setSuspendDialogOpen(false); setArchiveDialogOpen(false); setRestoreDialogOpen(false); setActionReason(''); } }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{suspendDialogOpen ? 'Suspend student account?' : archiveDialogOpen ? 'Archive student?' : 'Restore student?'}</AlertDialogTitle><AlertDialogDescription>{suspendDialogOpen ? 'Mark this student account as inactive.' : archiveDialogOpen ? 'Move this student out of the active list. Their record is kept and can be restored.' : 'Return this student to the active list.'} {selectedStudent ? getStudentName(selectedStudent) : ''}</AlertDialogDescription></AlertDialogHeader>
          {archiveDialogOpen && <Textarea aria-label="Archive reason" placeholder="Reason (optional)" value={actionReason} disabled={actionLoading} onChange={event => setActionReason(event.target.value)} />}
          <AlertDialogFooter><AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel><AlertDialogAction disabled={actionLoading} onClick={event => { event.preventDefault(); void (suspendDialogOpen ? handleSuspendStudent() : archiveDialogOpen ? handleArchiveStudent() : handleRestoreStudent()); }}>{actionLoading ? 'Saving…' : suspendDialogOpen ? 'Suspend account' : archiveDialogOpen ? 'Archive student' : 'Restore student'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (actionLoading) return;
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirmText("");
            setActionReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete student permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {selectedStudent ? getStudentName(selectedStudent) : "this student"}
              </strong>
              's account, profile, documents and applications. This cannot be undone.
              Type <span className="font-mono font-semibold">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Reason (optional)"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
            <Input
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteStudent();
              }}
              disabled={actionLoading || deleteConfirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudents;
