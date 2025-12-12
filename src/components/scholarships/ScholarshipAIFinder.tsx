import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Target } from "lucide-react";
import {
  SCHOLARSHIP_COUNTRIES,
  SCHOLARSHIP_FIELDS,
  SCHOLARSHIP_LEVELS,
  SCHOLARSHIP_FUNDING_TYPES,
} from "@/data/scholarships";
import type { ScholarshipMatchProfile } from "@/types/scholarship";

interface ScholarshipAIFinderProps {
  onApplyProfile: (profile: ScholarshipMatchProfile) => void;
  activeProfile?: ScholarshipMatchProfile | null;
  loading?: boolean;
}

const WORK_EXPERIENCE_OPTIONS: { label: string; value: ScholarshipMatchProfile["workExperience"] }[] = [
  { label: "No experience yet", value: "none" },
  { label: "1-2 years", value: "1-2" },
  { label: "3+ years", value: "3+" },
];

const DEADLINE_OPTIONS: { label: string; value: ScholarshipMatchProfile["deadlinePreference"] }[] = [
  { label: "Next 30 days", value: "next30" },
  { label: "This year", value: "thisYear" },
  { label: "Flexible / Rolling", value: "flexible" },
];

const FUNDING_NEED_OPTIONS: { label: string; value: ScholarshipMatchProfile["fundingNeed"] }[] = [
  { label: "Any funding", value: "any" },
  { label: "Full tuition", value: "full" },
  { label: "Partial tuition", value: "partial" },
];

export const ScholarshipAIFinder = ({ onApplyProfile, activeProfile, loading }: ScholarshipAIFinderProps) => {
  const [formState, setFormState] = useState<ScholarshipMatchProfile>(activeProfile ?? {});
  const [context, setContext] = useState(activeProfile?.contextNote ?? "");

  useEffect(() => {
    setFormState(activeProfile ?? {});
    setContext(activeProfile?.contextNote ?? "");
  }, [activeProfile]);

  const canSubmit = useMemo(() => {
    return (
      Object.values(formState).some((value) => value !== undefined && value !== "") ||
      Boolean(context.trim())
    );
  }, [formState, context]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onApplyProfile({ ...formState, contextNote: context || undefined });
  };

  const setField = <K extends keyof ScholarshipMatchProfile>(key: K, value: ScholarshipMatchProfile[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Scholarship Finder
        </CardTitle>
        <CardDescription>
          Tell Zoe a few details. She will automatically filter scholarships by GPA, location, course, deadlines, tuition coverage
, and experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gpa">Your GPA</Label>
              <Input
                id="gpa"
                type="number"
                min="0"
                max="4"
                step="0.01"
                placeholder="e.g. 3.5"
                value={formState.gpa ?? ""}
                onChange={(event) => setField("gpa", event.target.value ? Number(event.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Country</Label>
              <Select value={formState.country ?? undefined} onValueChange={(value) => setField("country", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a destination" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {SCHOLARSHIP_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Course level</Label>
              <Select value={formState.programLevel ?? undefined} onValueChange={(value) => setField("programLevel", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {SCHOLARSHIP_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Field of study</Label>
              <Select value={formState.fieldOfStudy ?? undefined} onValueChange={(value) => setField("fieldOfStudy", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a discipline" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {SCHOLARSHIP_FIELDS.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deadline preference</Label>
              <Select
                value={formState.deadlinePreference ?? undefined}
                onValueChange={(value) => setField("deadlinePreference", value as ScholarshipMatchProfile["deadlinePreference"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="When do you want to apply?" />
                </SelectTrigger>
                <SelectContent>
                  {DEADLINE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value ?? ""}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tuition coverage</Label>
              <Select
                value={formState.fundingNeed ?? undefined}
                onValueChange={(value) => setField("fundingNeed", value as ScholarshipMatchProfile["fundingNeed"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Funding need" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_NEED_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value ?? ""}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work experience</Label>
              <Select
                value={formState.workExperience ?? undefined}
                onValueChange={(value) => setField("workExperience", value as ScholarshipMatchProfile["workExperience"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Experience level" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_EXPERIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value ?? ""}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Anything else?</Label>
            <Textarea
              id="context"
              placeholder="Share target universities, budget constraints, or standout achievements."
              rows={3}
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Zoe uses this context to fine tune the AI match scoring and keep your daily recommendations fresh.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <Target className="h-3.5 w-3.5" />
                Smart filtering enabled
              </Badge>
              <Badge variant="outline" className="gap-1">
                {SCHOLARSHIP_FUNDING_TYPES.length}+ funding types tracked
              </Badge>
            </div>
            <Button type="submit" size="lg" disabled={!canSubmit || loading}>
              {loading ? "Finding scholarships..." : "Find AI Matches"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
