"use client";

import type React from "react";
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
  Trash2,
} from "lucide-react";

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
  { value: "passport", label: "Passport", required: true },
  { value: "passport_photo", label: "Passport Photo", required: true },
  { value: "transcript", label: "Academic Transcript", required: true },
  { value: "cv", label: "CV / Resume", required: true },
  { value: "ielts", label: "IELTS Score", required: false },
  { value: "toefl", label: "TOEFL Score", required: false },
  { value: "sop", label: "Statement of Purpose", required: false },
  { value: "lor", label: "Letter of Recommendation", required: false },
  { value: "portfolio", label: "Portfolio", required: false },
  { value: "financial_document", label: "Financial Document", required: false },
  { value: "other", label: "Other", required: false },
] as const;

// Required core documents that students should upload
const REQUIRED_DOCUMENTS = DOCUMENT_TYPES.filter((t) => t.required);

// Helper to get document type label from value
const getDocumentTypeLabel = (value: string): string => {
  const docType = DOCUMENT_TYPES.find((t) => t.value === value);
  if (docType) return docType.label;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const UPLOAD_VALIDATION = {
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ] as string[],
  allowedExtensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"] as string[],
  maxSizeBytes: 10 * 1024 * 1024,
};

const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export default function Documents() {
  const { toast } = useToast();
  const { data: studentRecord, isLoading, error } = useStudentRecord();

  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const outstandingFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);

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
        setDocuments((data ?? []) as StudentDocument[]);
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
    void loadDocuments(studentRecord.id);
  }, [studentRecord, isLoading, error, loadDocuments, toast]);

  /* ------------------------------------------------------------------------ */
  /*                               File Upload                                */
  /* ------------------------------------------------------------------------ */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleOutstandingDocClick = (docTypeValue: string) => {
    setPendingDocType(docTypeValue);
    outstandingFileInputRef.current?.click();
  };

  const insertDocumentRow = async (args: {
    student_id: string;
    document_type: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
  }) => {
    const { error: dbError } = await supabase.from("student_documents").insert(args);
    if (dbError) throw dbError;
  };

  const uploadToStorage = async (storagePath: string, file: File, contentType: string) => {
    const { error: uploadError } = await supabase.storage
      .from("student-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType,
      });

    if (uploadError) throw uploadError;
  };

  const handleOutstandingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const selectedDocType = pendingDocType;

    if (!file || !selectedDocType || !studentId) {
      setPendingDocType(null);
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(
        file,
        UPLOAD_VALIDATION
      );

      const ext = sanitizedFileName.split(".").pop() || "pdf";
      const storagePath = `${studentId}/${selectedDocType}_${Date.now()}.${ext}`;

      await uploadToStorage(storagePath, preparedFile, detectedMimeType);

      try {
        await insertDocumentRow({
          student_id: studentId,
          document_type: selectedDocType,
          file_name: sanitizedFileName,
          file_size: preparedFile.size,
          mime_type: detectedMimeType,
          storage_path: storagePath,
        });
      } catch (dbErr) {
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from("student-documents").remove([storagePath]);
        throw dbErr;
      }

      const docLabel =
        DOCUMENT_TYPES.find((t) => t.value === selectedDocType)?.label || selectedDocType;

      toast({ title: "Uploaded", description: `${docLabel} uploaded successfully.` });
      void loadDocuments(studentId);
    } catch (err) {
      logError(err, "Documents.handleOutstandingFileSelect");
      toast(formatErrorForToast(err, "Failed to upload document"));
    } finally {
      setUploading(false);
      setPendingDocType(null);
      e.target.value = "";
    }
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
      const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(
        selectedFile,
        UPLOAD_VALIDATION
      );

      const ext = sanitizedFileName.split(".").pop() || "pdf";
      const storagePath = `${studentId}/${documentType}_${Date.now()}.${ext}`;

      await uploadToStorage(storagePath, preparedFile, detectedMimeType);

      try {
        await insertDocumentRow({
          student_id: studentId,
          document_type: documentType,
          file_name: sanitizedFileName,
          file_size: preparedFile.size,
          mime_type: detectedMimeType,
          storage_path: storagePath,
        });
      } catch (dbErr) {
        await supabase.storage.from("student-documents").remove([storagePath]);
        throw dbErr;
      }

      toast({ title: "Uploaded", description: "Document uploaded successfully." });
      setSelectedFile(null);
      setDocumentType("");
      void loadDocuments(studentId);
    } catch (err) {
      logError(err, "Documents.handleUpload");
      toast(formatErrorForToast(err, "Failed to upload document"));
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
      logError(err, "Documents.viewDocument");
      toast(formatErrorForToast(err, "Failed to open document"));
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
      logError(err, "Documents.downloadDocument");
      toast(formatErrorForToast(err, "Failed to download document"));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleReplaceDocument = async (
    doc: StudentDocument,
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

      const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(
        file,
        UPLOAD_VALIDATION
      );

      const ext = sanitizedFileName.split(".").pop() || "pdf";
      const newStoragePath = `${studentId}/${doc.document_type}_${Date.now()}.${ext}`;

      await uploadToStorage(newStoragePath, preparedFile, detectedMimeType);

      // Reset all verification-related fields when replacing a document
      // This ensures the document goes through the full review workflow again
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
          // Reset admin review status columns
          admin_review_status: "awaiting_admin_review",
          university_access_approved: false,
          university_access_approved_at: null,
          university_access_approved_by: null,
        })
        .eq("id", doc.id);

      if (updateError) {
        await supabase.storage.from("student-documents").remove([newStoragePath]);
        throw updateError;
      }

      if (doc.storage_path) {
        await supabase.storage.from("student-documents").remove([doc.storage_path]);
      }

      toast({
        title: "Document replaced",
        description: `${getDocumentTypeLabel(doc.document_type)} has been updated and sent for review.`,
      });

      void loadDocuments(studentId);
    } catch (err) {
      logError(err, "Documents.replaceDocument");
      toast(formatErrorForToast(err, "Failed to replace document"));
    } finally {
      resetInput();
      setReplacingDocId(null);
    }
  };

  const handleDeleteDocument = async (doc: StudentDocument) => {
    if (!studentId) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive",
      });
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${getDocumentTypeLabel(doc.document_type)}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingDocId(doc.id);

      // Delete from storage first
      if (doc.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("student-documents")
          .remove([doc.storage_path]);

        if (storageError) {
          console.warn("Failed to delete file from storage:", storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("student_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Document deleted",
        description: `${getDocumentTypeLabel(doc.document_type)} has been deleted.`,
      });

      void loadDocuments(studentId);
    } catch (err) {
      logError(err, "Documents.deleteDocument");
      toast(formatErrorForToast(err, "Failed to delete document"));
    } finally {
      setDeletingDocId(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                            Helpers & Status                              */
  /* ------------------------------------------------------------------------ */

  const getStatusBadge = (doc: StudentDocument) => {
    // Show admin review status first if applicable
    const adminStatus = doc.admin_review_status;
    
    if (adminStatus === "admin_rejected") {
      return { label: "Rejected - Resubmit Required", variant: "destructive" as const };
    }
    if (adminStatus === "awaiting_admin_review") {
      return { label: "Pending Admin Review", variant: "secondary" as const };
    }
    if (adminStatus === "ready_for_university_review") {
      // Document is approved by admin, check university verification status
      switch (doc.verified_status) {
        case "verified":
          return { label: "Verified by University", variant: "default" as const };
        case "rejected":
          return { label: "Rejected by University", variant: "destructive" as const };
        default:
          return { label: "Approved - Pending University Review", variant: "outline" as const };
      }
    }
    
    // Fallback to verified_status
    switch (doc.verified_status) {
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

  const getStatusIcon = (doc: StudentDocument) => {
    const adminStatus = doc.admin_review_status;
    
    if (adminStatus === "admin_rejected") {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (adminStatus === "awaiting_admin_review") {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    if (adminStatus === "ready_for_university_review") {
      if (doc.verified_status === "verified") {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      }
      return <ShieldAlert className="h-4 w-4 text-blue-500" />;
    }
    
    // Fallback
    switch (doc.verified_status) {
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

  const getStatusIconLegacy = (status: string) => {
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
          <CardDescription>Upload required documents for your applications</CardDescription>
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
            <Input type="file" accept={FILE_ACCEPT} onChange={handleFileSelect} />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !studentId}
            aria-disabled={uploading || !studentId}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </CardContent>
      </Card>

      {/* Outstanding Documents */}
      {(() => {
        // Get the latest document for each type (to check if it's rejected)
        const latestDocByType = new Map<string, StudentDocument>();
        for (const doc of documents) {
          const existing = latestDocByType.get(doc.document_type);
          if (!existing || new Date(doc.created_at) > new Date(existing.created_at)) {
            latestDocByType.set(doc.document_type, doc);
          }
        }

        // Find required documents that are either not uploaded or rejected
        const notUploaded = REQUIRED_DOCUMENTS.filter((t) => !latestDocByType.has(t.value));
        
        // Find rejected documents (from all document types, not just required)
        // Include both admin-rejected and university-rejected documents
        const rejectedDocs = Array.from(latestDocByType.values()).filter(
          (doc) => doc.verified_status === "rejected" || doc.admin_review_status === "admin_rejected"
        );

        // No outstanding items
        if (notUploaded.length === 0 && rejectedDocs.length === 0) return null;

        return (
          <Card className="border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Outstanding Documents
              </CardTitle>
              <CardDescription className="text-muted-foreground dark:text-amber-200/70">
                The following documents are required but have not been uploaded yet. Click to
                upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hidden file input for outstanding document uploads */}
              <input
                type="file"
                className="hidden"
                ref={outstandingFileInputRef}
                accept={FILE_ACCEPT}
                onChange={handleOutstandingFileSelect}
              />

              {/* Rejected Documents Section */}
              {rejectedDocs.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Rejected Documents - Please Resubmit
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rejectedDocs.map((doc) => {
                      const isUploading = uploading && pendingDocType === doc.document_type;
                      const docLabel = getDocumentTypeLabel(doc.document_type);

                      return (
                        <button
                          key={`rejected-${doc.id}`}
                          onClick={() => handleOutstandingDocClick(doc.document_type)}
                          disabled={uploading}
                          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer text-left group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                          type="button"
                        >
                          <div className="flex-shrink-0 h-11 w-11 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/60 transition-colors">
                            {isUploading ? (
                              <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-400 animate-spin" />
                            ) : (
                              <Upload className="h-5 w-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {docLabel}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {isUploading ? "Uploading..." : "Click to resubmit"}
                            </p>
                            {(doc.admin_review_notes || doc.verification_notes) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={doc.admin_review_notes || doc.verification_notes || ""}>
                                Reason: {doc.admin_review_notes || doc.verification_notes}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Not Yet Uploaded Documents Section */}
              {notUploaded.length > 0 && (
                <div className="space-y-3">
                  {rejectedDocs.length > 0 && (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Not Yet Uploaded
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {notUploaded.map((docType) => {
                      const isUploading = uploading && pendingDocType === docType.value;

                      return (
                        <button
                          key={docType.value}
                          onClick={() => handleOutstandingDocClick(docType.value)}
                          disabled={uploading}
                          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-amber-300 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer text-left group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                          type="button"
                        >
                          <div className="flex-shrink-0 h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-800/60 transition-colors">
                            {isUploading ? (
                              <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-spin" />
                            ) : (
                              <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {docType.label}
                            </p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                              {isUploading ? "Uploading..." : "Click to upload"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>Documents you have uploaded for your applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 && (
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          )}

          {documents.map((doc) => {
            const badge = getStatusBadge(doc);
            const docTypeLabel = getDocumentTypeLabel(doc.document_type);

            const isBusy =
              viewingDocId === doc.id ||
              downloadingDocId === doc.id ||
              replacingDocId === doc.id ||
              deletingDocId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border rounded-md p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>
                    <p className="font-semibold text-base">{docTypeLabel}</p>
                    <p
                      className="text-sm text-muted-foreground truncate max-w-[200px]"
                      title={doc.file_name}
                    >
                      {doc.file_name}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {getStatusIcon(doc)}
                    </div>
                    {doc.admin_review_notes && doc.admin_review_status === "admin_rejected" && (
                      <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded p-2 mt-2">
                        <strong>Rejection Reason:</strong> {doc.admin_review_notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleViewDocument(doc)}
                    disabled={isBusy}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {viewingDocId === doc.id ? "Opening…" : "View"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDownloadDocument(doc)}
                    disabled={downloadingDocId === doc.id || replacingDocId === doc.id}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadingDocId === doc.id ? "Preparing…" : "Download"}
                  </Button>

                  <input
                    type="file"
                    className="hidden"
                    accept={FILE_ACCEPT}
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDeleteDocument(doc)}
                    disabled={isBusy}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingDocId === doc.id ? "Deleting…" : "Delete"}
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
