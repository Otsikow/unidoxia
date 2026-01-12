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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  History,
  Loader2,
  MessageCircle,
  MessageSquare,
  Maximize2,
  Minimize2,
  MoreVertical,
  Plane,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  User,
  X,
  XCircle,
  PenTool,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logSecurityEvent } from "@/lib/securityLogger";

import { AdminStudentChat } from "@/components/admin/AdminStudentChat";
import { ApplicationReview } from "@/components/application/ApplicationReview";

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
  admin_review_status: string | null;
  admin_review_notes: string | null;
  admin_reviewed_at: string | null;
  created_at: string;
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
  address: Record<string, any> | null;
  nationality: string | null;
  current_country: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  visa_history_json: any[];
  created_at: string;
  status: "active" | "suspended" | "deleted" | null;
  status_reason: string | null;
  status_changed_at: string | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  applications: {
    id: string;
    status: string | null;
    program: {
      name: string | null;
      university: {
        name: string | null;
      } | null;
    } | null;
  }[];
}

/* -------------------------------------------------------------------------- */
/*                               Constants                                    */
/* -------------------------------------------------------------------------- */

const DOCUMENT_LABELS: Record<string, string> = {
  passport: "Passport",
  passport_photo: "Passport Photo",
  transcript: "Academic Transcript",
  sop: "Statement of Purpose",
  cv: "CV / Resume",
  degree_certificate: "Degree Certificate",
  recommendation_letter: "Recommendation Letter",
  english_proficiency: "English Proficiency",
  financial_document: "Financial Document",
};

const REQUIRED_DOCUMENTS = [
  "passport",
  "transcript",
  "sop",
  "cv",
];

const getDocLabel = (t: string) =>
  DOCUMENT_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* -------------------------------------------------------------------------- */
/*                               Component                                    */
/* -------------------------------------------------------------------------- */

const AdminStudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [education, setEducation] = useState<EducationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Listen for fullscreen change events (e.g., when user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const [chatOpen, setChatOpen] = useState(false);
  const [reviewDoc, setReviewDoc] = useState<StudentDocument | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const [docTab, setDocTab] = useState("pending");

  // Account management state
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* ------------------------------ Data Load ------------------------------ */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Define base query without status columns which might be missing in some environments
      const baseQuery = `
          id,
          profile_id,
          legal_name,
          preferred_name,
          contact_email,
          contact_phone,
          address,
          nationality,
          current_country,
          date_of_birth,
          passport_number,
          passport_expiry,
          visa_history_json,
          created_at,
          profile:profiles (
            id,
            full_name,
            email
          ),
          applications (
            id,
            status,
            program:programs (
              name,
              university:universities ( name )
            )
          )
      `;

      // Try fetching with status columns first (preferred)
      // We use a try/catch block here to handle the case where the columns don't exist
      let studentData = null;
      let studentErr = null;

      try {
        const { data, error } = await supabase
          .from("students")
          .select(`${baseQuery}, status, status_reason, status_changed_at`)
          .eq("id", studentId)
          .maybeSingle();

        if (error) throw error;
        studentData = data;
      } catch (e) {
        console.warn("Failed to fetch student with status columns, retrying with base fields...", e);

        // Fallback: fetch without status columns
        const { data, error } = await supabase
          .from("students")
          .select(baseQuery)
          .eq("id", studentId)
          .maybeSingle();

        studentErr = error;
        studentData = data;
      }

      if (studentErr) throw studentErr;
      if (!studentData) {
        setError("Student not found");
        return;
      }

      setStudent(studentData as StudentProfile);

      const { data: docs } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      setDocuments(docs ?? []);

      const { data: edu } = await supabase
        .from("education_records")
        .select("*")
        .eq("student_id", studentId);

      setEducation(edu ?? []);
    } catch (e) {
      console.error(e);
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ------------------------------ Document Stats ------------------------------ */

  const documentStats = useMemo(() => {
    const pending = documents.filter(
      (d) => !d.admin_review_status || d.admin_review_status === "pending"
    ).length;
    const approved = documents.filter(
      (d) => d.admin_review_status === "ready_for_university_review" || d.admin_review_status === "approved"
    ).length;
    const rejected = documents.filter(
      (d) => d.admin_review_status === "rejected" || d.admin_review_status === "admin_rejected"
    ).length;
    return { pending, approved, rejected };
  }, [documents]);

  const missingDocuments = useMemo(() => {
    const uploadedTypes = documents.map((d) => d.document_type.toLowerCase());
    return REQUIRED_DOCUMENTS.filter((req) => !uploadedTypes.includes(req));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    switch (docTab) {
      case "pending":
        return documents.filter(
          (d) => !d.admin_review_status || d.admin_review_status === "pending"
        );
      case "approved":
        return documents.filter(
          (d) => d.admin_review_status === "ready_for_university_review" || d.admin_review_status === "approved"
        );
      case "rejected":
        return documents.filter(
          (d) => d.admin_review_status === "rejected" || d.admin_review_status === "admin_rejected"
        );
      default:
        return documents;
    }
  }, [documents, docTab]);

  /* ------------------------------ Document Preview ------------------------------ */

  const preview = async (doc: StudentDocument) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    const { data } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(doc.storage_path, 3600);
    setPreviewUrl(data?.signedUrl ?? null);
    setPreviewLoading(false);
  };

  const toggleFullscreen = async () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      await previewRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  /* ------------------------------ Document Review ------------------------------ */

  const handleReviewDocument = async (status: "approved" | "rejected") => {
    if (!reviewDoc || !profile?.id) return;
    setReviewLoading(true);
    try {
      const { error } = await supabase
        .from("student_documents")
        .update({
          admin_review_status: status === "approved" ? "ready_for_university_review" : "admin_rejected",
          admin_review_notes: reviewNotes || null,
          admin_reviewed_by: profile.id,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq("id", reviewDoc.id);

      if (error) throw error;

      toast({
        title: `Document ${status}`,
        description: `The document has been ${status}.`,
      });

      setReviewDoc(null);
      setReviewNotes("");
      loadData();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive",
      });
    } finally {
      setReviewLoading(false);
    }
  };

  /* ------------------------------ Account Management ------------------------------ */

  const handleSuspendStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: false,
        })
        .eq("id", student.profile_id);

      if (error) throw error;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin suspended student account: ${studentName}`,
        severity: "high",
        metadata: {
          studentId: student.id,
          studentName,
          reason: actionReason,
        },
        alert: true,
      });

      toast({
        title: "Student suspended",
        description: `${studentName}'s account has been suspended.`,
      });

      setSuspendDialogOpen(false);
      setActionReason("");
      loadData();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to suspend student account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: false,
        })
        .eq("id", student.profile_id);

      if (error) throw error;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin deleted student account: ${studentName}`,
        severity: "high",
        metadata: {
          studentId: student.id,
          studentName,
          reason: actionReason,
        },
        alert: true,
      });

      toast({
        title: "Student deleted",
        description: `${studentName}'s account has been deleted.`,
      });

      setDeleteDialogOpen(false);
      setActionReason("");
      navigate("/admin/students");
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to delete student account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: true,
        })
        .eq("id", student.profile_id);

      if (error) throw error;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin reactivated student account: ${studentName}`,
        severity: "medium",
        metadata: {
          studentId: student.id,
          studentName,
        },
        alert: false,
      });

      toast({
        title: "Student reactivated",
        description: `${studentName}'s account has been reactivated.`,
      });

      setReactivateDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to reactivate student account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /* ------------------------------ Derived Values ------------------------------ */

  const studentName = student?.preferred_name || student?.legal_name || student?.profile?.full_name || "Student";
  const studentEmail = student?.contact_email || student?.profile?.email || "";
  const whatsappNumber = (student?.address as any)?.whatsapp || student?.contact_phone || null;

  const overallStatus = useMemo(() => {
    if (documentStats.pending > 0) return "review_in_progress";
    if (documentStats.rejected > 0) return "needs_attention";
    if (documentStats.approved > 0) return "ready";
    return "pending";
  }, [documentStats]);

  const statusBadge = useMemo(() => {
    switch (overallStatus) {
      case "review_in_progress":
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Clock className="w-3 h-3 mr-1" /> Review In Progress</Badge>;
      case "needs_attention":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Needs Attention</Badge>;
      case "ready":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Ready</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  }, [overallStatus]);

  /* ------------------------------ Render ------------------------------ */

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error ?? "Student not found"}</AlertDescription>
        </Alert>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/admin/students")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{studentName}</h1>
            <p className="text-muted-foreground">{studentEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {student.status === "suspended" ? (
            <Badge variant="destructive" className="gap-1">
              <Ban className="h-3 w-3" />
              Suspended
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </Badge>
          )}
          <Button variant="outline" onClick={() => setChatOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" /> Message
          </Button>
          <Button variant="ghost" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {student.status === "suspended" ? (
                <DropdownMenuItem onClick={() => setReactivateDialogOpen(true)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reactivate Account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setSuspendDialogOpen(true)}
                  className="text-amber-600"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend Account
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Suspended Alert */}
      {student.status === "suspended" && (
        <Alert className="border-destructive bg-destructive/10">
          <Ban className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Account Suspended</AlertTitle>
          <AlertDescription>
            This student account is currently suspended.
            {student.status_reason && (
              <span className="block mt-1 text-muted-foreground">
                Reason: {student.status_reason}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Legal Name</span>
                <span className="font-medium">{student.legal_name || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">
                  {student.date_of_birth ? format(new Date(student.date_of_birth), "MMM d, yyyy") : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-medium">{student.nationality || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{student.current_country || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                {student.contact_phone ? (
                  <a 
                    href={`tel:${student.contact_phone}`} 
                    className="font-medium text-primary hover:underline"
                  >
                    {student.contact_phone}
                  </a>
                ) : (
                  <span className="font-medium">—</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">WhatsApp</span>
                {whatsappNumber ? (
                  <a 
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-500 hover:underline"
                  >
                    {whatsappNumber}
                  </a>
                ) : (
                  <span className="font-medium">—</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Email</span>
                {studentEmail ? (
                  <a 
                    href={`mailto:${studentEmail}`}
                    className="font-medium text-primary hover:underline cursor-pointer"
                    title={studentEmail}
                  >
                    {studentEmail}
                  </a>
                ) : (
                  <span className="font-medium">—</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passport No.</span>
                <span className="font-medium">{student.passport_number || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passport Expiry</span>
                <span className="font-medium">
                  {student.passport_expiry ? format(new Date(student.passport_expiry), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Education Records */}
          {education.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" /> Education History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {education.map((edu) => (
                  <div key={edu.id} className="border-l-2 border-primary pl-4 py-2">
                    <p className="font-medium">{edu.institution_name}</p>
                    <p className="text-sm text-muted-foreground">{edu.level} • {edu.country}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(edu.start_date), "yyyy")} - {edu.end_date ? format(new Date(edu.end_date), "yyyy") : "Present"}
                      {edu.gpa && ` • GPA: ${edu.gpa}`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Applications */}
          {student.applications && student.applications.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{app.program?.name || "Unknown Program"}</p>
                      <p className="text-xs text-muted-foreground">{app.program?.university?.name || ""}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {app.status?.replace(/_/g, " ") || "Draft"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Missing Documents Alert */}
          {missingDocuments.length > 0 && (
            <Alert className="border-amber-500 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-500">Missing Required Documents</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {missingDocuments.map((doc) => (
                    <Badge key={doc} variant="outline" className="border-amber-500 text-amber-600">
                      {getDocLabel(doc)}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Document Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${docTab === "pending" ? "ring-2 ring-amber-500" : ""}`}
              onClick={() => setDocTab("pending")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{documentStats.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all ${docTab === "approved" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setDocTab("approved")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{documentStats.approved}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all ${docTab === "rejected" ? "ring-2 ring-destructive" : ""}`}
              onClick={() => setDocTab("rejected")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/20">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{documentStats.rejected}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Documents
              </CardTitle>
              <CardDescription>Review and approve student documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={docTab} onValueChange={setDocTab}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="pending" className="gap-2">
                    <Clock className="h-4 w-4" /> Pending ({documentStats.pending})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Approved ({documentStats.approved})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-2">
                    <XCircle className="h-4 w-4" /> Rejected ({documentStats.rejected})
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-3">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No {docTab} documents
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="p-3 rounded-lg bg-muted shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{getDocLabel(doc.document_type)}</p>
                            <p className="text-sm text-muted-foreground truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)} • Uploaded {format(new Date(doc.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Badge
                            variant={
                              doc.admin_review_status === "ready_for_university_review" || doc.admin_review_status === "approved"
                                ? "default"
                                : doc.admin_review_status === "rejected" || doc.admin_review_status === "admin_rejected"
                                ? "destructive"
                                : "outline"
                            }
                            className={
                              doc.admin_review_status === "ready_for_university_review" || doc.admin_review_status === "approved"
                                ? "bg-green-600"
                                : ""
                            }
                          >
                            {doc.admin_review_status === "ready_for_university_review" || doc.admin_review_status === "approved"
                              ? "Approved"
                              : doc.admin_review_status === "rejected" || doc.admin_review_status === "admin_rejected"
                              ? "Rejected"
                              : "Pending"}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => preview(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(!doc.admin_review_status || doc.admin_review_status === "pending") && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setReviewDoc(doc);
                                setReviewNotes("");
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl p-0" hideClose>
          <AdminStudentChat
            studentProfileId={student.profile_id}
            studentName={studentName}
            onClose={() => setChatOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc && getDocLabel(previewDoc.document_type)}</DialogTitle>
            <DialogDescription>{previewDoc?.file_name}</DialogDescription>
          </DialogHeader>

          <div ref={previewRef} className="relative min-h-[60vh] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {/* Close button visible in fullscreen mode */}
            {fullscreen && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-50 bg-background/80 hover:bg-background shadow-lg"
                onClick={toggleFullscreen}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            {previewLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl ? (
              previewDoc?.mime_type === "application/pdf" ? (
                <iframe src={previewUrl} className={`w-full border-0 ${fullscreen ? "h-screen" : "h-[60vh]"}`} />
              ) : (
                <img src={previewUrl} className={`object-contain ${fullscreen ? "max-w-full max-h-screen" : "max-w-full max-h-[60vh]"}`} alt={previewDoc?.file_name} />
              )
            ) : (
              <p className="text-muted-foreground">Unable to load preview</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
              {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
            {previewUrl && (
              <Button variant="outline" asChild>
                <a href={previewUrl} download={previewDoc?.file_name} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Download
                </a>
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={async () => {
                if (!previewDoc || !profile?.id) return;
                setReviewLoading(true);
                try {
                  const { error } = await supabase
                    .from("student_documents")
                    .update({
                      admin_review_status: "admin_rejected",
                      admin_reviewed_by: profile.id,
                      admin_reviewed_at: new Date().toISOString(),
                    })
                    .eq("id", previewDoc.id);
                  if (error) throw error;
                  toast({ title: "Document rejected", description: "The document has been rejected." });
                  setPreviewDoc(null);
                  loadData();
                } catch (e) {
                  console.error(e);
                  toast({ title: "Error", description: "Failed to reject document", variant: "destructive" });
                } finally {
                  setReviewLoading(false);
                }
              }}
              disabled={reviewLoading}
            >
              {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={async () => {
                if (!previewDoc || !profile?.id) return;
                setReviewLoading(true);
                try {
                  const { error } = await supabase
                    .from("student_documents")
                    .update({
                      admin_review_status: "ready_for_university_review",
                      admin_reviewed_by: profile.id,
                      admin_reviewed_at: new Date().toISOString(),
                    })
                    .eq("id", previewDoc.id);
                  if (error) throw error;
                  toast({ title: "Document approved", description: "The document has been approved." });
                  setPreviewDoc(null);
                  loadData();
                } catch (e) {
                  console.error(e);
                  toast({ title: "Error", description: "Failed to approve document", variant: "destructive" });
                } finally {
                  setReviewLoading(false);
                }
              }}
              disabled={reviewLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Review Dialog */}
      <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              {reviewDoc && getDocLabel(reviewDoc.document_type)} - {reviewDoc?.file_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Review Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about this document..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDoc(null)} disabled={reviewLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewDocument("rejected")}
              disabled={reviewLoading}
            >
              {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={() => handleReviewDocument("approved")}
              disabled={reviewLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Student Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend{" "}
              <span className="font-semibold">{studentName}</span>'s account?
              The student will not be able to access their account until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for suspension (optional)</label>
            <Textarea
              placeholder="Enter reason for suspension..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendStudent}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Student Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{studentName}</span>'s account?
              This action will remove the student from the system. This cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for deletion (optional)</label>
            <Textarea
              placeholder="Enter reason for deletion..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Student Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate{" "}
              <span className="font-semibold">{studentName}</span>'s account?
              The student will regain access to their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateStudent}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reactivate Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudentDetail;
