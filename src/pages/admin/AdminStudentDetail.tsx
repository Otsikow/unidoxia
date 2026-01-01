"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Plane,
  RefreshCw,
  Send,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

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

interface EducationRecord {
  id: string;
  level: string;
  institution_name: string;
  country: string;
  start_date: string;
  end_date: string | null;
  gpa: number | null;
  grade_scale: string | null;
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
  date_of_birth: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  visa_history_json: any;
  education_history: any;
  created_at: string | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  applications: {
    id: string;
    status: string | null;
    app_number: string | null;
    submitted_at: string | null;
    program: {
      id: string;
      name: string | null;
      level: string;
      university: {
        id: string;
        name: string | null;
        country: string | null;
      } | null;
    } | null;
  }[];
}

/* -------------------------------------------------------------------------- */
/*                               Constants                                    */
/* -------------------------------------------------------------------------- */

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

const REQUIRED_DOCUMENTS = [
  { key: "passport", label: "Passport" },
  { key: "passport_photo", label: "Passport Photo" },
  { key: "transcript", label: "Academic Transcript" },
  { key: "sop", label: "Statement of Purpose" },
];

const getDocumentTypeLabel = (type: string) => {
  return DOCUMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

/* -------------------------------------------------------------------------- */
/*                               Component                                    */
/* -------------------------------------------------------------------------- */

const AdminStudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Document action states
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState<string>("");
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [relatedDocumentId, setRelatedDocumentId] = useState<string | null>(null);

  // Document tab state
  const [activeDocTab, setActiveDocTab] = useState<string>("pending");

  /* ------------------------------------------------------------------------ */
  /*                              Data Fetching                               */
  /* ------------------------------------------------------------------------ */

  const fetchStudentData = useCallback(async () => {
    if (!studentId) {
      setError("Student ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch student profile
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
          date_of_birth,
          passport_number,
          passport_expiry,
          visa_history_json,
          education_history,
          created_at,
          profile:profiles!students_profile_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          ),
          applications (
            id,
            status,
            app_number,
            submitted_at,
            program:programs (
              id,
              name,
              level,
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

      if (studentError) throw studentError;
      setStudent(studentData as unknown as StudentProfile);

      // Fetch student documents
      const { data: docsData, error: docsError } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;
      setDocuments((docsData ?? []) as StudentDocument[]);

      // Fetch education records
      const { data: eduData, error: eduError } = await supabase
        .from("education_records")
        .select("*")
        .eq("student_id", studentId)
        .order("start_date", { ascending: false });

      if (!eduError && eduData) {
        setEducationRecords(eduData as EducationRecord[]);
      }
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

  /* ------------------------------------------------------------------------ */
  /*                          Document Operations                             */
  /* ------------------------------------------------------------------------ */

  const getSignedUrl = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data?.signedUrl;
  };

  const handlePreviewDocument = async (doc: StudentDocument) => {
    try {
      setPreviewDoc(doc);
      setPreviewLoading(true);
      const signedUrl = await getSignedUrl(doc.storage_path);
      if (!signedUrl) {
        toast({
          title: "Unable to preview document",
          description: "Please try again later.",
          variant: "destructive",
        });
        setPreviewDoc(null);
        return;
      }
      setPreviewUrl(signedUrl);
    } catch (err) {
      console.error("Failed to preview document", err);
      toast({
        title: "Error",
        description: "Failed to load document preview.",
        variant: "destructive",
      });
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
    // Exit fullscreen if active when closing preview
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  const toggleFullscreen = async () => {
    if (!previewContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await previewContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
      // Fallback: open in new tab for browsers that don't support fullscreen
      if (previewUrl) {
        window.open(previewUrl, "_blank");
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
        description: "Failed to download document.",
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

      if (updateError) throw updateError;

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
        description: "Failed to update document status.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                              Messaging                                   */
  /* ------------------------------------------------------------------------ */

  const openMessageDialog = (docId?: string) => {
    setRelatedDocumentId(docId ?? null);
    setMessageContent("");
    setMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !student?.profile_id || !profile?.id || !profile?.tenant_id) return;

    setMessageLoading(true);

    try {
      const { data: conversationId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_id: profile.id,
          p_other_user_id: student.profile_id,
          p_tenant_id: profile.tenant_id,
        }
      );

      if (convError) throw convError;
      if (!conversationId) throw new Error("Failed to create conversation");

      let messageBody = messageContent.trim();
      if (relatedDocumentId) {
        const relatedDoc = documents.find((d) => d.id === relatedDocumentId);
        if (relatedDoc) {
          messageBody = `[Re: ${getDocumentTypeLabel(relatedDoc.document_type)}]\n\n${messageBody}`;
        }
      }

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
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setMessageLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                              Computed Values                             */
  /* ------------------------------------------------------------------------ */

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
    return student.preferred_name?.trim() || student.legal_name?.trim() || student.profile?.full_name?.trim() || "Unknown Student";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Document categorization
  const pendingDocs = documents.filter((d) => !d.admin_review_status || d.admin_review_status === "awaiting_admin_review" || d.admin_review_status === "pending");
  const approvedDocs = documents.filter((d) => d.admin_review_status === "ready_for_university_review");
  const rejectedDocs = documents.filter((d) => d.admin_review_status === "admin_rejected");

  // Outstanding documents calculation
  const uploadedDocTypes = useMemo(() => new Set(documents.map((d) => d.document_type)), [documents]);
  const outstandingDocs = useMemo(() => {
    return REQUIRED_DOCUMENTS.filter((req) => !uploadedDocTypes.has(req.key));
  }, [uploadedDocTypes]);

  const isReadyForUniversity = useMemo(() => {
    // All required documents must be uploaded and approved
    const allRequiredUploaded = REQUIRED_DOCUMENTS.every((req) => uploadedDocTypes.has(req.key));
    const allUploadsApproved = documents.length > 0 && documents.every(
      (d) => d.admin_review_status === "ready_for_university_review"
    );
    return allRequiredUploaded && allUploadsApproved;
  }, [documents, uploadedDocTypes]);

  /* ------------------------------------------------------------------------ */
  /*                                 Render                                   */
  /* ------------------------------------------------------------------------ */

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
          {isReadyForUniversity ? (
            <Badge className="bg-green-600 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Ready for University
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Review In Progress
            </Badge>
          )}
          <Button variant="outline" className="gap-2" onClick={() => openMessageDialog()}>
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void fetchStudentData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Sidebar - Student Info */}
        <div className="space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Legal Name</span>
                <span className="font-medium">{student.legal_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">
                  {student.date_of_birth ? format(new Date(student.date_of_birth), "MMM d, yyyy") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-medium">{student.nationality ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{student.current_country ?? "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{student.contact_phone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate max-w-[150px]">
                  {student.contact_email ?? student.profile?.email ?? "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passport No.</span>
                <span className="font-medium">{student.passport_number ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passport Expiry</span>
                <span className="font-medium">
                  {student.passport_expiry ? format(new Date(student.passport_expiry), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Education History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Education History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {educationRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education records</p>
              ) : (
                <div className="space-y-4">
                  {educationRecords.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-primary/30 pl-3 space-y-1">
                      <p className="font-medium text-sm">{edu.institution_name}</p>
                      <p className="text-xs text-muted-foreground">{edu.level} • {edu.country}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(edu.start_date), "MMM yyyy")} - {edu.end_date ? format(new Date(edu.end_date), "MMM yyyy") : "Present"}
                      </p>
                      {edu.gpa && (
                        <p className="text-xs">GPA: {edu.gpa} {edu.grade_scale ? `/ ${edu.grade_scale}` : ""}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visa History */}
          {student.visa_history_json && Array.isArray(student.visa_history_json) && student.visa_history_json.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plane className="h-4 w-4" />
                  Visa History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.visa_history_json.slice(0, 5).map((visa: any, idx: number) => (
                    <div key={idx} className="text-sm border-l-2 border-muted pl-3">
                      <p className="font-medium">{visa.country ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {visa.type ?? "Visa"} • {visa.status ?? "Unknown status"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applications Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Applications ({student.applications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applications yet</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-3">
                    {student.applications.map((app) => (
                      <div key={app.id} className="rounded-lg border p-3 space-y-1">
                        <p className="text-sm font-medium">{app.program?.university?.name ?? "Unknown"}</p>
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
        </div>

        {/* Main Content - Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Outstanding Documents Alert */}
          {outstandingDocs.length > 0 && (
            <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Missing Required Documents</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                <div className="flex flex-wrap gap-2 mt-2">
                  {outstandingDocs.map((doc) => (
                    <Badge key={doc.key} variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
                      {doc.label}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Document Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card
              className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${pendingDocs.length > 0 ? "border-amber-500/50" : ""} ${activeDocTab === "pending" ? "ring-2 ring-amber-500" : ""}`}
              onClick={() => setActiveDocTab("pending")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{pendingDocs.length}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeDocTab === "approved" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setActiveDocTab("approved")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{approvedDocs.length}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeDocTab === "rejected" ? "ring-2 ring-red-500" : ""}`}
              onClick={() => setActiveDocTab("rejected")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{rejectedDocs.length}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
              <CardDescription>Review and approve student documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeDocTab} onValueChange={setActiveDocTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Pending ({pendingDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Approved ({approvedDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Rejected ({rejectedDocs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                  {pendingDocs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No documents pending review</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingDocs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          onPreview={() => void handlePreviewDocument(doc)}
                          onDownload={() => void handleDownloadDocument(doc)}
                          onApprove={() => openActionDialog(doc, "approve")}
                          onReject={() => openActionDialog(doc, "reject")}
                          onMessage={() => openMessageDialog(doc.id)}
                          downloadingDocId={downloadingDocId}
                          showActions
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="approved" className="mt-6">
                  {approvedDocs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No approved documents yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {approvedDocs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          onPreview={() => void handlePreviewDocument(doc)}
                          onDownload={() => void handleDownloadDocument(doc)}
                          onMessage={() => openMessageDialog(doc.id)}
                          downloadingDocId={downloadingDocId}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rejected" className="mt-6">
                  {rejectedDocs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No rejected documents</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rejectedDocs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          onPreview={() => void handlePreviewDocument(doc)}
                          onDownload={() => void handleDownloadDocument(doc)}
                          onMessage={() => openMessageDialog(doc.id)}
                          downloadingDocId={downloadingDocId}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className={`${isFullscreen ? "max-w-none w-screen h-screen m-0 rounded-none" : "max-w-4xl max-h-[90vh]"}`}>
          <DialogHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <DialogTitle>
                {previewDoc && getDocumentTypeLabel(previewDoc.document_type)}
              </DialogTitle>
              <DialogDescription>
                {previewDoc?.file_name}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </DialogHeader>
          <div
            ref={previewContainerRef}
            className={`flex-1 bg-muted rounded-lg overflow-hidden ${isFullscreen ? "min-h-[calc(100vh-180px)]" : "min-h-[60vh]"}`}
          >
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl && previewDoc ? (
              previewDoc.mime_type.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={previewDoc.file_name}
                  className="w-full h-full object-contain"
                />
              ) : previewDoc.mime_type === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  className={`w-full ${isFullscreen ? "h-[calc(100vh-180px)]" : "h-[60vh]"}`}
                  title={previewDoc.file_name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <FileText className="h-16 w-16 opacity-30" />
                  <p>Preview not available for this file type</p>
                  <Button onClick={() => previewUrl && window.open(previewUrl, "_blank")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
            {previewDoc && (
              <Button onClick={() => void handleDownloadDocument(previewDoc)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={Boolean(selectedDocument && actionType)} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This document will be marked as approved and visible to universities."
                : "This document will be rejected. The student will be notified."}
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
                  ? "Add any internal notes..."
                  : "Explain why this document was rejected..."}
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
              Send a message to {getStudentName()} about their documents.
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

/* -------------------------------------------------------------------------- */
/*                            Document Card Component                         */
/* -------------------------------------------------------------------------- */

interface DocumentCardProps {
  doc: StudentDocument;
  onPreview: () => void;
  onDownload: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onMessage?: () => void;
  downloadingDocId: string | null;
  showActions?: boolean;
}

const DocumentCard = ({
  doc,
  onPreview,
  onDownload,
  onApprove,
  onReject,
  onMessage,
  downloadingDocId,
  showActions = false,
}: DocumentCardProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "ready_for_university_review":
        return { label: "Approved", variant: "default" as const, icon: CheckCircle2, className: "bg-green-600" };
      case "admin_rejected":
        return { label: "Rejected", variant: "destructive" as const, icon: XCircle, className: "" };
      default:
        return { label: "Pending", variant: "secondary" as const, icon: Clock, className: "" };
    }
  };

  const statusInfo = getStatusBadge(doc.admin_review_status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
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
            <span className="font-medium">Notes:</span> {doc.admin_review_notes}
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
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={downloadingDocId === doc.id}
          >
            {downloadingDocId === doc.id ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Download
          </Button>
          {onMessage && (
            <Button variant="ghost" size="sm" onClick={onMessage}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Button>
          )}
          {showActions && (
            <>
              <div className="flex-1" />
              {onApprove && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={onApprove}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              {onReject && (
                <Button variant="destructive" size="sm" onClick={onReject}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetail;