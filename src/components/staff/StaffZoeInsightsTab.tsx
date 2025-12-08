import { useState } from "react";
import { Bot, CalendarClock, Flame, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useStaffInsights } from "@/hooks/useStaffData";
import { useZoeAI, useZoePromptLibrary } from "@/hooks/useZoeAI";

export function StaffZoeInsightsTab() {
  const { toast } = useToast();
  const { data, isLoading, isError, refetch, isFetching } = useStaffInsights();
  const prompts = useZoePromptLibrary();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [promptValue, setPromptValue] = useState("Which students haven’t uploaded transcripts?");
  const [responseHtml, setResponseHtml] = useState("<p class=\"text-sm text-muted-foreground\">Ask Zoe anything about student readiness, application health, or agent performance.</p>");

  const zoeMutation = useZoeAI();

  const handleSubmit = async () => {
    if (!promptValue.trim()) {
      toast({ title: "Prompt required", description: "Please provide a question for Zoe." });
      return;
    }

    try {
      const result = await zoeMutation.mutateAsync({ prompt: promptValue });
      setResponseHtml(result.markdown);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Zoe prompt failed", error);
      toast({
        title: "Zoe is unavailable",
        description: error instanceof Error ? error.message : "Unable to contact Zoe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    if (isLoading || isFetching) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((__, row) => (
                  <Skeleton key={row} className="h-3 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (isError || !data) {
      return (
        <Card className="rounded-2xl border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-muted-foreground" /> Zoe insights unavailable
            </CardTitle>
            <CardDescription>We couldn't load Zoe’s summaries. Try refreshing below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" /> Retry Zoe fetch
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" /> Students at Risk
            </CardTitle>
            <CardDescription>Flagged by Zoe across live document and visa readiness checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.riskStudents.length === 0 && (
              <p className="text-sm text-muted-foreground">No urgent risk cases. Zoe will alert you when something changes.</p>
            )}
            {data.riskStudents.map((student) => (
              <div key={student.id} className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{student.name}</p>
                  {student.escalationLevel && <Badge variant="outline" className="border-orange-400 text-orange-600">{student.escalationLevel}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{student.riskReason}</p>
                {student.owner && <p className="text-xs text-muted-foreground mt-2">Owner: {student.owner}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-green-500" /> Top Performing Agents
            </CardTitle>
            <CardDescription>Conversion impact based on Zoe’s telemetry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topAgents.length === 0 && (
              <p className="text-sm text-muted-foreground">No agent performance deltas reported today.</p>
            )}
            {data.topAgents.map((agent) => (
              <div key={agent.id} className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{agent.name}</p>
                  <Badge variant="outline" className="border-green-400 text-green-600">{agent.metric}</Badge>
                </div>
                {typeof agent.delta === "number" && (
                  <p className="text-xs text-muted-foreground mt-1">Δ {agent.delta.toFixed(1)}% week-over-week</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-blue-500" /> Applications Near Deadlines
            </CardTitle>
            <CardDescription>Courses approaching due dates within 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.deadlineApplications.length === 0 && (
              <p className="text-sm text-muted-foreground">No applications near deadlines. Zoe will watch for you.</p>
            )}
            {data.deadlineApplications.map((application) => (
              <div key={application.id} className="rounded-xl bg-muted/40 p-3">
                <p className="font-medium">{application.applicant}</p>
                <p className="text-xs text-muted-foreground">{application.program}</p>
                <p className="text-xs text-muted-foreground mt-1">Deadline: {application.deadline ?? "Unknown"}</p>
                <Badge variant="outline" className="mt-2">{application.status ?? "Pending"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Recommendations
            </CardTitle>
            <CardDescription>Next best actions curated by Zoe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendations.length === 0 && (
              <p className="text-sm text-muted-foreground">Zoe will surface next best actions as data changes.</p>
            )}
            {data.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-xl bg-muted/40 p-3">
                <p className="font-medium">{recommendation.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{recommendation.description}</p>
                {recommendation.impact && (
                  <Badge variant="outline" className="mt-2 border-primary/40 text-primary">
                    {recommendation.impact}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Zoe AI Insights</h2>
          <p className="text-sm text-muted-foreground">Real-time orchestration hints based on your Supabase tenant.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prompts.map((quickPrompt) => (
            <Button
              key={quickPrompt.id}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setPromptValue(quickPrompt.prompt);
                setIsDialogOpen(true);
              }}
            >
              <Sparkles className="h-4 w-4" /> {quickPrompt.label}
            </Button>
          ))}
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Bot className="h-4 w-4" /> Ask Zoe
          </Button>
        </div>
      </div>

      {renderContent()}

      <Card className="rounded-2xl border border-muted">
        <CardHeader>
          <CardTitle>Zoe response</CardTitle>
          <CardDescription>Structured answers appear below. Markdown formatting is supported.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-72">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: responseHtml }} />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask Zoe</DialogTitle>
            <DialogDescription>
              Type a natural language prompt. Zoe will respond with structured insights based on Supabase data.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={promptValue}
            onChange={(event) => setPromptValue(event.target.value)}
            placeholder="Which students haven’t uploaded transcripts?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-2" onClick={handleSubmit} disabled={zoeMutation.isPending}>
              {zoeMutation.isPending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StaffZoeInsightsTab;
