import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  Star, 
  Send, 
  CheckCircle,
  Bug,
  Lightbulb,
  ThumbsUp,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const feedbackSchema = z.object({
  type: z.enum(['general', 'bug', 'feature', 'improvement']),
  category: z.string().min(1, 'Please select a category'),
  rating: z.number().min(1).max(5),
  message: z.string()
    .trim()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be less than 2000 characters'),
  contact: z.boolean(),
  email: z.string().email('Invalid email address').optional().or(z.literal(''))
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

export default function UserFeedback() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackForm>({
    type: 'general',
    rating: 0,
    category: '',
    message: '',
    contact: false,
    email: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FeedbackForm, string>>>({});

  const feedbackTypes = [
    { value: 'general' as const, label: 'General Feedback', icon: MessageSquare },
    { value: 'bug' as const, label: 'Bug Report', icon: Bug },
    { value: 'feature' as const, label: 'Feature Request', icon: Lightbulb },
    { value: 'improvement' as const, label: 'Improvement', icon: ThumbsUp }
  ];

  const categories = {
    general: ['User Experience', 'Navigation', 'Performance', 'Content', 'Other'],
    bug: ['Login Issues', 'Data Not Loading', 'Form Errors', 'Mobile Issues', 'Other'],
    feature: ['New Tools', 'Dashboard Features', 'AI Features', 'Communication', 'Other'],
    improvement: ['UI/UX', 'Performance', 'Functionality', 'Content', 'Other']
  };

  const handleSubmit = async () => {
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = feedbackSchema.parse(feedback);
      
      // Additional validation for contact email
      if (validatedData.contact && !validatedData.email) {
        setErrors({ email: 'Email is required when requesting contact' });
        setLoading(false);
        return;
      }

      // Get tenant ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .maybeSingle();

      const tenantId = profileData?.tenant_id || '00000000-0000-0000-0000-000000000001';

      // Insert feedback into database
      const { error: insertError } = await supabase
        .from('user_feedback')
        .insert({
          tenant_id: tenantId,
          user_id: user?.id || null,
          feedback_type: validatedData.type,
          category: validatedData.category,
          rating: validatedData.rating,
          message: validatedData.message,
          contact_requested: validatedData.contact,
          contact_email: validatedData.contact ? validatedData.email : null,
          user_agent: navigator.userAgent,
          page_url: window.location.href
        });

      if (insertError) throw insertError;

      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully'
      });
      
      setSubmitted(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof FeedbackForm, string>> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as keyof FeedbackForm] = issue.message;
          }
        });
        setErrors(newErrors);
        toast({
          title: 'Validation Error',
          description: 'Please check the form for errors',
          variant: 'destructive'
        });
      } else {
        console.error('Error submitting feedback:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit feedback. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFeedback({
      type: 'general',
      rating: 0,
      category: '',
      message: '',
      contact: false,
      email: ''
    });
    setSubmitted(false);
    setErrors({});
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-lg w-full animate-fade-in">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Thank you for your feedback!</h3>
                <p className="text-muted-foreground">
                  We appreciate you taking the time to help us improve the UniDoxia platform.
                </p>
              </div>
              <Button onClick={resetForm} className="hover-scale">
                Submit Another Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto py-6 md:py-8 px-4 max-w-4xl space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Share Your Feedback
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Help us improve by sharing your thoughts, reporting issues, or suggesting new features
          </p>
        </div>

        <Card className="hover:shadow-lg transition-shadow animate-fade-in">
          <CardHeader>
            <CardTitle>Feedback Form</CardTitle>
            <CardDescription>
              Your feedback helps us make the platform better for everyone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Feedback Type */}
            <div className="space-y-3">
              <Label className="text-base">What type of feedback is this? *</Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {feedbackTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = feedback.type === type.value;
                  return (
                    <Button
                      key={type.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-center gap-2 hover-scale"
                      onClick={() => setFeedback(prev => ({ ...prev, type: type.value, category: '' }))}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs sm:text-sm text-center">{type.label}</span>
                    </Button>
                  );
                })}
              </div>
              {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label htmlFor="category" className="text-base">Category *</Label>
              <Select 
                value={feedback.category} 
                onValueChange={(value) => setFeedback(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category" className={errors.category ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories[feedback.type].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <Label className="text-base">How would you rate your overall experience? *</Label>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    type="button"
                    variant={feedback.rating >= rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeedback(prev => ({ ...prev, rating }))}
                    className="h-10 w-10 p-0 hover-scale"
                  >
                    <Star className={`h-4 w-4 ${feedback.rating >= rating ? 'fill-current' : ''}`} />
                  </Button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">
                  {feedback.rating === 0 ? 'Select rating' : 
                   feedback.rating === 1 ? 'Poor' :
                   feedback.rating === 2 ? 'Fair' :
                   feedback.rating === 3 ? 'Good' :
                   feedback.rating === 4 ? 'Very Good' : 'Excellent'}
                </span>
              </div>
              {errors.rating && <p className="text-sm text-destructive">{errors.rating}</p>}
            </div>

            {/* Message */}
            <div className="space-y-3">
              <Label htmlFor="message" className="text-base">Your feedback *</Label>
              <Textarea
                id="message"
                placeholder="Please describe your feedback in detail... (10-2000 characters)"
                value={feedback.message}
                onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
                className={`resize-none ${errors.message ? 'border-destructive' : ''}`}
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{errors.message || ''}</span>
                <span>{feedback.message.length}/2000</span>
              </div>
            </div>

            {/* Contact Preference */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contact"
                  checked={feedback.contact}
                  onCheckedChange={(checked) => setFeedback(prev => ({ ...prev, contact: !!checked }))}
                />
                <Label htmlFor="contact" className="text-sm cursor-pointer">
                  I'd like to be contacted about this feedback
                </Label>
              </div>
              
              {feedback.contact && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={feedback.email}
                    onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={resetForm}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Reset Form
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !feedback.message.trim() || feedback.rating === 0}
                className="w-full sm:w-auto hover-scale"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="bg-muted/50 animate-fade-in">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Privacy Notice:</strong> Your feedback will be reviewed by our team to improve the platform. 
              If you provided contact information, we may reach out to you for clarification or follow-up. 
              We will not share your information with third parties.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}