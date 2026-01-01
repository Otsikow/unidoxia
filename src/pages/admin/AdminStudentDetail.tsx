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
  Plane,
  RefreshCw,
  Send,
  User,
  X,
  XCircle,
  PenTool,
} from "lucide-react";

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

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string | null;
  };
}

interface StudentProfile {
  id: string;
  profile_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  nationality: string | null;
  current_country: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  visa_history_json: any[];
  created_at: string;
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
};

const getDocLabel = (t: string) =>
  DOCUMENT_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

  const [chatOpen, setChatOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  /* ------------------------------ Data Load ------------------------------ */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: studentData, error: studentErr } = await supabase
        .from("students")
        .select(`
          *,
          profile:profiles (*),
          applications (
            id,
            status,
            program:programs (
              name,
              university:universities ( name )
            )
          )
        `)
        .eq("id", studentId)
        .single();

      if (studentErr) throw studentErr;

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

  /* ------------------------------ Render ------------------------------ */

  if (loading) return <Skeleton className="h-96 w-full" />;

  if (error || !student) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error ?? "Student not found"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/students")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <h1 className="text-2xl font-semibold">
        {student.preferred_name || student.legal_name}
      </h1>

      {/* DOCUMENTS */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border p-4 rounded flex justify-between">
              <div>
                <p className="font-medium">{getDocLabel(doc.document_type)}</p>
                <p className="text-sm text-muted-foreground">{doc.file_name}</p>
              </div>
              <Button size="sm" onClick={() => preview(doc)}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CHAT */}
      <Button variant="outline" onClick={() => setChatOpen(true)}>
        <MessageSquare className="h-4 w-4 mr-2" /> Message Student
      </Button>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl p-0">
          <AdminStudentChat
            studentProfileId={student.profile_id}
            studentName={student.preferred_name || student.legal_name || "Student"}
            onClose={() => setChatOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* APPLICATION REVIEW */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-3xl">
          {selectedAppId && (
            <ApplicationReview
              applicationId={selectedAppId}
              defaultStage="admin_review"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PREVIEW */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewDoc && getDocLabel(previewDoc.document_type)}</DialogTitle>
          </DialogHeader>

          <div ref={previewRef} className="min-h-[60vh] bg-muted">
            {previewLoading ? (
              <Loader2 className="animate-spin m-auto" />
            ) : previewUrl ? (
              previewDoc?.mime_type === "application/pdf" ? (
                <iframe src={previewUrl} className="w-full h-full" />
              ) : (
                <img src={previewUrl} className="w-full h-full object-contain" />
              )
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
            <Button onClick={() => setPreviewDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudentDetail;
