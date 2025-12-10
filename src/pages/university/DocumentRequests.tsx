import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, RefreshCw, UploadCloud } from "lucide-react";
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

const UniversityDocumentRequestsPage = () => {
  const { data, isLoading: dashboardLoading } = useUniversityDashboard();
  const { toast } = useToast();

  const universityId = data?.university?.id ?? null;
  // ISOLATION: Use the actual tenant_id for data scoping, not university_id
  const tenantId = data?.university?.tenant_id ?? null;

  const [documentRequests, setDocumentRequests] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCompletedFirstLoadRef = useRef(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchRequests = useCallback(
    async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
      // ISOLATION: Must have both universityId and tenantId
      if (!universityId || !tenantId) return;

      if (showLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        // ISOLATION: Filter by tenant_id to ensure only this tenant's document requests
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
      } catch (error) {
        logError(error, "UniversityDocumentRequests.fetchRequests");
        const formattedError = formatErrorForToast(
          error,
          "Failed to load document requests",
        );

        setErrorMessage(formattedError);

        // Avoid flashing a toast during the initial load so the UI stays calm
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
    // ISOLATION: Only fetch if we have proper context
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

      return matchesStatus && matchesType;
    });
  }, [documentRequests, statusFilter, typeFilter]);

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

  const handleFileUpload = async (requestId: string, file: File) => {
    // ISOLATION CHECK: Verify tenant context
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

      // ISOLATION: Update must be scoped by tenant_id
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full border-border bg-muted/60 text-card-foreground sm:w-52">
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent className="border-border bg-background text-card-foreground">
                {documentTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
              <SelectTrigger className="w-full border-border bg-muted/60 text-card-foreground sm:w-48">
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
            <div className={withUniversitySurfaceTint("overflow-hidden rounded-xl bg-muted/40")}>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Student</TableHead>
                    <TableHead className="text-muted-foreground">Document Type</TableHead>
                    <TableHead className="text-muted-foreground">Requested Date</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="border-border bg-muted/30 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="font-medium text-foreground">
                        {request.studentName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
                            disabled={uploadingId === request.id}
                            className="gap-2 border-border text-card-foreground hover:bg-muted/40"
                          >
                            {uploadingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UploadCloud className="h-4 w-4" />
                            )}
                            {uploadingId === request.id ? "Uploading..." : "Upload"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversityDocumentRequestsPage;
