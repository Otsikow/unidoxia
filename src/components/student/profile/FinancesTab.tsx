import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, DollarSign } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';

interface FinancesData {
  sponsor_type?: string;
  annual_budget?: string;
  currency?: string;
  sponsor_name?: string;
  sponsor_relationship?: string;
  sponsor_occupation?: string;
  additional_notes?: string;
}

interface FinancesTabProps {
  student: Tables<'students'>;
  onUpdate: () => void;
}

const extractFinancesFormData = (student: Tables<'students'>) => {
  const financesData = student.finances_json as FinancesData | undefined;
  return {
    sponsor_type: financesData?.sponsor_type || '',
    annual_budget: financesData?.annual_budget || '',
    currency: financesData?.currency || 'USD',
    sponsor_name: financesData?.sponsor_name || '',
    sponsor_relationship: financesData?.sponsor_relationship || '',
    sponsor_occupation: financesData?.sponsor_occupation || '',
    additional_notes: financesData?.additional_notes || ''
  };
};

export function FinancesTab({ student, onUpdate }: FinancesTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState(() => extractFinancesFormData(student));

  // Sync form data when student prop changes (e.g., after refetch)
  useEffect(() => {
    setFormData(extractFinancesFormData(student));
  }, [student]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          finances_json: formData
        })
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      // Immediately update the form with the saved data
      if (data) {
        setFormData(extractFinancesFormData(data));
      }

      // Invalidate and refetch the student record query to update all consumers
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });

      toast({
        title: 'Success',
        description: 'Financial information updated successfully'
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error updating finances:', error);
      toast({
        title: 'Error',
        description: 'Failed to update financial information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Information
          </CardTitle>
          <CardDescription>
            Provide details about your finances and sponsorship
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsor_type">Funding Source *</Label>
            <Select value={formData.sponsor_type} onValueChange={(value) => handleChange('sponsor_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select funding source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Self-Funded</SelectItem>
                <SelectItem value="parent">Parent/Guardian</SelectItem>
                <SelectItem value="relative">Other Relative</SelectItem>
                <SelectItem value="government">Government Scholarship</SelectItem>
                <SelectItem value="employer">Employer</SelectItem>
                <SelectItem value="loan">Educational Loan</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annual_budget">Annual Budget *</Label>
              <Input
                id="annual_budget"
                type="number"
                value={formData.annual_budget}
                onChange={(e) => handleChange('annual_budget', e.target.value)}
                placeholder="e.g., 25000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select value={formData.currency} onValueChange={(value) => handleChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.sponsor_type && formData.sponsor_type !== 'self' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sponsor_name">Sponsor Name</Label>
                <Input
                  id="sponsor_name"
                  value={formData.sponsor_name}
                  onChange={(e) => handleChange('sponsor_name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sponsor_relationship">Relationship</Label>
                  <Input
                    id="sponsor_relationship"
                    value={formData.sponsor_relationship}
                    onChange={(e) => handleChange('sponsor_relationship', e.target.value)}
                    placeholder="e.g., Father, Uncle, Employer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sponsor_occupation">Sponsor Occupation</Label>
                  <Input
                    id="sponsor_occupation"
                    value={formData.sponsor_occupation}
                    onChange={(e) => handleChange('sponsor_occupation', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="additional_notes">Additional Notes</Label>
            <Textarea
              id="additional_notes"
              value={formData.additional_notes}
              onChange={(e) => handleChange('additional_notes', e.target.value)}
              placeholder="Any additional information about your financial situation..."
              rows={4}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Documents Required</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Bank statements (last 6 months)</li>
              <li>Sponsor letter (if applicable)</li>
              <li>Proof of income or assets</li>
              <li>Loan approval letter (if applicable)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              Upload these documents in the <strong>Documents</strong> section
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Financial Information
      </Button>
    </form>
  );
}
