import { useEffect, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, Pencil, Trash2, Loader2, Eye, Upload } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';
import { validateFileUpload } from '@/lib/fileUpload';
import {
  EDUCATION_LEVEL_OPTIONS,
  getEducationLevelLabel,
  normalizeEducationLevel,
} from '@/lib/education';

const CERTIFICATE_BUCKET = 'student-documents';
const CERTIFICATE_PREFIX = 'education-certificates';
const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CERTIFICATE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

interface EducationTabProps {
  studentId: string;
  onUpdate?: () => void;
}

export function EducationTab({ studentId, onUpdate }: EducationTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [educationRecords, setEducationRecords] = useState<Tables<'education_records'>[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Tables<'education_records'> | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [existingCertificatePath, setExistingCertificatePath] = useState<string | null>(null);
  const [viewingCertificatePath, setViewingCertificatePath] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    level: '',
    institution_name: '',
    country: '',
    start_date: '',
    end_date: '',
    grade_scale: '',
    gpa: ''
  });

  const fetchEducationRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('education_records')
        .select('*')
        .eq('student_id', studentId)
        .order('end_date', { ascending: false });

      if (error) throw error;
      setEducationRecords(data || []);
    } catch (error) {
      console.error('Error fetching education records:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchEducationRecords();
  }, [fetchEducationRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let uploadedCertificatePath: string | null = null;
    const previousCertificatePath = editingRecord?.certificate_url ?? null;

    try {
      const normalizedLevel = normalizeEducationLevel(formData.level);
      let certificatePath = existingCertificatePath ?? null;

      // Handle certificate upload
      if (certificateFile) {
        const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(certificateFile, {
          allowedMimeTypes: ALLOWED_CERTIFICATE_TYPES,
          allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf'],
          maxSizeBytes: MAX_CERTIFICATE_SIZE,
        });

        const extension = sanitizedFileName.split('.').pop()?.toLowerCase() || 'pdf';
        const safeInstitution = formData.institution_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        const filePath = `${studentId}/${CERTIFICATE_PREFIX}/${safeInstitution}-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .upload(filePath, preparedFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: detectedMimeType
          });

        if (uploadError) throw uploadError;

        uploadedCertificatePath = filePath;
        certificatePath = filePath;
      }

      if (editingRecord) {
        const { error } = await supabase
          .from('education_records')
          .update({
            ...formData,
            level: normalizedLevel,
            gpa: formData.gpa ? parseFloat(formData.gpa) : null,
            certificate_url: certificatePath
          })
          .eq('id', editingRecord.id);

        if (error) throw error;

        // Clean up old certificate if a new one was uploaded
        if (uploadedCertificatePath && previousCertificatePath && previousCertificatePath !== uploadedCertificatePath) {
          const { error: removeError } = await supabase.storage
            .from(CERTIFICATE_BUCKET)
            .remove([previousCertificatePath]);
          if (removeError) {
            console.error('Error removing previous certificate:', removeError);
          }
        }

        toast({ title: 'Success', description: 'Education record updated' });
      } else {
        const { error } = await supabase
          .from('education_records')
          .insert({
            student_id: studentId,
            ...formData,
            level: normalizedLevel,
            gpa: formData.gpa ? parseFloat(formData.gpa) : null,
            certificate_url: certificatePath
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Education record added' });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      setCertificateFile(null);
      setExistingCertificatePath(null);
      resetForm();
      await fetchEducationRecords();
      
      // Invalidate student record query to update completeness calculation
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });
      
      onUpdate?.();
    } catch (error: unknown) {
      // Clean up uploaded certificate on error
      if (uploadedCertificatePath) {
        const { error: cleanupError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .remove([uploadedCertificatePath]);
        if (cleanupError) {
          console.error('Failed to clean up uploaded certificate after error:', cleanupError);
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: Tables<'education_records'>) => {
    if (!confirm('Are you sure you want to delete this education record?')) return;

    try {
      const { error } = await supabase
        .from('education_records')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      // Delete certificate from storage if it exists
      if (record.certificate_url) {
        const { error: removeError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .remove([record.certificate_url]);
        if (removeError) {
          console.error('Error removing certificate from storage:', removeError);
        }
      }

      toast({ title: 'Success', description: 'Education record deleted' });
      await fetchEducationRecords();
      
      // Invalidate student record query to update completeness calculation
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });
      
      onUpdate?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      level: '',
      institution_name: '',
      country: '',
      start_date: '',
      end_date: '',
      grade_scale: '',
      gpa: ''
    });
    setCertificateFile(null);
    setExistingCertificatePath(null);
  };

  const openEditDialog = (record: Tables<'education_records'>) => {
    setEditingRecord(record);
    setFormData({
      level: normalizeEducationLevel(record.level),
      institution_name: record.institution_name,
      country: record.country,
      start_date: record.start_date,
      end_date: record.end_date || '',
      grade_scale: record.grade_scale || '',
      gpa: record.gpa?.toString() || ''
    });
    setCertificateFile(null);
    setExistingCertificatePath(record.certificate_url || null);
    setIsDialogOpen(true);
  };

  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCertificateFile(null);
      return;
    }

    if (!ALLOWED_CERTIFICATE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (PNG, JPG, JPEG).',
        variant: 'destructive'
      });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_CERTIFICATE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Certificate must be smaller than 10MB.',
        variant: 'destructive'
      });
      event.target.value = '';
      return;
    }

    setCertificateFile(file);
  };

  const viewCertificate = async (path: string) => {
    if (viewingCertificatePath) return;

    setViewingCertificatePath(path);
    try {
      const { data, error } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .download(path);

      if (error || !data) {
        throw new Error(error?.message || 'Unable to retrieve certificate');
      }

      const url = URL.createObjectURL(data);
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.download = path.split('/').pop() || 'certificate';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (error) {
      console.error('Error viewing certificate:', error);
      toast({
        title: 'Unable to view certificate',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setViewingCertificatePath(null);
    }
  };

  if (loading && educationRecords.length === 0) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Education History</h2>
          <p className="text-muted-foreground">Add your academic qualifications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRecord(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Education
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit' : 'Add'} Education Record</DialogTitle>
                <DialogDescription>
                  Add details about your academic qualifications
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level *</Label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution_name">Institution Name *</Label>
                  <Input
                    id="institution_name"
                    value={formData.institution_name}
                    onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date (or Expected)</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade_scale">Grading Scale</Label>
                    <Select value={formData.grade_scale} onValueChange={(value) => setFormData({ ...formData, grade_scale: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GPA 4.0">GPA 4.0</SelectItem>
                        <SelectItem value="GPA 5.0">GPA 5.0</SelectItem>
                        <SelectItem value="Percentage">Percentage</SelectItem>
                        <SelectItem value="UK Classification">UK Classification</SelectItem>
                        <SelectItem value="CGPA 10.0">CGPA 10.0</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpa">Grade/GPA</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="certificate" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Certificate (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload your degree certificate, transcript, or academic record
                  </p>
                  <Input
                    id="certificate"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={handleCertificateChange}
                  />
                  {certificateFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {certificateFile.name} ({(certificateFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  {!certificateFile && existingCertificatePath && (
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Existing certificate uploaded</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => viewCertificate(existingCertificatePath)}
                        disabled={viewingCertificatePath !== null}
                      >
                        {viewingCertificatePath === existingCertificatePath && (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        )}
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? 'Update' : 'Add'} Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {educationRecords.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Education Records</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your academic qualifications to complete your profile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {educationRecords.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {record.institution_name}
                    </CardTitle>
                    <CardDescription>
                      {getEducationLevelLabel(normalizeEducationLevel(record.level))} • {record.country}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(record)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p>{record.start_date} - {record.end_date || 'Present'}</p>
                  </div>
                  {record.gpa && (
                    <div>
                      <span className="text-muted-foreground">Grade:</span>
                      <p>{record.gpa} ({record.grade_scale})</p>
                    </div>
                  )}
                </div>
                {record.certificate_url && (
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Certificate</p>
                      <p className="text-xs text-muted-foreground">View the uploaded document</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewCertificate(record.certificate_url!)}
                      disabled={viewingCertificatePath !== null}
                    >
                      {viewingCertificatePath === record.certificate_url && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
