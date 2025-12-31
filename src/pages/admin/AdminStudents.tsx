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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  profile_ready_for_university: boolean | null;
  profile_approved_at: string | null;
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

// Required documents that must be uploaded and approved
const REQUIRED_DOCUMENT_TYPES = ["passport", "passport_photo", "transcript", "cv"];

type SortField = "name" | "country" | "programme" | "joined";
type SortDirection = "asc" | "desc";
type DocumentStatusFilter =
  | "all"
  | "awaiting_admin_review"
  | "ready_for_university_review"
  | "admin_rejected";

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
          profile_ready_for_university,
          profile_approved_at,
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

  const getMissingDocsCount = (s: StudentWithDocuments) => {
    const docs = s.documents ?? [];
    // Get latest doc for each type
    const latestByType = new Map<string, typeof docs[0]>();
    for (const doc of docs) {
      const existing = latestByType.get(doc.document_type);
      if (!existing || new Date(doc.created_at) > new Date(existing.created_at)) {
        latestByType.set(doc.document_type, doc);
      }
    }
    // Count missing or rejected required docs
    return REQUIRED_DOCUMENT_TYPES.filter(type => {
      const doc = latestByType.get(type);
      return !doc || doc.admin_review_status === "admin_rejected";
    }).length;
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

      return matchesSearch && matchesDocs && matchesApplication;
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Students
          </CardTitle>
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
                <TableHead>Profile</TableHead>
                <TableHead>App Status</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("joined")}>
                    Joined {getSortIcon("joined")}
                  </Button>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    No students match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map(student => {
                  const stats = getDocumentStats(student);
                  const missingCount = getMissingDocsCount(student);
                  return (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/admin/students/${student.id}`)
                      }
                    >
                      <TableCell>{getStudentName(student)}</TableCell>
                      <TableCell>{student.current_country ?? "—"}</TableCell>
                      <TableCell>
                        {student.applications[0]?.program?.level ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {missingCount > 0 && (
                            <Badge variant="outline" className="border-red-300 text-red-600 gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {missingCount} missing
                            </Badge>
                          )}
                          {stats.pending > 0 && (
                            <Badge variant="secondary">
                              {stats.pending} pending
                            </Badge>
                          )}
                          {stats.approved > 0 && (
                            <Badge className="bg-green-600">
                              {stats.approved} approved
                            </Badge>
                          )}
                          {stats.rejected > 0 && (
                            <Badge variant="destructive">
                              {stats.rejected} rejected
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.profile_ready_for_university ? (
                          <Badge className="bg-green-600 gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Not Ready
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.applications[0]?.status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "—"}
                      </TableCell>
                      <TableCell>
                        {student.created_at
                          ? format(
                              new Date(student.created_at),
                              "MMM d, yyyy"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Eye className="h-4 w-4" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudents;
