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
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StudentWithDocuments {
  id: string;
  profile_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  current_country: string | null;
  created_at: string | null;
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
  }[];
}

type DocumentStatusFilter = "all" | "awaiting_admin_review" | "ready_for_university_review" | "admin_rejected";

const ALL_FILTER = "all";

const AdminStudents = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentWithDocuments[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [documentStatusFilter, setDocumentStatusFilter] = useState<DocumentStatusFilter>(ALL_FILTER);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>(ALL_FILTER);
  

  const fetchStudents = useCallback(async () => {
    if (!tenantId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch students with their profiles, documents, and applications
      // Using separate queries to avoid complex join issues with RLS policies
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          profile_id,
          legal_name,
          preferred_name,
          contact_email,
          current_country,
          created_at,
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
            status
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (studentsError) {
        throw studentsError;
      }

      const studentsList = studentsData ?? [];
      setStudents(studentsList as StudentWithDocuments[]);
    } catch (err) {
      console.error("Failed to load students", err);
      setError("Unable to load students at this time.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  // Removed agent-related filter since assigned_agent_id doesn't exist on students

  const uniqueApplicationStatuses = useMemo(() => {
    const statuses = new Set<string>();
    students.forEach((student) => {
      student.applications.forEach((app) => {
        if (app.status) {
          statuses.add(app.status);
        }
      });
    });
    return Array.from(statuses).sort();
  }, [students]);

  const getDocumentStats = (student: StudentWithDocuments) => {
    const docs = student.documents || [];
    const pending = docs.filter((d) => d.admin_review_status === "awaiting_admin_review").length;
    const approved = docs.filter((d) => d.admin_review_status === "ready_for_university_review").length;
    const rejected = docs.filter((d) => d.admin_review_status === "admin_rejected").length;
    return { total: docs.length, pending, approved, rejected };
  };

  const filteredStudents = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const name = student.preferred_name ?? student.legal_name ?? student.profile?.full_name ?? "";
      const email = student.contact_email ?? student.profile?.email ?? "";

      const searchMatch =
        lowerSearch.length === 0 ||
        name.toLowerCase().includes(lowerSearch) ||
        email.toLowerCase().includes(lowerSearch);

      const docStats = getDocumentStats(student);
      let docStatusMatch = true;
      if (documentStatusFilter !== ALL_FILTER) {
        if (documentStatusFilter === "awaiting_admin_review") {
          docStatusMatch = docStats.pending > 0;
        } else if (documentStatusFilter === "ready_for_university_review") {
          docStatusMatch = docStats.approved > 0;
        } else if (documentStatusFilter === "admin_rejected") {
          docStatusMatch = docStats.rejected > 0;
        }
      }

      let applicationMatch = true;
      if (applicationStatusFilter !== ALL_FILTER) {
        applicationMatch = student.applications.some((app) => app.status === applicationStatusFilter);
      }

      return searchMatch && docStatusMatch && applicationMatch;
    });
  }, [students, searchTerm, documentStatusFilter, applicationStatusFilter]);

  const totals = useMemo(() => {
    const total = students.length;
    let pendingDocs = 0;
    let approvedDocs = 0;
    let rejectedDocs = 0;

    students.forEach((student) => {
      const stats = getDocumentStats(student);
      pendingDocs += stats.pending;
      approvedDocs += stats.approved;
      rejectedDocs += stats.rejected;
    });

    return { total, pendingDocs, approvedDocs, rejectedDocs };
  }, [students]);

  const formatStatus = (status: string | null) => {
    if (!status) return "Unknown";
    return status
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const getStudentName = (student: StudentWithDocuments) => {
    return student.preferred_name ?? student.legal_name ?? student.profile?.full_name ?? "Unknown Student";
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredStudents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="py-10 text-center text-sm text-muted-foreground">
              No students match the current filters.
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return filteredStudents.map((student) => {
      const stats = getDocumentStats(student);
      const latestApp = student.applications[0];

      return (
        <TableRow key={student.id} className="align-top hover:bg-muted/50 cursor-pointer"
          onClick={() => navigate(`/admin/students/${student.id}`)}
        >
          <TableCell className="min-w-[180px]">
            <div className="space-y-1">
              <p className="font-medium">{getStudentName(student)}</p>
              <p className="text-xs text-muted-foreground">
                {student.contact_email ?? student.profile?.email ?? "No email"}
              </p>
            </div>
          </TableCell>
          <TableCell className="min-w-[120px]">
            {student.current_country ?? "—"}
          </TableCell>
          <TableCell className="min-w-[120px]">
            <span className="text-muted-foreground">Direct</span>
          </TableCell>
          <TableCell className="min-w-[140px]">
            <div className="flex flex-wrap gap-1">
              {stats.pending > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.pending} pending
                </Badge>
              )}
              {stats.approved > 0 && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {stats.approved} approved
                </Badge>
              )}
              {stats.rejected > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {stats.rejected} rejected
                </Badge>
              )}
              {stats.total === 0 && (
                <span className="text-xs text-muted-foreground">No documents</span>
              )}
            </div>
          </TableCell>
          <TableCell className="min-w-[120px]">
            {latestApp ? (
              <Badge variant="outline">{formatStatus(latestApp.status)}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">No applications</span>
            )}
          </TableCell>
          <TableCell className="min-w-[120px]">
            {student.created_at ? format(new Date(student.created_at), "MMM d, yyyy") : "—"}
          </TableCell>
          <TableCell className="min-w-[100px]">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/students/${student.id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                Review
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Student Document Review</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve student documents before they are sent to partner universities.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void fetchStudents()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-all hover:bg-accent/50 ${documentStatusFilter === ALL_FILTER ? "ring-2 ring-primary" : ""}`}
          onClick={() => setDocumentStatusFilter(ALL_FILTER)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.total}</div>
            <p className="text-xs text-muted-foreground">Across your tenant</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:bg-accent/50 ${documentStatusFilter === "awaiting_admin_review" ? "ring-2 ring-amber-500" : ""}`}
          onClick={() => setDocumentStatusFilter("awaiting_admin_review")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">{totals.pendingDocs}</div>
            <p className="text-xs text-muted-foreground">Documents awaiting admin review</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:bg-accent/50 ${documentStatusFilter === "ready_for_university_review" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setDocumentStatusFilter("ready_for_university_review")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{totals.approvedDocs}</div>
            <p className="text-xs text-muted-foreground">Ready for university review</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:bg-accent/50 ${documentStatusFilter === "admin_rejected" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setDocumentStatusFilter("admin_rejected")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{totals.rejectedDocs}</div>
            <p className="text-xs text-muted-foreground">Require student resubmission</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
          <CardDescription>Filter students by document status, application status, or agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Student name or email..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Document Status</span>
              <Select value={documentStatusFilter} onValueChange={(v) => setDocumentStatusFilter(v as DocumentStatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All document statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All statuses</SelectItem>
                  <SelectItem value="awaiting_admin_review">Pending Admin Review</SelectItem>
                  <SelectItem value="ready_for_university_review">Approved</SelectItem>
                  <SelectItem value="admin_rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Application Status</span>
              <Select value={applicationStatusFilter} onValueChange={setApplicationStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All statuses</SelectItem>
                  {uniqueApplicationStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setDocumentStatusFilter(ALL_FILTER);
                setApplicationStatusFilter(ALL_FILTER);
              }}
            >
              Clear filters
            </Button>
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredStudents.length}</span> of
              {" "}<span className="font-semibold text-foreground">{students.length}</span> students.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Students & Documents
          </CardTitle>
          <CardDescription>Click on a student to review their documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Application Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudents;
