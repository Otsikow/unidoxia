import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, UploadCloud, Check, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatErrorForToast, logError } from "@/lib/errorUtils";
import { LoadingState } from "@/components/LoadingState";
import { StatePlaceholder } from "@/components/university/common/StatePlaceholder";
import {
  withUniversityCardStyles,
  withUniversitySurfaceTint,
} from "@/components/university/common/cardStyles";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STORAGE_BUCKET = "student-documents";
const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

type DocumentStatus = "pending" | "received" | "overdue" | string;
type StatusFilterValue = "all" | "pending" | "received" | "overdue";
type DocumentRequestRow =
  Database["public"]["Tables"]["document_requests"]["Row"] & {
    university_id?: string | null;
  };
type StudentRow = Database["public"]["Tables"]["students"]["Row"];

interface DocumentRequestItem {
  id: string;
  studentId: string | null;
  studentName: string;
  requestType: string;
  status: DocumentStatus;
  requestedAt: string | null;
  documentUrl: string | null;
  storagePath: string | null;
}

interface StudentGroup {
  studentId: string;
  studentName: string;
  requests: DocumentRequestItem[];
  pendingCount: number;
}

const statusOptions: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "received", label: "Received" },
  { value: "overdue", label: "Overdue" },
];

const formatStatus = (status: string) =>
  status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "received":
      return "border-success/30 bg-success/10 text-success";
    case "overdue":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "pending":
    default:
      return "border-warning/30 bg-warning/10 text-warning";
  }
};

