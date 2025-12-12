import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider } from "@/components/ui/tooltip";
import { IconTooltip } from "./IconTooltip";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  X,
  Users,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorDetails: string[];
}

interface StudentRecord {
  name: string;
  email: string;
  phone?: string;
  nationality: string;
  academic_history: string;
  desired_country: string;
  program_interests: string;
  gpa?: number;
  ielts_score?: number;
  toefl_score?: number;
  budget?: number;
  notes?: string;
}

const REQUIRED_HEADERS = [
  'name',
  'email',
  'nationality',
  'academic_history',
  'desired_country',
  'program_interests',
] as const;

type HeaderMap = Record<string, number>;

const normalizeHeader = (header: string) =>
  header
    .replace(/\uFEFF/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const detectDelimiter = (line: string) => {
  const commaCount = (line.match(/,/g) ?? []).length;
  const semicolonCount = (line.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const cleanCSVValue = (value: string) =>
  value
    .replace(/\uFEFF/g, '')
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/""/g, '"');

const getValueFromRow = (values: string[], headerMap: HeaderMap, key: string) => {
  const index = headerMap[key];
  if (index === undefined) {
    return '';
  }
  return cleanCSVValue(values[index] ?? '');
};

const getOptionalValueFromRow = (values: string[], headerMap: HeaderMap, key: string) => {
  const value = getValueFromRow(values, headerMap, key);
  return value.length > 0 ? value : undefined;
};

const getNumericValueFromRow = (
  values: string[],
  headerMap: HeaderMap,
  key: string,
  parser: (value: string) => number
) => {
  const value = getValueFromRow(values, headerMap, key);
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/,/g, '');
  const parsed = parser(normalized);

  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

export default function BulkImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<StudentRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === 'text/csv' ||
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.name.toLowerCase().endsWith('.csv')
      ) {
        setFile(selectedFile);
        setImportResult(null);
        parseCSV(selectedFile);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV file',
          variant: 'destructive'
        });
        setFile(null);
        setPreviewData([]);
        setShowPreview(false);
        setImportResult(null);
        if (event.target) {
          event.target.value = '';
        }
      }
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;

        if (typeof text !== 'string') {
          throw new Error('Unable to read file contents.');
        }

        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const rawLines = normalizedText.split('\n');
        const lines = rawLines.filter((line) => line.trim().length > 0);

        if (lines.length === 0) {
          toast({
            title: 'Empty CSV file',
            description: 'The selected file does not contain any data.',
            variant: 'destructive',
          });
          setPreviewData([]);
          setShowPreview(false);
          return;
        }

        const delimiter = detectDelimiter(lines[0]);
        const rawHeaders = parseCSVLine(lines[0], delimiter);
        const headerMap = rawHeaders.reduce<HeaderMap>((acc, header, index) => {
          const normalized = normalizeHeader(header);
          if (normalized && acc[normalized] === undefined) {
            acc[normalized] = index;
          }
          return acc;
        }, {});

        const missingHeaders = REQUIRED_HEADERS.filter((header) => headerMap[header] === undefined);

        if (missingHeaders.length > 0) {
          toast({
            title: 'Invalid CSV format',
            description: `Missing required columns: ${missingHeaders.join(', ')}`,
            variant: 'destructive',
          });
          setPreviewData([]);
          setShowPreview(false);
          return;
        }

        const records: StudentRecord[] = [];

        lines.slice(1).forEach((line) => {
          if (!line.trim()) {
            return;
          }

          const values = parseCSVLine(line, delimiter);

          const record: StudentRecord = {
            name: getValueFromRow(values, headerMap, 'name'),
            email: getValueFromRow(values, headerMap, 'email'),
            phone: getOptionalValueFromRow(values, headerMap, 'phone'),
            nationality: getValueFromRow(values, headerMap, 'nationality'),
            academic_history: getValueFromRow(values, headerMap, 'academic_history'),
            desired_country: getValueFromRow(values, headerMap, 'desired_country'),
            program_interests: getValueFromRow(values, headerMap, 'program_interests'),
            gpa: getNumericValueFromRow(values, headerMap, 'gpa', parseFloat),
            ielts_score: getNumericValueFromRow(values, headerMap, 'ielts_score', parseFloat),
            toefl_score: getNumericValueFromRow(values, headerMap, 'toefl_score', (value) => parseInt(value, 10)),
            budget: getNumericValueFromRow(values, headerMap, 'budget', parseFloat),
            notes: getOptionalValueFromRow(values, headerMap, 'notes'),
          };

          records.push(record);
        });

        if (records.length === 0) {
          toast({
            title: 'No student rows found',
            description: 'Add at least one student row beneath the header row and try again.',
            variant: 'destructive',
          });
          setPreviewData([]);
          setShowPreview(false);
          return;
        }

        setPreviewData(records);
        setShowPreview(true);
      } catch (error) {
        console.error('CSV parse error:', error);
        toast({
          title: 'Unable to process CSV file',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred while parsing the CSV file.',
          variant: 'destructive',
        });
        setPreviewData([]);
        setShowPreview(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Unable to read file',
        description: 'Please make sure the file is accessible and try again.',
        variant: 'destructive',
      });
      setPreviewData([]);
      setShowPreview(false);
    };

    reader.readAsText(file);
  };

  const validateRecords = (records: StudentRecord[]): { valid: StudentRecord[]; errors: string[] } => {
    const validRecords: StudentRecord[] = [];
    const errors: string[] = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2; // +2 because CSV starts from row 1 and we skip header
      const recordErrors: string[] = [];

      const name = record.name.trim();
      const email = record.email.trim();
      const nationality = record.nationality.trim();
      const academicHistory = record.academic_history.trim();
      const desiredCountry = record.desired_country.trim();
      const programInterests = record.program_interests.trim();
      const phone = record.phone?.trim();
      const notes = record.notes?.trim();

      if (!name) recordErrors.push('Name is required');
      if (!email) recordErrors.push('Email is required');
      if (!nationality) recordErrors.push('Nationality is required');
      if (!academicHistory) recordErrors.push('Academic history is required');
      if (!desiredCountry) recordErrors.push('Desired country is required');
      if (!programInterests) recordErrors.push('Course interests are required');

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        recordErrors.push('Invalid email format');
      }

      if (record.gpa !== undefined) {
        if (Number.isNaN(record.gpa)) {
          recordErrors.push('GPA must be a valid number');
        } else if (record.gpa < 0 || record.gpa > 4) {
          recordErrors.push('GPA must be between 0 and 4');
        }
      }

      if (record.ielts_score !== undefined) {
        if (Number.isNaN(record.ielts_score)) {
          recordErrors.push('IELTS score must be a valid number');
        } else if (record.ielts_score < 0 || record.ielts_score > 9) {
          recordErrors.push('IELTS score must be between 0 and 9');
        }
      }

      if (record.toefl_score !== undefined) {
        if (Number.isNaN(record.toefl_score)) {
          recordErrors.push('TOEFL score must be a valid number');
        } else if (record.toefl_score < 0 || record.toefl_score > 120) {
          recordErrors.push('TOEFL score must be between 0 and 120');
        } else if (!Number.isInteger(record.toefl_score)) {
          recordErrors.push('TOEFL score must be an integer');
        }
      }

      if (record.budget !== undefined) {
        if (Number.isNaN(record.budget)) {
          recordErrors.push('Budget must be a valid number');
        } else if (record.budget < 0) {
          recordErrors.push('Budget must be a positive number');
        }
      }

      if (recordErrors.length > 0) {
        errors.push(`Row ${rowNumber}: ${recordErrors.join(', ')}`);
      } else {
        validRecords.push({
          ...record,
          name,
          email,
          nationality,
          academic_history: academicHistory,
          desired_country: desiredCountry,
          program_interests: programInterests,
          phone: phone || undefined,
          notes: notes || undefined,
        });
      }
    });

    return { valid: validRecords, errors };
  };

  const processImport = async () => {
    if (!file || previewData.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const { valid, errors } = validateRecords(previewData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result: ImportResult = {
        success: valid.length,
        errors: errors.length,
        total: previewData.length,
        errorDetails: errors
      };
      
      setImportResult(result);
      
      if (valid.length > 0) {
        toast({
          title: 'Import completed',
          description: `Successfully imported ${valid.length} students`
        });
      }
      
      if (errors.length > 0) {
        toast({
          title: 'Import completed with errors',
          description: `${errors.length} records had validation errors`,
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'An error occurred during import. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'name,email,phone,nationality,academic_history,desired_country,program_interests,gpa,ielts_score,toefl_score,budget,notes',
      '"John Doe",john@example.com,+1234567890,USA,"Bachelor in Computer Science, University of Toronto",Canada,"Computer Science, Data Science",3.5,7.5,100,50000,"Interested in AI, data, and research opportunities"',
      '"Jane Smith",jane@example.com,+1234567891,UK,"Master in Business Administration",USA,"Business Administration",3.8,8,110,60000,"Looking for MBA courses with co-op options"'
    ].join('\n');
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    setPreviewData([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IconTooltip label="Bulk import students">
              <Upload className="h-6 w-6 text-primary" />
            </IconTooltip>
            Bulk Import Students
          </h2>
          <p className="text-muted-foreground">Import multiple students at once using a CSV file</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <IconTooltip label="Download CSV template">
            <Download className="h-4 w-4 mr-2" />
          </IconTooltip>
          Download Template
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file with student information. Make sure it follows the required format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <IconTooltip label="Upload CSV file">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              </IconTooltip>
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose CSV file or drag and drop</p>
                <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                <IconTooltip label="Select CSV file">
                  <Upload className="h-4 w-4 mr-2" />
                </IconTooltip>
                Select File
              </Button>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <IconTooltip label="Chosen file">
                    <FileText className="h-4 w-4" />
                  </IconTooltip>
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={resetImport}>
                  <IconTooltip label="Remove file">
                    <X className="h-4 w-4" />
                  </IconTooltip>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Required Format</CardTitle>
            <CardDescription>
              Your CSV file must include these columns:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Required Fields:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• name</li>
                    <li>• email</li>
                    <li>• nationality</li>
                    <li>• academic_history</li>
                    <li>• desired_country</li>
                    <li>• program_interests</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Optional Fields:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• phone</li>
                    <li>• gpa (0-4)</li>
                    <li>• ielts_score (0-9)</li>
                    <li>• toefl_score (0-120)</li>
                    <li>• budget</li>
                    <li>• notes</li>
                  </ul>
                </div>
              </div>

            <Alert>
                <IconTooltip label="CSV format reminder">
                  <AlertCircle className="h-4 w-4" />
                </IconTooltip>
                <AlertDescription>
                  Make sure your CSV file uses commas as separators and has a header row. Column
                  names are matched case-insensitively, and spaces or hyphens in headers are
                  handled automatically.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {showPreview && previewData.length > 0 && (
        <Card>
          <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Data ({previewData.length} records)</CardTitle>
                  <CardDescription>Review the data before importing</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <IconTooltip label="Hide preview">
                    <Eye className="h-4 w-4 mr-2" />
                  </IconTooltip>
                  Hide Preview
                </Button>
                <Button onClick={processImport} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Import Students'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Nationality</th>
                    <th className="text-left p-2">Desired Country</th>
                    <th className="text-left p-2">Course Interests</th>
                    <th className="text-left p-2">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((record, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{record.name}</td>
                      <td className="p-2">{record.email}</td>
                      <td className="p-2">{record.nationality}</td>
                      <td className="p-2">{record.desired_country}</td>
                      <td className="p-2">{record.program_interests}</td>
                      <td className="p-2">{record.gpa || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 10 records of {previewData.length} total
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm font-medium">Processing import...</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.errors === 0 ? (
                <IconTooltip label="Import finished successfully">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </IconTooltip>
              ) : (
                <IconTooltip label="Import finished with issues">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </IconTooltip>
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-muted-foreground">Successfully Imported</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
            </div>

            {importResult.errorDetails.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Error Details:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errorDetails.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={resetImport}>
                Import More Students
              </Button>
              <Button variant="outline" onClick={() => setImportResult(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
}