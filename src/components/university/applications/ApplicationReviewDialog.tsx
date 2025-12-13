"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  MessageSquare,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  GraduationCap,
  Calendar,
  Globe,
  Mail,
  Phone,
  FileCheck,
  AlertCircle,
  Send,
  Plus,
  Save,
  Loader2,
  ExternalLink,
  ChevronRight,
  X,
  MapPin,
  CreditCard,
  Users,
  Award,
  BookOpen,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  withUniversitySurfaceTint,
  withUniversitySurfaceSubtle,
} from "@/components/university/common/cardStyles";
import { cn } from "@/lib/utils";

// Types
export interface ApplicationDocument {
  id: string;
  documentType: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  verified: boolean;
  verificationNotes: string | null;
  uploadedAt: string;
  publicUrl: string | null;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Guardian {
  name?: string;
  relationship?: string;
  email?: string;
  phone?: string;
}

export interface StudentDetails {
  id: string;
  profileId: string;
  legalName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  currentCountry: string | null;
  address: Address | null;
  guardian: Guardian | null;
  finances: Record<string, unknown> | null;
  visaHistory: Record<string, unknown>[] | null;
  avatarUrl: string | null;
  educationHistory: EducationRecord[] | null;
  testScores: TestScore[] | null;
}

export interface EducationRecord {
  id?: string;
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

export interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  actor?: string;
  details?: string;
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
  studentId: string;
  studentName: string;
  studentNationality: string | null;
  agentId: string | null;
  notes: string | null; // Student's notes/SOP
  internalNotes: string | null; // University's internal notes
  timelineJson: TimelineEvent[] | null;
  student: StudentDetails | null;
  documents: ApplicationDocument[];
}

interface ApplicationReviewDialogProps {
  application: ExtendedApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: (applicationId: string, newStatus: string) => void;
  onNotesUpdate?: (applicationId: string, notes: string) => void;
  universityId?: string;
  tenantId?: string;
  isLoading?: boolean;
}

const STORAGE_BUCKET = "student-documents";

const APPLICATION_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "screening", label: "Under Review" },
  { value: "conditional_offer", label: "Conditional Offer" },
  { value: "unconditional_offer", label: "Unconditional Offer" },
  { value: "cas_loa", label: "CAS/LOA Issued" },
  { value: "visa", label: "Visa Stage" },
  { value: "enrolled", label: "Enrolled" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "deferred", label: "Deferred" },
];

const DOCUMENT_REQUEST_TYPES = [
  "Academic Transcript",
  "English Proficiency Test",
  "Passport Copy",
  "Statement of Purpose",
  "Recommendation Letter",
  "Financial Statement",
  "CV/Resume",
  "Portfolio",
  "Other",
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMonthName = (month: number) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] ?? "Unknown";
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getDocumentTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    transcript: "Academic Transcript",
    passport: "Passport Copy",
    ielts: "IELTS Score Report",
    toefl: "TOEFL Score Report",
    duolingo: "Duolingo English Test",
    pte: "PTE Academic",
    sop: "Statement of Purpose",
    cv: "CV/Resume",
    recommendation: "Recommendation Letter",
    lor: "Letter of Recommendation",
    financial: "Financial Documents",
    bank_statement: "Bank Statement",
    sponsor_letter: "Sponsor Letter",
    photo: "Passport Photo",
    portfolio: "Portfolio",
    certificate: "Certificate",
    waec: "WAEC Result",
    neco: "NECO Result",
    other: "Other Document",
  };
  return labels[type.toLowerCase()] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const getDocumentCategory = (type: string): string => {
  const typeLC = type.toLowerCase();
  
  // Identity Documents
  if (["passport", "photo", "id_card", "birth_certificate"].includes(typeLC)) {
    return "Identity Documents";
  }
  
  // Academic Documents
  if (["transcript", "certificate", "waec", "neco", "degree", "diploma", "grade_sheet", "marksheet"].includes(typeLC)) {
    return "Academic Documents";
  }
  
  // English Proficiency
  if (["ielts", "toefl", "duolingo", "pte", "cambridge", "english_test"].includes(typeLC)) {
    return "English Proficiency";
  }
  
  // Application Materials
  if (["sop", "cv", "resume", "recommendation", "lor", "personal_statement", "portfolio"].includes(typeLC)) {
    return "Application Materials";
  }
  
  // Financial Documents
  if (["financial", "bank_statement", "sponsor_letter", "scholarship", "funding", "affidavit"].includes(typeLC)) {
    return "Financial Documents";
  }
  
  return "Other Documents";
};

