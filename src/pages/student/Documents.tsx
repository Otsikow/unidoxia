import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, logError, formatErrorForToast } from '@/lib/errorUtils';
import { validateFileUpload } from '@/lib/fileUpload';
import { FileText, Upload, Download, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { useStudentRecord } from '@/hooks/useStudentRecord';

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
}

const ADMIN_REVIEW_STATUS = 'awaiting_admin_review' as const;
const ADMIN_REVIEW_MESSAGE =
  'Pending admin review – we are checking your document for accuracy.';

const DOCUMENT_TYPES = [
  'passport_photo',
  'passport',
  'transcript',
  'degree_certificate',
  'english_test',
  'recommendation_letter',
  'personal_statement',
  'cv_resume',
  'financial_document',
  'other',
];

export default function Documents() {
  const { toast } = useToast();
  const {
    data: studentRecord,
    isLoading: studentRecordLoading,
    error: studentRecordError,
  } = useStudentRecord();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');

  const loadDocumentsForStudent = useCallback(
    async (id: string) => {
      try {
        setLoading(true);

        const { data: docsData, error: docsError } = await supabase
          .from('student_documents')
          .select('*')
          .eq('student_id', id)
          .order('created_at', { ascending: false });

        if (docsError) throw docsError;

        setDocuments(docsData || []);
      } catch (error) {
        logError(error, 'Documents.loadDocumentsForStudent');
        toast(formatErrorForToast(error, 'Failed to load documents'));
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (studentRecordLoading) return;

    if (studentRecordError) {
      logError(studentRecordError, 'Documents.studentRecord');
      toast(formatErrorForToast(studentRecordError, 'Failed to load student information'));
      setLoading(false);
      return;
    }

    if (!studentRecord?.id) {
      setStudentId(null);
      setDocuments([]);
      setLoading(false);
      toast({
        title: 'Profile Required',
        description: 'Student profile not found. Please complete your profile first.',
        variant: 'destructive',
      });
      return;
    }

    setStudentId(studentRecord.id);
    loadDocumentsForStudent(studentRecord.id);
  }, [studentRecord, studentRecordLoading, studentRecordError, loadDocumentsForStudent, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !studentId) {
      toast({
        title: 'Error',
        description: 'Please select a file and document type',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(selectedFile, {
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        maxSizeBytes: 10 * 1024 * 1024,
      });

      const fileExt = sanitizedFileName.split('.').pop();
      const filePath = `${studentId}/${documentType}_${Date.now()}.${fileExt}`;

      console.log('Uploading file:', {
        bucket: 'student-documents',
        path: filePath,
        fileName: sanitizedFileName,
        size: preparedFile.size,
        type: detectedMimeType,
      });

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, preparedFile, { cacheControl: '3600', upsert: false, contentType: detectedMimeType });

      if (uploadError) throw new Error(uploadError.message);

      const { error: dbError } = await supabase
        .from('student_documents')
        .insert({
          student_id: studentId,
          document_type: documentType,
          file_name: sanitizedFileName,
          file_size: preparedFile.size,
          mime_type: detectedMimeType,
          storage_path: filePath,
          verified_status: ADMIN_REVIEW_STATUS,
        });

      if (dbError) {
        await supabase.storage.from('student-documents').remove([filePath]);
        throw new Error(dbError.message);
      }

      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setSelectedFile(null);
      setDocumentType('');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      if (studentId) {
        loadDocumentsForStudent(studentId);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('student-documents')
        .download(doc.storage_path);
      if (error || !data) throw new Error('Download failed');

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Downloaded', description: 'Document downloaded successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Download failed',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        await supabase.storage.from('student-documents').remove([doc.storage_path]);
        await supabase.from('student_documents').delete().eq('id', doc.id);

        toast({ title: 'Deleted', description: 'Document removed successfully' });
        if (studentId) {
          loadDocumentsForStudent(studentId);
        }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Delete failed',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ADMIN_REVIEW_STATUS:
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatStatusLabel = (status: string) => {
    if (!status) return 'Unknown';

    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Loading documents...</div>;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <BackButton variant="ghost" size="sm" wrapperClassName="mb-4" fallback="/dashboard" />

      <div className="space-y-1.5 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">My Documents</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Upload and manage your application documents
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload New Document
          </CardTitle>
          <CardDescription>
            Upload transcripts, certificates, test scores, and other documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            {ADMIN_REVIEW_MESSAGE}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-input">Select File</Label>
              <Input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="text-sm text-muted-foreground break-words">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !documentType}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> My Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded yet. Upload your first document above.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-4 p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium break-words">{doc.file_name}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {doc.document_type
                          .split('_')
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}{' '}
                        • {formatFileSize(doc.file_size)} •{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                      {doc.verification_notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Note: {doc.verification_notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge
                      variant={
                        doc.verified_status === 'verified'
                          ? 'default'
                          : doc.verified_status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      {getStatusIcon(doc.verified_status)}
                      {formatStatusLabel(doc.verified_status)}
                    </Badge>
                    {doc.verified_status === ADMIN_REVIEW_STATUS && (
                      <span className="text-xs text-muted-foreground">
                        {ADMIN_REVIEW_MESSAGE}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
