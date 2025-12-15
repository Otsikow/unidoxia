import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  User,
  Globe,
  CreditCard,
  AlertCircle,
  Send,
  FileUp,
  ExternalLink,
  RefreshCw,
  Eye,
  Flag,
  IdCard,
  Home,
  BookOpen,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  APPLICATION_STATUS_OPTIONS,
  getApplicationStatusLabel,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/applicationStatus";

/* ======================================================
   Type Definitions (exported for useExtendedApplication)
====================================================== */

export interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  actor?: string;
  details?: string;
}

export interface EducationRecord {
  id: string;
  level: string;
  institutionName: string;
  country: string;
  startDate: string;
  endDate: string;
  gpa: string;
  gradeScale: string;
  transcriptUrl?: string | null;
  certificateUrl?: string | null;
}

export interface TestScore {
  testType: string;
  totalScore: number;
  testDate: string;
  subscores?: Record<string, number>;
  reportUrl?: string | null;
}

export interface StudentAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface StudentDetails {
  id: string;
  profileId: string | null;
  legalName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  currentCountry: string | null;
  address: StudentAddress | null;
  guardian?: { name?: string; email?: string; phone?: string } | null;
  finances?: { currency?: string; amount?: number; source?: string } | null;
  visaHistory?: { country?: string; type?: string; status?: string }[] | null;
  avatarUrl: string | null;
  educationHistory: EducationRecord[] | null;
  testScores: TestScore[] | null;
}

export interface ApplicationDocument {
  id: string;
  documentType: string | null;
  storagePath: string | null;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  verified: boolean;
  verificationNotes: string | null;
  uploadedAt: string;
  publicUrl: string | null;
  signedUrl?: string | null;
}

export interface ExtendedApplication {
  id: string;
  appNumber: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  updatedAt: string | null;
  programId: string;
  programName: string;
  programLevel: string;
  programDiscipline: string | null;
  intakeMonth: number;
  intakeYear: number;
  studentId: string | null;
  studentName: string;
  studentNationality: string | null;
  agentId: string | null;
  notes: string | null;
  internalNotes: string | null;
  timelineJson: TimelineEvent[] | null;
  student: StudentDetails | null;
  documents: ApplicationDocument[];
}

export interface ApplicationReviewDialogProps {
  application: ExtendedApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  onStatusUpdate?: (applicationId: string, newStatus: string) => void;
  onNotesUpdate?: (applicationId: string, notes: string) => void;
  universityId?: string;
  tenantId?: string;
}

/* ======================================================
   Constants
====================================================== */

const STORAGE_BUCKET = "student-documents";
const APPLICATION_DOCUMENTS_BUCKET = "application-documents";

const REQUIRED_DOCUMENT_TYPES = [
  "transcript",
  "passport",
  "ielts",
  "sop",
  "recommendation",
  "cv",
];

/* ======================================================
   RPC detection helper
====================================================== */

