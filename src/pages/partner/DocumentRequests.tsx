import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { PartnerHeader } from "@/components/partner/PartnerHeader";
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
import { Progress } from "@/components/ui/progress";
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

type DocumentStatusFilter = "all" | "pending" | "received" | "overdue";

type DocumentRequestRow =
  Database["public"]["Tables"]["document_requests"]["Row"];
type DocumentRequestUpdate =
  Database["public"]["Tables"]["document_requests"]["Update"];
type StudentRow = Database["public"]["Tables"]["students"]["Row"];
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

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "received":
      return "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100";
    case "pending":
      return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-100";
    case "overdue":
      return "border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200";
    default:
      return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-200";
  }
};

const statusOptions: { label: string; value: DocumentStatusFilter }[] = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Received", value: "received" },
  { label: "Overdue", value: "overdue" },
];

export default function PartnerDocumentRequestsPage() {
  const { profile, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();

  const [documentRequests, setDocumentRequests] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateUploadProgress = (requestId: string, value: number) => {
    setUploadProgress((prev) => ({
      ...prev,
      [requestId]: Math.min(100, Math.max(0, Math.round(value))),
    }));
  };

  const clearUploadProgress = (requestId: string) => {
    setUploadProgress((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
  };

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

        type StudentNameInfo = Pick<StudentRow, "id" | "legal_name" | "preferred_name">;
        let studentsMap = new Map<string, StudentNameInfo>();

        if (studentIds.length > 0) {
          const { data: studentsData, error: studentError } = await supabase
            .from("students")
            .select("id, legal_name, preferred_name")
            .in("id", studentIds);

          if (studentError) throw studentError;

          if (Array.isArray(studentsData)) {
            studentsMap = new Map(studentsData.map((student) => [student.id, student]));
          }
        }

        const mappedRequests: DocumentRequestItem[] = rawRequests.map((request) => {
          const student = request.student_id ? studentsMap.get(request.student_id) : null;
          const studentName =
            student?.preferred_name || student?.legal_name || "Unknown student";
          const requestedAt = request.requested_at || request.created_at || null;

          // @ts-expect-error - file_path property doesn't exist in type
          const storagePath = request.storage_path || request.file_path || null;

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

          const rawStatus = (request.status || "pending").toLowerCase();
          const normalizedStatus =
            rawStatus === "overdue"
              ? "overdue"
              : rawStatus === "received"
                ? "received"
                : rawStatus === "pending"
                  ? "pending"
                  : rawStatus;

          return {
            id: request.id,
            studentId: request.student_id ?? null,
            studentName,
            requestType: request.request_type || "Document",
            status: normalizedStatus,
            requestedAt,
            documentUrl,
            storagePath,
          };
        });

        setDocumentRequests(mappedRequests);
      } catch (error) {
        logError(error, "PartnerDocumentRequests.fetchRequests");
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
        statusFilter === "all" || request.status.toLowerCase() === statusFilter;

      if (!matchesStatus) return false;

      if (!term) return true;

      return request.studentName.toLowerCase().includes(term);
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
    updateUploadProgress(requestId, 5);

    try {
      const sanitizedName = file.name.replace(/\s+/g, "-");
      const timestamp = Date.now();
      const storagePath = `document-requests/${requestId}/${timestamp}-${sanitizedName}`;

      updateUploadProgress(requestId, 25);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;
      updateUploadProgress(requestId, 65);

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

      updateUploadProgress(requestId, 100);

      toast({
        title: "Document uploaded",
        description: "The requested document has been received.",
      });

      await fetchRequests({ showLoader: false });

      setTimeout(() => {
        clearUploadProgress(requestId);
      }, 1500);
    } catch (error) {
      logError(error, "PartnerDocumentRequests.handleFileUpload");
      toast(formatErrorForToast(error, "Failed to upload document"));
      clearUploadProgress(requestId);
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

  const renderContent = () => {
    // Include profileLoading to prevent "No partner profile found" flash during auth
    if (authLoading || profileLoading) {
      return (
        <Card className="border border-slate-200 bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/60">
          <CardContent className="py-16">
            <LoadingState message="Loading document requests..." />
          </CardContent>
        </Card>
      );
    }

    if (!profile) {
      return (
        <Card className="border border-slate-200 bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/60">
          <CardContent className="py-16">
            <EmptyState
              title="No partner profile found"
              description="We could not load your partner profile information. Please sign in again."
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border border-slate-200 bg-white/80 text-slate-900 shadow-lg shadow-slate-200/40 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-slate-950/30">
        <CardHeader className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Active Document Requests
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Review outstanding document requests from university partners and upload files as students submit them.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Input
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 sm:w-60"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as DocumentStatusFilter)}
            >
              <SelectTrigger className="w-full border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
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
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-900/80"
            >
              {isRefreshing ? (
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
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="No document requests found"
              description="New document requests from universities will appear here as students are assigned to you."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40 dark:border-slate-800/60 dark:bg-slate-950/40">
              <Table>
                <TableHeader className="bg-slate-100/70 dark:bg-slate-950/70">
                  <TableRow className="border-slate-200 dark:border-slate-800/60">
                    <TableHead className="text-slate-600 dark:text-slate-300">Student</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Document Type</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Requested</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRequests.map((request) => {
                      const progress = uploadProgress[request.id];

                      return (
                        <TableRow
                          key={request.id}
                          className="border-slate-200/60 bg-white/40 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-950/30 dark:hover:bg-slate-900/60"
                        >
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {request.studentName}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {formatStatus(request.requestType)}
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">
                            {formatDate(request.requestedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClasses(request.status)}>
                              {formatStatus(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:gap-3">
                              {progress !== undefined && (
                                <div className="w-full min-w-[160px] sm:w-40">
                                  <Progress value={progress} className="h-2 bg-slate-200 dark:bg-slate-800" />
                                  <div className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                                    {progress === 100 ? "Upload complete" : `Uploading… ${progress}%`}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-end gap-2">
                                {request.documentUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
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
                                  className="gap-2 border-slate-300 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900/80"
                                >
                                  {uploadingId === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UploadCloud className="h-4 w-4" />
                                  )}
                                  {uploadingId === request.id ? "Uploading..." : "Upload"}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <PartnerSidebar />
        <SidebarInset className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <PartnerHeader />
          <main className="flex-1 space-y-8 px-4 pb-12 pt-6 md:px-8 lg:px-12">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                Student Document Requests
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Monitor outstanding document requests from universities, upload student submissions, and track their status in real time.
              </p>
            </div>
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
