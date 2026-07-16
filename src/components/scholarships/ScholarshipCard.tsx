import { MouseEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ExternalLink,
  Globe2,
  GraduationCap,
  Sparkles,
  Award,
  Share2,
  ShieldCheck,
  Clock,
  Zap,
} from "lucide-react";
import type { ScholarshipSearchResult } from "@/types/scholarship";
import { cn } from "@/lib/utils";

interface ScholarshipCardProps {
  scholarship: ScholarshipSearchResult;
  onToggleSave: (scholarship: ScholarshipSearchResult) => void;
  isSaved: boolean;
  onSelect?: (scholarship: ScholarshipSearchResult) => void;
  onViewDetails?: () => void;
  onShare?: () => void;
  className?: string;
}

const getDeadlineVariant = (days: number | null | undefined) => {
  if (days === null) return "outline" as const;
  if (days < 0) return "secondary" as const;
  if (days <= 7) return "destructive" as const;
  if (days <= 14) return "default" as const;
  return "outline" as const;
};

export const ScholarshipCard = ({
  scholarship,
  onToggleSave,
  isSaved,
  onSelect,
  onViewDetails,
  onShare,
  className,
}: ScholarshipCardProps) => {
  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails();
      return;
    }

    onSelect?.(scholarship);
  };

  const handleSave = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleSave(scholarship);
  };

  const handleShare = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onShare?.();
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (onViewDetails) {
            onViewDetails();
            return;
          }

          onSelect?.(scholarship);
        }
      }}
      className={cn("flex flex-col h-full cursor-pointer transition-transform hover:-translate-y-1", className)}
    >
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
              {scholarship.logoUrl ? (
                <img src={scholarship.logoUrl} alt={scholarship.institution} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <GraduationCap className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl leading-snug line-clamp-2">{scholarship.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Globe2 className="h-4 w-4" />
                  {scholarship.country}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {scholarship.level}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-start gap-2">
            {scholarship.verified ? (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </Badge>
            ) : null}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSave} aria-label={isSaved ? "Remove from saved scholarships" : "Save scholarship"}>
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Award className="h-3.5 w-3.5" />
            {scholarship.fundingType} funding
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            AI match {scholarship.aiScore ?? 80}%
          </Badge>
          {typeof scholarship.profileMatchScore === "number" ? (
            <Badge
              variant={scholarship.qualifiesBasedOnProfile ? "secondary" : "outline"}
              className="gap-1"
            >
              <Zap className="h-3.5 w-3.5" />
              Profile match {scholarship.profileMatchScore}%
            </Badge>
          ) : null}
          <Badge variant={getDeadlineVariant(scholarship.deadlineDaysRemaining)} className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {scholarship.deadlineLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Award className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">Funding overview</p>
              <p>{scholarship.awardAmount}</p>
              {scholarship.stipendDetails ? <p className="mt-1 text-xs">{scholarship.stipendDetails}</p> : null}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">Eligibility snapshot</p>
              <p>{scholarship.eligibilitySummary}</p>
            </div>
          </div>
        </div>

        {scholarship.matchReasons?.length ? (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <p className="mb-2 font-semibold text-foreground">Why we recommend it</p>
            <ul className="space-y-1 text-muted-foreground">
              {scholarship.matchReasons.slice(0, 3).map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {(scholarship.tags ?? []).slice(0, 6).map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full">
              #{tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-3">
        {(scholarship.status || scholarship.lastVerified) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              {scholarship.status && (
                <Badge variant="outline">{scholarship.status}</Badge>
              )}
              {scholarship.sponsor && scholarship.sponsor !== scholarship.institution && (
                <span>Sponsor: {scholarship.sponsor}</span>
              )}
            </div>
            {scholarship.lastVerified && (
              <span>
                Verified {new Date(scholarship.lastVerified).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString() : "Rolling"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={(event) => event.stopPropagation()} asChild>
              <a href={scholarship.officialLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                Official application <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardFooter>

    </Card>
  );
};
