"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { AdminStudentChat } from "@/components/admin/AdminStudentChat";

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
  finances_json: Record<string, any> | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  applications: {
    id: string;
    status: string | null;
    app_number: string | null;
    submitted_at: string | null;
    program: {
      name: string | null;
      level: string | null;
      university: {
        name: string | null;
        country: string | null;
      } | null;
    } | null;
  }[];
}

interface TestScore {
  id: string;
  test_type: string;
  total_score: number | null;
  subscores_json: unknown;
  test_date: string | null;
}

interface StudentProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  applicationId?: string | null;
}

/* -------------------------------------------------------------------------- */
/*                               Constants                                    */
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
  letter_of_reference: "Letter of Reference",
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
/*                               Component                                    */
/* -------------------------------------------------------------------------- */

export function StudentProfileSheet({
  open,
  onOpenChange,
  studentId,
  applicationId,
}: StudentProfileSheetProps) {
  const { profile: adminProfile } = useAuth();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [education, setEducation] = useState<EducationRecord[]>([]);
  const [testScores, setTestScores] = useState<TestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [sopContent, setSopContent] = useState<string | null>(null);
  const [sopLoading, setSopLoading] = useState(false);

  /* ------------------------------ Data Load ------------------------------ */

  const loadData = useCallback(async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: studentData, error: studentErr } = await supabase
        .from("students")
        .select(`
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
          finances_json,
          created_at,
          profile:profiles (
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
              name,
              level,
              university:universities ( name, country )
            )
          )
        `)
        .eq("id", studentId)
        .maybeSingle();

      if (studentErr) throw studentErr;
      if (!studentData) {
        setError("Student not found");
        return;
      }

      setStudent(studentData as StudentProfile);

      // Load documents
      const { data: docs } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      setDocuments(docs ?? []);

      // Load education
      const { data: edu } = await supabase
        .from("education_records")
        .select("*")
        .eq("student_id", studentId);

      setEducation(edu ?? []);

      // Load test scores
      const { data: scores } = await supabase
        .from("test_scores")
        .select("*")
        .eq("student_id", studentId);

      setTestScores(scores ?? []);

    } catch (e) {
      console.error(e);
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (open && studentId) {
      loadData();
      setActiveTab("overview");
      setSopContent(null);
    }
  }, [open, studentId, loadData]);

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
    return { pending, approved, rejected, total: documents.length };
  }, [documents]);

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

  /* ------------------------------ Document Review ------------------------------ */

  const handleReviewDocument = async (doc: StudentDocument, status: "approved" | "rejected") => {
    if (!adminProfile?.id) return;
    setReviewLoading(true);
    try {
      const { error } = await supabase
        .from("student_documents")
        .update({
          admin_review_status: status === "approved" ? "ready_for_university_review" : "admin_rejected",
          admin_reviewed_by: adminProfile.id,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      if (error) throw error;

      toast({
        title: `Document ${status}`,
        description: `The document has been ${status}.`,
      });

      // Update local state
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, admin_review_status: status === "approved" ? "ready_for_university_review" : "admin_rejected" }
            : d
        )
      );
      setPreviewDoc(null);
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

  /* ------------------------------ Load SOP Content ------------------------------ */

  const loadSopContent = useCallback(async () => {
    const sopDoc = documents.find(
      (d) => d.document_type === "sop" || d.document_type === "personal_statement"
    );
    if (!sopDoc) {
      setSopContent(null);
      return;
    }

    setSopLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .download(sopDoc.storage_path);

      if (error || !data) throw error;

      const text = await data.text();
      setSopContent(text);
    } catch (e) {
      console.error(e);
      setSopContent(null);
    } finally {
      setSopLoading(false);
    }
  }, [documents]);

  useEffect(() => {
    if (activeTab === "sop") {
      loadSopContent();
    }
  }, [activeTab, loadSopContent]);

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

  /* ------------------------------ Render ------------------------------ */

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">{studentName}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {studentEmail && (
                    <a href={`mailto:${studentEmail}`} className="flex items-center gap-1 hover:underline">
                      <Mail className="h-3 w-3" /> {studentEmail}
                    </a>
                  )}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    overallStatus === "ready"
                      ? "default"
                      : overallStatus === "needs_attention"
                      ? "destructive"
                      : "outline"
                  }
                  className={overallStatus === "ready" ? "bg-green-600" : ""}
                >
                  {overallStatus === "ready" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {overallStatus === "needs_attention" && <AlertCircle className="w-3 h-3 mr-1" />}
                  {overallStatus === "review_in_progress" && <Clock className="w-3 h-3 mr-1" />}
                  {overallStatus === "ready"
                    ? "Ready"
                    : overallStatus === "needs_attention"
                    ? "Needs Attention"
                    : overallStatus === "review_in_progress"
                    ? "In Review"
                    : "Pending"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/admin/students/${studentId}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {loading ? (
            <div className="space-y-4 flex-1">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : student ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents" className="relative">
                  Documents
                  {documentStats.pending > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center">
                      {documentStats.pending}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sop">SOP</TabsTrigger>
                <TabsTrigger value="applications">Apps</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">Legal Name</span>
                          <p className="font-medium">{student.legal_name || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date of Birth</span>
                          <p className="font-medium">
                            {student.date_of_birth
                              ? format(new Date(student.date_of_birth), "MMM d, yyyy")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Nationality</span>
                          <p className="font-medium">{student.nationality || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Country</span>
                          <p className="font-medium">{student.current_country || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone</span>
                          <p className="font-medium">
                            {student.contact_phone ? (
                              <a href={`tel:${student.contact_phone}`} className="hover:underline">
                                {student.contact_phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">WhatsApp</span>
                          <p className="font-medium">
                            {whatsappNumber ? (
                              <a
                                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:underline"
                              >
                                {whatsappNumber}
                              </a>
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Passport No.</span>
                          <p className="font-medium">{student.passport_number || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Passport Expiry</span>
                          <p className="font-medium">
                            {student.passport_expiry
                              ? format(new Date(student.passport_expiry), "MMM d, yyyy")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Education Records */}
                  {education.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" /> Education History
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {education.map((edu) => (
                          <div key={edu.id} className="border-l-2 border-primary pl-3 py-1">
                            <p className="font-medium text-sm">{edu.institution_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {edu.level} • {edu.country}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(edu.start_date), "yyyy")} -{" "}
                              {edu.end_date ? format(new Date(edu.end_date), "yyyy") : "Present"}
                              {edu.gpa && ` • GPA: ${edu.gpa}`}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Test Scores */}
                  {testScores.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Test Scores
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {testScores.map((score) => (
                          <div key={score.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium uppercase">{score.test_type}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{score.total_score ?? "—"}</Badge>
                              {score.test_date && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(score.test_date), "MMM yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
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
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <p className="text-2xl font-bold text-amber-500">{documentStats.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <p className="text-2xl font-bold text-green-500">{documentStats.approved}</p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <p className="text-2xl font-bold text-red-500">{documentStats.rejected}</p>
                          <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0 space-y-3">
                  {documents.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{getDocLabel(doc.document_type)}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file_name} • {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              doc.admin_review_status === "ready_for_university_review" ||
                              doc.admin_review_status === "approved"
                                ? "default"
                                : doc.admin_review_status === "rejected" ||
                                  doc.admin_review_status === "admin_rejected"
                                ? "destructive"
                                : "outline"
                            }
                            className={
                              doc.admin_review_status === "ready_for_university_review" ||
                              doc.admin_review_status === "approved"
                                ? "bg-green-600"
                                : ""
                            }
                          >
                            {doc.admin_review_status === "ready_for_university_review" ||
                            doc.admin_review_status === "approved"
                              ? "Approved"
                              : doc.admin_review_status === "rejected" ||
                                doc.admin_review_status === "admin_rejected"
                              ? "Rejected"
                              : "Pending"}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => preview(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* SOP Tab */}
                <TabsContent value="sop" className="mt-0">
                  {sopLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sopContent ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Statement of Purpose</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap text-sm font-sans bg-muted p-4 rounded-lg">
                            {sopContent}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No statement of purpose uploaded yet.
                    </div>
                  )}
                </TabsContent>

                {/* Applications Tab */}
                <TabsContent value="applications" className="mt-0 space-y-3">
                  {student.applications && student.applications.length > 0 ? (
                    student.applications.map((app) => (
                      <Card key={app.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{app.program?.name || "Unknown Program"}</p>
                              <p className="text-sm text-muted-foreground">
                                {app.program?.university?.name || ""}
                                {app.program?.university?.country && ` • ${app.program.university.country}`}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {app.app_number && `#${app.app_number}`}
                                {app.submitted_at &&
                                  ` • Submitted ${format(new Date(app.submitted_at), "MMM d, yyyy")}`}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {app.status?.replace(/_/g, " ") || "Draft"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No applications found.
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc && getDocLabel(previewDoc.document_type)}</DialogTitle>
            <DialogDescription>{previewDoc?.file_name}</DialogDescription>
          </DialogHeader>

          <div className="min-h-[50vh] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {previewLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl ? (
              previewDoc?.mime_type === "application/pdf" ? (
                <iframe src={previewUrl} className="w-full h-[50vh] border-0" />
              ) : (
                <img
                  src={previewUrl}
                  className="max-w-full max-h-[50vh] object-contain"
                  alt={previewDoc?.file_name}
                />
              )
            ) : (
              <p className="text-muted-foreground">Unable to load preview</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {previewUrl && (
              <Button variant="outline" asChild>
                <a href={previewUrl} download={previewDoc?.file_name} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Download
                </a>
              </Button>
            )}
            {previewDoc &&
              (!previewDoc.admin_review_status || previewDoc.admin_review_status === "pending") && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleReviewDocument(previewDoc, "rejected")}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleReviewDocument(previewDoc, "approved")}
                    disabled={reviewLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {reviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      {student && (
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogContent className="max-w-2xl p-0" hideClose>
            <AdminStudentChat
              studentProfileId={student.profile_id}
              studentName={studentName}
              onClose={() => setChatOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
