import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Documents {
  passport_photo: File | null;
  transcript: File | null;
  passport: File | null;
  ielts: File | null;
  sop: File | null;
}

export type ExistingDocumentMap = Partial<
  Record<
    keyof Documents,
    {
      fileName: string;
      fileSize: number;
      mimeType: string;
      verifiedStatus?: string | null;
    }
  >
>;

interface DocumentsUploadStepProps {
  data: Documents;
  onChange: (data: Documents) => void;
  onNext: () => void;
  onBack: () => void;
  existingDocuments?: ExistingDocumentMap;
}

const DOCUMENT_TYPES = [
  {
    key: 'passport_photo' as keyof Documents,
    label: 'Passport Photo',
    description: 'A recent passport-style photo of yourself',
    required: true,
  },
  {
    key: 'transcript' as keyof Documents,
    label: 'Academic Transcript',
    description: 'Official transcript of your academic records',
    required: true,
  },
  {
    key: 'passport' as keyof Documents,
    label: 'Passport Copy',
    description: 'Clear copy of your passport bio-data page',
    required: true,
  },
  {
    key: 'ielts' as keyof Documents,
    label: 'English Test Score (IELTS/TOEFL)',
    description: 'Official English language test results',
    required: false,
  },
  {
    key: 'sop' as keyof Documents,
    label: 'Statement of Purpose',
    description: 'Your personal statement explaining your goals',
    required: true,
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function DocumentsUploadStep({
  data,
  onChange,
  onNext,
  onBack,
  existingDocuments,
}: DocumentsUploadStepProps) {
  const handleFileChange = (key: keyof Documents, file: File | null) => {
    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert('File size must be less than 10MB');
        return;
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('File type not supported. Please upload PDF, DOC, DOCX, JPG, or PNG files.');
        return;
      }
    }

    onChange({ ...data, [key]: file });
  };

  const removeFile = (key: keyof Documents) => {
    onChange({ ...data, [key]: null });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isValid = () => {
    // Check if all required documents are uploaded
    const requiredDocs = DOCUMENT_TYPES.filter((doc) => doc.required);
    return requiredDocs.every(
      (doc) => data[doc.key] !== null || Boolean(existingDocuments?.[doc.key]),
    );
  };

  const uploadedCount = DOCUMENT_TYPES.reduce((count, docType) => {
    const hasFile = data[docType.key] !== null;
    const hasExisting = Boolean(existingDocuments?.[docType.key]);

    return count + (hasFile || hasExisting ? 1 : 0);
  }, 0);
  const totalDocs = DOCUMENT_TYPES.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload the required documents for your application. All files must be under 10MB.
          </CardDescription>
          <div className="pt-2">
            <Badge variant="secondary">
              {uploadedCount} of {totalDocs} documents uploaded
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {DOCUMENT_TYPES.map((docType) => {
            const file = data[docType.key];
            const hasFile = file !== null;
            const existingDocument = existingDocuments?.[docType.key];
            const hasDocument = hasFile || Boolean(existingDocument);

            return (
              <Card key={docType.key} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {docType.label}
                        {docType.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {docType.description}
                      </CardDescription>
                    </div>
                    {hasDocument && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasFile ? (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(docType.key)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : existingDocument ? (
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Using your saved document</p>
                            <p className="text-xs text-muted-foreground">
                              {existingDocument.fileName} • {formatFileSize(existingDocument.fileSize)}
                            </p>
                            {existingDocument.mimeType && (
                              <p className="text-xs text-muted-foreground">{existingDocument.mimeType}</p>
                            )}
                            {existingDocument.verifiedStatus && (
                              <p className="text-xs text-muted-foreground">
                                Status: {existingDocument.verifiedStatus}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">Already uploaded</Badge>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById(`file-${docType.key}`) as HTMLInputElement | null;
                            input?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Replace file
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label
                        htmlFor={`file-${docType.key}`}
                        className="cursor-pointer"
                      >
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF, DOC, DOCX, JPG, PNG (max 10MB)
                          </p>
                        </div>
                      </Label>
                      <Input
                        id={`file-${docType.key}`}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(docType.key, file);
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Important Notes */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Important Document Guidelines:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>All documents must be clear and legible</li>
                    <li>Transcripts should be official or certified copies</li>
                    <li>Passport must be valid for at least 6 months</li>
                    <li>English test scores should be from the last 2 years</li>
                    <li>Statement of Purpose should be 500-1000 words</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onNext} disabled={!isValid()}>
              Continue to Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
