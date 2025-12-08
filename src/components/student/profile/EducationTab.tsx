import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';

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

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('education_records')
          .update({
            ...formData,
            gpa: formData.gpa ? parseFloat(formData.gpa) : null
          })
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Education record updated' });
      } else {
        const { error } = await supabase
          .from('education_records')
          .insert({
            student_id: studentId,
            ...formData,
            gpa: formData.gpa ? parseFloat(formData.gpa) : null
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Education record added' });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      resetForm();
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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education record?')) return;

    try {
      const { error } = await supabase
        .from('education_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
  };

  const openEditDialog = (record: Tables<'education_records'>) => {
    setEditingRecord(record);
    setFormData({
      level: record.level,
      institution_name: record.institution_name,
      country: record.country,
      start_date: record.start_date,
      end_date: record.end_date || '',
      grade_scale: record.grade_scale || '',
      gpa: record.gpa?.toString() || ''
    });
    setIsDialogOpen(true);
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
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="postgraduate">Postgraduate</SelectItem>
                      <SelectItem value="doctorate">Doctorate</SelectItem>
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
                      {record.level.replace('_', ' ').toUpperCase()} • {record.country}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(record.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
