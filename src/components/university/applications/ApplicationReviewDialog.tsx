import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  Upload,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// ScrollArea removed - using native overflow-y-auto for single scroll container
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
import type { Database } from "@/integrations/supabase/types";
import {
  APPLICATION_STATUS_OPTIONS,
  getApplicationStatusLabel,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/applicationStatus";
import { useAuth } from "@/hooks/useAuth";
import { logDocumentAuditEvent } from "@/lib/auditLogger";
import {
  buildMissingRpcError,
  isRpcMissingError,
  isRpcUnavailable,
  markRpcMissing,
} from "@/lib/supabaseRpc";

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
  reviewStatus: "pending" | "verified" | "rejected" | "ready_for_university_review";
  verificationNotes: string | null;
  uploadedAt: string;
  publicUrl: string | null;
  signedUrl?: string | null;
  source: "student_documents" | "application_documents";
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

const isUpdateApplicationReviewRpcMissing = (error: unknown) =>
  isRpcMissingError(error as { code?: string | null; message?: string | null });

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
  const details = error.details ?? "";
  const hint = error.hint ?? "";

  // Log detailed error for debugging
  console.error("[ApplicationReview] Update error details:", { code, msg, details, hint, applicationId: context.applicationId });

  if (msg.includes("Could not find the function")) {
    return {
      title: "Backend misconfigured",
      description:
        `The update function is missing. Please contact support or refresh the page. ` +
        `Application ID: ${context.applicationId}.`,
    };
  }

  if (code === "42501" || msg.toLowerCase().includes("permission")) {
    // Check for specific permission issues from the RPC error messages
    if (msg.includes("tenant_id is NULL") || msg.includes("not linked to university")) {
      return {
        title: "Account not linked to university",
        description:
          `Your account is not properly linked to a university (tenant_id is missing). ` +
          `Please contact support to verify your account configuration.`,
      };
    }
    if (msg.includes("not associated with a university") || msg.includes("tenant not found")) {
      return {
        title: "Account not linked to university",
        description:
          `Your account is not properly linked to a university. ` +
          `Please contact support to verify your account configuration.`,
      };
    }
    if (msg.includes("different university") || msg.includes("app tenant")) {
      return {
        title: "Permission denied",
        description:
          `This application belongs to a different university. ` +
          `You can only update applications to your own university's programs.`,
      };
    }
    if (msg.includes("app tenant is NULL") || msg.includes("not properly configured")) {
      return {
        title: "Application configuration issue",
        description:
          `This application's program or university is not properly configured. ` +
          `Please contact support to resolve this issue.`,
      };
    }
    if (msg.includes("role")) {
      return {
        title: "Role permission denied",
        description:
          `Your account role does not have permission to update applications. ` +
          `Only university partners and staff can update internal notes.`,
      };
    }
    // If the message contains useful details, show them
    if (msg.length > 20 && !msg.includes("permission denied")) {
      return {
        title: "Permission denied",
        description: msg,
      };
    }
    return {
      title: "Permission denied",
      description:
        `You don't have permission to update this application. ` +
        `This may be due to account configuration. Please try refreshing the page or contact support. ` +
        `(Error: ${code})`,
    };
  }

  if (code === "22P02" || msg.toLowerCase().includes("enum")) {
    return {
      title: "Invalid status",
      description:
        `The selected status is not valid. Please select a different status.`,
    };
  }

  if (code === "P0002" || msg.toLowerCase().includes("not found")) {
    return {
      title: "Application not found",
      description:
        `This application may have been deleted or moved. Please refresh the page and try again.`,
    };
  }

  // If there's a message, show it
  if (msg.length > 10) {
    return {
      title: "Update failed",
      description: msg,
    };
  }

  return {
    title: "Update failed",
    description: `An unexpected error occurred. Please try again or contact support. (Error: ${code || 'unknown'})`,
  };
};

const rpcMissingResult = (rpcName: string) => ({
  data: null,
  error: buildMissingRpcError(rpcName),
});

