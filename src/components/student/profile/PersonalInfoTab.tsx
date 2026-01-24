import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';
import { COUNTRIES } from '@/lib/countries';

// Common study areas/disciplines
const STUDY_AREAS = [
  'Business & Management',
  'Computer Science & IT',
  'Engineering',
  'Medicine & Health Sciences',
  'Law',
  'Arts & Humanities',
  'Social Sciences',
  'Natural Sciences',
  'Education',
  'Architecture & Design',
  'Media & Communications',
  'Agriculture & Environmental Sciences',
  'Hospitality & Tourism',
  'Finance & Accounting',
  'Other'
] as const;

interface PersonalInfoTabProps {
  student: Tables<'students'>;
  onUpdate: () => void;
}

type AddressData = { 
  phone?: string; 
  whatsapp?: string;
  line1?: string; 
  line2?: string; 
  city?: string; 
  postal_code?: string; 
  country?: string; 
} | null;

const extractFormData = (student: Tables<'students'>) => {
  const addressData = student.address as AddressData;
  return {
    legal_name: student.legal_name || '',
    preferred_name: student.preferred_name || '',
    date_of_birth: student.date_of_birth || '',
    nationality: student.nationality || '',
    passport_number: student.passport_number || '',
    passport_expiry: student.passport_expiry || '',
    contact_email: student.contact_email || '',
    contact_phone: student.contact_phone || addressData?.phone || '',
    whatsapp_number: addressData?.whatsapp || addressData?.phone || student.contact_phone || '+',
    current_country: student.current_country || '',
    preferred_course: (student as any).preferred_course || '',
    preferred_study_area: (student as any).preferred_study_area || '',
    preferred_country: (student as any).preferred_country || '',
    address_line1: addressData?.line1 || '',
    address_line2: addressData?.line2 || '',
    city: addressData?.city || '',
    postal_code: addressData?.postal_code || '',
    country: addressData?.country || ''
  };
};

export function PersonalInfoTab({ student, onUpdate }: PersonalInfoTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState(() => extractFormData(student));

  // Sync form data when student prop changes (e.g., after refetch)
  useEffect(() => {
    setFormData(extractFormData(student));
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          legal_name: formData.legal_name,
          preferred_name: formData.preferred_name,
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality,
          passport_number: formData.passport_number,
          passport_expiry: formData.passport_expiry,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          current_country: formData.current_country,
          preferred_course: formData.preferred_course,
          preferred_study_area: formData.preferred_study_area,
          preferred_country: formData.preferred_country,
          address: {
            line1: formData.address_line1,
            line2: formData.address_line2,
            city: formData.city,
            postal_code: formData.postal_code,
            country: formData.country,
            phone: formData.contact_phone,
            whatsapp:
              formData.whatsapp_number.trim() && formData.whatsapp_number.trim() !== '+'
                ? formData.whatsapp_number.trim()
                : null
          }
        })
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      // Immediately update the form with the saved data
      if (data) {
        setFormData(extractFormData(data));
      }

      // Invalidate and refetch the student record query to update all consumers
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });

      toast({
        title: 'Success',
        description: 'Personal information updated successfully'
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast({
        title: 'Error',
        description: 'Failed to update personal information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your legal name and identification details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name (as on passport) *</Label>
              <Input
                id="legal_name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input
                id="preferred_name"
                name="preferred_name"
                value={formData.preferred_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality *</Label>
              <Input
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passport_number">Passport Number *</Label>
              <Input
                id="passport_number"
                name="passport_number"
                value={formData.passport_number}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport_expiry">Passport Expiry *</Label>
              <Input
                id="passport_expiry"
                name="passport_expiry"
                type="date"
                value={formData.passport_expiry}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How we can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email *</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number *</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">WhatsApp Number (with country code) *</Label>
              <Input
                id="whatsapp_number"
                name="whatsapp_number"
                type="tel"
                value={formData.whatsapp_number}
                onChange={handleChange}
                placeholder="+233 501 234 567"
                required
              />
              <p className="text-sm text-muted-foreground">
                Use your full international format so admins can message you directly.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_country">Current Country of Residence *</Label>
            <Input
              id="current_country"
              name="current_country"
              value={formData.current_country}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Study Preferences</CardTitle>
          <CardDescription>
            Tell us about your study goals so we can better support your journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred_course">Preferred Course</Label>
              <Input
                id="preferred_course"
                name="preferred_course"
                value={formData.preferred_course}
                onChange={handleChange}
                placeholder="e.g., MBA, Computer Science, Nursing"
              />
              <p className="text-xs text-muted-foreground">
                The specific program or degree you want to pursue
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_study_area">Preferred Study Area</Label>
              <Select
                value={formData.preferred_study_area}
                onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_study_area: value }))}
              >
                <SelectTrigger id="preferred_study_area">
                  <SelectValue placeholder="Select a study area" />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The broader field or discipline
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_country">Preferred Country</Label>
            <Select
              value={formData.preferred_country}
              onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_country: value }))}
            >
              <SelectTrigger id="preferred_country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred destination for studying abroad
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full hover-scale">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Personal Information
      </Button>
    </form>
  );
}