const buildDocumentTypeOptions = (items: DocumentRequestItem[]) => {
  const uniqueTypes = Array.from(
    new Set(items.map((item) => item.requestType).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  return [
    { value: "all", label: "All document types" },
    ...uniqueTypes.map((type) => ({
      value: type,
      label: type,
    })),
  ];
};

const buildDocumentRequestItem = (
  raw: DocumentRequestRow,
  studentsMap: Map<string, Pick<StudentRow, "id" | "legal_name" | "preferred_name">>,
): DocumentRequestItem => {
  const student = raw.student_id ? studentsMap.get(raw.student_id) : null;
  const studentName =
    student?.preferred_name ?? student?.legal_name ?? "Unknown student";

  const storagePath = raw.storage_path ?? (raw as any).file_path ?? null;
  let documentUrl =
    raw.document_url ?? raw.uploaded_file_url ?? raw.file_url ?? null;

  if (!documentUrl && storagePath) {
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);
    documentUrl = publicUrlData?.publicUrl ?? null;
  }

  const status = (raw.status ?? "pending").toLowerCase();

  return {
    id: raw.id,
    studentId: raw.student_id ?? null,
    studentName,
    requestType: raw.request_type
      ? formatStatus(raw.request_type.toLowerCase())
      : "Document",
    status,
    requestedAt: raw.requested_at ?? raw.created_at ?? null,
    documentUrl,
    storagePath,
  };
};

const groupRequestsByStudent = (requests: DocumentRequestItem[]): StudentGroup[] => {
  const groupMap = new Map<string, StudentGroup>();

  requests.forEach((request) => {
    const key = request.studentId ?? "unknown";
    const existing = groupMap.get(key);

    if (existing) {
      existing.requests.push(request);
      if (request.status === "pending") {
        existing.pendingCount++;
      }
    } else {
      groupMap.set(key, {
        studentId: request.studentId ?? "unknown",
        studentName: request.studentName,
        requests: [request],
        pendingCount: request.status === "pending" ? 1 : 0,
      });
    }
  });

  return Array.from(groupMap.values()).sort((a, b) => 
    b.pendingCount - a.pendingCount || a.studentName.localeCompare(b.studentName)
  );
};

const UniversityDocumentRequestsPage = () => {
  const { data, isLoading: dashboardLoading } = useUniversityDashboard();
  const { toast } = useToast();

  const universityId = data?.university?.id ?? null;
  const tenantId = data?.university?.tenant_id ?? null;

  const [documentRequests, setDocumentRequests] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [markingReceivedId, setMarkingReceivedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const hasCompletedFirstLoadRef = useRef(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchRequests = useCallback(
    async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
      if (!universityId || !tenantId) return;

      if (showLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        const { data: rows, error } = await supabase
          .from("document_requests")
          .select(
            "id, student_id, request_type, status, requested_at, created_at, document_url, uploaded_file_url, file_url, storage_path",
          )
          .eq("tenant_id", tenantId)
          .order("requested_at", { ascending: false });

        if (error) {
          throw error;
        }

        const documentRows = (rows ?? []) as any[];

        const studentIds = Array.from(
          new Set(
            documentRows
              .map((row: any) => row.student_id)
              .filter((id: any): id is string => Boolean(id)),
          ),
        );

        let studentsMap = new Map<
          string,
          Pick<StudentRow, "id" | "legal_name" | "preferred_name">
        >();

        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from("students")
            .select("id, legal_name, preferred_name")
            .in("id", studentIds);

          if (studentsError) {
            throw studentsError;
          }

          if (Array.isArray(studentsData)) {
            studentsMap = new Map(
              studentsData.map((student) => [student.id, student]),
            );
          }
        }

        const mapped = documentRows.map((row: any) =>
          buildDocumentRequestItem(row as DocumentRequestRow, studentsMap),
        );

        setDocumentRequests(mapped);
        
        // Auto-expand students with pending documents
        const studentsWithPending = new Set<string>();
        mapped.forEach(req => {
          if (req.status === "pending" && req.studentId) {
            studentsWithPending.add(req.studentId);
          }
        });
        setExpandedStudents(studentsWithPending);
      } catch (error) {
        logError(error, "UniversityDocumentRequests.fetchRequests");
        const formattedError = formatErrorForToast(
          error,
          "Failed to load document requests",
        );

        setErrorMessage(formattedError.description || formattedError.title);

        if (hasCompletedFirstLoadRef.current) {
          toast(formattedError);
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }

        hasCompletedFirstLoadRef.current = true;
      }
    },
    [toast, universityId, tenantId],
  );

  useEffect(() => {
    if (universityId && tenantId) {
      void fetchRequests();
    } else {
      setLoading(false);
    }
  }, [fetchRequests, universityId, tenantId]);

  const documentTypeOptions = useMemo(
    () => buildDocumentTypeOptions(documentRequests),
    [documentRequests],
  );

  const filteredRequests = useMemo(() => {
    return documentRequests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" ||
        request.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === "all" ||
        request.requestType.toLowerCase() === typeFilter.toLowerCase();

      const matchesSearch =
        searchQuery === "" ||
        request.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requestType.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [documentRequests, statusFilter, typeFilter, searchQuery]);

  const studentGroups = useMemo(
    () => groupRequestsByStudent(filteredRequests),
    [filteredRequests],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRequests({ showLoader: false });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    void fetchRequests();
  };

  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleMarkReceived = async (requestId: string) => {
    if (!tenantId) {
      toast({
        title: "Missing account context",
        description: "Unable to verify your university profile.",
        variant: "destructive",
      });
      return;
    }

    setMarkingReceivedId(requestId);

    try {
      const { error: updateError } = await supabase
        .from("document_requests")
        .update({ status: "received" })
        .eq("id", requestId)
        .eq("tenant_id", tenantId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Document marked as received",
        description: "The document request has been updated successfully.",
      });

      await fetchRequests({ showLoader: false });
    } catch (error) {
      logError(error, "UniversityDocumentRequests.handleMarkReceived");
      toast(formatErrorForToast(error, "Unable to update request"));
    } finally {
      setMarkingReceivedId(null);
    }
  };

  const handleFileUpload = async (requestId: string, file: File) => {
    if (!tenantId) {
      toast({
        title: "Missing account context",
        description: "Unable to verify your university profile.",
        variant: "destructive",
      });
      return;
    }

    setUploadingId(requestId);

    try {
      const sanitizedName = file.name.replace(/\s+/g, "-");
      const timestamp = Date.now();
      const storagePath = `document-requests/${requestId}/${timestamp}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl ?? null;

      const updates: Database["public"]["Tables"]["document_requests"]["Update"] & {
        university_id?: string | null;
      } = {
        status: "received",
      };

      if (publicUrl) {
        updates.document_url = publicUrl;
        updates.storage_path = storagePath;
      }

      const { error: updateError } = await supabase
        .from('document_requests')
        .update(updates)
        .eq('id', requestId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Document uploaded",
        description: "The requested document has been marked as received.",
      });

      await fetchRequests({ showLoader: false });
    } catch (error) {
      logError(error, "UniversityDocumentRequests.handleFileUpload");
      toast(formatErrorForToast(error, "Failed to upload document"));
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileChange = (requestId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";
    void handleFileUpload(requestId, file);
  };

  const handleUploadClick = (requestId: string) => {
    fileInputRefs.current[requestId]?.click();
  };

  if (dashboardLoading) {
    return (
      <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}>
        <CardContent className="py-16">
          <LoadingState message="Loading document requests..." />
        </CardContent>
      </Card>
    );
  }

  if (!universityId) {
    return (
      <StatePlaceholder
        title="No university profile found"
        description="We could not identify a university profile for your account. Please contact support."
        className="bg-transparent"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Document Requests</h1>
        <p className="text-sm text-muted-foreground">
          Track document requests sent to agents or students and upload files as you receive them.
        </p>
      </div>

      <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}>
        <CardHeader className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Requests queue
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {filteredRequests.length} of {documentRequests.length} requests displayed
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student or request type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-border bg-muted/60 text-card-foreground"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
              <SelectTrigger className="w-full border-border bg-muted/60 text-card-foreground sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-border bg-background text-card-foreground">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              className="border-border bg-muted/60 text-card-foreground hover:bg-muted/40"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12">
              <LoadingState message="Loading document requests..." />
            </div>
          ) : errorMessage ? (
            <StatePlaceholder
              title="We couldn't load your document requests"
              description={errorMessage}
              action={
                <Button onClick={handleRetry} className="gap-2">
                  Try again
                  <RefreshCw className="h-4 w-4" />
                </Button>
              }
              className="bg-transparent"
            />
          ) : documentRequests.length === 0 ? (
            <StatePlaceholder
              title="No document requests yet"
              description="When a document is requested from an agent or student, it will appear here for follow-up."
              className="bg-transparent"
            />
          ) : filteredRequests.length === 0 ? (
            <StatePlaceholder
              title="No requests match your filters"
              description="Adjust the filters to view additional document requests."
              className="bg-transparent"
            />
          ) : (
            <div className="space-y-3">
              {studentGroups.map((group) => (
                <Collapsible
                  key={group.studentId}
                  open={expandedStudents.has(group.studentId)}
                  onOpenChange={() => toggleStudentExpanded(group.studentId)}
                >
                  <div className={withUniversitySurfaceTint("overflow-hidden rounded-xl bg-muted/40")}>
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/60">
                        <div className="flex items-center gap-3">
                          {expandedStudents.has(group.studentId) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-foreground">{group.studentName}</span>
                          <Badge variant="outline" className="ml-2 border-border text-muted-foreground">
                            {group.requests.length} document{group.requests.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        {group.pendingCount > 0 && (
                          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                            {group.pendingCount} pending
                          </Badge>
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="border-border">
                              <TableHead className="text-muted-foreground">Document Type</TableHead>
                              <TableHead className="text-muted-foreground">Requested Date</TableHead>
                              <TableHead className="text-muted-foreground">Status</TableHead>
                              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.requests.map((request) => (
                              <TableRow
                                key={request.id}
                                className="border-border bg-muted/20 transition-colors hover:bg-muted/30"
                              >
                                <TableCell className="text-foreground">
                                  {request.requestType}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(request.requestedAt)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={getStatusBadgeClasses(request.status)}
                                  >
                                    {formatStatus(request.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {request.documentUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="text-primary hover:text-primary"
                                      >
                                        <a
                                          href={request.documentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          View
                                        </a>
                                      </Button>
                                    )}
                                    {request.status === "pending" && (
                                      <>
                                        <input
                                          ref={(element) => {
                                            fileInputRefs.current[request.id] = element;
                                          }}
                                          type="file"
                                          accept={ACCEPTED_FILE_TYPES}
                                          className="hidden"
                                          onChange={(event) => handleFileChange(request.id, event)}
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUploadClick(request.id)}
                                          disabled={uploadingId === request.id || markingReceivedId === request.id}
                                          className="gap-2 border-border text-card-foreground hover:bg-muted/40"
                                        >
                                          {uploadingId === request.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <UploadCloud className="h-4 w-4" />
                                          )}
                                          Upload
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleMarkReceived(request.id)}
                                          disabled={markingReceivedId === request.id || uploadingId === request.id}
                                          className="gap-2 border-success/30 bg-success/10 text-success hover:bg-success/20"
                                        >
                                          {markingReceivedId === request.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Check className="h-4 w-4" />
                                          )}
                                          Mark received
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversityDocumentRequestsPage;
