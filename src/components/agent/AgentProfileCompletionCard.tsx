import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AgentProfileChecklistItem, AgentProfileCompletionResult } from "@/hooks/useAgentProfileCompletion";

interface AgentProfileCompletionCardProps {
  completion: AgentProfileCompletionResult;
  checklist: AgentProfileChecklistItem[];
  actionHref?: string;
  loading?: boolean;
}

export function AgentProfileCompletionCard({
  completion,
  checklist,
  actionHref = "/agent/settings",
  loading = false,
}: AgentProfileCompletionCardProps) {
  const missingItems = checklist.filter((item) => !item.isComplete);

  return (
    <Card className="border-warning/30 bg-warning/5 shadow-sm">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-warning">
            <ShieldCheck className="h-4 w-4" />
            <CardTitle className="text-base">Complete your agent profile</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Finish your credentials so students and universities know they are working with a verified professional.
          </CardDescription>
        </div>
        <div className="w-full md:w-64">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Profile completeness</span>
            <span>{completion.percentage}%</span>
          </div>
          <Progress value={completion.percentage} className="mt-2 h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Alert className="bg-muted">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Checking your profile requirements…</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-3 rounded-lg border bg-background/80 px-3 py-2"
              >
                <div className="mt-1">
                  {item.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {item.label}
                    <Badge variant={item.isComplete ? "secondary" : "outline"} className="text-[11px]">
                      {item.isComplete ? "Complete" : "Action needed"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {missingItems.length > 0
              ? `Next up: ${missingItems.map((item) => item.label).join(", ")}.`
              : "Great work! Your agent profile is complete."}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={actionHref}>{missingItems.length > 0 ? "Update profile" : "View profile"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