const callRpcWithCache = async <T,>(
  rpcName: string,
  params: Record<string, unknown>,
) => {
  if (isRpcUnavailable(rpcName)) return rpcMissingResult(rpcName);

  const result = await supabase.rpc(rpcName as any, params);
  if (isUpdateApplicationReviewRpcMissing(result.error)) {
    markRpcMissing(rpcName, result.error);
  }

  return result as { data: T | null; error: RpcErrorLike | null };
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
   Signed URL helper via Edge Function
====================================================== */

const normalizeStoragePath = (storagePath: string): string => {
  // Some older rows may store a path like "student-documents/<path>".
  // Supabase storage expects the object path WITHOUT the bucket prefix.
  return storagePath.replace(/^student-documents\//, "");
};

const getSignedUrlViaEdge = async (
  documentId: string,
  storagePath: string | null
): Promise<string | null> => {
  if (!storagePath) return null;

  const objectPath = normalizeStoragePath(storagePath);

  try {
    // Use edge function to generate signed URL (bypasses RLS issues)
    const { data, error } = await supabase.functions.invoke("get-document-url", {
      body: { documentId, storagePath: objectPath },
    });

    if (!error && data?.signedUrl) {
      console.log("[ApplicationReview] Got signed URL via edge function");
      return data.signedUrl;
    }

    console.error("[ApplicationReview] Edge function error:", error || data?.error);

    // Fallback to direct storage API (may fail due to RLS but worth trying)
    const { data: directData, error: directError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(objectPath, 3600);

    if (!directError && directData?.signedUrl) {
      console.log("[ApplicationReview] Got signed URL via direct storage API");
      return directData.signedUrl;
    }

    console.error("[ApplicationReview] Direct storage error:", directError);
    return null;
  } catch (err) {
    console.error("[ApplicationReview] Failed to get signed URL:", err);
    return null;
  }
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
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "student" | "documents" | "notes" | "messages">("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<Date | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Document request state
  const [requestingDocument, setRequestingDocument] = useState(false);
  const [documentRequestType, setDocumentRequestType] = useState("");
  const [documentRequestNote, setDocumentRequestNote] = useState("");

  // Messaging state
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    isOwn: boolean;
  }>>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Document review state (local overrides so UI updates immediately)
  const [reviewOverrides, setReviewOverrides] = useState<
    Record<
      string,
      {
        status: "pending" | "verified" | "rejected" | "ready_for_university_review";
        notes: string | null;
      }
    >
  >({});
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewStatusDraft, setReviewStatusDraft] = useState<
    "pending" | "verified" | "rejected" | "ready_for_university_review"
  >("pending");
  const [reviewNotesDraft, setReviewNotesDraft] = useState<string>("");
  const [savingReview, setSavingReview] = useState(false);

  // Fullscreen controls
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    setMessages([]);
    setConversationId(null);
    setNotesSavedAt(null);
  }, [application]);

  const readyDocuments = useMemo(
    () =>
      application?.documents?.filter(
        (doc) => doc.reviewStatus === "ready_for_university_review",
      ) ?? [],
    [application?.documents],
  );

  // Load messages when switching to messages tab
  const loadMessages = useCallback(async () => {
    if (!application?.student?.profileId || !tenantId) return;

    setLoadingMessages(true);
    console.log("[ApplicationReview] Loading messages for student:", application.student.profileId);

    try {
      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) return;

      // Get or create conversation to find the conversation ID
      const { data: convId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_id: currentUserId,
          p_other_user_id: application.student.profileId,
          p_tenant_id: tenantId,
        }
      );

      if (convError) {
        console.error("[ApplicationReview] Error getting conversation:", convError);
        setLoadingMessages(false);
        return;
      }

      if (!convId) {
        setLoadingMessages(false);
        return;
      }

      setConversationId(convId);

      // Fetch messages from the conversation
      const { data: messagesData, error: msgError } = await supabase
        .from("conversation_messages")
        .select(`
          id,
          content,
          sender_id,
          created_at,
          sender:profiles!conversation_messages_sender_id_fkey(full_name)
        `)
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (msgError) {
        console.error("[ApplicationReview] Error fetching messages:", msgError);
        setLoadingMessages(false);
        return;
      }

      const formattedMessages = (messagesData ?? []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_id,
        senderName: msg.sender?.full_name ?? "Unknown",
        createdAt: msg.created_at,
        isOwn: msg.sender_id === currentUserId,
      }));

      setMessages(formattedMessages);
      console.log("[ApplicationReview] Loaded messages:", formattedMessages.length);
    } catch (error) {
      console.error("[ApplicationReview] Error loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [application?.student?.profileId, tenantId]);

  // Load messages when switching to messages tab
  useEffect(() => {
    if (activeTab === "messages" && open && application?.student?.profileId) {
      void loadMessages();
    }
  }, [activeTab, open, application?.student?.profileId, loadMessages]);

  // Load signed URLs for documents
  useEffect(() => {
    if (!readyDocuments.length || !open) return;

    const loadSignedUrls = async () => {
      setLoadingUrls(true);
      const urls: Record<string, string> = {};

      for (const doc of readyDocuments) {
        if (doc.storagePath) {
          const signedUrl = await getSignedUrlViaEdge(doc.id, doc.storagePath);
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
  }, [open, readyDocuments]);

  const openReview = (doc: ApplicationDocument) => {
    setReviewingDocId(doc.id);
    setReviewStatusDraft((reviewOverrides[doc.id]?.status ?? doc.reviewStatus) as any);
    setReviewNotesDraft(reviewOverrides[doc.id]?.notes ?? doc.verificationNotes ?? "");
  };

  const saveReview = async () => {
    if (!reviewingDocId) return;

    const doc = application?.documents?.find((d) => d.id === reviewingDocId);
    if (!doc) return;

    if (doc.source !== "student_documents") {
      toast({
        title: "Review not available",
        description: "This document type can't be reviewed yet.",
        variant: "destructive",
      });
      return;
    }

    setSavingReview(true);
    const { error } = await supabase.rpc("partner_review_student_document" as any, {
      p_document_id: reviewingDocId,
      p_status: reviewStatusDraft,
      p_notes: reviewNotesDraft.trim() ? reviewNotesDraft.trim() : null,
    });

    if (error) {
      setSavingReview(false);
      toast({
        title: "Failed to save review",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setReviewOverrides((prev) => ({
      ...prev,
      [reviewingDocId]: { status: reviewStatusDraft, notes: reviewNotesDraft.trim() || null },
    }));

    void logDocumentAuditEvent({
      action: "document_reviewed_by_university",
      tenantId,
      userId: user?.id ?? profile?.id ?? null,
      entityId: doc.id,
      details: {
        applicationId: application?.id ?? null,
        documentType: doc.documentType,
        decision: reviewStatusDraft,
        notes: reviewNotesDraft.trim() || null,
        source: doc.source,
      },
    });

    setSavingReview(false);
    setReviewingDocId(null);
    toast({ title: "Saved", description: "Document review updated." });
  };

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

    let data: any = null;
    let error: any = null;

    // APPROACH 1: Try the text version of the RPC first (handles enum conversion internally)
    const textRpcResult = await callRpcWithCache(
      "update_application_review_text",
      {
        p_application_id: application.id,
        p_new_status: null,
        p_internal_notes: internalNotes,
        p_append_timeline_event: null,
      },
    );

    if (!textRpcResult.error) {
      data = textRpcResult.data;
      error = null;
      console.log("[ApplicationReview] update_application_review_text succeeded for notes");
    } else if (!isUpdateApplicationReviewRpcMissing(textRpcResult.error)) {
      error = textRpcResult.error;
      console.error("[ApplicationReview] update_application_review_text failed:", error);
    }

    // APPROACH 2: Try enum version if text version is missing
    if (!data && (!error || isUpdateApplicationReviewRpcMissing(error))) {
      console.log("[ApplicationReview] Text RPC missing, trying enum version");
      const enumResult = await callRpcWithCache(
        "update_application_review",
        {
          p_application_id: application.id,
          p_new_status: null,
          p_internal_notes: internalNotes,
          p_append_timeline_event: null,
        },
      );
      
      if (!enumResult.error) {
        data = enumResult.data;
        error = null;
      } else if (!isUpdateApplicationReviewRpcMissing(enumResult.error)) {
        error = enumResult.error;
      }
    }

    // APPROACH 3: Fall back to direct update
    if (!data && (!error || isUpdateApplicationReviewRpcMissing(error))) {
      console.log("[ApplicationReview] RPC missing, falling back to direct update for notes");
      
      // Preflight check
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
          .update({ internal_notes: internalNotes, updated_at: new Date().toISOString() })
          .eq("id", application.id)
          .select("id, internal_notes, updated_at")
          .limit(1);

        data = fallback.data;
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
      toast({ 
        ...explained, 
        variant: "destructive",
        duration: 10000, // Show error longer so user can read it
      });
      return;
    }

    // Verify we got data back from the update
    const row = firstRow<any>(data as any);
    if (!row) {
      console.error("[ApplicationReview] Notes update returned no data - update may not have persisted");
      toast({
        title: "Save may not have completed",
        description: "The notes update completed but could not be verified. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const savedAt = new Date();
    setNotesSavedAt(savedAt);
    
    console.log("[ApplicationReview] Notes saved successfully:", {
      applicationId: application.id,
      notesLength: internalNotes.length,
      updatedAt: row.updated_at ?? savedAt.toISOString()
    });
    
    onNotesUpdate?.(application.id, internalNotes);
    toast({ 
      title: "Notes saved", 
      description: `Internal notes updated successfully at ${savedAt.toLocaleTimeString()}`,
    });
  }, [application, internalNotes, onNotesUpdate, toast]);

  /* ===========================
     Confirm Status Change
  ============================ */

  const confirmStatusChange = useCallback(async () => {
    if (!application?.id || !selectedStatus) return;

    setUpdatingStatus(true);
    console.log("[ApplicationReview] Updating status:", { applicationId: application.id, newStatus: selectedStatus });

    // Handle file upload if a file is selected
    if (selectedFile) {
      try {
        console.log("[ApplicationReview] Uploading file:", selectedFile.name);
        const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}_${sanitize(selectedFile.name)}`;
        // Use application ID as folder
        const filePath = `${application.id}/${fileName}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from("application-documents")
          .upload(filePath, selectedFile);

        if (uploadError) {
          console.error("[ApplicationReview] File upload failed:", uploadError);
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        // 2. Insert into application_documents
        // Use the generic "other" type since offer/CAS files are stored in the application documents bucket
        const documentType: Database['public']['Enums']['document_type'] = 'other';

        const { data: insertedApplicationDoc, error: dbError } = await supabase
          .from("application_documents")
          .insert({
            application_id: application.id,
            document_type: documentType,
            storage_path: filePath,
            mime_type: selectedFile.type,
            file_size: selectedFile.size,
            verified: true, // University uploaded it
            uploaded_at: new Date().toISOString(),
          } as any)
          .select("id")
          .single();

        if (dbError) {
           console.error("[ApplicationReview] Document record creation failed:", dbError);
           // We uploaded the file but failed to create record.
           // Technically we should delete the file, but for now just throw.
           throw new Error(`Failed to record document: ${dbError.message}`);
        }

        if (insertedApplicationDoc) {
          void logDocumentAuditEvent({
            action: "document_uploaded",
            tenantId,
            userId: user?.id ?? profile?.id ?? null,
            entityId: insertedApplicationDoc.id,
            details: {
              applicationId: application.id,
              documentType: "other",
              storagePath: filePath,
              mimeType: selectedFile.type,
              fileSize: selectedFile.size,
              source: "application_documents",
              uploadedBy: "university",
            },
          });
        }

        // Also make sure the offer record is created/updated for students to view
        if (selectedStatus === 'conditional_offer' || selectedStatus === 'unconditional_offer') {
          const offerType = selectedStatus === 'conditional_offer' ? 'conditional' : 'unconditional';
          const { error: offerError } = await supabase
            .from('offers')
            .upsert({
              application_id: application.id,
              offer_type: offerType,
              letter_url: filePath,
              accepted: null,
            }, { onConflict: 'application_id' });

          if (offerError) {
            console.error('[ApplicationReview] Offer upsert failed:', offerError);
            throw new Error(`Failed to record offer: ${offerError.message}`);
          }
        }

        console.log("[ApplicationReview] File uploaded and recorded successfully");
        toast({
          title: "Document uploaded",
          description: "The document has been successfully attached to the application.",
        });

      } catch (err: any) {
        setUpdatingStatus(false);
        setConfirmStatus(false);
        toast({
          title: "Upload failed",
          description: err.message || "Could not upload document.",
          variant: "destructive",
        });
        return; // Abort status update
      }
    }

    // First, run diagnostics to help debug any issues
    try {
      const diagResult = await callRpcWithCache(
        "diagnose_app_update_issue",
        {
          p_app_id: application.id,
        },
      );
      if (!diagResult.error && diagResult.data) {
        console.log("[ApplicationReview] Diagnostics:", diagResult.data);
      }
    } catch (diagError) {
      console.log("[ApplicationReview] Diagnostics function not available:", diagError);
    }

    let data: any = null;
    let error: any = null;

    // APPROACH 1: Try the dedicated university_update_application_status RPC first
    // This is the most reliable method with explicit authorization and SECURITY DEFINER
    try {
      console.log("[ApplicationReview] Trying university_update_application_status RPC...");
      const rpcResult = await callRpcWithCache(
        "university_update_application_status",
        {
          p_application_id: application.id,
          p_status: selectedStatus,
          p_notes: null,
        },
      );
      
      if (!rpcResult.error) {
        // This RPC returns JSONB directly with {id, status, updated_at}
        data = rpcResult.data;
        error = null;
        console.log("[ApplicationReview] university_update_application_status succeeded:", data);
      } else if (!isUpdateApplicationReviewRpcMissing(rpcResult.error)) {
        // It's a real error (not just "function not found"), use it
        error = rpcResult.error;
        console.error("[ApplicationReview] university_update_application_status failed:", error);
      } else {
        // Function not found, try fallbacks
        console.log("[ApplicationReview] university_update_application_status not found, trying fallbacks");
      }
    } catch (e) {
      console.warn("[ApplicationReview] university_update_application_status exception:", e);
    }

    // APPROACH 2: Try update_application_review_text if first approach didn't work
    if (!data && (!error || isUpdateApplicationReviewRpcMissing(error))) {
      const timelineEvent = {
        id: crypto.randomUUID(),
        action: `Status changed to ${getApplicationStatusLabel(selectedStatus)}`,
        timestamp: new Date().toISOString(),
        actor: "University",
      };

      const textRpcResult = await callRpcWithCache(
        "update_application_review_text",
        {
          p_application_id: application.id,
          p_new_status: selectedStatus,
          p_internal_notes: null,
          p_append_timeline_event: timelineEvent,
        },
      );

      if (!textRpcResult.error) {
        data = textRpcResult.data;
        error = null;
        console.log("[ApplicationReview] update_application_review_text succeeded");
      } else if (!isUpdateApplicationReviewRpcMissing(textRpcResult.error)) {
        error = textRpcResult.error;
        console.error("[ApplicationReview] update_application_review_text failed:", error);
      }
    }

    // APPROACH 3: Try enum version of update_application_review
    if (!data && (!error || isUpdateApplicationReviewRpcMissing(error))) {
      console.log("[ApplicationReview] Trying enum version of update_application_review");
      const enumResult = await callRpcWithCache("update_application_review", {
        p_application_id: application.id,
        p_new_status: selectedStatus,
        p_internal_notes: null,
        p_append_timeline_event: null,
      });
      
      if (!enumResult.error) {
        data = enumResult.data;
        error = null;
      } else if (!isUpdateApplicationReviewRpcMissing(enumResult.error)) {
        error = enumResult.error;
      }
    }

    // APPROACH 4: Direct table update as last resort
    if (!data && (!error || isUpdateApplicationReviewRpcMissing(error))) {
      console.log("[ApplicationReview] All RPCs failed/missing, falling back to direct update");
      
      // Preflight check
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
      toast({ ...explained, variant: "destructive", duration: 10000 });
      return;
    }

    // Verify we got data back from the update
    const row = firstRow<any>(data as any);
    if (!row) {
      console.error("[ApplicationReview] Status update returned no data - update may not have persisted");
      toast({
        title: "Update may not have saved",
        description: "The status update completed but could not be verified. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Clear file selection on success
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFile(null);

    const finalStatus = String(row.status);
    console.log("[ApplicationReview] Status updated successfully:", {
      requestedStatus: selectedStatus,
      savedStatus: finalStatus,
      updatedAt: row.updated_at
    });

    // Verify the saved status matches what we requested
    if (finalStatus !== selectedStatus) {
      console.warn("[ApplicationReview] Status mismatch:", { requested: selectedStatus, saved: finalStatus });
    }

    onStatusUpdate?.(application.id, finalStatus);

    // Send email notification (status update)
    if (finalStatus !== application.status) {
      try {
        await supabase.functions.invoke('send-application-update', {
          body: {
            applicationId: application.id,
            type: 'status_change',
            newStatus: finalStatus
          }
        });
      } catch (emailError) {
        console.error("Failed to send status update email:", emailError);
      }
    }

    toast({
      title: "Status updated",
      description: `Application status changed to ${getApplicationStatusLabel(finalStatus)}`,
    });
  }, [application, selectedStatus, onStatusUpdate, toast]);

  /* ===========================
     Request Document
  ============================ */

  const handleRequestDocument = useCallback(async () => {
    // Debug logging to diagnose "Missing information" error
    const resolvedStudentId = application?.student?.id ?? application?.studentId ?? null;
    console.log("[ApplicationReview] handleRequestDocument called:", {
      applicationId: application?.id,
      studentId: application?.student?.id,
      resolvedStudentId,
      documentRequestType,
      tenantId,
    });

    // More specific validation with targeted error messages
    if (!application?.id) {
      toast({
        title: "Application not loaded",
        description: "Please wait for the application to load and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!resolvedStudentId) {
      toast({
        title: "Student link missing",
        description:
          "This application is missing a linked student record (student_id). Please refresh and try again, or contact support if the issue persists.",
        variant: "destructive",
      });
      return;
    }

    if (!documentRequestType || documentRequestType.trim() === "") {
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
        description: "Unable to verify your university profile. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setRequestingDocument(true);
    console.log("[ApplicationReview] Requesting document:", {
      applicationId: application.id,
      studentId: resolvedStudentId,
      type: documentRequestType,
      tenantId,
    });

    // Get current user for requested_by field
    const { data: userData } = await supabase.auth.getUser();

    // NOTE: The schema has evolved over time:
    // - `application_id` may or may not exist on `document_requests` depending on migration state.
    // - `request_type` is used by some UI/notification logic; `document_type` is required by the table.
    // We attempt the most complete insert first, then gracefully fall back for older schemas.
    const basePayload: Record<string, any> = {
      tenant_id: tenantId,
      student_id: resolvedStudentId,
      requested_by: userData?.user?.id ?? null,
      document_type: documentRequestType,
      request_type: documentRequestType,
      status: "pending",
      notes: documentRequestNote || null,
    };

    let error: any = null;
    const primaryAttempt = await supabase.from("document_requests").insert([
      {
        ...basePayload,
        application_id: application.id,
      },
    ] as any);

    if (primaryAttempt.error) {
      const msg = String(primaryAttempt.error.message ?? "");
      const code = String(primaryAttempt.error.code ?? "");

      // If the column doesn't exist (older schema), retry without it.
      if (code === "42703" || msg.toLowerCase().includes("application_id")) {
        console.warn(
          "[ApplicationReview] document_requests.application_id not available; retrying insert without application_id",
          { code, msg }
        );
        const fallbackAttempt = await supabase.from("document_requests").insert([
          basePayload,
        ] as any);
        error = fallbackAttempt.error;
      } else {
        error = primaryAttempt.error;
      }
    }

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
      // Get current user first
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) {
        throw new Error("Not authenticated");
      }

      // Use existing conversationId if available, otherwise get/create one
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const { data: convId, error: convError } = await supabase.rpc(
          "get_or_create_conversation",
          {
            p_user_id: currentUserId,
            p_other_user_id: application.student.profileId,
            p_tenant_id: tenantId,
          }
        );

        if (convError) {
          throw convError;
        }

        if (!convId) {
          throw new Error("Failed to create conversation");
        }

        activeConversationId = convId;
        setConversationId(convId);
      }

      // Send the message
      const { data: msgData, error: msgError } = await supabase
        .from("conversation_messages")
        .insert([{
          conversation_id: activeConversationId,
          sender_id: currentUserId,
          content: messageContent.trim(),
          message_type: "text",
          metadata: {
            application_id: application.id,
            context: "application_review",
          },
        }] as any)
        .select("id, content, sender_id, created_at")
        .single();

      if (msgError) {
        throw msgError;
      }

      console.log("[ApplicationReview] Message sent successfully:", msgData?.id);

      // Add the message to local state immediately for instant UI update
      if (msgData) {
        setMessages((prev) => [
          ...prev,
          {
            id: msgData.id,
            content: msgData.content,
            senderId: msgData.sender_id,
            senderName: "You",
            createdAt: msgData.created_at,
            isOwn: true,
          },
        ]);
      }

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
  }, [application, messageContent, conversationId, tenantId, toast]);

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

  // Reset fullscreen when dialog closes
  useEffect(() => {
    if (!open) {
      setIsFullscreen(false);
    }
  }, [open]);

  /* ======================================================
     RENDER
  ======================================================= */

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`!grid-rows-[auto_1fr] overflow-hidden flex flex-col p-4 sm:p-6 ${
            isFullscreen
              ? "w-screen h-screen max-w-[100vw] max-h-screen sm:max-w-[100vw] sm:max-h-screen sm:h-screen rounded-none sm:rounded-none"
              : "w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl lg:max-w-4xl h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh]"
          }`}
        >
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  </span>
                </Button>
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
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
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

                {/* Single scroll container for all tab content */}
                <div className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2 sm:pr-4">
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
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
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

                            <div className="space-y-2">
                              <Label htmlFor="status-doc" className="text-xs sm:text-sm">
                                Attach Document <span className="text-muted-foreground font-normal">(Optional)</span>
                              </Label>
                              <Input
                                ref={fileInputRef}
                                id="status-doc"
                                type="file"
                                className="text-xs sm:text-sm h-9 sm:h-10 cursor-pointer"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setSelectedFile(e.target.files[0]);
                                  } else {
                                    setSelectedFile(null);
                                  }
                                }}
                              />
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                Upload CAS, Offer Letter, or other relevant documents.
                              </p>
                            </div>
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
                              Admin-verified documents
                            </CardTitle>
                            <CardDescription>
                              {readyDocuments.length} document(s) cleared for university review
                            </CardDescription>
                          </div>
                          {loadingUrls && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {readyDocuments.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground space-y-2">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No admin-verified documents are available yet.</p>
                            <p className="text-xs">
                              Universities only see documents marked as ready for university review.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {readyDocuments.map((doc) => (
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
                                  <Badge variant="outline" className="border-success/50 bg-success/10 text-success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Admin Verified
                                  </Badge>

                                  {documentUrls[doc.id] ? (
                                    <>
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
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(documentUrls[doc.id]);
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement("a");
                                            link.href = url;
                                            link.download = doc.fileName || "document";
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } catch (err) {
                                            console.error("Download failed:", err);
                                            toast({
                                              title: "Download failed",
                                              description: "Could not download the document.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </Button>
                                    </>
                                  ) : (
                                    <Button variant="ghost" size="sm" disabled>
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Loading
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Review dialog */}
                    <Dialog open={!!reviewingDocId} onOpenChange={(o) => !o && setReviewingDocId(null)}>
                      <DialogContent className="sm:max-w-[560px]">
                        <DialogHeader>
                          <DialogTitle>Review document</DialogTitle>
                          <DialogDescription>
                            Mark this document as accepted or rejected and add feedback.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={reviewStatusDraft}
                              onValueChange={(v) => setReviewStatusDraft(v as any)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending review</SelectItem>
                                <SelectItem value="verified">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Feedback</Label>
                            <Textarea
                              value={reviewNotesDraft}
                              onChange={(e) => setReviewNotesDraft(e.target.value)}
                              placeholder="Add feedback (e.g., resubmit as a clearer PDF, missing pages, etc.)"
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setReviewingDocId(null)} disabled={savingReview}>
                            Cancel
                          </Button>
                          <Button onClick={saveReview} disabled={savingReview}>
                            {savingReview ? "Saving…" : "Save"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

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
                            onValueChange={(value) => {
                              console.log("[ApplicationReview] Document type selected:", value);
                              setDocumentRequestType(value);
                            }}
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
                          disabled={savingNotes}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                          <div className="order-2 sm:order-1 space-y-0.5">
                            {notesSavedAt ? (
                              <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Saved at {notesSavedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                              </p>
                            ) : (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                Last saved: {formatDate(application.updatedAt, true)}
                              </p>
                            )}
                            {internalNotes !== (application.internalNotes ?? "") && !savingNotes && (
                              <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">
                                You have unsaved changes
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={saveNotes}
                            disabled={
                              savingNotes ||
                              internalNotes === (application.internalNotes ?? "")
                            }
                            className="w-full sm:w-auto h-9 sm:h-10 text-sm order-1 sm:order-2"
                          >
                            {savingNotes ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Notes"
                            )}
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
                  <TabsContent value="messages" className="m-0 space-y-4">
                    {/* Message History */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Conversation with {application.student?.legalName ?? "Student"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {messages.length > 0
                                ? `${messages.length} message${messages.length !== 1 ? "s" : ""}`
                                : "No messages yet"}
                            </CardDescription>
                          </div>
                          {application.student?.profileId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void loadMessages()}
                              disabled={loadingMessages}
                            >
                              {loadingMessages ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {!application.student?.profileId ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Unable to send messages</p>
                            <p className="text-xs mt-1">
                              Student profile is not available for messaging
                            </p>
                          </div>
                        ) : loadingMessages ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No messages yet</p>
                            <p className="text-xs mt-1">
                              Send a message to start the conversation
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}
                              >
                                <div
                                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                    msg.isOwn
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 px-1">
                                  {msg.isOwn ? "You" : msg.senderName} • {formatDate(msg.createdAt, true)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Send Message */}
                    {application.student?.profileId && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">New Message</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Textarea
                            placeholder="Type your message..."
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            rows={3}
                            className="resize-none text-sm"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Messages are sent to the student's inbox
                            </p>
                            <Button
                              onClick={handleSendMessage}
                              disabled={!messageContent.trim() || sendingMessage}
                              size="sm"
                            >
                              {sendingMessage ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Send
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/university/messages")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Full Messages
                    </Button>
                  </TabsContent>
                </div>
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
