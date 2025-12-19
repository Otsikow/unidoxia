"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";
import { useStudentRecord } from "@/hooks/useStudentRecord";
import { validateFileUpload } from "@/lib/fileUpload";
import { logError, formatErrorForToast } from "@/lib/errorUtils";

import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ShieldAlert,
  Download,
  Eye,
  RefreshCw,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface Document {
  id: string;
  student_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  verified_status: string;
  verification_notes: string | null;
  created_at: string;
  updated_at?: string;
  verified_at?: string | null;
  verified_by?: string | null;
  checksum?: string | null;
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "transcript", label: "Transcript" },
  { value: "ielts", label: "IELTS" },
  { value: "toefl", label: "TOEFL" },
  { value: "sop", label: "Statement of Purpose" },
  { value: "cv", label: "CV/Resume" },
  { value: "lor", label: "Letter of Recommendation" },
  { value: "portfolio", label: "Portfolio" },
  { value: "financial_document", label: "Financial Document" },
  { value: "other", label: "Other" },
];

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export default function Documents() {
  const { toast } = useToast();
  const { data: studentRecord, isLoading, error } = useStudentRecord();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  /* ------------------------------------------------------------------------ */
  /*                               Data Loading                               */
  /* ------------------------------------------------------------------------ */

  const loadDocuments = useCallback(
    async (id: string) => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("student_documents")
          .select("*")
          .eq("student_id", id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDocuments(data ?? []);
      } catch (err) {
        logError(err, "Documents.loadDocuments");
        toast(formatErrorForToast(err, "Failed to load documents"));
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (isLoading) return;

    if (error) {
      logError(error, "Documents.studentRecord");
      toast(formatErrorForToast(error, "Failed to load student profile"));
      setLoading(false);
      return;
    }

    if (!studentRecord?.id) {
      setStudentId(null);
      setDocuments([]);
      setLoading(false);
      toast({
        title: "Profile Required",
        description: "Please complete your student profile first.",
        variant: "destructive",
      });
      return;
    }

    setStudentId(studentRecord.id);
    loadDocuments(studentRecord.id);
  }, [studentRecord, isLoading, error, loadDocuments, toast]);

  /* ------------------------------------------------------------------------ */
  /*                               File Upload                                */
  /* ------------------------------------------------------------------------ */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !studentId) {
      toast({
        title: "Missing Information",
        description: "Please select a document type and file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { preparedFile, sanitizedFileName, detectedMimeType } =
        await validateFileUpload(selectedFile, {
          allowedMimeTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          allowedExtensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
          maxSizeBytes: 10 * 1024 * 1024,
        });

      const ext = sanitizedFileName.split(".").pop();
      const storagePath = `${studentId}/${documentType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(storagePath, preparedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: detectedMimeType,
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          document_type: documentType,
          file_name: sanitizedFileName,
          file_size: preparedFile.size,
          mime_type: detectedMimeType,
          storage_path: storagePath,
          status: "awaiting_admin_review",
        });

      if (dbError) {
        await supabase.storage.from("student-documents").remove([storagePath]);
        throw dbError;
      }

      toast({ title: "Uploaded", description: "Document uploaded successfully." });
      setSelectedFile(null);
      setDocumentType("");
      loadDocuments(studentId);
    } catch (err) {
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                             Document Actions                             */
  /* ------------------------------------------------------------------------ */

  const getSignedUrl = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data?.signedUrl;
  };

  const handleViewDocument = async (doc: Document) => {
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

      window.open(signedUrl, "_blank");
    } catch (err) {
      logError(err, "Documents.viewDocument");
      toast(formatErrorForToast(err, "Failed to open document"));
    } finally {
      setViewingDocId(null);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
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
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.file_name || "document";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      logError(err, "Documents.downloadDocument");
      toast(formatErrorForToast(err, "Failed to download document"));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleReplaceDocument = async (
    doc: Document,
    file: File,
    resetInput: () => void
  ) => {
    if (!studentId) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile before replacing documents.",
        variant: "destructive",
      });
      return;
    }

    try {
      setReplacingDocId(doc.id);

      const { preparedFile, sanitizedFileName, detectedMimeType } =
        await validateFileUpload(file, {
          allowedMimeTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          allowedExtensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
          maxSizeBytes: 10 * 1024 * 1024,
        });

      const ext = sanitizedFileName.split(".").pop();
      const newStoragePath = `${studentId}/${doc.document_type}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(newStoragePath, preparedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: detectedMimeType,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("student_documents")
        .update({
          file_name: sanitizedFileName,
          file_size: preparedFile.size,
          mime_type: detectedMimeType,
          storage_path: newStoragePath,
          verified_status: "pending",
          verification_notes: null,
          verified_at: null,
          verified_by: null,
          status: "awaiting_admin_review",
        })
        .eq("id", doc.id);

      if (updateError) {
        await supabase.storage
          .from("student-documents")
          .remove([newStoragePath]);
        throw updateError;
      }

      if (doc.storage_path) {
        await supabase.storage
          .from("student-documents")
          .remove([doc.storage_path]);
      }

      toast({
        title: "Document replaced",
        description: `${doc.file_name} has been updated and sent for review.`,
      });

      loadDocuments(studentId);
    } catch (err) {
      logError(err, "Documents.replaceDocument");
      toast(formatErrorForToast(err, "Failed to replace document"));
    } finally {
      resetInput();
      setReplacingDocId(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                            Helpers & Status                              */
  /* ------------------------------------------------------------------------ */

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending Review", variant: "secondary" as const };
      case "rejected":
        return { label: "Rejected", variant: "destructive" as const };
      case "verified":
        return { label: "Verified", variant: "default" as const };
      default:
        return { label: "Pending", variant: "secondary" as const };
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                   UI                                     */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return <div className="text-center py-10">Loading documents…</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">My Documents</h1>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload required documents for your applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>File</Label>
            <Input type="file" onChange={handleFileSelect} />
          </div>

          <Button onClick={handleUpload} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 && (
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          )}

          {documents.map((doc) => {
            const badge = getStatusBadge(doc.verified_status);
            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border rounded-md p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {getStatusIcon(doc.verified_status)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(doc)}
                    disabled={
                      viewingDocId === doc.id ||
                      downloadingDocId === doc.id ||
                      replacingDocId === doc.id
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {viewingDocId === doc.id ? "Opening…" : "View"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc)}
                    disabled={
                      downloadingDocId === doc.id ||
                      replacingDocId === doc.id
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadingDocId === doc.id ? "Preparing…" : "Download"}
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    ref={(el) => {
                      fileInputsRef.current[doc.id] = el;
                    }}
                    onChange={(event) => {
                      const input = event.target;
                      const newFile = input.files?.[0];
                      const reset = () => {
                        input.value = "";
                      };

                      if (newFile) {
                        void handleReplaceDocument(doc, newFile, reset);
                      } else {
                        reset();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputsRef.current[doc.id]?.click()}
                    disabled={replacingDocId === doc.id}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {replacingDocId === doc.id ? "Replacing…" : "Replace"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
