import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DecisionSurveyProps {
  applicationId: string;
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

const QUESTIONS = [
  {
    id: 'process_clarity',
    text: 'How clear was the application process?',
    options: ['Very Clear', 'Somewhat Clear', 'Neutral', 'Unclear', 'Very Unclear'],
  },
  {
    id: 'speed',
    text: 'How satisfied are you with the speed of the decision?',
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
  },
  {
    id: 'support_quality',
    text: 'How would you rate the quality of support received?',
    options: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
  },
  {
    id: 'trust',
    text: 'Do you trust UniDoxia for your education journey?',
    options: ['Yes, absolutely', 'Somewhat', 'Not really'],
  },
];

export function DecisionSurvey({ applicationId, studentId, open, onOpenChange, onSubmitted }: DecisionSurveyProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate all questions answered
    const allAnswered = QUESTIONS.every((q) => answers[q.id]);
    if (!allAnswered) {
      toast({
        title: 'Please answer all questions',
        description: 'Your feedback is important to us.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('survey_responses').insert({
        application_id: applicationId,
        student_id: studentId,
        responses: {
          ...answers,
          feedback,
        },
      });

      if (error) throw error;

      toast({
        title: 'Thank you!',
        description: 'Your feedback helps us improve.',
      });
      onSubmitted();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Survey submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit survey. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>We'd love your feedback</DialogTitle>
          <DialogDescription>
            Please answer a few quick questions about your experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="space-y-3">
              <Label className="text-base font-medium">{q.text}</Label>
              <RadioGroup
                value={answers[q.id]}
                onValueChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                className="space-y-1"
              >
                {q.options.map((opt) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="font-normal cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="feedback">Any other comments? (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what we can do better..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
