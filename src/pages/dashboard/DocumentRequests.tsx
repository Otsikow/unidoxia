import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatErrorForToast, logError } from "@/lib/errorUtils";
import { Loader2, RefreshCw, UploadCloud } from "lucide-react";

const STORAGE_BUCKET = "student-documents";
const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

type DocumentStatusFilter = "all" | "pending" | "received";

type DocumentRequestRow =
  Database["public"]["Tables"]["document_requests"]["Row"];
type DocumentRequestUpdate =
  Database["public"]["Tables"]["document_requests"]["Update"];
type RawDocumentRequest = DocumentRequestRow;

interface DocumentRequestItem {
  id: string;
  studentId: string | null;
  studentName: string;
  requestType: string;
  status: string;
  requestedAt: string | null;
  documentUrl: string | null;
  storagePath: string | null;
}

const formatStatus = (status: string) =>
  status
    ? status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Unknown";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const getStatusVariant = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "received":
      return "default";
    case "pending":
      return "secondary";
    default:
      return "outline";
  }
};

const statusOptions: { label: string; value: DocumentStatusFilter }[] = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Received", value: "received" },
];

const DocumentRequestsPage = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [documentRequests, setDocumentRequests] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchRequests = useCallback(
    async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
      if (!profile?.tenant_id) return;

      if (showLoader) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("document_requests")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rawRequests: RawDocumentRequest[] = Array.isArray(data) ? data : [];
        const studentIds = Array.from(
          new Set(
            rawRequests
              .map((request) => request.student_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        interface StudentNameInfo {
          id: string;
          legal_name: string | null;
          preferred_name: string | null;
          profile: { full_name: string } | null;
        }
        let studentsMap = new Map<string, StudentNameInfo>();

        if (studentIds.length > 0) {
          const { data: studentsData, error: studentError } = await supabase
            .from("students")
            .select("id, legal_name, preferred_name, profile:profiles(full_name)")
            .in("id", studentIds);

          if (studentError) throw studentError;

          if (Array.isArray(studentsData)) {
            studentsMap = new Map(
              studentsData.map((student) => [student.id, student as StudentNameInfo]),
            );
          }
        }

        const mappedRequests: DocumentRequestItem[] = rawRequests.map((request) => {
          const student = request.student_id
            ? studentsMap.get(request.student_id)
            : null;
          const studentName =
            student?.preferred_name ||
            student?.legal_name ||
            student?.profile?.full_name ||
            "Unknown student";
          const requestedAt = request.requested_at || request.created_at || null;

          const storagePath =
            request.storage_path || null;

          let documentUrl =
            request.document_url ||
            request.uploaded_file_url ||
            request.file_url ||
            null;

          if (!documentUrl && storagePath) {
            const { data: publicUrlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(storagePath);
            documentUrl = publicUrlData?.publicUrl ?? null;
          }

          return {
            id: request.id,
            studentId: request.student_id ?? null,
            studentName,
            requestType: request.request_type || "Document",
            status: (request.status || "pending").toLowerCase(),
            requestedAt,
            documentUrl,
            storagePath,
          };
        });

        setDocumentRequests(mappedRequests);
      } catch (error) {
        logError(error, "DocumentRequests.fetchRequests");
        toast(formatErrorForToast(error, "Failed to load document requests"));
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [profile?.tenant_id, toast],
  );

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return documentRequests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" ||
        request.status.toLowerCase() === statusFilter;

      if (!matchesStatus) return false;

      if (!term) return true;

      return (
        request.studentName.toLowerCase().includes(term) ||
        request.requestType.toLowerCase().includes(term)
      );
    });
  }, [documentRequests, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRequests({ showLoader: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileUpload = async (requestId: string, file: File) => {
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

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl ?? null;

      const updates: DocumentRequestUpdate = {
        status: "received",
      };

      if (publicUrl) {
        updates.document_url = publicUrl;
        updates.storage_path = storagePath;
      }

      const { error: updateError } = await supabase
        .from("document_requests")
        .update(updates)
        .eq("id", requestId);

      if (updateError) {
        if (updates.document_url || updates.storage_path) {
          const { error: fallbackError } = await supabase
            .from("document_requests")
            .update({ status: "received" })
            .eq("id", requestId);

          if (fallbackError) throw fallbackError;
        } else {
          throw updateError;
        }
      }

      toast({
        title: "Document uploaded",
        description: "The requested document has been received.",
      });

      await fetchRequests({ showLoader: false });
    } catch (error) {
      logError(error, "DocumentRequests.handleFileUpload");
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

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <LoadingState message="Loading document requests..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <EmptyState
            title="No profile found"
            description="We could not load your profile information. Please sign in again."
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Requests</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Track and fulfil outstanding document requests from partner institutions.
            Upload the required files directly to mark requests as received.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl">Requests Queue</CardTitle>
              <CardDescription>
                Review pending document requests and upload files as they are received.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Input
                placeholder="Search by student or request type..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="sm:w-64"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as DocumentStatusFilter)}
              >
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
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
                disabled={loading || isRefreshing}
                className="sm:w-auto"
              >
                {isRefreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12">
                <LoadingState message="Loading document requests..." />
              </div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                title="No document requests"
                description="You’re all caught up! New requests will appear here as they are assigned to you."
              />
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Date Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.studentName}</TableCell>
                        <TableCell>{formatStatus(request.requestType)}</TableCell>
                        <TableCell>{formatDate(request.requestedAt)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(request.status)}>
                            {formatStatus(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {request.documentUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={request.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                              </Button>
                            )}
                            <Input
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
                              className="gap-2"
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
    </DashboardLayout>
  );
};

export default DocumentRequestsPage;
