"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  XCircle,
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

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface StudentWithDocuments {
  id: string;
  profile_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  current_country: string | null;
  created_at: string | null;
  status: "active" | "suspended" | "deleted" | null;
  status_reason: string | null;
  status_changed_at: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
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
}

type SortField = "name" | "country" | "programme" | "joined";
type SortDirection = "asc" | "desc";
type DocumentStatusFilter =
  | "all"
  | "awaiting_admin_review"
  | "ready_for_university_review"
  | "admin_rejected";

type AccountStatusFilter = "all" | "active" | "suspended";

const ALL_FILTER = "all";

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

const AdminStudents = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [documentStatusFilter, setDocumentStatusFilter] =
    useState<DocumentStatusFilter>(ALL_FILTER);
  const [applicationStatusFilter, setApplicationStatusFilter] =
    useState<string>(ALL_FILTER);

  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  // Account management state
  const [accountStatusFilter, setAccountStatusFilter] =
    useState<AccountStatusFilter>("active");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDocuments | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* ------------------------------------------------------------------------ */
  /*                                 Fetching                                 */
  /* ------------------------------------------------------------------------ */

  const fetchStudents = useCallback(async () => {
    if (!tenantId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("students")
        .select(
          `
          id,
          profile_id,
          legal_name,
          preferred_name,
          contact_email,
          current_country,
          created_at,
          status,
          status_reason,
          status_changed_at,
          profile:profiles!students_profile_id_fkey (
            full_name,
            email
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
          )
        `
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStudents((data ?? []) as StudentWithDocuments[]);
    } catch (err) {
      console.error(err);
      setError("Unable to load students at this time.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  /* ------------------------------------------------------------------------ */
  /*                               Computations                               */
  /* ------------------------------------------------------------------------ */

  const getStudentName = (s: StudentWithDocuments) =>
    s.preferred_name?.trim() ||
    s.legal_name?.trim() ||
    s.profile?.full_name?.trim() ||
    "Unknown Student";

  const getDocumentStats = (s: StudentWithDocuments) => {
    const docs = s.documents ?? [];
    return {
      total: docs.length,
      pending: docs.filter(d => d.admin_review_status === "awaiting_admin_review").length,
      approved: docs.filter(d => d.admin_review_status === "ready_for_university_review").length,
      rejected: docs.filter(d => d.admin_review_status === "admin_rejected").length,
    };
  };

  const uniqueApplicationStatuses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s =>
      s.applications.forEach(a => a.status && set.add(a.status))
    );
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = students.filter(s => {
      const name = getStudentName(s).toLowerCase();
      const email =
        (s.contact_email ?? s.profile?.email ?? "").toLowerCase();

      const matchesSearch =
        !query || name.includes(query) || email.includes(query);

      const stats = getDocumentStats(s);

      const matchesDocs =
        documentStatusFilter === ALL_FILTER ||
        (documentStatusFilter === "awaiting_admin_review" && stats.pending > 0) ||
        (documentStatusFilter === "ready_for_university_review" && stats.approved > 0) ||
        (documentStatusFilter === "admin_rejected" && stats.rejected > 0);

      const matchesApplication =
        applicationStatusFilter === ALL_FILTER ||
        s.applications.some(a => a.status === applicationStatusFilter);

      const matchesAccountStatus =
        accountStatusFilter === ALL_FILTER ||
        (s.status ?? "active") === accountStatusFilter;

      return matchesSearch && matchesDocs && matchesApplication && matchesAccountStatus;
    });

    return filtered.sort((a, b) => {
      let value = 0;

      switch (sortField) {
        case "name":
          value = getStudentName(a).localeCompare(getStudentName(b));
          break;
        case "country":
          value = (a.current_country ?? "").localeCompare(b.current_country ?? "");
          break;
        case "programme":
          value =
            (a.applications[0]?.program?.level ?? "").localeCompare(
              b.applications[0]?.program?.level ?? ""
            );
          break;
        case "joined":
          value =
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime();
          break;
      }

      return sortDirection === "asc" ? value : -value;
    });
  }, [
    students,
    searchTerm,
    documentStatusFilter,
    applicationStatusFilter,
    accountStatusFilter,
    sortField,
    sortDirection,
  ]);

  /* ------------------------------------------------------------------------ */
  /*                                 Sorting                                  */
  /* ------------------------------------------------------------------------ */

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) =>
    sortField !== field ? (
      <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />
    ) : sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );

  /* ------------------------------------------------------------------------ */
  /*                           Account Management                             */
  /* ------------------------------------------------------------------------ */

  const handleSuspendStudent = async () => {
    if (!selectedStudent || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: false,
        })
        .eq("id", selectedStudent.profile_id);

      if (error) throw error;

      const { error: studentError } = await supabase
        .from("students")
        .update({
          status: "suspended",
          status_reason: actionReason || null,
          status_changed_at: new Date().toISOString(),
          status_changed_by: profile.id,
        })
        .eq("id", selectedStudent.id);

      if (studentError) throw studentError;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin suspended student account: ${getStudentName(selectedStudent)}`,
        severity: "high",
        metadata: {
          studentId: selectedStudent.id,
          studentName: getStudentName(selectedStudent),
          reason: actionReason,
        },
        alert: true,
      });

      toast({
        title: "Student suspended",
        description: `${getStudentName(selectedStudent)}'s account has been suspended.`,
      });

      setSuspendDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      void fetchStudents();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to suspend student account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: false,
        })
        .eq("id", selectedStudent.profile_id);

      if (error) throw error;

      const { error: studentError } = await supabase
        .from("students")
        .update({
          status: "deleted",
          status_reason: actionReason || null,
          status_changed_at: new Date().toISOString(),
          status_changed_by: profile.id,
        })
        .eq("id", selectedStudent.id);

      if (studentError) throw studentError;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin deleted student account: ${getStudentName(selectedStudent)}`,
        severity: "high",
        metadata: {
          studentId: selectedStudent.id,
          studentName: getStudentName(selectedStudent),
          reason: actionReason,
        },
        alert: true,
      });

      toast({
        title: "Student deleted",
        description: `${getStudentName(selectedStudent)}'s account has been deleted.`,
      });

      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      void fetchStudents();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to delete student account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateStudent = async () => {
    if (!selectedStudent || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: true,
        })
        .eq("id", selectedStudent.profile_id);

      if (error) throw error;

      const { error: studentError } = await supabase
        .from("students")
        .update({
          status: "active",
          status_reason: null,
          status_changed_at: new Date().toISOString(),
          status_changed_by: profile.id,
        })
        .eq("id", selectedStudent.id);

      if (studentError) throw studentError;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin reactivated student account: ${getStudentName(selectedStudent)}`,
        severity: "medium",
        metadata: {
          studentId: selectedStudent.id,
          studentName: getStudentName(selectedStudent),
        },
        alert: false,
      });

      toast({
        title: "Student reactivated",
        description: `${getStudentName(selectedStudent)}'s account has been reactivated.`,
      });

      setReactivateDialogOpen(false);
      setSelectedStudent(null);
      void fetchStudents();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to reactivate student account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                  Render                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Student Document Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and approve student documents before universities see them.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchStudents()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={documentStatusFilter}
                onValueChange={(v) => setDocumentStatusFilter(v as DocumentStatusFilter)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Document Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="awaiting_admin_review">Pending Review</SelectItem>
                  <SelectItem value="ready_for_university_review">Approved</SelectItem>
                  <SelectItem value="admin_rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={applicationStatusFilter}
                onValueChange={setApplicationStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Application Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueApplicationStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={accountStatusFilter}
                onValueChange={(v) => setAccountStatusFilter(v as AccountStatusFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Account Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || documentStatusFilter !== "all" || applicationStatusFilter !== "all" || accountStatusFilter !== "active") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setDocumentStatusFilter("all");
                  setApplicationStatusFilter("all");
                  setAccountStatusFilter("active");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{filteredStudents.length}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {students.reduce((sum, s) => sum + getDocumentStats(s).pending, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {students.reduce((sum, s) => sum + getDocumentStats(s).approved, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {students.reduce((sum, s) => sum + getDocumentStats(s).rejected, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Students ({filteredStudents.length})
          </CardTitle>
          <CardDescription>
            Click on a student to review their documents
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("name")}>
                    Student {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("country")}>
                    Country {getSortIcon("country")}
                  </Button>
                </TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("joined")}>
                    Joined {getSortIcon("joined")}
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No students match your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map(student => {
                  const stats = getDocumentStats(student);
                  const hasPending = stats.pending > 0;
                  const isSuspended = student.status === "suspended";
                  return (
                    <TableRow
                      key={student.id}
                      className={`cursor-pointer hover:bg-muted/50 ${hasPending ? "bg-amber-50/30 dark:bg-amber-950/10" : ""} ${isSuspended ? "opacity-60" : ""}`}
                      onClick={() => navigate(`/admin/students/${student.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{getStudentName(student)}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.contact_email ?? student.profile?.email ?? "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{student.current_country ?? "—"}</TableCell>
                      <TableCell>
                        {student.applications[0]?.program?.level ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {stats.pending > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {stats.pending}
                            </Badge>
                          )}
                          {stats.approved > 0 && (
                            <Badge className="bg-green-600 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {stats.approved}
                            </Badge>
                          )}
                          {stats.rejected > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              {stats.rejected}
                            </Badge>
                          )}
                          {stats.total === 0 && (
                            <span className="text-sm text-muted-foreground">No docs</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {student.applications[0]?.status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isSuspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.created_at
                          ? format(new Date(student.created_at), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => navigate(`/admin/students/${student.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isSuspended ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setReactivateDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reactivate Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setSuspendDialogOpen(true);
                                }}
                                className="text-amber-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend Account
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suspend Student Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend{" "}
              <span className="font-semibold">{selectedStudent && getStudentName(selectedStudent)}</span>'s account?
              The student will not be able to access their account until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for suspension (optional)</label>
            <Textarea
              placeholder="Enter reason for suspension..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedStudent(null);
                setActionReason("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendStudent}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Student Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedStudent && getStudentName(selectedStudent)}</span>'s account?
              This action will remove the student from the system. This cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for deletion (optional)</label>
            <Textarea
              placeholder="Enter reason for deletion..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedStudent(null);
                setActionReason("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Student Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate{" "}
              <span className="font-semibold">{selectedStudent && getStudentName(selectedStudent)}</span>'s account?
              The student will regain access to their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedStudent(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateStudent}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reactivate Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudents;
