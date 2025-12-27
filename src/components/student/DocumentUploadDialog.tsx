import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logError, formatErrorForToast } from '@/lib/errorUtils';
import { validateFileUpload } from '@/lib/fileUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, FileCheck, AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

/**
 * Document request object passed when responding to a university document request.
 * When provided, the document type is locked and cannot be changed by the student.
 */
export interface DocumentRequestInfo {
  id: string;
  document_type: string;
  request_type?: string | null;
  notes?: string | null;
  description?: string | null;
  due_date?: string | null;
}

interface DocumentUploadDialogProps {
  applicationId: string;
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
  /**
   * When responding to a specific document request, pass the request info here.
   * This will lock the document type and link the upload to the request.
   */
  documentRequest?: DocumentRequestInfo;
}

const DOCUMENT_TYPES = [
  { value: 'passport_photo', label: 'Passport Photo' },
  { value: 'passport', label: 'Passport' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
  { value: 'sop', label: 'Statement of Purpose' },
  { value: 'cv', label: 'CV/Resume' },
  { value: 'lor', label: 'Letter of Recommendation' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Other' },
];

type DocumentType = Database['public']['Enums']['document_type'];

/**
 * Maps a document request type to the corresponding enum value for application_documents.
 * Handles various naming conventions used in document requests.
 */
function mapRequestTypeToDocumentType(requestType: string): DocumentType {
  const normalized = requestType.toLowerCase().replace(/[\s_-]+/g, '');
  
  const mappings: Record<string, DocumentType> = {
    'passport': 'passport',
    'passportphoto': 'passport',
    'transcript': 'transcript',
    'academictranscript': 'transcript',
    'ielts': 'ielts',
    'ieltsscore': 'ielts',
    'toefl': 'toefl',
    'toeflscore': 'toefl',
    'sop': 'sop',
    'statementofpurpose': 'sop',
    'cv': 'cv',
    'resume': 'cv',
    'cvresume': 'cv',
    'lor': 'lor',
    'letterofrecommendation': 'lor',
    'recommendation': 'lor',
    'portfolio': 'portfolio',
  };
  
  return mappings[normalized] ?? 'other';
}

/**
 * Formats a document type for display.
 */
function formatDocumentTypeLabel(type: string): string {
  const normalized = type.toLowerCase().replace(/[\s_-]+/g, '');
  const found = DOCUMENT_TYPES.find(
    (t) => t.value.toLowerCase().replace(/[\s_-]+/g, '') === normalized
  );
  if (found) return found.label;
  
  // Fallback: capitalize each word
  return type
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DocumentUploadDialog({
  applicationId,
  onUploadComplete,
  trigger,
  documentRequest,
}: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Determine if this is a locked document request mode
  const isLockedMode = !!documentRequest;
  const lockedDocumentType = documentRequest
    ? mapRequestTypeToDocumentType(documentRequest.document_type)
    : null;
  const lockedDocumentLabel = documentRequest
    ? formatDocumentTypeLabel(documentRequest.document_type)
    : null;

  // When in locked mode, set the document type automatically
  useEffect(() => {
    if (isLockedMode && lockedDocumentType) {
      setDocumentType(lockedDocumentType);
    }
  }, [isLockedMode, lockedDocumentType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentType) {
      toast({
        title: 'Missing information',
        description: 'Please select a document type and file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

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

      // Upload file to Supabase Storage
      const fileExt = sanitizedFileName.split('.').pop();
      // IMPORTANT: application-documents bucket policies expect the first folder
      // segment to be the application id (no extra prefix like `documents/`).
      const filePath = `${applicationId}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(filePath, preparedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: detectedMimeType,
        });

      if (uploadError) throw uploadError;

      // Create document record in database
      const { error: dbError } = await supabase
        .from('application_documents')
        .insert({
          application_id: applicationId,
          document_type: documentType,
          storage_path: filePath,
          mime_type: detectedMimeType,
          file_size: preparedFile.size,
        });

      if (dbError) throw dbError;

      // If this is a response to a document request, update the request status
      if (documentRequest?.id) {
        // Get the public URL for the uploaded document
        const { data: urlData } = supabase.storage
          .from('application-documents')
          .getPublicUrl(filePath);
        
        const publicUrl = urlData?.publicUrl ?? null;

        const { error: requestUpdateError } = await supabase
          .from('document_requests')
          .update({
            status: 'received',
            storage_path: filePath,
            document_url: publicUrl,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', documentRequest.id);

        if (requestUpdateError) {
          // Log but don't fail the entire operation - the document was uploaded
          logError(requestUpdateError, 'DocumentUploadDialog.updateDocumentRequest');
          console.warn('Failed to update document request status, but document was uploaded successfully');
        }

        toast({
          title: 'Document submitted',
          description: `Your ${lockedDocumentLabel} has been uploaded and submitted to the university.`,
        });
      } else {
        toast({
          title: 'Success',
          description: 'Document uploaded successfully',
        });
      }

      setOpen(false);
      setFile(null);
      if (!isLockedMode) {
        setDocumentType('');
      }
      onUploadComplete?.();
    } catch (error) {
      logError(error, 'DocumentUploadDialog.handleUpload');
      toast(formatErrorForToast(error, 'Failed to upload document'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLockedMode ? (
              <>
                <FileCheck className="h-5 w-5 text-primary" />
                Submit Requested Document
              </>
            ) : (
              'Upload Document'
            )}
          </DialogTitle>
          <DialogDescription>
            {isLockedMode ? (
              <>
                The university has requested a specific document from you.
                Upload your <strong>{lockedDocumentLabel}</strong> to complete this request.
              </>
            ) : (
              'Upload a document for this application. Make sure the file is clear and readable.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Request Alert - shown only in locked mode */}
          {isLockedMode && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>This is the document the university has requested.</strong>
                <br />
                Please ensure your file is clear, readable, and matches the requested document type.
              </AlertDescription>
            </Alert>
          )}

          {/* Document Type - locked or selectable */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            {isLockedMode ? (
              <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{lockedDocumentLabel}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  Required
                </Badge>
              </div>
            ) : (
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as DocumentType)}
              >
                <SelectTrigger id="document-type">
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
            )}
          </div>

          {/* Request notes - shown only if document request has notes/description */}
          {isLockedMode && (documentRequest?.notes || documentRequest?.description) && (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Notes from University</Label>
              <p className="text-sm p-3 rounded-md border bg-muted/30">
                {documentRequest?.notes || documentRequest?.description}
              </p>
            </div>
          )}

          {/* Due date - shown if available */}
          {isLockedMode && documentRequest?.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Due by:</span>
              <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
                {new Date(documentRequest.due_date).toLocaleDateString()}
              </Badge>
            </div>
          )}

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPEG, PNG, DOC, DOCX (max 10 MB)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !documentType}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {uploading ? 'Uploading...' : isLockedMode ? 'Submit Document' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
