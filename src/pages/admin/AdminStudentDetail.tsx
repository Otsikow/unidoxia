"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  verified_status: string;
  verification_notes: string | null;
  admin_review_status: string | null;
  admin_review_notes: string | null;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface StudentProfile {
  id: string;
  profile_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  current_country: string | null;
  nationality: string | null;
  created_at: string | null;
  assigned_agent_id: string | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  assigned_agent: {
    id: string;
    company_name: string | null;
    profile: {
      full_name: string | null;
      email: string | null;
    } | null;
  } | null;
  applications: {
    id: string;
    status: string | null;
    app_number: string | null;
    submitted_at: string | null;
    program: {
      id: string;
      name: string | null;
      university: {
        id: string;
        name: string | null;
        country: string | null;
      } | null;
    } | null;
  }[];
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  passport_photo: "Passport Photo",
  transcript: "Academic Transcript",
  cv: "CV / Resume",
  ielts: "IELTS Score",
  toefl: "TOEFL Score",
  sop: "Statement of Purpose",
  lor: "Letter of Recommendation",
  portfolio: "Portfolio",
  financial_document: "Financial Document",
  other: "Other Document",
};

const getDocumentTypeLabel = (type: string) => {
  return DOCUMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const AdminStudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Document action states
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState<string>("");
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [relatedDocumentId, setRelatedDocumentId] = useState<string | null>(null);

  const fetchStudentData = useCallback(async () => {
    if (!studentId) {
      setError("Student ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch student profile with basic relations
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          profile_id,
          legal_name,
          preferred_name,
          contact_email,
          contact_phone,
          current_country,
          nationality,
          created_at,
          profile:profiles!students_profile_id_fkey (
            id,
            full_name,
            email
          ),
          applications (
            id,
            status,
            app_number,
            submitted_at,
            program:programs (
              id,
              name,
              university:universities (
                id,
                name,
                country
              )
            )
          )
        `)
        .eq("id", studentId)
        .single();

      if (studentError) {
        throw studentError;
      }

      setStudent(studentData as unknown as StudentProfile);

      // Fetch student documents
      const { data: docsData, error: docsError } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (docsError) {
        throw docsError;
      }

      setDocuments((docsData ?? []) as StudentDocument[]);
    } catch (err) {
      console.error("Failed to load student data", err);
      setError("Unable to load student data at this time.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void fetchStudentData();
  }, [fetchStudentData]);

  const getSignedUrl = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data?.signedUrl;
  };

  const handleViewDocument = async (doc: StudentDocument) => {
    try {
      setViewingDocId(doc.id);
      const signedUrl = await getSignedUrl(doc.storage_path);

      if (!signedUrl) {
        toast({
          title: "Unable to view document",
          description: "Please try again later.",
          variant: "destructive",
        });
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to view document", err);
      toast({
        title: "Error",
        description: "Failed to open document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setViewingDocId(null);
    }
  };

  const handleDownloadDocument = async (doc: StudentDocument) => {
    try {
      setDownloadingDocId(doc.id);
      const signedUrl = await getSignedUrl(doc.storage_path);

      if (!signedUrl) {
        toast({
          title: "Unable to download",
          description: "Document is not available right now.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Failed to fetch document");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.file_name || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download document", err);
      toast({
        title: "Error",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const openActionDialog = (doc: StudentDocument, type: "approve" | "reject") => {
    setSelectedDocument(doc);
    setActionType(type);
    setActionNotes("");
  };

  const closeActionDialog = () => {
    setSelectedDocument(null);
    setActionType(null);
    setActionNotes("");
  };

  const handleDocumentAction = async () => {
    if (!selectedDocument || !actionType || !profile?.id) return;

    setActionLoading(true);

    try {
      const newStatus = actionType === "approve" ? "ready_for_university_review" : "admin_rejected";

      const { error: updateError } = await supabase
        .from("student_documents")
        .update({
          admin_review_status: newStatus,
          admin_review_notes: actionNotes.trim() || null,
          admin_reviewed_by: profile.id,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedDocument.id);

      if (updateError) {
        throw updateError;
      }

      // Create notification for student
      if (student?.profile_id) {
        const notificationTitle = actionType === "approve"
          ? "Document Approved"
          : "Document Rejected - Action Required";
        const notificationMessage = actionType === "approve"
          ? `Your ${getDocumentTypeLabel(selectedDocument.document_type)} has been approved and is now ready for university review.`
          : `Your ${getDocumentTypeLabel(selectedDocument.document_type)} has been rejected. ${actionNotes ? `Reason: ${actionNotes}` : "Please upload a new version."}`;

        await supabase.from("notifications").insert({
          user_id: student.profile_id,
          tenant_id: profile.tenant_id,
          title: notificationTitle,
          content: notificationMessage,
          type: actionType === "approve" ? "document_approved" : "document_rejected",
          metadata: {
            document_id: selectedDocument.id,
            document_type: selectedDocument.document_type,
            action: actionType,
          },
        });
      }

      toast({
        title: actionType === "approve" ? "Document Approved" : "Document Rejected",
        description: actionType === "approve"
          ? "The document is now available for university review."
          : "The student has been notified to resubmit the document.",
      });

      closeActionDialog();
      void fetchStudentData();
    } catch (err) {
      console.error("Failed to update document status", err);
      toast({
        title: "Error",
        description: "Failed to update document status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openMessageDialog = (docId?: string) => {
    setRelatedDocumentId(docId ?? null);
    setMessageContent("");
    setMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !student?.profile_id || !profile?.id || !profile?.tenant_id) return;

    setMessageLoading(true);

    try {
      // Use the get_or_create_conversation RPC to properly create/find conversation
      const { data: conversationId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_id: profile.id,
          p_other_user_id: student.profile_id,
          p_tenant_id: profile.tenant_id,
        }
      );

      if (convError) {
        console.error("Conversation error:", convError);
        throw convError;
      }

      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }

      // Get related document info if applicable
      let messageBody = messageContent.trim();
      if (relatedDocumentId) {
        const relatedDoc = documents.find((d) => d.id === relatedDocumentId);
        if (relatedDoc) {
          messageBody = `[Re: ${getDocumentTypeLabel(relatedDoc.document_type)}]\n\n${messageBody}`;
        }
      }

      // Send message using conversation_messages table
      const { error: msgError } = await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: messageBody,
        message_type: "text",
      });

      if (msgError) throw msgError;

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the student.",
      });

      setMessageDialogOpen(false);
      setMessageContent("");
      setRelatedDocumentId(null);
    } catch (err) {
      console.error("Failed to send message", err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMessageLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "ready_for_university_review":
        return { label: "Approved", variant: "default" as const, icon: CheckCircle2, className: "bg-green-600" };
      case "admin_rejected":
        return { label: "Rejected", variant: "destructive" as const, icon: XCircle, className: "" };
      case "awaiting_admin_review":
      default:
        return { label: "Pending Review", variant: "secondary" as const, icon: Clock, className: "" };
    }
  };

  const getStudentName = () => {
    if (!student) return "Unknown Student";
    // Use || to handle empty strings, not just null/undefined
    const name =
      (student.preferred_name?.trim()) ||
      (student.legal_name?.trim()) ||
      (student.profile?.full_name?.trim());
    return name || "Unknown Student";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/students")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error ?? "Student not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const pendingDocs = documents.filter((d) => d.admin_review_status === "awaiting_admin_review");
  const approvedDocs = documents.filter((d) => d.admin_review_status === "ready_for_university_review");
  const rejectedDocs = documents.filter((d) => d.admin_review_status === "admin_rejected");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/admin/students")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{getStudentName()}</h1>
            <p className="text-sm text-muted-foreground">
              {student.contact_email ?? student.profile?.email ?? "No email"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => openMessageDialog()}>
            <MessageSquare className="h-4 w-4" />
            Message Student
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void fetchStudentData()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Legal Name</p>
                <p className="text-sm">{student.legal_name ?? "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{student.contact_email ?? student.profile?.email ?? "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{student.contact_phone ?? "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Country</p>
                <p className="text-sm">{student.current_country ?? "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                <p className="text-sm">{student.nationality ?? "Not provided"}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Agent</p>
                {student.assigned_agent ? (
                  <div className="text-sm">
                    <p>{student.assigned_agent.profile?.full_name ?? student.assigned_agent.company_name}</p>
                    <p className="text-muted-foreground">{student.assigned_agent.profile?.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Direct application</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Applications Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applications ({student.applications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {student.applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applications yet</p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {student.applications.map((app) => (
                      <div key={app.id} className="rounded-lg border p-3 space-y-2">
                        <p className="text-sm font-medium">{app.program?.university?.name ?? "Unknown University"}</p>
                        <p className="text-xs text-muted-foreground">{app.program?.name ?? "Unknown Program"}</p>
                        <Badge variant="outline" className="text-xs">
                          {app.status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Unknown"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Document Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Review</span>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingDocs.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <Badge className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {approvedDocs.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rejected</span>
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {rejectedDocs.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Documents - Priority */}
          {pendingDocs.length > 0 && (
            <Card className="border-amber-500/50">
              <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Admin Review ({pendingDocs.length})
                </CardTitle>
                <CardDescription>These documents require your review before being sent to universities.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {pendingDocs.map((doc) => (
                    <div key={doc.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                      <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                            <p className="text-sm text-muted-foreground truncate" title={doc.file_name}>
                              {doc.file_name}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>Uploaded {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleViewDocument(doc)}
                            disabled={viewingDocId === doc.id}
                          >
                            {viewingDocId === doc.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-1" />
                            )}
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDownloadDocument(doc)}
                            disabled={downloadingDocId === doc.id}
                          >
                            {downloadingDocId === doc.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Download
                          </Button>
                          <div className="flex-1" />
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openActionDialog(doc, "approve")}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openActionDialog(doc, "reject")}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                All Documents ({documents.length})
              </CardTitle>
              <CardDescription>Complete document history for this student.</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => {
                    const statusInfo = getStatusBadge(doc.admin_review_status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div key={doc.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                        <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                              <p className="text-sm text-muted-foreground truncate" title={doc.file_name}>
                                {doc.file_name}
                              </p>
                            </div>
                            <Badge variant={statusInfo.variant} className={`shrink-0 gap-1 ${statusInfo.className}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {doc.admin_review_notes && (
                            <div className="text-sm bg-muted/50 rounded p-2">
                              <span className="font-medium">Admin Notes:</span> {doc.admin_review_notes}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>Uploaded {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                            {doc.admin_reviewed_at && (
                              <span>Reviewed {format(new Date(doc.admin_reviewed_at), "MMM d, yyyy")}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleViewDocument(doc)}
                              disabled={viewingDocId === doc.id}
                            >
                              {viewingDocId === doc.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 mr-1" />
                              )}
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDownloadDocument(doc)}
                              disabled={downloadingDocId === doc.id}
                            >
                              {downloadingDocId === doc.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMessageDialog(doc.id)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Message
                            </Button>
                            {doc.admin_review_status === "awaiting_admin_review" && (
                              <>
                                <div className="flex-1" />
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => openActionDialog(doc, "approve")}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openActionDialog(doc, "reject")}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={Boolean(selectedDocument && actionType)} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This document will be marked as approved and will become visible to partner universities."
                : "This document will be rejected. The student will be notified and asked to upload a new version."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDocument && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium">{getDocumentTypeLabel(selectedDocument.document_type)}</p>
                <p className="text-sm text-muted-foreground">{selectedDocument.file_name}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionType === "approve" ? "Notes (optional)" : "Rejection Reason (recommended)"}
              </label>
              <Textarea
                placeholder={actionType === "approve"
                  ? "Add any internal notes about this approval..."
                  : "Explain why this document was rejected so the student can correct it..."}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeActionDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDocumentAction()}
              disabled={actionLoading}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "Approve Document" : "Reject Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message Student</DialogTitle>
            <DialogDescription>
              Send a message to {getStudentName()} about their documents or application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {relatedDocumentId && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Regarding: {getDocumentTypeLabel(documents.find((d) => d.id === relatedDocumentId)?.document_type ?? "")}
                </p>
              </div>
            )}
            <Textarea
              placeholder="Type your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={6}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setMessageDialogOpen(false)} disabled={messageLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSendMessage()}
              disabled={messageLoading || !messageContent.trim()}
            >
              {messageLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudentDetail;
