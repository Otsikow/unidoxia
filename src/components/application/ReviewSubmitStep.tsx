import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  User,
  GraduationCap,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ApplicationFormData } from '@/pages/student/NewApplication';
import { Badge } from '@/components/ui/badge';

interface ReviewSubmitStepProps {
  formData: ApplicationFormData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  onNotesChange: (notes: string) => void;
}

type ProgramDetailsRow = Pick<
  Tables<'programs'>,
  'name' | 'level' | 'discipline'
> & {
  university: {
    name: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

interface ProgramDetails {
  name: string | null;
  level: string | null;
  discipline: string | null;
  university: {
    name: string | null;
    city: string | null;
    country: string | null;
  } | null;
}

export default function ReviewSubmitStep({
  formData,
  onBack,
  onSubmit,
  submitting,
  onNotesChange,
}: ReviewSubmitStepProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [programDetails, setProgramDetails] = useState<ProgramDetails | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(true);

  useEffect(() => {
    const fetchProgramDetails = async () => {
      if (!formData.programSelection.programId) {
        setLoadingProgram(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('programs')
          .select(
            `
            name,
            level,
            discipline,
            university:universities (
              name,
              city,
              country
            )
          `
          )
          .eq('id', formData.programSelection.programId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setProgramDetails({
            name: data.name ?? null,
            level: data.level ?? null,
            discipline: data.discipline ?? null,
            university: data.university ?? null,
          });
        } else {
          setProgramDetails(null);
        }
      } catch (error) {
        console.error('Error fetching program details:', error);
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchProgramDetails();
  }, [formData.programSelection.programId]);

  const handleSubmit = () => {
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions before submitting');
      return;
    }
    onSubmit();
  };

  const getMonthName = (month: number) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1] || '';
  };

  const documentCount = Object.values(formData.documents).filter((doc) => doc !== null).length;

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Review Your Application
          </CardTitle>
          <CardDescription>
            Please review all information carefully before submitting. You can go back to edit any
            section.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Personal Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-muted-foreground">Full Name</p>
              <p>{formData.personalInfo.fullName}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Email</p>
              <p>{formData.personalInfo.email}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Phone</p>
              <p>{formData.personalInfo.phone}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Date of Birth</p>
              <p>{formData.personalInfo.dateOfBirth || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Nationality</p>
              <p>{formData.personalInfo.nationality}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Current Country</p>
              <p>{formData.personalInfo.currentCountry}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.educationHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education records added</p>
          ) : (
            <div className="space-y-4">
              {formData.educationHistory.map((edu, index) => (
                <Card key={edu.id} className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{edu.institutionName}</p>
                      <Badge variant="secondary">{edu.level}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {edu.country} • {edu.startDate} to {edu.endDate || 'Present'}
                    </p>
                    {edu.gpa && (
                      <p className="text-muted-foreground">
                        GPA: {edu.gpa} / {edu.gradeScale}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Selected Course
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loadingProgram ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : programDetails ? (
            <>
              <div>
                <p className="font-medium text-muted-foreground">Course</p>
                <p className="text-base font-semibold">
                  {programDetails.name ?? 'Course unavailable'}
                </p>
                <p className="text-muted-foreground">
                  {(programDetails.level ?? '—')} • {(programDetails.discipline ?? '—')}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">University</p>
                <p>
                  {programDetails.university?.name ?? '—'}, {programDetails.university?.city ?? '—'}, {programDetails.university?.country ?? '—'}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Intended Intake</p>
                <p>
                  {getMonthName(formData.programSelection.intakeMonth)}{' '}
                  {formData.programSelection.intakeYear}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Course details not available</p>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Total Documents Uploaded</p>
              <Badge>{documentCount}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {Object.entries(formData.documents).map(([key, file]) => (
                <div key={key} className="flex items-center gap-2">
                  {file ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="capitalize">
                    {key === 'ielts' ? 'IELTS/TOEFL' : key === 'sop' ? 'Statement of Purpose' : key}
                  </span>
                  {file && <span className="text-muted-foreground">• {file.name}</span>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Notes (Optional)</CardTitle>
          <CardDescription>
            Add any additional information or special circumstances you'd like us to know
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter any additional notes or comments..."
            value={formData.notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                I agree to the terms and conditions
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I confirm that all information provided in this application is true, complete, and
                accurate to the best of my knowledge. I understand that providing false or
                misleading information may result in the rejection of my application or cancellation
                of my admission.
              </p>
            </div>
          </div>

          {!agreedToTerms && (
            <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Please agree to the terms and conditions to submit your application.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack} disabled={submitting}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!agreedToTerms || submitting}
              size="lg"
              className="min-w-[200px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
