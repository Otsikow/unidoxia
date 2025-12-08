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
import { Plus, Award, Pencil, Trash2, Loader2, Eye } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { validateFileUpload } from '@/lib/fileUpload';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';

interface TestScoresTabProps {
  studentId: string;
  onUpdate?: () => void;
}

const CERTIFICATE_BUCKET = 'student-documents';
const CERTIFICATE_PREFIX = 'test-score-certificates';
const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10MB
const ENGLISH_PROFICIENCY_LETTER = 'English Proficiency Letter';
const ALLOWED_CERTIFICATE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

export function TestScoresTab({ studentId, onUpdate }: TestScoresTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [testScores, setTestScores] = useState<Tables<'test_scores'>[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Tables<'test_scores'> | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [existingCertificatePath, setExistingCertificatePath] = useState<string | null>(null);
  const [viewingCertificatePath, setViewingCertificatePath] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    test_type: '',
    total_score: '',
    test_date: '',
    listening: '',
    reading: '',
    writing: '',
    speaking: ''
  });

  const fetchTestScores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('test_scores')
        .select('*')
        .eq('student_id', studentId)
        .order('test_date', { ascending: false });

      if (error) throw error;
      setTestScores(data || []);
    } catch (error) {
      console.error('Error fetching test scores:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const formatTestScoreError = (error: unknown, action: 'add' | 'update' | 'delete') => {
    if (error && typeof error === 'object') {
      const supabaseError = error as { message?: string; code?: string; details?: string };
      const message = supabaseError.message?.toLowerCase() || '';
      const details = supabaseError.details?.toLowerCase() || '';

      if (supabaseError.code === '42501' || message.includes('row-level security')) {
        return 'You can only manage test scores for your own profile. Please make sure you are signed in to the right account.';
      }

      if (message.includes('permission') || details.includes('permission')) {
        return 'You do not have permission to complete this action. Try signing in again or contact support if this persists.';
      }
    }

    return `We couldn't ${action} your test score right now. Please try again in a moment.`;
  };

  useEffect(() => {
    fetchTestScores();
  }, [fetchTestScores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isEnglishProficiencyLetter = formData.test_type === ENGLISH_PROFICIENCY_LETTER;

    if (!formData.test_type) {
      toast({
        title: 'Test type required',
        description: 'Please select the type of test you are adding.',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    if (!isEnglishProficiencyLetter) {
      const parsedTotalScore = parseFloat(formData.total_score);

      if (!formData.total_score || Number.isNaN(parsedTotalScore)) {
        toast({
          title: 'Score required',
          description: 'Please enter your total test score before submitting.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
    }

    if (isEnglishProficiencyLetter && !certificateFile && !existingCertificatePath) {
      toast({
        title: 'Document required',
        description: 'Please upload your English proficiency letter.',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    let uploadedCertificatePath: string | null = null;
    const previousCertificatePath = editingRecord?.report_url ?? null;

    try {
      const subscores: Record<string, number> = {};
      const parsedSubscores: Array<[keyof typeof subscores, string]> = [
        ['listening', formData.listening],
        ['reading', formData.reading],
        ['writing', formData.writing],
        ['speaking', formData.speaking],
      ];

      parsedSubscores.forEach(([key, value]) => {
        if (!value) return;
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed)) {
          subscores[key] = parsed;
        }
      });

      let certificatePath = existingCertificatePath ?? null;

      if (certificateFile) {
        const { preparedFile, sanitizedFileName, detectedMimeType } = await validateFileUpload(certificateFile, {
          allowedMimeTypes: ALLOWED_CERTIFICATE_TYPES,
          allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf'],
          maxSizeBytes: MAX_CERTIFICATE_SIZE,
        });

        const extension = sanitizedFileName.split('.').pop()?.toLowerCase() || 'jpg';
        const safeTestType = formData.test_type ? formData.test_type.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'test';
        // The storage policy for student-documents expects the first folder to be the student ID
        // so we place the certificate prefix after the student folder to satisfy RLS checks.
        const filePath = `${studentId}/${CERTIFICATE_PREFIX}/${safeTestType}-${Date.now()}.${extension}`;

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

      const payload = {
        test_type: formData.test_type,
        total_score: isEnglishProficiencyLetter ? 0 : parseFloat(formData.total_score),
        test_date: formData.test_date || new Date().toISOString().split('T')[0],
        subscores_json: Object.keys(subscores).length > 0 ? subscores : null,
        report_url: certificatePath
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('test_scores')
          .update(payload)
          .eq('id', editingRecord.id);

        if (error) throw error;

        if (uploadedCertificatePath && previousCertificatePath && previousCertificatePath !== uploadedCertificatePath) {
          const { error: removeError } = await supabase.storage
            .from(CERTIFICATE_BUCKET)
            .remove([previousCertificatePath]);
          if (removeError) {
            console.error('Error removing previous certificate:', removeError);
          }
        }

        toast({ title: 'Success', description: 'Test score updated' });
      } else {
        const { error } = await supabase
          .from('test_scores')
          .insert({
            student_id: studentId,
            ...payload
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Test score added' });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      setCertificateFile(null);
      setExistingCertificatePath(null);
      resetForm();
      await fetchTestScores();
      
      // Invalidate student record query to update completeness calculation
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });
      
      onUpdate?.();
    } catch (error: unknown) {
      if (uploadedCertificatePath) {
        const { error: cleanupError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .remove([uploadedCertificatePath]);
        if (cleanupError) {
          console.error('Failed to clean up uploaded certificate after error:', cleanupError);
        }
      }

      const errorMessage = formatTestScoreError(error, editingRecord ? 'update' : 'add');
      console.error('Failed to submit test score:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (score: Tables<'test_scores'>) => {
    if (!confirm('Are you sure you want to delete this test score?')) return;

    try {
      const { error } = await supabase
        .from('test_scores')
        .delete()
        .eq('id', score.id);

      if (error) throw error;
      if (score.report_url) {
        const { error: removeError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .remove([score.report_url]);
        if (removeError) {
          console.error('Error removing certificate from storage:', removeError);
        }
      }
      toast({ title: 'Success', description: 'Test score deleted' });
      await fetchTestScores();
      
      // Invalidate student record query to update completeness calculation
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });
      
      onUpdate?.();
    } catch (error: unknown) {
      const errorMessage = formatTestScoreError(error, 'delete');
      console.error('Failed to delete test score:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      test_type: '',
      total_score: '',
      test_date: '',
      listening: '',
      reading: '',
      writing: '',
      speaking: ''
    });
    setCertificateFile(null);
    setExistingCertificatePath(null);
  };

  const openEditDialog = (record: Tables<'test_scores'>) => {
    setEditingRecord(record);
    const subscores = record.subscores_json as { listening?: number; reading?: number; writing?: number; speaking?: number } | null;
    setFormData({
      test_type: record.test_type,
      total_score: record.total_score?.toString() || '',
      test_date: record.test_date,
      listening: subscores?.listening?.toString() || '',
      reading: subscores?.reading?.toString() || '',
      writing: subscores?.writing?.toString() || '',
      speaking: subscores?.speaking?.toString() || ''
    });
    setCertificateFile(null);
    setExistingCertificatePath(record.report_url || null);
    setIsDialogOpen(true);
  };

  const showSubscores = ['IELTS', 'TOEFL'].includes(formData.test_type);
  const isEnglishProficiencyLetter = formData.test_type === ENGLISH_PROFICIENCY_LETTER;

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
        description: 'Document must be smaller than 10MB.',
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

  if (loading && testScores.length === 0) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Test Scores</h2>
          <p className="text-muted-foreground">English proficiency and standardized tests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRecord(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Test Score
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit' : 'Add'} Test Score</DialogTitle>
                <DialogDescription>
                  Add your English proficiency or standardized test scores
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="test_type">Test Type *</Label>
                  <Select value={formData.test_type} onValueChange={(value) => setFormData({...formData, test_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IELTS">IELTS</SelectItem>
                      <SelectItem value="TOEFL">TOEFL</SelectItem>
                      <SelectItem value="Duolingo">Duolingo English Test</SelectItem>
                      <SelectItem value={ENGLISH_PROFICIENCY_LETTER}>English Proficiency Letter</SelectItem>
                      <SelectItem value="SAT">SAT</SelectItem>
                      <SelectItem value="GRE">GRE</SelectItem>
                      <SelectItem value="GMAT">GMAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {!isEnglishProficiencyLetter ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="total_score">Overall Score *</Label>
                        <Input
                          id="total_score"
                          type="number"
                          step="0.5"
                          value={formData.total_score}
                          onChange={(e) => setFormData({...formData, total_score: e.target.value})}
                          required={!isEnglishProficiencyLetter}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test_date">Test Date *</Label>
                        <Input
                          id="test_date"
                          type="date"
                          value={formData.test_date}
                          onChange={(e) => setFormData({...formData, test_date: e.target.value})}
                          required={!isEnglishProficiencyLetter}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="test_date">Letter Date (Optional)</Label>
                      <Input
                        id="test_date"
                        type="date"
                        value={formData.test_date}
                        onChange={(e) => setFormData({...formData, test_date: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">We'll use today's date if you don't provide one.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate">Certificate or Letter (Optional)</Label>
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
                      <span className="text-muted-foreground">Existing document uploaded</span>
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
                        View
                      </Button>
                    </div>
                  )}
                </div>

                {showSubscores && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Band Scores (Optional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="listening" className="text-sm font-normal">Listening</Label>
                        <Input
                          id="listening"
                          type="number"
                          step="0.5"
                          value={formData.listening}
                          onChange={(e) => setFormData({...formData, listening: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reading" className="text-sm font-normal">Reading</Label>
                        <Input
                          id="reading"
                          type="number"
                          step="0.5"
                          value={formData.reading}
                          onChange={(e) => setFormData({...formData, reading: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="writing" className="text-sm font-normal">Writing</Label>
                        <Input
                          id="writing"
                          type="number"
                          step="0.5"
                          value={formData.writing}
                          onChange={(e) => setFormData({...formData, writing: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="speaking" className="text-sm font-normal">Speaking</Label>
                        <Input
                          id="speaking"
                          type="number"
                          step="0.5"
                          value={formData.speaking}
                          onChange={(e) => setFormData({...formData, speaking: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? 'Update' : 'Add'} Score
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {testScores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Test Scores</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your English proficiency test scores to complete your profile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {testScores.map((score) => (
            <Card key={score.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      {score.test_type}
                    </CardTitle>
                    <CardDescription>
                      {score.test_type === ENGLISH_PROFICIENCY_LETTER
                        ? `Uploaded on ${new Date(score.test_date).toLocaleDateString()}`
                        : `Overall: ${score.total_score} • Taken on ${new Date(score.test_date).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(score)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(score)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
                {(score.report_url || score.subscores_json) && (
                  <CardContent className="space-y-4">
                    {score.report_url && (
                      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {score.test_type === ENGLISH_PROFICIENCY_LETTER ? 'English proficiency letter' : 'Certificate'}
                          </p>
                          <p className="text-xs text-muted-foreground">View the uploaded document</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewCertificate(score.report_url!)}
                          disabled={viewingCertificatePath !== null}
                        >
                          {viewingCertificatePath === score.report_url && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    )}
                    {score.subscores_json && (() => {
                      const subscores = score.subscores_json as { listening?: number; reading?: number; writing?: number; speaking?: number };
                      return (
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          {subscores.listening && (
                            <div>
                              <span className="text-muted-foreground">Listening:</span>
                              <p className="font-medium">{subscores.listening}</p>
                            </div>
                          )}
                          {subscores.reading && (
                            <div>
                              <span className="text-muted-foreground">Reading:</span>
                              <p className="font-medium">{subscores.reading}</p>
                            </div>
                          )}
                          {subscores.writing && (
                            <div>
                              <span className="text-muted-foreground">Writing:</span>
                              <p className="font-medium">{subscores.writing}</p>
                            </div>
                          )}
                          {subscores.speaking && (
                            <div>
                              <span className="text-muted-foreground">Speaking:</span>
                              <p className="font-medium">{subscores.speaking}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
