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
  status: "active" | "suspended" | "archived" | null;
  status_reason: string | null;
  status_changed_at: string | null;
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

type AccountStatusFilter = "all" | "active" | "suspended" | "archived";

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
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((s: any) => ({
        ...s,
        status: s.archived_at
          ? "archived"
          : s.status ?? "active",
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

      await supabase
        .from("students")
        .update({
          status: "suspended",
          status_reason: actionReason || "Suspended by admin",
          status_changed_at: now,
          updated_at: now,
        })
        .eq("id", selectedStudent.id);

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
              ) : students.map((student) => {
                  const isArchived = student.status === "archived";
                  const isSuspended = student.status === "suspended";

                  return (
                    <TableRow
                      key={student.id}
                      className={`${isArchived || isSuspended ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        {getStudentName(student)}
                      </TableCell>
                      <TableCell>
                        {student.current_country ?? "—"}
                      </TableCell>
                      <TableCell>
                        {isArchived ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : isSuspended ? (
                          <Badge variant="destructive">Suspended</Badge>
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