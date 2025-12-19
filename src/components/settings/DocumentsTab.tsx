import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateFileUpload } from '@/lib/fileUpload';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  File,
  Image,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DocumentsTabProps {
  profile: any;
}

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'resume', label: 'Resume/CV' },
  { value: 'recommendation', label: 'Recommendation Letter' },
  { value: 'financial', label: 'Financial Document' },
  { value: 'other', label: 'Other' },
];

const DocumentsTab = ({ profile }: DocumentsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);

  // Fetch student documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['userDocuments', profile.id],
    queryFn: async () => {
      // Get student ID first
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) return [];

      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentData.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const document = documents?.find((d) => d.id === documentId);
      if (!document) throw new Error('Document not found');

      // Delete from storage using the full storage path
      const { error: storageError } = await supabase.storage
        .from('student-documents')
        .remove([document.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDocuments', profile.id] });
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !documentType) {
      toast({
        title: 'Missing information',
        description: 'Please select a document type',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(file, {
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ],
        allowedExtensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'],
        maxSizeBytes: 10 * 1024 * 1024,
      });

      // Get student ID first
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) {
        throw new Error('No student profile found. Please complete your profile setup first.');
      }

      // Upload to storage using student ID (required by RLS policy)
      const fileExt = sanitizedFileName.split('.').pop();
      const fileName = `${studentData.id}/${Date.now()}-${documentType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(fileName, preparedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: detectedMimeType,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from('student_documents').insert({
        student_id: studentData.id,
        document_type: documentType,
        file_name: sanitizedFileName,
        storage_path: fileName,
        file_size: preparedFile.size,
        mime_type: detectedMimeType,
        verified_status: 'pending',
        admin_review_status: 'awaiting_admin_review',
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['userDocuments', profile.id] });

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      // Reset form
      setDocumentType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('student-documents')
        .download(document.storage_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (document: any) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  if (isLoading) {
    return <LoadingState message="Loading documents..." />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload and manage your important documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Upload New Document</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="documentType">Document Type</Label>
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

              <div className="grid gap-2">
                <Label htmlFor="file">Choose File</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    onChange={handleFileUpload}
                    disabled={!documentType || isUploading}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, DOC, DOCX, JPG, PNG. Max size: 10MB
                </p>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Uploaded Documents</h3>
            {!documents || documents.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No documents uploaded"
                description="Upload your first document to get started"
              />
            ) : (
              <div className="space-y-2">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(document.mime_type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{document.file_name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{document.document_type}</span>
                          <span>•</span>
                          <span>{formatFileSize(document.file_size)}</span>
                          <span>•</span>
                          <span>
                            {new Date(document.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(document)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && deleteMutation.mutate(documentToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DocumentsTab;
