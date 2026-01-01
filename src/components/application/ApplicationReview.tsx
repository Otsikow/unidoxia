import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { ApplicationReview as AppReviewType, ScoringConfig } from "@/types/review";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/LoadingState";

interface Props {
  applicationId: string;
  readOnly?: boolean;
  defaultStage?: string;
}

const reviewSchema = z.object({
  scores: z.object({
    academics: z.number().min(0).max(100),
    english_proficiency: z.number().min(0).max(100),
    statement_quality: z.number().min(0).max(100),
    visa_risk: z.number().min(0).max(100),
  }),
  feedback: z.object({
    strengths: z.string().optional(),
    weaknesses: z.string().optional(),
    conditions: z.string().optional(),
    visa_concerns: z.string().optional(),
  }),
  decision: z.enum(["approve", "reject", "request_changes"]),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export const ApplicationReview = ({ applicationId, readOnly = false, defaultStage = 'admin_review' }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [totalScore, setTotalScore] = useState(0);

  const { data: applicationData, isLoading: isLoadingApp } = useQuery({
    queryKey: ["application-review-data", applicationId],
    queryFn: async () => {
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          program:programs!inner (
            id,
            university:universities!inner (
              id,
              scoring_config
            )
          )
        `)
        .eq("id", applicationId)
        .single();

      if (appError) throw appError;
      return appData;
    },
  });

  const { data: reviewData, isLoading: isLoadingReview } = useQuery({
    queryKey: ["application-review", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_reviews")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as AppReviewType | null;
    },
  });

  // Safe access to scoring config
  const scoringConfig = (applicationData?.program?.university as any)?.scoring_config as ScoringConfig | undefined;

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      scores: {
        academics: 0,
        english_proficiency: 0,
        statement_quality: 0,
        visa_risk: 0,
      },
      feedback: {
        strengths: "",
        weaknesses: "",
        conditions: "",
        visa_concerns: "",
      },
      decision: "request_changes",
    },
  });

  useEffect(() => {
    if (reviewData) {
      form.reset({
        scores: {
          academics: reviewData.scores?.academics || 0,
          english_proficiency: reviewData.scores?.english_proficiency || 0,
          statement_quality: reviewData.scores?.statement_quality || 0,
          visa_risk: reviewData.scores?.visa_risk || 0,
        },
        feedback: {
          strengths: reviewData.feedback?.strengths?.join("\n") || "",
          weaknesses: reviewData.feedback?.weaknesses?.join("\n") || "",
          conditions: reviewData.feedback?.conditions?.join("\n") || "",
          visa_concerns: reviewData.feedback?.visa_concerns?.join("\n") || "",
        },
        decision: (reviewData.decision as any) || "request_changes",
      });
    }
  }, [reviewData, form]);

  const scores = form.watch("scores");

  useEffect(() => {
    if (scoringConfig) {
      const weightedScore =
        (scores.academics * (scoringConfig.academics.weight / 100)) +
        (scores.english_proficiency * (scoringConfig.english_proficiency.weight / 100)) +
        (scores.statement_quality * (scoringConfig.statement_quality.weight / 100)) +
        (scores.visa_risk * (scoringConfig.visa_risk.weight / 100));
      setTotalScore(Math.round(weightedScore));
    }
  }, [scores, scoringConfig]);

  const mutation = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      const feedback = {
        strengths: values.feedback.strengths?.split("\n").filter(s => s.trim()) || [],
        weaknesses: values.feedback.weaknesses?.split("\n").filter(s => s.trim()) || [],
        conditions: values.feedback.conditions?.split("\n").filter(s => s.trim()) || [],
        visa_concerns: values.feedback.visa_concerns?.split("\n").filter(s => s.trim()) || [],
      };

      // Determine stage: if updating, keep existing stage, else use default
      const stage = reviewData?.stage || defaultStage;

      const payload = {
        application_id: applicationId,
        scores: values.scores,
        feedback,
        decision: values.decision,
        stage: stage,
        status: 'completed',
      };

      if (reviewData?.id) {
        const { error } = await supabase
          .from("application_reviews")
          .update(payload)
          .eq("id", reviewData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("application_reviews")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Review submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["application-review", applicationId] });
    },
    onError: (error) => {
      toast({ title: "Error submitting review", description: error.message, variant: "destructive" });
    },
  });

  if (isLoadingApp || isLoadingReview) {
    return <LoadingState message="Loading review data..." />;
  }

  // If readOnly is true and there is no review data, show nothing or a specific message
  if (readOnly && !reviewData) {
    return (
      <Card className="border-border bg-muted/20">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No review available yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (!scoringConfig) {
    if (readOnly) return null; // Don't show config error to read-only viewers (like agents)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Missing</AlertTitle>
        <AlertDescription>
          The university has not configured the scoring rubric yet. Please ask the administrator to set it up in the university profile.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Application Review</CardTitle>
        <CardDescription>
          {readOnly ? "Review details and feedback." : "Score the application based on the university's rubric and provide feedback."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">

            {/* Scoring Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Scoring Rubric (Total Score: <span className="text-primary font-bold">{totalScore}/100</span>)</h3>

              <FormField control={form.control} name="scores.academics" render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>Academics (Weight: {scoringConfig.academics.weight}%)</FormLabel>
                    <span className="text-sm text-muted-foreground">{field.value} / 100</span>
                  </div>
                  <FormControl>
                    <Slider
                      disabled={readOnly}
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="scores.english_proficiency" render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>English Proficiency (Weight: {scoringConfig.english_proficiency.weight}%)</FormLabel>
                    <span className="text-sm text-muted-foreground">{field.value} / 100</span>
                  </div>
                  <FormControl>
                    <Slider
                      disabled={readOnly}
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="scores.statement_quality" render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>Statement Quality (Weight: {scoringConfig.statement_quality.weight}%)</FormLabel>
                    <span className="text-sm text-muted-foreground">{field.value} / 100</span>
                  </div>
                  <FormControl>
                    <Slider
                      disabled={readOnly}
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="scores.visa_risk" render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>Visa Risk (Weight: {scoringConfig.visa_risk.weight}%)</FormLabel>
                    <span className="text-sm text-muted-foreground">{field.value} / 100</span>
                  </div>
                  <FormControl>
                    <Slider
                      disabled={readOnly}
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="border-t my-4" />

            {/* Feedback Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Feedback</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="feedback.strengths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strengths</FormLabel>
                    <FormControl>
                      <Textarea disabled={readOnly} placeholder="List key strengths (one per line)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="feedback.weaknesses" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weaknesses</FormLabel>
                    <FormControl>
                      <Textarea disabled={readOnly} placeholder="List areas for improvement (one per line)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="feedback.conditions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conditions</FormLabel>
                    <FormControl>
                      <Textarea disabled={readOnly} placeholder="List conditions if applicable (one per line)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="feedback.visa_concerns" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visa Concerns</FormLabel>
                    <FormControl>
                      <Textarea disabled={readOnly} placeholder="Note any visa risks (one per line)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Decision Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Decision</h3>
              <FormField control={form.control} name="decision" render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <Select
                    disabled={readOnly}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="request_changes">Request Changes</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {!readOnly && (
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Submit Review
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
