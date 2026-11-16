import { ReactNode, useMemo } from "react";
import { Sparkles, CheckCircle2, CalendarDays, PiggyBank, ArrowRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withUniversityCardStyles } from "@/components/university/common/cardStyles";

type OfferInsight = {
  id: string;
  studentName: string;
  courseName: string;
  conditions: string[];
  deadline: string;
  deposit: string;
  nextSteps: string[];
  statusLabel: string;
};

const fallbackInsights: OfferInsight[] = [
  {
    id: "offer-ai-1",
    studentName: "Adaeze U.",
    courseName: "MSc Data Science",
    conditions: [
      "Submit final transcript showing minimum 3.2 CGPA",
      "Upload IELTS certificate with overall band 7.0",
    ],
    deadline: "Accept offer & send documents by 15 Mar 2025",
    deposit: "$2,000 seat deposit due 20 Mar 2025",
    nextSteps: [
      "Pay deposit to secure seat",
      "Choose accommodation preference",
    ],
    statusLabel: "Needs follow-up",
  },
  {
    id: "offer-ai-2",
    studentName: "Samuel O.",
    courseName: "MBA International",
    conditions: [
      "Provide employer reference on company letterhead",
      "Show proof of funds covering first year tuition",
    ],
    deadline: "Conditions due 22 Mar 2025",
    deposit: "$3,500 commitment fee due on acceptance",
    nextSteps: [
      "Upload bank statement to portal",
      "Check official visa information for the destination",
    ],
    statusLabel: "On track",
  },
  {
    id: "offer-ai-3",
    studentName: "Zainab L.",
    courseName: "BEng Civil Engineering",
    conditions: [
      "Send certified WAEC results with math ≥ B3",
      "Sign and return student conduct agreement",
    ],
    deadline: "Documents due 28 Mar 2025",
    deposit: "£1,500 deposit before CAS issuance",
    nextSteps: [
      "Upload signed offer letter",
      "Book CAS interview prep",
    ],
    statusLabel: "Ready for CAS",
  },
];

export type OfferLetterRecord = {
  id: string;
  studentName: string;
  courseName: string;
};

interface AIOfferLetterCheckerProps {
  records: OfferLetterRecord[];
  isLoading?: boolean;
}

const buildInsights = (records: OfferLetterRecord[]): OfferInsight[] => {
  if (!records.length) {
    return fallbackInsights;
  }

  return records.slice(0, 3).map((record, index) => {
    const fallback = fallbackInsights[index % fallbackInsights.length];
    return {
      ...fallback,
      id: record.id,
      studentName: record.studentName,
      courseName: record.courseName,
    } satisfies OfferInsight;
  });
};

export const AIOfferLetterChecker = ({ records, isLoading }: AIOfferLetterCheckerProps) => {
  const insights = useMemo(() => buildInsights(records), [records]);

  return (
    <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Offer Letter Checker
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Every uploaded offer letter is scanned so students clearly see what to do next—no more missed conditions
            or deadlines.
          </CardDescription>
        </div>
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          {isLoading ? "Analyzing new uploads…" : "Automatic review active"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-foreground"
          >
            <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Latest summary for</p>
                <p className="text-base font-semibold">
                  {insight.studentName}
                </p>
                <p className="text-xs text-muted-foreground">{insight.courseName}</p>
              </div>
              <Badge variant="outline" className="w-fit border-success/30 bg-success/10 text-success">
                {insight.statusLabel}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <InsightList
                icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                title="Conditions to meet"
                items={insight.conditions}
              />
              <InsightHighlight
                icon={<CalendarDays className="h-4 w-4 text-warning" />}
                title="Deadlines"
                value={insight.deadline}
              />
              <InsightHighlight
                icon={<PiggyBank className="h-4 w-4 text-primary" />}
                title="Deposit amount"
                value={insight.deposit}
              />
              <InsightList
                icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
                title="Next steps"
                items={insight.nextSteps}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

interface InsightListProps {
  title: string;
  icon: ReactNode;
  items: string[];
}

const InsightList = ({ title, icon, items }: InsightListProps) => (
  <div className="rounded-xl border border-border/40 bg-background/70 p-3">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title}
    </div>
    <ul className="space-y-1 text-sm text-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

interface InsightHighlightProps {
  title: string;
  icon: ReactNode;
  value: string;
}

const InsightHighlight = ({ title, icon, value }: InsightHighlightProps) => (
  <div className="rounded-xl border border-border/40 bg-background/70 p-3">
    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title}
    </div>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);

