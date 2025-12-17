import { useState } from 'react';
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
import { Upload, Loader2 } from 'lucide-react';

interface DocumentUploadDialogProps {
  applicationId: string;
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
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

export function DocumentUploadDialog({
  applicationId,
  onUploadComplete,
  trigger,
}: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      setOpen(false);
      setFile(null);
      setDocumentType('');
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
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this application. Make sure the file is clear and
            readable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !documentType}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