export const ApplicationReviewDialog = ({
  application,
  open,
  onOpenChange,
  onStatusUpdate,
  onNotesUpdate,
  universityId,
  tenantId,
  isLoading = false,
}: ApplicationReviewDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [internalNotes, setInternalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDocumentRequest, setShowDocumentRequest] = useState(false);
  const [documentRequestType, setDocumentRequestType] = useState("");
  const [documentRequestNotes, setDocumentRequestNotes] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  // Sync internal notes when application changes
  useEffect(() => {
    if (application) {
      setInternalNotes(application.internalNotes ?? "");
    }
  }, [application?.id, application?.internalNotes]);

  const handleCopy = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSaveNotes = useCallback(async () => {
    if (!application || !tenantId) return;

    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ internal_notes: internalNotes })
        .eq("id", application.id);

      if (error) throw error;

      toast({ title: "Notes saved", description: "Internal notes have been updated." });
      onNotesUpdate?.(application.id, internalNotes);
    } catch (err) {
      console.error("Failed to save notes:", err);
      toast({
        title: "Failed to save notes",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  }, [application, internalNotes, tenantId, toast, onNotesUpdate]);

  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
    setShowStatusConfirm(true);
  }, []);

  const confirmStatusChange = useCallback(async () => {
    if (!application || !selectedStatus || !tenantId) return;

    setIsUpdatingStatus(true);
    try {
      // Build timeline event
      const timelineEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        action: `Status changed to ${selectedStatus}`,
        timestamp: new Date().toISOString(),
        actor: "University",
      };

      const existingTimeline = application.timelineJson ?? [];
      const newTimeline = [...existingTimeline, timelineEvent];

      const { error } = await supabase
        .from("applications")
        .update({
          status: selectedStatus,
          timeline_json: newTimeline as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Application status changed to ${selectedStatus.replace(/_/g, " ")}.`,
      });
      onStatusUpdate?.(application.id, selectedStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      toast({
        title: "Failed to update status",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
      setShowStatusConfirm(false);
      setSelectedStatus(null);
    }
  }, [application, selectedStatus, tenantId, toast, onStatusUpdate]);

  const handleSendDocumentRequest = useCallback(async () => {
    if (!application || !documentRequestType || !tenantId) return;

    setIsSendingRequest(true);
    try {
      const { error } = await supabase.from("document_requests").insert({
        student_id: application.studentId,
        tenant_id: tenantId,
        request_type: documentRequestType,
        notes: documentRequestNotes || null,
        status: "pending",
        requested_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      toast({
        title: "Document requested",
        description: `Request for ${documentRequestType} has been sent to the student.`,
      });
      setShowDocumentRequest(false);
      setDocumentRequestType("");
      setDocumentRequestNotes("");
    } catch (err) {
      console.error("Failed to send document request:", err);
      toast({
        title: "Failed to send request",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingRequest(false);
    }
  }, [application, documentRequestType, documentRequestNotes, tenantId, toast]);

  const handleMessageStudent = useCallback(async () => {
    if (!application?.student?.profileId) {
      toast({
        title: "Unable to message student",
        description: "Student profile information is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsStartingConversation(true);
    try {
      // Navigate to messages with the student's profile ID
      navigate(`/university/messages?contact=${application.student.profileId}`);
    } catch (err) {
      console.error("Failed to start conversation:", err);
      toast({
        title: "Unable to start conversation",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStartingConversation(false);
    }
  }, [application, navigate, toast]);

  const handleDownloadDocument = useCallback((doc: ApplicationDocument) => {
    if (doc.publicUrl) {
      window.open(doc.publicUrl, "_blank");
    } else {
      toast({
        title: "Download unavailable",
        description: "Document URL is not available.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handlePreviewDocument = useCallback((doc: ApplicationDocument) => {
    if (doc.publicUrl) {
      window.open(doc.publicUrl, "_blank");
    }
  }, []);

  // Build timeline from available data
  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!application) return [];

    const events: TimelineEvent[] = [];

    // Add creation event
    if (application.createdAt) {
      events.push({
        id: "created",
        action: "Application created",
        timestamp: application.createdAt,
      });
    }

    // Add submission event
    if (application.submittedAt) {
      events.push({
        id: "submitted",
        action: "Application submitted",
        timestamp: application.submittedAt,
      });
    }

    // Add timeline events from JSON
    if (application.timelineJson) {
      events.push(...application.timelineJson);
    }

    // Sort by timestamp
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [application]);

  // Show loading state in the sheet
  if (!application && open) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading application details...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!application) return null;

  const student = application.student;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border bg-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-semibold text-foreground truncate">
                  {application.programName}
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground mt-1">
                  {application.studentName} • {application.programLevel}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <StatusBadge status={application.status} />
                  <Badge variant="outline" className="text-xs">
                    {getMonthName(application.intakeMonth)} {application.intakeYear}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy("Application ID", application.id)}
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy("Application #", application.appNumber)}
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {application.appNumber}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleMessageStudent}
                disabled={isStartingConversation || !student?.profileId}
                className="gap-2"
              >
                {isStartingConversation ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                Message Student
              </Button>
            </div>
          </SheetHeader>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-4 border-b border-border bg-card">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="documents">
                  Documents
                  {application.documents.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {application.documents.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sop">SOP</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 py-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Application Summary */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Application Details</h3>
                    <div className={withUniversitySurfaceTint("rounded-xl p-4 space-y-3")}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Application ID</p>
                          <p className="text-sm font-medium text-foreground">{application.appNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <StatusBadge status={application.status} className="mt-1" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Submitted</p>
                          <p className="text-sm text-foreground">{formatDate(application.submittedAt || application.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Intake</p>
                          <p className="text-sm text-foreground">
                            {getMonthName(application.intakeMonth)} {application.intakeYear}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Program Info */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Program</h3>
                    <div className={withUniversitySurfaceTint("rounded-xl p-4")}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{application.programName}</p>
                          <p className="text-sm text-muted-foreground">{application.programLevel}</p>
                          {application.programDiscipline && (
                            <p className="text-xs text-muted-foreground mt-1">{application.programDiscipline}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Student Summary */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Student</h3>
                    <div className={withUniversitySurfaceTint("rounded-xl p-4")}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{application.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {application.studentNationality ?? "Nationality not specified"}
                          </p>
                          {student?.email && (
                            <p className="text-xs text-muted-foreground mt-1">{student.email}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("student")}
                          className="gap-1 text-primary"
                        >
                          View details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </section>

                  {/* Application Readiness */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Application Readiness</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className={withUniversitySurfaceSubtle("rounded-xl p-4 text-center")}>
                        <p className="text-2xl font-semibold text-foreground">{application.documents.length}</p>
                        <p className="text-xs text-muted-foreground">Documents</p>
                      </div>
                      <div className={withUniversitySurfaceSubtle("rounded-xl p-4 text-center")}>
                        <p className="text-2xl font-semibold text-success">
                          {application.documents.filter((d) => d.verified).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Verified</p>
                      </div>
                      <div className={withUniversitySurfaceSubtle("rounded-xl p-4 text-center")}>
                        <p className="text-2xl font-semibold text-warning">
                          {application.documents.filter((d) => !d.verified).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </section>

                  {/* Quick Checklist */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Review Checklist</h3>
                    <div className={withUniversitySurfaceTint("rounded-xl p-4 space-y-2")}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Student profile complete</span>
                        {student ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Education history provided</span>
                        {student?.educationHistory && student.educationHistory.length > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Test scores available</span>
                        {student?.testScores && student.testScores.length > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Documents uploaded</span>
                        {application.documents.length > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Statement of Purpose</span>
                        {application.notes ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Passport details</span>
                        {student?.passportNumber ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                  </section>
                </TabsContent>

                {/* Student Tab */}
                <TabsContent value="student" className="mt-0 space-y-6">
                  {student ? (
                    <>
                      {/* Personal Information */}
                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                        <div className={withUniversitySurfaceTint("rounded-xl p-4 space-y-4")}>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Full Name (Legal)</p>
                                <p className="text-sm font-medium text-foreground">{student.legalName}</p>
                              </div>
                            </div>
                            {student.preferredName && (
                              <div>
                                <p className="text-xs text-muted-foreground">Preferred Name</p>
                                <p className="text-sm text-foreground">{student.preferredName}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Nationality</p>
                                <p className="text-sm text-foreground">{student.nationality ?? "—"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Date of Birth</p>
                                <p className="text-sm text-foreground">{formatDate(student.dateOfBirth)}</p>
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="text-sm text-foreground">{student.email ?? "—"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="text-sm text-foreground">{student.phone ?? "—"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Passport & Travel */}
                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Passport & Travel</h3>
                        <div className={withUniversitySurfaceTint("rounded-xl p-4")}>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Passport Number</p>
                                <p className="text-sm text-foreground font-mono">
                                  {student.passportNumber ?? "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Passport Expiry</p>
                                <p className="text-sm text-foreground">{formatDate(student.passportExpiry)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 col-span-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Current Location</p>
                                <p className="text-sm text-foreground">{student.currentCountry ?? "—"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Address */}
                      {student.address && (
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">Address</h3>
                          <div className={withUniversitySurfaceTint("rounded-xl p-4")}>
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="text-sm text-foreground">
                                {student.address.line1 && <p>{student.address.line1}</p>}
                                {student.address.line2 && <p>{student.address.line2}</p>}
                                <p>
                                  {[student.address.city, student.address.state, student.address.postalCode]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                                {student.address.country && <p>{student.address.country}</p>}
                              </div>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Guardian/Emergency Contact */}
                      {student.guardian && (student.guardian.name || student.guardian.email || student.guardian.phone) && (
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">Guardian / Emergency Contact</h3>
                          <div className={withUniversitySurfaceTint("rounded-xl p-4")}>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Name</p>
                                  <p className="text-sm text-foreground">{student.guardian.name ?? "—"}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Relationship</p>
                                <p className="text-sm text-foreground">{student.guardian.relationship ?? "—"}</p>
                              </div>
                              {student.guardian.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="text-sm text-foreground">{student.guardian.email}</p>
                                  </div>
                                </div>
                              )}
                              {student.guardian.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <p className="text-sm text-foreground">{student.guardian.phone}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Education History */}
                      {student.educationHistory && student.educationHistory.length > 0 && (
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">Education History</h3>
                          <div className="space-y-3">
                            {student.educationHistory.map((edu, index) => (
                              <div
                                key={edu.id ?? index}
                                className={withUniversitySurfaceTint("rounded-xl p-4")}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{edu.institutionName}</p>
                                    <p className="text-sm text-muted-foreground">{edu.level}</p>
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Globe className="h-3 w-3" />
                                        {edu.country}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(edu.startDate)} — {formatDate(edu.endDate)}
                                      </span>
                                      {edu.gpa && (
                                        <span className="flex items-center gap-1">
                                          <Award className="h-3 w-3" />
                                          GPA: {edu.gpa}/{edu.gradeScale}
                                        </span>
                                      )}
                                    </div>
                                    {(edu.transcriptUrl || edu.certificateUrl) && (
                                      <div className="flex gap-2 mt-3">
                                        {edu.transcriptUrl && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(edu.transcriptUrl!, "_blank")}
                                            className="gap-1.5 text-xs h-7"
                                          >
                                            <FileText className="h-3 w-3" />
                                            Transcript
                                          </Button>
                                        )}
                                        {edu.certificateUrl && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(edu.certificateUrl!, "_blank")}
                                            className="gap-1.5 text-xs h-7"
                                          >
                                            <FileCheck className="h-3 w-3" />
                                            Certificate
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Test Scores */}
                      {student.testScores && student.testScores.length > 0 && (
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">Test Scores</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {student.testScores.map((score, index) => (
                              <div
                                key={index}
                                className={withUniversitySurfaceSubtle("rounded-xl p-4")}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      <BookOpen className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{score.testType}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Taken: {formatDate(score.testDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-lg font-semibold">
                                    {score.totalScore}
                                  </Badge>
                                </div>
                                {score.subscores && Object.keys(score.subscores).length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-xs text-muted-foreground mb-2">Section Scores</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(score.subscores).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="text-muted-foreground capitalize">{key}</span>
                                          <span className="font-medium text-foreground">{value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {score.reportUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(score.reportUrl!, "_blank")}
                                    className="gap-1.5 text-xs h-7 mt-3 w-full"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View Score Report
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* No Education/Test Data Message */}
                      {(!student.educationHistory || student.educationHistory.length === 0) && 
                       (!student.testScores || student.testScores.length === 0) && (
                        <div className={withUniversitySurfaceSubtle("rounded-xl p-6 text-center")}>
                          <GraduationCap className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            No education history or test scores have been provided yet.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDocumentRequest(true)}
                            className="mt-3 gap-2"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Request Academic Documents
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Student details not available</p>
                      <p className="text-xs mt-1 text-muted-foreground/70">
                        The student profile may not be complete or accessible.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Submitted Documents</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {application.documents.filter((d) => d.verified).length} of {application.documents.length} verified
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDocumentRequest(true)}
                      className="gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Request Document
                    </Button>
                  </div>

                  {application.documents.length > 0 ? (
                    <div className="space-y-4">
                      {/* Group documents by category */}
                      {(() => {
                        const documentCategories: Record<string, ApplicationDocument[]> = {};
                        application.documents.forEach((doc) => {
                          const category = getDocumentCategory(doc.documentType);
                          if (!documentCategories[category]) {
                            documentCategories[category] = [];
                          }
                          documentCategories[category].push(doc);
                        });

                        return Object.entries(documentCategories).map(([category, docs]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {docs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className={cn(
                                    withUniversitySurfaceTint("rounded-xl p-4 border"),
                                    doc.verified ? "border-success/30" : "border-transparent"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={cn(
                                      "p-2 rounded-lg shrink-0",
                                      doc.verified ? "bg-success/10" : "bg-muted"
                                    )}>
                                      <FileText className={cn(
                                        "h-5 w-5",
                                        doc.verified ? "text-success" : "text-muted-foreground"
                                      )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-foreground">
                                          {getDocumentTypeLabel(doc.documentType)}
                                        </p>
                                        {doc.verified ? (
                                          <Badge variant="outline" className="border-success/30 text-success text-xs">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Verified
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="border-warning/30 text-warning text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Pending Review
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 truncate" title={doc.fileName}>
                                        {doc.fileName}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>{formatFileSize(doc.fileSize)}</span>
                                        <span>•</span>
                                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                                      </div>
                                      {doc.verificationNotes && (
                                        <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                                          <p className="text-xs text-muted-foreground">
                                            <span className="font-medium">Review Note:</span> {doc.verificationNotes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handlePreviewDocument(doc)}
                                        disabled={!doc.publicUrl}
                                        title="Preview document"
                                        className="h-8 w-8"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDownloadDocument(doc)}
                                        disabled={!doc.publicUrl}
                                        title="Download document"
                                        className="h-8 w-8"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No documents submitted yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Request documents from the student to review their application.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDocumentRequest(true)}
                        className="mt-4 gap-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Request Document
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* SOP Tab */}
                <TabsContent value="sop" className="mt-0 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Statement of Purpose</h3>
                  {application.notes ? (
                    <div className={withUniversitySurfaceTint("rounded-xl p-4")}>
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {application.notes}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No statement of purpose provided</p>
                    </div>
                  )}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-0 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Application Timeline</h3>
                  {timeline.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-4">
                        {timeline.map((event, index) => (
                          <div key={event.id} className="relative pl-10">
                            <div className={cn(
                              "absolute left-2.5 w-3 h-3 rounded-full border-2 border-background",
                              index === timeline.length - 1 ? "bg-primary" : "bg-muted-foreground"
                            )} />
                            <div className={withUniversitySurfaceSubtle("rounded-xl p-3")}>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">{event.action}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</p>
                              </div>
                              {event.actor && (
                                <p className="text-xs text-muted-foreground mt-1">By: {event.actor}</p>
                              )}
                              {event.details && (
                                <p className="text-xs text-muted-foreground mt-1">{event.details}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No timeline events recorded</p>
                    </div>
                  )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Internal Notes</h3>
                    <p className="text-xs text-muted-foreground">Only visible to your university</p>
                  </div>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add internal notes about this application..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={8}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes || internalNotes === (application.internalNotes ?? "")}
                      className="gap-2"
                    >
                      {isSavingNotes ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Notes
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>

            {/* Action Bar */}
            <div className="px-6 py-4 border-t border-border bg-card mt-auto">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Update Status</Label>
                  <Select onValueChange={handleStatusChange} value="">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select new status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((status) => (
                        <SelectItem
                          key={status.value}
                          value={status.value}
                          disabled={status.value === application.status}
                        >
                          {status.label}
                          {status.value === application.status && " (current)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDocumentRequest(true)}
                    className="gap-2"
                  >
                    <FileCheck className="h-4 w-4" />
                    Request Docs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/university/offers")}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Offers & CAS
                  </Button>
                </div>
              </div>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Status Change Confirmation */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the application status to{" "}
              <strong>{selectedStatus?.replace(/_/g, " ")}</strong>?
              {selectedStatus === "rejected" && (
                <span className="block mt-2 text-destructive">
                  This action will reject the application and notify the student.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isUpdatingStatus}
              className={selectedStatus === "rejected" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Request Dialog */}
      <Dialog open={showDocumentRequest} onOpenChange={setShowDocumentRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document</DialogTitle>
            <DialogDescription>
              Send a document request to the student. They will be notified to upload the required document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={documentRequestType} onValueChange={setDocumentRequestType}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_REQUEST_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="doc-notes"
                placeholder="Add any specific instructions for the student..."
                value={documentRequestNotes}
                onChange={(e) => setDocumentRequestNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentRequest(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendDocumentRequest}
              disabled={!documentRequestType || isSendingRequest}
              className="gap-2"
            >
              {isSendingRequest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplicationReviewDialog;
