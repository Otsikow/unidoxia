"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/lib/securityLogger";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Expand,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Minimize2,
  Phone,
  RotateCcw,
  Trash2,
  User,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { getMissingRequiredStudentDocuments } from "@/lib/studentDocuments";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface StudentBundle {
  student: {
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
    address: any;
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
        level: string | null;
        university: {
          id: string;
          name: string | null;
          country: string | null;
        } | null;
      } | null;
    }[];
  };
  documents: {
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
    admin_reviewed_by: string | null;
    created_at: string;
  }[];
  education_records: {
    id: string;
    level: string;
    institution_name: string;
    country: string;
    start_date: string;
    end_date: string | null;
    gpa: number | null;
    grade_scale: string | null;
  }[];
}

/* -------------------------------------------------------------------------- */
/*                                Constants                                   */
/* -------------------------------------------------------------------------- */

const DOCUMENT_LABELS: Record<string, string> = {
  passport: "Passport",
  passport_photo: "Passport Photo",
  transcript: "Academic Transcript",
  sop: "Statement of Purpose",
  personal_statement: "Statement of Purpose",
  cv: "CV / Resume",
  degree_certificate: "Degree Certificate",
  recommendation_letter: "Recommendation Letter",
  lor: "Letter of Reference",
  reference_letter: "Letter of Reference",
  english_proficiency: "English Proficiency",
  financial_document: "Financial Document",
  ielts: "IELTS Certificate",
};

const getDocLabel = (t: string) =>
  DOCUMENT_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

const AdminStudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [bundle, setBundle] = useState<StudentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Document preview
  const [previewDoc, setPreviewDoc] = useState<StudentBundle["documents"][0] | null>(null);
  const [missingDocsExpanded, setMissingDocsExpanded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Archive status - check from direct query since RPC doesn't include it
  const [archivedAt, setArchivedAt] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState<string | null>(null);

  /* ------------------------------ Data Load ------------------------------ */

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      // Fetch bundle via RPC
      const { data, error } = await supabase.rpc("get_admin_student_review_bundle", {
        p_student_id: studentId,
      });

      if (error) throw error;
      setBundle(data as unknown as StudentBundle);

      // Also fetch archive status separately
      const { data: archiveData } = await supabase
        .from("students")
        .select("archived_at, archive_reason")
        .eq("id", studentId)
        .maybeSingle();

      setArchivedAt(archiveData?.archived_at ?? null);
      setArchiveReason(archiveData?.archive_reason ?? null);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load student details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    void fetchStudent();
  }, [fetchStudent]);

  /* ------------------------------ Derived ------------------------------ */

  const student = bundle?.student;
  const documents = bundle?.documents ?? [];
  const educationRecords = bundle?.education_records ?? [];

  const studentName =
    student?.preferred_name || student?.legal_name || student?.profile?.full_name || "Unknown Student";

  const isArchived = !!archivedAt;

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
    return { pending, approved, rejected, total: documents.length };
  }, [documents]);

  const missingDocuments = useMemo(
    () => getMissingRequiredStudentDocuments(documents.map((d) => ({ document_type: d.document_type }))),
    [documents],
  );

  /* ------------------------------ Document Actions ------------------------------ */

  const handlePreview = async (doc: StudentBundle["documents"][0]) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    const { data } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(doc.storage_path, 3600);
    setPreviewUrl(data?.signedUrl ?? null);
    setPreviewLoading(false);
  };

  const handleReviewDocument = async (doc: StudentBundle["documents"][0], status: "approved" | "rejected") => {
    if (!profile?.id) return;
    setReviewLoading(true);
    try {
      const reviewedAt = new Date().toISOString();
      const reviewPayload =
        status === "approved"
          ? {
              admin_review_status: "ready_for_university_review",
              admin_reviewed_by: profile.id,
              admin_reviewed_at: reviewedAt,
              verified_status: "verified",
              verified_by: profile.id,
              verified_at: reviewedAt,
              university_access_approved: true,
              university_access_approved_at: reviewedAt,
              university_access_approved_by: profile.id,
            }
          : {
              admin_review_status: "admin_rejected",
              admin_reviewed_by: profile.id,
              admin_reviewed_at: reviewedAt,
              verified_status: "rejected",
              verified_by: profile.id,
              verified_at: reviewedAt,
              university_access_approved: false,
              university_access_approved_at: null,
              university_access_approved_by: null,
            };

      const { data, error } = await supabase
        .from("student_documents")
        .update(reviewPayload)
        .select("id")
        .eq("id", doc.id);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Document review update was not applied");

      toast({ title: `Document ${status}`, description: `The document has been ${status}.` });
      setPreviewDoc(null);
      void fetchStudent();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to update document status", variant: "destructive" });
    } finally {
      setReviewLoading(false);
    }
  };

  /* ------------------------------ Archive/Restore ------------------------------ */

  const handleArchiveStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: profile.id,
          archive_reason: actionReason || null,
        } as any)
        .eq("id", student.id);

      if (error) throw error;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin archived student account: ${studentName}`,
        severity: "medium",
        metadata: { studentId: student.id, studentName, reason: actionReason },
        alert: false,
      });

      toast({ title: "Student archived", description: `${studentName}'s account has been archived.` });
      setArchiveDialogOpen(false);
      setActionReason("");
      navigate("/admin/students");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to archive student", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ archived_at: null, archived_by: null, archive_reason: null } as any)
        .eq("id", student.id);

      if (error) throw error;
      toast({ title: "Student restored", description: `${studentName}'s account has been restored.` });
      setRestoreDialogOpen(false);
      void fetchStudent();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to restore student", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  /* ------------------------------ Render: Loading/Empty ------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Loading student details..." size="lg" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => navigate("/admin/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Students
        </Button>
        <p className="text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  /* ------------------------------ Render: Main ------------------------------ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/students")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-semibold">{studentName}</h1>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
        </div>
        <div className="flex gap-2">
          {isArchived ? (
            <Button variant="outline" onClick={() => setRestoreDialogOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-2" /> Restore
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setArchiveDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Archive
            </Button>
          )}
        </div>
      </div>

      {/* Missing Required Documents - prominent position */}
      {missingDocuments.length > 0 && (
        <>
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-4 w-4" /> Missing Required Documents ({missingDocuments.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setMissingDocsExpanded(true)} className="text-amber-500 hover:text-amber-400 h-7 px-2">
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {missingDocuments.map((doc) => (
                  <Badge key={doc.type} variant="outline" className="border-amber-500/50 text-amber-400">
                    {doc.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Dialog open={missingDocsExpanded} onOpenChange={setMissingDocsExpanded}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" /> Missing Required Documents — {studentName}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                The following {missingDocuments.length} document{missingDocuments.length > 1 ? "s are" : " is"} required but not yet uploaded. Please request these from the student.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mt-2">
                {missingDocuments.map((doc) => (
                  <Card key={doc.type} className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="rounded-lg bg-amber-500/10 p-2">
                        <FileText className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">Not uploaded</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <User className="h-4 w-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="relative">
            <FileText className="h-4 w-4 mr-1" /> Documents
            {documentStats.pending > 0 && (
              <span className="ml-1 h-5 w-5 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center">
                {documentStats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap className="h-4 w-4 mr-1" /> Education
          </TabsTrigger>
          <TabsTrigger value="applications">
            <BookOpen className="h-4 w-4 mr-1" /> Applications
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{student.profile?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Legal Name</p>
                <p className="font-medium">{student.legal_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Preferred Name</p>
                <p className="font-medium">{student.preferred_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {student.date_of_birth ? format(new Date(student.date_of_birth), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nationality</p>
                <p className="font-medium">{student.nationality ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="font-medium">{student.current_country ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">
                  {student.contact_email || student.profile?.email ? (
                    <a href={`mailto:${student.contact_email || student.profile?.email}`} className="text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {student.contact_email || student.profile?.email}
                    </a>
                  ) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">
                  {student.contact_phone ? (
                    <a href={`tel:${student.contact_phone}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {student.contact_phone}
                    </a>
                  ) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">
                  {student.created_at ? format(new Date(student.created_at), "MMM d, yyyy") : "—"}
                </p>
              </div>
              {student.passport_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Passport</p>
                  <p className="font-medium">
                    {student.passport_number}
                    {student.passport_expiry && (
                      <span className="text-muted-foreground text-xs ml-2">
                        (Exp: {format(new Date(student.passport_expiry), "MMM yyyy")})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {isArchived && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Archive Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Archived At</p>
                  <p>{archivedAt ? format(new Date(archivedAt), "MMM d, yyyy HH:mm") : "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p>{archiveReason ?? "No reason provided"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Document Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{documentStats.total}</span> Total
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Clock className="h-3 w-3" /> <span className="font-semibold">{documentStats.pending}</span> Pending
                </div>
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3 w-3" /> <span className="font-semibold">{documentStats.approved}</span> Approved
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3 w-3" /> <span className="font-semibold">{documentStats.rejected}</span> Rejected
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No documents uploaded yet.
              </CardContent>
            </Card>
          ) : (
            documents.map((doc) => {
              const statusColor =
                doc.admin_review_status === "ready_for_university_review" || doc.admin_review_status === "approved"
                  ? "default"
                  : doc.admin_review_status === "admin_rejected" || doc.admin_review_status === "rejected"
                  ? "destructive"
                  : "outline";

              const statusLabel =
                doc.admin_review_status === "ready_for_university_review"
                  ? "Approved"
                  : doc.admin_review_status === "admin_rejected"
                  ? "Rejected"
                  : doc.admin_review_status === "approved"
                  ? "Approved"
                  : doc.admin_review_status === "rejected"
                  ? "Rejected"
                  : "Pending Review";

              return (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{getDocLabel(doc.document_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.file_name} • {formatFileSize(doc.file_size)} •{" "}
                          {format(new Date(doc.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor}>{statusLabel}</Badge>
                      <Button variant="outline" size="sm" onClick={() => handlePreview(doc)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-4 mt-4">
          {educationRecords.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No education records found.
              </CardContent>
            </Card>
          ) : (
            educationRecords.map((edu) => (
              <Card key={edu.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{edu.institution_name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {edu.country}
                      </p>
                      <p className="text-sm mt-1">
                        <Badge variant="outline">{edu.level}</Badge>
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{format(new Date(edu.start_date), "MMM yyyy")}</p>
                      <p>{edu.end_date ? format(new Date(edu.end_date), "MMM yyyy") : "Present"}</p>
                      {edu.gpa && (
                        <p className="font-medium mt-1">
                          GPA: {edu.gpa}{edu.grade_scale ? ` / ${edu.grade_scale}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4 mt-4">
          {(student.applications ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No applications found.
              </CardContent>
            </Card>
          ) : (
            student.applications.map((app) => (
              <Card key={app.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{app.program?.name ?? "Unknown Program"}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.program?.level} • {app.program?.university?.name ?? "Unknown University"}
                      </p>
                      {app.app_number && (
                        <p className="text-xs text-muted-foreground mt-1">#{app.app_number}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{app.status ?? "draft"}</Badge>
                      {app.submitted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {format(new Date(app.submitted_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && getDocLabel(previewDoc.document_type)} — {previewDoc?.file_name}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewUrl ? (
            <div className="space-y-4">
              {previewDoc?.mime_type?.startsWith("image/") ? (
                <img src={previewUrl} alt={previewDoc.file_name} className="max-h-[60vh] mx-auto rounded" />
              ) : previewDoc?.mime_type === "application/pdf" ? (
                <iframe src={previewUrl} className="w-full h-[60vh] rounded border" title="Document Preview" />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </a>
                </div>
              )}

              {/* Review Actions */}
              {previewDoc && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </a>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={reviewLoading}
                    onClick={() => handleReviewDocument(previewDoc, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={reviewLoading}
                    onClick={() => handleReviewDocument(previewDoc, "approved")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Unable to load preview.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {studentName}'s account. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for archiving (optional)"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveStudent} disabled={actionLoading}>
              {actionLoading ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {studentName}'s account and make it active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreStudent} disabled={actionLoading}>
              {actionLoading ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudentDetail;
