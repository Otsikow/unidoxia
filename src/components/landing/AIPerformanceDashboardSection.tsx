import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface MetricConfig {
  label: string;
  value: string;
  helper: string;
  trend?: "up" | "down" | "neutral";
}

const trendClassMap: Record<NonNullable<MetricConfig["trend"]>, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-600 dark:text-slate-200/80",
};

export function AIPerformanceDashboardSection() {
  const { t } = useTranslation();

  const titleParts = useMemo(
    () =>
      (t("pages.index.aiExecutiveDashboard.title", { returnObjects: true }) as {
        prefix?: string;
        highlight?: string;
        suffix?: string;
      }) ?? {},
    [t]
  );

  const metrics = useMemo(
    () =>
      (t("pages.index.aiExecutiveDashboard.metrics", { returnObjects: true }) as MetricConfig[]) ?? [],
    [t]
  );

  const insights = useMemo(
    () =>
      (t("pages.index.aiExecutiveDashboard.insights", { returnObjects: true }) as string[]) ?? [],
    [t]
  );

  const badgeLabel = t("pages.index.aiExecutiveDashboard.badge");
  const description = t("pages.index.aiExecutiveDashboard.description");
  const ceoPromise = t("pages.index.aiExecutiveDashboard.ceoPromise");
  const insightsTitle = t("pages.index.aiExecutiveDashboard.insightsTitle");

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 py-24 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.1),_transparent_50%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_50%)]" />
      <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-8">
          <Badge className="w-fit border-slate-300 bg-slate-200/80 text-xs font-semibold tracking-wide text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white">
            {badgeLabel}
          </Badge>
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">
              {titleParts.prefix}
              {titleParts.highlight ? (
                <span className="text-primary"> {titleParts.highlight} </span>
              ) : null}
              {titleParts.suffix ? <span>{titleParts.suffix}</span> : null}
            </h2>
            <p className="text-lg text-slate-600 dark:text-white/80">{description}</p>
            <p className="text-base font-semibold text-sky-600 dark:text-sky-200">{ceoPromise}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-white/60">
              {insightsTitle}
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-white/80">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => {
            const trendClass = metric.trend
              ? trendClassMap[metric.trend]
              : trendClassMap.neutral;

            return (
              <Card
                key={metric.label}
                className="border-slate-200 bg-white/90 text-slate-900 shadow-lg backdrop-blur transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-2xl"
              >
                <CardHeader className="pb-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-white/70">{metric.label}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-3xl font-semibold">{metric.value}</p>
                  <p className={`text-sm font-medium ${trendClass}`}>{metric.helper}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
