"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatItem {
  value: string;
  label: string;
}

const fallbackApprovals = [
  "Passport",
  "WAEC/NECO",
  "Transcripts",
  "Recommendation letters",
  "Bank statements",
];

const fallbackDetections = [
  "Missing pages",
  "Unclear images",
  "Wrong document type",
  "Fraud signs",
];

const fallbackRiskSignals = [
  "Same passport used for multiple accounts",
  "Students buying fabricated bank statements",
  "Uploading fake WAEC results",
  "Agents sending unrealistic profiles",
];

const fallbackStats: StatItem[] = [
  { value: "60s", label: "Average review time" },
  { value: "5 docs", label: "Checked simultaneously" },
  { value: "24/7", label: "Automated monitoring" },
];

const parseStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => Boolean(item));

  return parsed.length > 0 ? parsed : null;
};

const parseStats = (value: unknown): StatItem[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const stat = item as Partial<StatItem>;
      if (!stat.value || !stat.label) return null;
      return { value: String(stat.value), label: String(stat.label) } satisfies StatItem;
    })
    .filter((item): item is StatItem => Boolean(item));

  return parsed.length > 0 ? parsed : null;
};

function AIDocumentCheckerSection() {
  const { t } = useTranslation();

  const badge = t("pages.index.aiDocumentChecker.badge");
  const heading = t("pages.index.aiDocumentChecker.heading");
  const description = t("pages.index.aiDocumentChecker.description");
  const tagline = t("pages.index.aiDocumentChecker.tagline");
  const approvalsHeading = t("pages.index.aiDocumentChecker.approvals.heading");
  const detectionsHeading = t("pages.index.aiDocumentChecker.detections.heading");
  const riskHeading = t("pages.index.aiDocumentChecker.riskMonitoring.heading");
  const riskDescription = t("pages.index.aiDocumentChecker.riskMonitoring.description");
  const riskFootnote = t("pages.index.aiDocumentChecker.riskMonitoring.footnote");

  const approvals = useMemo(
    () =>
      parseStringArray(
        t("pages.index.aiDocumentChecker.approvals.items", {
          returnObjects: true,
        }) as unknown,
      ) ?? fallbackApprovals,
    [t],
  );

  const detections = useMemo(
    () =>
      parseStringArray(
        t("pages.index.aiDocumentChecker.detections.items", {
          returnObjects: true,
        }) as unknown,
      ) ?? fallbackDetections,
    [t],
  );

  const stats = useMemo(
    () =>
      parseStats(
        t("pages.index.aiDocumentChecker.stats", {
          returnObjects: true,
        }) as unknown,
      ) ?? fallbackStats,
    [t],
  );

  const riskSignals = useMemo(
    () =>
      parseStringArray(
        t("pages.index.aiDocumentChecker.riskMonitoring.items", {
          returnObjects: true,
        }) as unknown,
      ) ?? fallbackRiskSignals,
    [t],
  );

  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Badge className="mb-4 inline-flex items-center gap-2 bg-primary/15 text-primary">
          <ShieldCheck className="h-4 w-4" /> {badge}
        </Badge>
        <h2 className="text-4xl font-bold text-foreground sm:text-5xl">{heading}</h2>
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        <p className="mt-2 text-base font-semibold text-primary">{tagline}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 via-background to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="h-6 w-6 text-primary" /> {approvalsHeading}
            </CardTitle>
            <CardDescription>
              {t("pages.index.aiDocumentChecker.approvals.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {approvals.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-background/80 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-base font-medium text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-red-200/40 bg-gradient-to-b from-background via-background to-red-50/50 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-6 w-6 text-red-500" /> {detectionsHeading}
            </CardTitle>
            <CardDescription>
              {t("pages.index.aiDocumentChecker.detections.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {detections.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-2xl border border-red-200/40 bg-background/80 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100/60 dark:bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                  </span>
                  <span className="text-base font-medium text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.value} className="border-muted-foreground/10 bg-background/80">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-primary">{stat.value}</CardTitle>
              <CardDescription className="text-base text-foreground">
                {stat.label}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="h-6 w-6 text-primary" /> {riskHeading}
          </CardTitle>
          <CardDescription className="text-base text-foreground">
            {riskDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {riskSignals.map((signal) => (
              <li
                key={signal}
                className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-background/80 p-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </span>
                <span className="text-base font-medium text-foreground">{signal}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <p className="text-sm font-medium text-primary">{riskFootnote}</p>
        </CardFooter>
      </Card>
    </section>
  );
}

export { AIDocumentCheckerSection };
export default AIDocumentCheckerSection;
