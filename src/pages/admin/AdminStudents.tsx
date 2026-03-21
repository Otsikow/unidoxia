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
import {
  deriveStudentStatus,
  getStudentStatusMeta,
  STUDENT_STATUS_FILTER_OPTIONS,
  type StudentOperationalStatus,
} from "@/lib/studentStatus";

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

type AccountStatusFilter = "all" | "active" | "archived";

const ALL_FILTER = "all";

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
  const [studentStatusFilter, setStudentStatusFilter] =
    useState<string>("all");
  const [accountStatusFilter, setAccountStatusFilter] =
    useState<AccountStatusFilter>("all");

  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithDocuments | null>(null);

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const filteredStudents = useMemo(() => {
    let result = students;

    // Filter by operational status
    if (studentStatusFilter !== "all") {
      result = result.filter((s) => s.operationalStatus === studentStatusFilter);
    }

    // Search filter
    const normalizedQuery = normalizeSearchValue(searchTerm);
    const queryTerms = normalizedQuery.split(/[\s,]+/).filter(Boolean);

    if (queryTerms.length) {
      result = result.filter((student) => {
        const searchableText = normalizeSearchValue(
          [
            student.preferred_name,
            student.legal_name,
            student.profile?.full_name,
            student.profile?.email,
            student.contact_email,
            student.current_country,
          ]
            .filter(Boolean)
            .join(" ")
        );
        return queryTerms.every((term) => searchableText.includes(term));
      });
    }

    return result;
  }, [searchTerm, students, studentStatusFilter]);

  const studentKpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = students.length;
    const active = students.filter((student) => student.status !== "archived").length;
    const archived = total - active;
    const pendingReview = students.filter((student) =>
      student.documents.some(
        (document) => document.admin_review_status === "awaiting_admin_review"
      )
    ).length;
    const joinedThisMonth = students.filter((student) => {
      if (!student.created_at) return false;
      return new Date(student.created_at) >= monthStart;
    }).length;

    return {
      total,
      active,
      archived,
      pendingReview,
      joinedThisMonth,
      visible: filteredStudents.length,
    };
  }, [filteredStudents.length, students]);

  /* ------------------------------------------------------------------------ */
  /*                                 Fetching                                 */
  /* ------------------------------------------------------------------------ */

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
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
          archived_at,
          archived_by,
          archive_reason,
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
        );

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      const mapped = (data ?? []).map((s: any) => ({
        ...s,
        status: s.archived_at ? "archived" : "active",
      }));

      setStudents(mapped as StudentWithDocuments[]);
    } catch (err) {
      console.error(err);
      setError("Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchStudents();
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
    if (!selectedStudent || !profile?.id) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();

      await supabase
        .from("profiles")
        .update({ active: false, updated_at: now })
        .eq("id", selectedStudent.profile_id);

      toast({ title: "Student suspended" });

      setSuspendDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      fetchStudents();
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveStudent = async () => {
    if (!selectedStudent || !profile?.id) return;
    setActionLoading(true);
    try {
      await supabase
        .from("students")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: profile.id,
          archive_reason: actionReason || null,
        })
        .eq("id", selectedStudent.id);

      toast({ title: "Student archived" });

      setArchiveDialogOpen(false);
      setSelectedStudent(null);
      setActionReason("");
      fetchStudents();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreStudent = async () => {
    if (!selectedStudent || !profile?.id) return;
    setActionLoading(true);
    try {
      await supabase
        .from("students")
        .update({
          archived_at: null,
          archived_by: null,
          archive_reason: null,
        })
        .eq("id", selectedStudent.id);

      toast({ title: "Student restored" });

      setRestoreDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } finally {
      setActionLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                  Render                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">
          Student Document Review
        </h1>
        <Button onClick={() => fetchStudents()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Students</CardDescription>
                <CardTitle className="text-2xl">{studentKpis.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{studentKpis.visible} currently visible</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Accounts</CardDescription>
                <CardTitle className="text-2xl">{studentKpis.active}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Students with active records
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Archived</CardDescription>
                <CardTitle className="text-2xl">{studentKpis.archived}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Hidden from active workflows
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending Document Review</CardDescription>
                <CardTitle className="text-2xl">{studentKpis.pendingReview}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                Students waiting for admin review
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Joined This Month</CardDescription>
                <CardTitle className="text-2xl">{studentKpis.joinedThisMonth}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                New student growth
              </CardContent>
            </Card>
          </div>

          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student name, country, or email"
              className="pl-9"
              aria-label="Search students"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No students found for "{searchTerm.trim()}".
                  </TableCell>
                </TableRow>
              ) : filteredStudents.map((student) => {
                  const isArchived = student.status === "archived";

                  return (
                    <TableRow
                      key={student.id}
                      className={`${isArchived ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        <button
                          className="text-left hover:underline text-primary font-medium"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                        >
                          {getStudentName(student)}
                        </button>
                      </TableCell>
                      <TableCell>
                        {student.current_country ?? "—"}
                      </TableCell>
                      <TableCell>
                        {isArchived ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.created_at
                          ? format(new Date(student.created_at), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
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
                                    setSelectedStudent(student);
                                    setSuspendDialogOpen(true);
                                  }}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setArchiveDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudents;
