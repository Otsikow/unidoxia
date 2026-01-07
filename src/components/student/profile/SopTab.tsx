import { useCallback, useEffect, useState } from "react";
import SoPGenerator from "@/components/ai/SoPGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Edit3, Loader2, RefreshCw, Trash2 } from "lucide-react";

interface StudentDocument {
  id: string;
  student_id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
  file_size: number;
  mime_type: string;
}

interface LoadedStatementState {
  content: string;
  fileName?: string;
}

interface SopTabProps {
  studentId: string;
  onUpdate?: () => Promise<void> | void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function SopTab({ studentId, onUpdate }: SopTabProps) {
  const { toast } = useToast();
  const [savedStatements, setSavedStatements] = useState<StudentDocument[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [loadingStatementId, setLoadingStatementId] = useState<string | null>(null);
  const [deletingStatementId, setDeletingStatementId] = useState<string | null>(null);
  const [loadedStatement, setLoadedStatement] = useState<LoadedStatementState | null>(null);

  const fetchSavedStatements = useCallback(async () => {
    try {
      setSavedLoading(true);
      const { data, error } = await supabase
        .from("student_documents")
        .select("id, student_id, file_name, storage_path, created_at, file_size, mime_type")
        .eq("student_id", studentId)
        .eq("document_type", "personal_statement")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSavedStatements(data ?? []);
    } catch (error) {
      console.error("Error fetching saved statements:", error);
      toast({
        title: "Error",
        description: "Failed to load saved statements",
        variant: "destructive",
      });
    } finally {
      setSavedLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    fetchSavedStatements();
  }, [fetchSavedStatements]);

  const handleSave = useCallback(
    async (sopContent: string) => {
      try {
        const timestamp = Date.now();
        const storageFileName = `sop_${timestamp}.txt`;
        const storagePath = `${studentId}/${storageFileName}`;
        const blob = new Blob([sopContent], { type: "text/plain" });

        const { error: uploadError } = await supabase.storage
          .from("student-documents")
          .upload(storagePath, blob, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const safeDisplayName = `Statement of Purpose - ${new Date(timestamp)
          .toISOString()
          .replace(/[:]/g, "-")}.txt`;

        const { error: dbError } = await supabase
          .from("student_documents")
          .insert({
            student_id: studentId,
            document_type: "personal_statement",
            file_name: safeDisplayName,
            file_size: blob.size,
            mime_type: "text/plain",
            storage_path: storagePath,
            verified_status: "pending",
          });

        if (dbError) {
          await supabase.storage.from("student-documents").remove([storagePath]);
          throw dbError;
        }

        await fetchSavedStatements();
        await onUpdate?.();
      } catch (error) {
        console.error("Error saving SOP:", error);
        toast({
          title: "Error",
          description: "Failed to save statement",
          variant: "destructive",
        });
      }
    },
    [studentId, fetchSavedStatements, onUpdate, toast],
  );

  const handleLoadStatement = useCallback(
    async (doc: StudentDocument) => {
      try {
        setLoadingStatementId(doc.id);
        const { data, error } = await supabase.storage
          .from("student-documents")
          .download(doc.storage_path);

        if (error || !data) throw error;

        const text = await data.text();
        setLoadedStatement({ content: text, fileName: doc.file_name });
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to load statement",
          variant: "destructive",
        });
      } finally {
        setLoadingStatementId(null);
      }
    },
    [toast],
  );

  const handleDownloadStatement = useCallback(
    async (doc: StudentDocument) => {
      try {
        const { data, error } = await supabase.storage
          .from("student-documents")
          .download(doc.storage_path);

        if (error || !data) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.file_name;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        toast({
          title: "Error",
          description: "Failed to download statement",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleDeleteStatement = useCallback(
    async (doc: StudentDocument) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${doc.file_name}"?`,
      );
      if (!confirmed) return;

      try {
        setDeletingStatementId(doc.id);

        await supabase.storage
          .from("student-documents")
          .remove([doc.storage_path]);

        await supabase.from("student_documents").delete().eq("id", doc.id);

        setSavedStatements((prev) => prev.filter((item) => item.id !== doc.id));
        await onUpdate?.();
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete statement",
          variant: "destructive",
        });
      } finally {
        setDeletingStatementId(null);
      }
    },
    [onUpdate, toast],
  );

  return (
    <div className="space-y-6">
      <SoPGenerator
        onSave={handleSave}
        loadedStatement={loadedStatement}
        onLoadedStatementApplied={() => setLoadedStatement(null)}
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Saved Statements
            </CardTitle>
            <CardDescription>
              Reopen, download, or delete saved drafts
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary">Saved: {savedStatements.length}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSavedStatements}
              disabled={savedLoading}
            >
              {savedLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {savedLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              Loading saved statements…
            </div>
          ) : savedStatements.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No saved statements yet.
            </div>
          ) : (
            <div className="space-y-3">
              {savedStatements.map((doc) => {
                const isLoading = loadingStatementId === doc.id;
                const isDeleting = deletingStatementId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold">{doc.file_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {formatDateTime(doc.created_at)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadStatement(doc)}
                        disabled={isLoading || isDeleting}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Edit3 className="h-4 w-4" />
                        )}
                        Load
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadStatement(doc)}
                        disabled={isDeleting}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteStatement(doc)}
                        disabled={isDeleting || isLoading}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
