import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CalendarDays,
  ExternalLink,
  FileCheck,
  GraduationCap,
  Layers,
  Sparkles,
  ShieldCheck,
  Share2,
  Bookmark,
  BookmarkCheck,
  Globe2,
} from "lucide-react";
import type { ScholarshipSearchResult } from "@/types/scholarship";
import { format } from "date-fns";

interface ScholarshipDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scholarship: ScholarshipSearchResult | null;
  isSaved: boolean;
  onToggleSave: (scholarship: ScholarshipSearchResult) => void;
  onShare?: (scholarship: ScholarshipSearchResult) => void;
  similarScholarships?: ScholarshipSearchResult[];
  onSelectScholarship?: (scholarship: ScholarshipSearchResult) => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <header className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary/80">
      <span className="h-1 w-6 rounded-full bg-primary" />
      <span>{title}</span>
    </header>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export const ScholarshipDetailDialog = ({
  open,
  onOpenChange,
  scholarship,
  isSaved,
  onToggleSave,
  onShare,
  similarScholarships,
  onSelectScholarship,
}: ScholarshipDetailDialogProps) => {
  if (!scholarship) return null;

  const handleSave = () => onToggleSave(scholarship);
  const handleShare = () => onShare?.(scholarship);

  const deadlineDate = scholarship.deadline ? format(new Date(scholarship.deadline), "PPP") : "Rolling";
  const countdownLabel = scholarship.deadlineLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-3xl">
        <DialogHeader className="border-b bg-muted/40 p-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/scholarships">Scholarships</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={(event) => event.preventDefault()}>
                  {scholarship.country}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={(event) => event.preventDefault()}>
                  {scholarship.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-semibold leading-tight sm:text-3xl">
                {scholarship.title}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-3 text-base text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {scholarship.institution}
                </span>
                <Separator orientation="vertical" className="hidden h-4 sm:inline-flex" />
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4" /> {scholarship.country}
                </span>
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3.5 w-3.5" /> {scholarship.level}
                </Badge>
                {scholarship.status ? (
                  <Badge
                    variant={
                      scholarship.status === "Expiring soon"
                        ? "destructive"
                        : scholarship.status === "Upcoming"
                          ? "default"
                          : "secondary"
                    }
                    className="gap-1"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {scholarship.status}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> AI match {scholarship.aiScore ?? 80}%
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {countdownLabel}
                </Badge>
                {scholarship.verified ? (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified source
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? "Saved" : "Save"}
              </Button>
              <Button size="sm" asChild>
                <a href={scholarship.officialLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                  Official application
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-10 p-6 sm:p-8">
            {scholarship.overview ? (
              <Section title="Scholarship overview">
                <p className="text-base text-foreground">{scholarship.overview}</p>
                <p>{scholarship.description}</p>
              </Section>
            ) : (
              <Section title="Scholarship overview">
                <p>{scholarship.description}</p>
              </Section>
            )}

            <Section title="Key details">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/40 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Funding
                  </h4>
                  <p className="text-base font-semibold text-foreground">{scholarship.awardAmount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Funding type:{" "}
                    <span className="font-medium text-foreground">
                      {scholarship.fundingType ?? "Not specified"}
                    </span>
                  </p>
                  {scholarship.benefitsSummary ? (
                    <p className="mt-1 text-sm text-muted-foreground">{scholarship.benefitsSummary}</p>
                  ) : null}
                  {scholarship.stipendDetails ? (
                    <p className="mt-1 text-sm text-muted-foreground">{scholarship.stipendDetails}</p>
                  ) : null}
                </div>
                <div className="rounded-xl border bg-muted/40 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" /> Deadline
                  </h4>
                  <p className="text-base font-semibold text-foreground">{deadlineDate}</p>
                  <p className="text-sm text-muted-foreground">{countdownLabel}</p>
                  {scholarship.applicationOpensAt ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Applications open:{" "}
                      <span className="font-medium text-foreground">
                        {format(new Date(scholarship.applicationOpensAt), "PPP p")}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border bg-muted/40 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Sponsor & verification
                  </h4>
                  <p className="text-sm text-foreground">
                    Sponsor:{" "}
                    <span className="font-medium">{scholarship.sponsor ?? scholarship.institution ?? "Not specified"}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Status:{" "}
                    <span className="font-medium text-foreground">{scholarship.status ?? "Not specified"}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last verified:{" "}
                    <span className="font-medium text-foreground">
                      {scholarship.lastVerified
                        ? format(new Date(scholarship.lastVerified), "PPP")
                        : "Not specified"}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileCheck className="h-4 w-4 text-primary" /> Application
                  </h4>
                  <p className="text-sm text-foreground">
                    Eligible applicants:{" "}
                    <span className="font-medium">{scholarship.applicantsEligible ?? "Not specified"}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Separate scholarship application required:{" "}
                    <span className="font-medium text-foreground">
                      {typeof scholarship.separateApplication === "boolean"
                        ? scholarship.separateApplication
                          ? "Yes"
                          : "No"
                        : "Not specified"}
                    </span>
                  </p>
                </div>
              </div>
              {scholarship.disclaimer ? (
                <div
                  role="note"
                  className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
                >
                  <p className="font-semibold text-destructive">Important disclaimer</p>
                  <p className="mt-1 text-muted-foreground">{scholarship.disclaimer}</p>
                </div>
              ) : null}
            </Section>

            <Section title="Eligibility">
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {scholarship.eligibility.nationality ? (
                  <li className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-semibold text-foreground">Eligible nationalities</p>
                    <p>{scholarship.eligibility.nationality.join(", ")}</p>
                  </li>
                ) : null}
                {scholarship.eligibility.fieldOfStudy ? (
                  <li className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-semibold text-foreground">Eligible fields</p>
                    <p>{scholarship.eligibility.fieldOfStudy.join(", ")}</p>
                  </li>
                ) : null}
                {scholarship.eligibility.gpa ? (
                  <li className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-semibold text-foreground">Academic requirement</p>
                    <p>{scholarship.eligibility.gpa}</p>
                  </li>
                ) : null}
                {scholarship.eligibility.languageRequirement ? (
                  <li className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-semibold text-foreground">Language requirement</p>
                    <p>{scholarship.eligibility.languageRequirement}</p>
                  </li>
                ) : null}
                {scholarship.eligibility.experience ? (
                  <li className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-semibold text-foreground">Experience</p>
                    <p>{scholarship.eligibility.experience}</p>
                  </li>
                ) : null}
                {scholarship.eligibility.notes ? (
                  <li className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-semibold text-foreground">Notes</p>
                    <p>{scholarship.eligibility.notes}</p>
                  </li>
                ) : null}
              </ul>
            </Section>

            <Section title="Application steps">
              <ol className="space-y-3 text-sm">
                {scholarship.applicationSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </Section>

            {scholarship.documentsRequired.length ? (
              <Section title="Required documents">
                <ul className="grid gap-2 text-sm sm:grid-cols-2">
                  {scholarship.documentsRequired.map((document) => (
                    <li key={document} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                      <FileCheck className="h-4 w-4 text-primary" />
                      <span>{document}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {scholarship.selectionProcess ? (
              <Section title="Selection process">
                <p>{scholarship.selectionProcess}</p>
              </Section>
            ) : null}

            {scholarship.languageSupport?.length ? (
              <Section title="Language support">
                <div className="flex flex-wrap gap-2">
                  {scholarship.languageSupport.map((language) => (
                    <Badge key={language} variant="secondary" className="rounded-full">
                      {language}
                    </Badge>
                  ))}
                </div>
              </Section>
            ) : null}

            {scholarship.tags?.length ? (
              <Section title="Tags & focus areas">
                <div className="flex flex-wrap gap-2">
                  {(scholarship.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </Section>
            ) : null}

            {similarScholarships?.length ? (
              <Section title="Similar scholarships">
                <div className="grid gap-3 sm:grid-cols-3">
                  {similarScholarships.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectScholarship?.(item)}
                      className="group rounded-2xl border bg-muted/30 p-4 text-left transition hover:border-primary"
                    >
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.country} • {item.level}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">{item.awardAmount}</p>
                    </button>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