const isUpdateApplicationReviewRpcMissing = (error: unknown) => {
  const e = error as { code?: string; message?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  return (
    e?.code === "PGRST202" ||
    e?.code === "PGRST204" ||
    e?.code === "42P01" ||
    e?.code === "42703" ||
    msg.includes("could not find the function") ||
    msg.includes("schema cache")
  );
};

/* ======================================================
   Error helpers
====================================================== */

type RpcErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

const firstRow = <T,>(data: T | T[] | null | undefined): T | null => {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
};

const formatSupabaseError = (error: RpcErrorLike) =>
  [
    error.message?.trim(),
    error.details?.trim(),
    error.hint?.trim(),
    error.code ? `(code: ${error.code})` : null,
  ]
    .filter(Boolean)
    .join(" ");

const explainUpdateError = (
  error: RpcErrorLike,
  context: { applicationId: string },
) => {
  const msg = error.message ?? "";
  const code = error.code ?? "";

  if (msg.includes("Could not find the function")) {
    return {
      title: "Backend misconfigured",
      description:
        `RPC public.update_application_review is missing or not executable. ` +
        `Deploy migrations and reload PostgREST schema. ` +
        `Application ID: ${context.applicationId}. ` +
        `Raw: ${formatSupabaseError(error)}`,
    };
  }

  if (code === "42501" || msg.toLowerCase().includes("permission")) {
    return {
      title: "Permission denied",
      description:
        `RLS or role permissions blocked this update. ` +
        `Application ID: ${context.applicationId}. ` +
        `Raw: ${formatSupabaseError(error)}`,
    };
  }

  if (code === "22P02" || msg.toLowerCase().includes("enum")) {
    return {
      title: "Invalid status",
      description:
        `Status value not accepted by database enum. ` +
        `Application ID: ${context.applicationId}. ` +
        `Raw: ${formatSupabaseError(error)}`,
    };
  }

  return {
    title: "Update failed",
    description: `Application ID: ${context.applicationId}. Raw: ${formatSupabaseError(error)}`,
  };
};

/* ======================================================
   Formatting helpers
====================================================== */

const formatDate = (v: string | null | undefined, includeTime = false) => {
  if (!v) return "—";
  const date = new Date(v);
  if (isNaN(date.getTime())) return "—";
  if (includeTime) {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
};

const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let s = bytes;
  while (s >= 1024 && i < u.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
};

const formatDocumentType = (type: string | null) => {
  if (!type) return "Document";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

/* ======================================================
   Signed URL helper
====================================================== */

const getSignedUrl = async (storagePath: string | null): Promise<string | null> => {
  if (!storagePath) return null;

  // Try application-documents bucket first
  const { data: appData, error: appError } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (!appError && appData?.signedUrl) {
    return appData.signedUrl;
  }

  // Fallback to student-documents bucket
  const { data: studentData, error: studentError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (!studentError && studentData?.signedUrl) {
    return studentData.signedUrl;
  }

  // Last resort: try public URL
  const { data: publicData } = supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);

  return publicData?.publicUrl ?? null;
};

/* ======================================================
   Component
====================================================== */

export function ApplicationReviewDialog({
  application,
  open,
  onOpenChange,
  isLoading = false,
  onStatusUpdate,
  onNotesUpdate,
  universityId,
  tenantId,
}: ApplicationReviewDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"overview" | "student" | "documents" | "notes" | "messages">("overview");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Document request state
  const [requestingDocument, setRequestingDocument] = useState(false);
  const [documentRequestType, setDocumentRequestType] = useState("");
  const [documentRequestNote, setDocumentRequestNote] = useState("");

  // Messaging state
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Document signed URLs
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Reset state when application changes
  useEffect(() => {
    if (!application) return;
    setInternalNotes(application.internalNotes ?? "");
    setSelectedStatus(
      isApplicationStatus(application.status) ? application.status : null
    );
    setActiveTab("overview");
    setDocumentUrls({});
  }, [application]);

  // Load signed URLs for documents
  useEffect(() => {
    if (!application?.documents?.length || !open) return;

    const loadSignedUrls = async () => {
      setLoadingUrls(true);
      const urls: Record<string, string> = {};

      for (const doc of application.documents) {
        if (doc.storagePath) {
          const signedUrl = await getSignedUrl(doc.storagePath);
          if (signedUrl) {
            urls[doc.id] = signedUrl;
          }
        } else if (doc.publicUrl) {
          urls[doc.id] = doc.publicUrl;
        }
      }

      setDocumentUrls(urls);
      setLoadingUrls(false);
    };

    void loadSignedUrls();
  }, [application?.documents, open]);

  const statusLabel = useMemo(
    () =>
      selectedStatus
        ? getApplicationStatusLabel(selectedStatus)
        : "Select status",
    [selectedStatus]
  );

  /* ===========================
     Save Notes
  ============================ */

  const saveNotes = useCallback(async () => {
    if (!application?.id) return;

    setSavingNotes(true);
    console.log("[ApplicationReview] Saving notes for application:", application.id);

    let { error } = await supabase.rpc("update_application_review" as any, {
      p_application_id: application.id,
      p_new_status: null,
      p_internal_notes: internalNotes,
      p_append_timeline_event: null,
    });

    if (error && isUpdateApplicationReviewRpcMissing(error)) {
      console.log("[ApplicationReview] RPC missing, falling back to direct update");
      // Preflight: if we can't even see the row, RLS will also block the update.
      const preflight = await supabase
        .from("applications")
        .select("id")
        .eq("id", application.id)
        .limit(1);

      if (preflight.error) {
        error = preflight.error;
      } else if (!preflight.data || preflight.data.length === 0) {
        error = {
          code: "42501",
          message:
            "Update blocked. This application may not exist, or you may not have permission to access it.",
        };
      } else {
        const fallback = await supabase
          .from("applications")
          .update({ internal_notes: internalNotes })
          .eq("id", application.id)
          .select("id")
          .limit(1);

        error = fallback.error;
        if (!error && (!fallback.data || fallback.data.length === 0)) {
          error = {
            code: "42501",
            message:
              "Update blocked by row-level security. You don't have permission to update this application.",
          };
        }
      }
    }

    setSavingNotes(false);

    if (error) {
      console.error("[ApplicationReview] Notes update failed:", error);
      const explained = explainUpdateError(error, {
        applicationId: application.id,
      });
      toast({ ...explained, variant: "destructive" });
      return;
    }

    console.log("[ApplicationReview] Notes saved successfully");
    onNotesUpdate?.(application.id, internalNotes);
    toast({ title: "Saved", description: "Internal notes updated" });
  }, [application, internalNotes, onNotesUpdate, toast]);

  /* ===========================
     Confirm Status Change
  ============================ */

  const confirmStatusChange = useCallback(async () => {
    if (!application?.id || !selectedStatus) return;

    setUpdatingStatus(true);
    console.log("[ApplicationReview] Updating status:", { applicationId: application.id, newStatus: selectedStatus });

    const timelineEvent = {
      id: crypto.randomUUID(),
      action: `Status changed to ${getApplicationStatusLabel(selectedStatus)}`,
      timestamp: new Date().toISOString(),
      actor: "University",
    };

    let { data, error } = await supabase.rpc("update_application_review" as any, {
      p_application_id: application.id,
      p_new_status: selectedStatus,
      p_internal_notes: null,
      p_append_timeline_event: timelineEvent,
    });

    if (error && isUpdateApplicationReviewRpcMissing(error)) {
      console.log("[ApplicationReview] RPC missing, falling back to direct update");
      // Preflight: if we can't see the row, RLS will also prevent returning/updating it.
      const preflight = await supabase
        .from("applications")
        .select("id")
        .eq("id", application.id)
        .limit(1);

      if (preflight.error) {
        error = preflight.error;
      } else if (!preflight.data || preflight.data.length === 0) {
        error = {
          code: "42501",
          message:
            "Update blocked. This application may not exist, or you may not have permission to access it.",
        };
      } else {
        const fallback = await supabase
          .from("applications")
          .update({ status: selectedStatus, updated_at: new Date().toISOString() })
          .eq("id", application.id)
          .select("id,status,updated_at")
          .limit(1);

        data = firstRow(fallback.data);
        error = fallback.error;
        if (!error && (!fallback.data || fallback.data.length === 0)) {
          error = {
            code: "42501",
            message:
              "Update blocked by row-level security. You don't have permission to update this application.",
          };
        }
      }
    }

    setUpdatingStatus(false);
    setConfirmStatus(false);

    if (error) {
      console.error("[ApplicationReview] Status update failed:", error);
      const explained = explainUpdateError(error, {
        applicationId: application.id,
      });
      toast({ ...explained, variant: "destructive" });
      return;
    }

    const row = firstRow<any>(data as any);
    const finalStatus = String(row?.status ?? selectedStatus);
    console.log("[ApplicationReview] Status updated successfully:", finalStatus);
    onStatusUpdate?.(application.id, finalStatus);

    toast({
      title: "Status updated",
      description: `Application status changed to ${getApplicationStatusLabel(finalStatus)}`,
    });
  }, [application, selectedStatus, onStatusUpdate, toast]);

  /* ===========================
     Request Document
  ============================ */

  const handleRequestDocument = useCallback(async () => {
    if (!application?.id || !application.student?.id || !documentRequestType) {
      toast({
        title: "Missing information",
        description: "Please select a document type to request.",
        variant: "destructive",
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: "Missing tenant context",
        description: "Unable to verify your university profile.",
        variant: "destructive",
      });
      return;
    }

    setRequestingDocument(true);
    console.log("[ApplicationReview] Requesting document:", { applicationId: application.id, type: documentRequestType });

    const { error } = await supabase.from("document_requests").insert([{
      student_id: application.student.id,
      document_type: documentRequestType,
      status: "pending",
      notes: documentRequestNote || null,
    }] as any);

    setRequestingDocument(false);

    if (error) {
      console.error("[ApplicationReview] Document request failed:", error);
      toast({
        title: "Request failed",
        description: error.message || "Unable to create document request. Please try again.",
        variant: "destructive",
      });
      return;
    }

    console.log("[ApplicationReview] Document request created successfully");
    toast({
      title: "Document requested",
      description: `A request for ${formatDocumentType(documentRequestType)} has been sent to the student.`,
    });

    setDocumentRequestType("");
    setDocumentRequestNote("");
  }, [application, documentRequestType, documentRequestNote, tenantId, toast]);

  /* ===========================
     Send Message
  ============================ */

  const handleSendMessage = useCallback(async () => {
    if (!application?.id || !application.student?.profileId || !messageContent.trim()) {
      toast({
        title: "Cannot send message",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    console.log("[ApplicationReview] Sending message to student:", application.student.profileId);

    try {
      // Get or create conversation with student
      const { data: conversationId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_id: null, // Current user
          p_other_user_id: application.student.profileId,
          p_tenant_id: tenantId,
        }
      );

      if (convError) {
        throw convError;
      }

      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }

      // Send the message
      const { data: userData } = await supabase.auth.getUser();
      const { error: msgError } = await supabase.from("conversation_messages").insert([{
        conversation_id: conversationId,
        sender_id: userData?.user?.id,
        content: messageContent.trim(),
        message_type: "text",
        metadata: {
          application_id: application.id,
          context: "application_review",
        },
      }] as any);

      if (msgError) {
        throw msgError;
      }

      console.log("[ApplicationReview] Message sent successfully");
      toast({
        title: "Message sent",
        description: "Your message has been sent to the student.",
      });

      setMessageContent("");
    } catch (error) {
      console.error("[ApplicationReview] Message send failed:", error);
      toast({
        title: "Message failed",
        description: (error as Error)?.message || "Unable to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  }, [application, messageContent, tenantId, toast]);

  /* ===========================
     Computed values
  ============================ */

  const displayStatus = selectedStatus ?? application?.status ?? "unknown";

  const missingDocuments = useMemo(() => {
    if (!application?.documents) return REQUIRED_DOCUMENT_TYPES;
    const uploadedTypes = new Set(
      application.documents.map((d) => d.documentType?.toLowerCase())
    );
    return REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !uploadedTypes.has(type.toLowerCase())
    );
  }, [application?.documents]);

  const timeline = useMemo(() => {
    if (!application?.timelineJson?.length) return [];
    return [...application.timelineJson].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [application?.timelineJson]);

  /* ======================================================
     RENDER
  ======================================================= */

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          {/* Header */}
          <DialogHeader className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl truncate">
                  {application?.programName ?? "Application Details"}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <span className="truncate max-w-[150px] sm:max-w-none">{application?.studentName ?? "Unknown Student"}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">
                    {application?.appNumber ?? "—"}
                  </span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={displayStatus} />
              </div>
            </div>
          </DialogHeader>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <LoadingState message="Loading application details..." />
            </div>
          ) : !application ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Application not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Unable to load application details. Please try again.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-shrink-0 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 gap-1">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3">Overview</TabsTrigger>
                    <TabsTrigger value="student" className="text-xs sm:text-sm px-2 sm:px-3">Student</TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                      Docs
                      {missingDocuments.length > 0 && (
                        <Badge variant="destructive" className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 p-0 text-[10px] sm:text-xs">
                          {missingDocuments.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs sm:text-sm px-2 sm:px-3">Notes</TabsTrigger>
                    <TabsTrigger value="messages" className="text-xs sm:text-sm px-2 sm:px-3">
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Message</span>
                      <span className="sm:hidden">Msg</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 mt-4">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="m-0 space-y-6">
                    {/* Status Update Card */}
                    <Card>
                      <CardHeader className="pb-3 px-3 sm:px-6">
                        <CardTitle className="text-sm sm:text-base">Update Status</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Change the application status to progress the review
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="status-select" className="text-xs sm:text-sm">New Status</Label>
                            <Select
                              value={selectedStatus ?? ""}
                              onValueChange={(v) =>
                                setSelectedStatus(v as ApplicationStatus)
                              }
                            >
                              <SelectTrigger id="status-select" className="h-9 sm:h-10 text-sm">
                                <SelectValue placeholder="Select new status" />
                              </SelectTrigger>
                              <SelectContent>
                                {APPLICATION_STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => setConfirmStatus(true)}
                            disabled={
                              !selectedStatus ||
                              selectedStatus === application.status ||
                              updatingStatus
                            }
                            className="w-full sm:w-auto h-9 sm:h-10 text-sm"
                          >
                            {updatingStatus && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Update Status
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Current status:{" "}
                          <span className="font-medium">
                            {getApplicationStatusLabel(application.status)}
                          </span>
                        </p>
                      </CardContent>
                    </Card>

                    {/* Application Details */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Program
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-6">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Course</span>
                            <span className="font-medium text-right truncate max-w-[60%]">{application.programName}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Level</span>
                            <span className="text-right">{application.programLevel}</span>
                          </div>
                          {application.programDiscipline && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground flex-shrink-0">Discipline</span>
                              <span className="text-right truncate max-w-[60%]">{application.programDiscipline}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Intake</span>
                            <span className="text-right">
                              {new Date(
                                application.intakeYear,
                                application.intakeMonth - 1
                              ).toLocaleDateString(undefined, {
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-6">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Created</span>
                            <span className="text-right">{formatDate(application.createdAt)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Submitted</span>
                            <span className="text-right">{formatDate(application.submittedAt)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground flex-shrink-0">Updated</span>
                            <span className="text-right">{formatDate(application.updatedAt, true)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Timeline Events */}
                    {timeline.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Activity Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6">
                          <div className="space-y-3 sm:space-y-4">
                            {timeline.map((event, idx) => (
                              <div key={event.id} className="flex gap-2 sm:gap-3">
                                <div className="relative flex flex-col items-center">
                                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                  {idx !== timeline.length - 1 && (
                                    <div className="w-px flex-1 bg-border mt-1" />
                                  )}
                                </div>
                                <div className="flex-1 pb-3 sm:pb-4 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium break-words">{event.action}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    {formatDate(event.timestamp, true)}
                                    {event.actor && ` • ${event.actor}`}
                                  </p>
                                  {event.details && (
                                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words">
                                      {event.details}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Student Tab */}
                  <TabsContent value="student" className="m-0 space-y-6">
                    {!application.student ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            Student details not available
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            The student profile could not be loaded. This may be due to
                            missing data or access restrictions.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Personal Information */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Personal Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Full Name
                                </Label>
                                <p className="text-sm font-medium">
                                  {application.student.legalName}
                                </p>
                              </div>
                              {application.student.preferredName && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Preferred Name
                                  </Label>
                                  <p className="text-sm">
                                    {application.student.preferredName}
                                  </p>
                                </div>
                              )}
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Date of Birth
                                </Label>
                                <p className="text-sm">
                                  {formatDate(application.student.dateOfBirth)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Nationality
                                </Label>
                                <p className="text-sm flex items-center gap-1">
                                  <Flag className="h-3 w-3" />
                                  {application.student.nationality ?? "—"}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Email
                                </Label>
                                <p className="text-sm flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {application.student.email ?? "—"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Phone
                                </Label>
                                <p className="text-sm flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {application.student.phone ?? "—"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Current Country
                                </Label>
                                <p className="text-sm flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {application.student.currentCountry ?? "—"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Passport Information */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <IdCard className="h-4 w-4" />
                              Passport Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Passport Number
                              </Label>
                              <p className="text-sm font-mono">
                                {application.student.passportNumber ?? "Not provided"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Expiry Date
                              </Label>
                              <p className="text-sm">
                                {formatDate(application.student.passportExpiry)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Address */}
                        {application.student.address && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                Address
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">
                                {[
                                  application.student.address.line1,
                                  application.student.address.line2,
                                  application.student.address.city,
                                  application.student.address.state,
                                  application.student.address.postalCode,
                                  application.student.address.country,
                                ]
                                  .filter(Boolean)
                                  .join(", ") || "—"}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Education History */}
                        {application.student.educationHistory &&
                          application.student.educationHistory.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  Education History
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {application.student.educationHistory.map((edu) => (
                                  <div
                                    key={edu.id}
                                    className="border rounded-lg p-3 space-y-2"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {edu.institutionName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {edu.level} • {edu.country}
                                        </p>
                                      </div>
                                      <Badge variant="outline">{edu.level}</Badge>
                                    </div>
                                    <div className="flex gap-4 text-xs text-muted-foreground">
                                      <span>
                                        {formatDate(edu.startDate)} –{" "}
                                        {formatDate(edu.endDate)}
                                      </span>
                                      {edu.gpa && (
                                        <span>
                                          GPA: {edu.gpa}/{edu.gradeScale}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}

                        {/* Test Scores */}
                        {application.student.testScores &&
                          application.student.testScores.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Award className="h-4 w-4" />
                                  Test Scores
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {application.student.testScores.map((test, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between border rounded-lg p-3"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">
                                        {test.testType.toUpperCase()}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(test.testDate)}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-lg">
                                      {test.totalScore}
                                    </Badge>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}
                      </>
                    )}
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="m-0 space-y-6">
                    {/* Uploaded Documents */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Submitted Documents
                            </CardTitle>
                            <CardDescription>
                              {application.documents.length} document(s) uploaded
                            </CardDescription>
                          </div>
                          {loadingUrls && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {application.documents.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No documents uploaded yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {application.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between border rounded-lg p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {formatDocumentType(doc.documentType)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.fileName} • {formatFileSize(doc.fileSize)} •{" "}
                                      {formatDate(doc.uploadedAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {doc.verified ? (
                                    <Badge variant="outline" className="border-success text-success">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Pending Review</Badge>
                                  )}
                                  {documentUrls[doc.id] ? (
                                    <Button variant="ghost" size="sm" asChild>
                                      <a
                                        href={documentUrls[doc.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </a>
                                    </Button>
                                  ) : doc.publicUrl ? (
                                    <Button variant="ghost" size="sm" asChild>
                                      <a
                                        href={doc.publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </a>
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" disabled>
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Unavailable
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Missing Documents */}
                    {missingDocuments.length > 0 && (
                      <Card className="border-warning/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2 text-warning">
                            <AlertCircle className="h-4 w-4" />
                            Missing Documents
                          </CardTitle>
                          <CardDescription>
                            The following required documents have not been uploaded
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {missingDocuments.map((type) => (
                              <Badge key={type} variant="outline" className="border-warning/50">
                                {formatDocumentType(type)}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Request Document */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileUp className="h-4 w-4" />
                          Request Document
                        </CardTitle>
                        <CardDescription>
                          Send a document request to the student
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="doc-type">Document Type</Label>
                          <Select
                            value={documentRequestType}
                            onValueChange={setDocumentRequestType}
                          >
                            <SelectTrigger id="doc-type">
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                              {REQUIRED_DOCUMENT_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {formatDocumentType(type)}
                                </SelectItem>
                              ))}
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doc-note">Note (optional)</Label>
                          <Textarea
                            id="doc-note"
                            placeholder="Add any specific instructions..."
                            value={documentRequestNote}
                            onChange={(e) => setDocumentRequestNote(e.target.value)}
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={handleRequestDocument}
                          disabled={!documentRequestType || requestingDocument}
                          className="w-full"
                        >
                          {requestingDocument && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Send Request
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="m-0 space-y-4 sm:space-y-6">
                    <Card>
                      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                        <CardTitle className="text-sm sm:text-base">Internal Notes</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Private notes visible only to university staff
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                        <Textarea
                          placeholder="Add internal notes about this application..."
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                          rows={5}
                          className="resize-none text-sm min-h-[120px] sm:min-h-[150px]"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                          <p className="text-[10px] sm:text-xs text-muted-foreground order-2 sm:order-1">
                            Last saved: {formatDate(application.updatedAt, true)}
                          </p>
                          <Button
                            onClick={saveNotes}
                            disabled={
                              savingNotes ||
                              internalNotes === (application.internalNotes ?? "")
                            }
                            className="w-full sm:w-auto h-9 sm:h-10 text-sm order-1 sm:order-2"
                          >
                            {savingNotes && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Save Notes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Student Notes (read-only) */}
                    {application.notes && (
                      <Card>
                        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                          <CardTitle className="text-sm sm:text-base">Student Notes</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Notes submitted by the student with their application
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6">
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                            {application.notes}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Messages Tab */}
                  <TabsContent value="messages" className="m-0 space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Message Student
                        </CardTitle>
                        <CardDescription>
                          Send a message to {application.student?.legalName ?? "the student"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!application.student?.profileId ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Unable to send messages</p>
                            <p className="text-xs mt-1">
                              Student profile is not available for messaging
                            </p>
                          </div>
                        ) : (
                          <>
                            <Textarea
                              placeholder="Type your message..."
                              value={messageContent}
                              onChange={(e) => setMessageContent(e.target.value)}
                              rows={4}
                              className="resize-none"
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                Messages are sent to the student's inbox
                              </p>
                              <Button
                                onClick={handleSendMessage}
                                disabled={!messageContent.trim() || sendingMessage}
                              >
                                {sendingMessage ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Send Message
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/university/messages")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Full Messages
                    </Button>
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Footer */}
              <DialogFooter className="flex-shrink-0 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-9 sm:h-10">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={confirmStatus} onOpenChange={setConfirmStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the application status from{" "}
              <span className="font-medium">
                {getApplicationStatusLabel(application?.status ?? "")}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {selectedStatus ? getApplicationStatusLabel(selectedStatus) : ""}
              </span>
              ?
              <br />
              <br />
              This action will be recorded in the application timeline and may
              trigger notifications to the student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={updatingStatus}
            >
              {updatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ApplicationReviewDialog;
