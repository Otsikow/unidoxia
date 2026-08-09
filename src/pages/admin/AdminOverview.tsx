"use client";

import { useCallback, useMemo, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminOverviewMetrics,
  useAdmissionsTrends,
  useApplicationsByCountry,
  useAdminRecentActivity,
  useSystemHealth,
} from "@/hooks/admin/useAdminOverviewData";
import AdminReportExportButton from "@/components/admin/AdminReportExportButton";
import { LoadingState } from "@/components/LoadingState";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  FileText,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/* KPI configuration — four essential operations signals                      */
/* -------------------------------------------------------------------------- */
const KPI_CONFIG = [
  {
    key: "activeApplications",
    labelKey: "admin.overview.kpis.activeApplications",
    defaultLabel: "Active applications",
    to: "/admin/admissions",
    icon: FileText,
  },
  {
    key: "totalStudents",
    labelKey: "admin.overview.kpis.totalStudents",
    defaultLabel: "Students",
    to: "/admin/students",
    icon: GraduationCap,
  },
  {
    key: "pendingVerifications",
    labelKey: "admin.overview.kpis.pendingVerifications",
    defaultLabel: "Needs review",
    to: "/admin/agents",
    icon: ShieldCheck,
    accent: true,
  },
  {
    key: "totalCommissionPaid",
    labelKey: "admin.overview.kpis.totalCommissionPaid",
    defaultLabel: "Commission paid",
    to: "/admin/payments",
    icon: Wallet,
    format: "currency",
  },
] as const;

const ACTION_ITEMS = [
  {
    key: "verification",
    labelKey: "admin.overview.actions.verification",
    defaultLabel: "Verification queue",
    descriptionKey: "admin.overview.actions.verificationDescription",
    defaultDescription: "Approve agents and university partners",
    to: "/admin/agents",
    icon: ShieldCheck,
  },
  {
    key: "leads",
    labelKey: "admin.overview.actions.leads",
    defaultLabel: "Website leads",
    descriptionKey: "admin.overview.actions.leadsDescription",
    defaultDescription: "Follow up on new consultation requests",
    to: "/admin/leads",
    icon: Users,
  },
  {
    key: "admissions",
    labelKey: "admin.overview.actions.admissions",
    defaultLabel: "Admissions pipeline",
    descriptionKey: "admin.overview.actions.admissionsDescription",
    defaultDescription: "Review offers, interviews and decisions",
    to: "/admin/admissions",
    icon: FileText,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */
const formatValue = (value: number, format?: "currency", currency = "USD", locale = "en") => {
  if (format === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
};

const getHealthStyles = (status: string, t: TFunction) => {
  switch (status) {
    case "operational":
      return {
        label: t("admin.overview.health.operational", { defaultValue: "Operational" }),
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
        accent: "text-emerald-500",
      };
    case "monitoring":
      return {
        label: t("admin.overview.health.monitoring", { defaultValue: "Monitoring" }),
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
        accent: "text-amber-500",
      };
    case "degraded":
      return {
        label: t("admin.overview.health.degraded", { defaultValue: "Degraded" }),
        badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
        accent: "text-orange-500",
      };
    case "critical":
      return {
        label: t("admin.overview.health.critical", { defaultValue: "Critical" }),
        badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
        accent: "text-red-500",
      };
    default:
      return {
        label: t("admin.overview.health.unknown", { defaultValue: "Unknown" }),
        badge: "bg-muted text-muted-foreground",
        accent: "text-muted-foreground",
      };
  }
};

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */
const AdminOverview = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const translate = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...options }),
    [t],
  );

  const metricsQuery = useAdminOverviewMetrics(tenantId);
  const trendsQuery = useAdmissionsTrends(tenantId);
  const geographyQuery = useApplicationsByCountry(tenantId);
  const activityQuery = useAdminRecentActivity(tenantId);
  const healthQuery = useSystemHealth(tenantId);

  const openZoe = (prompt: string) =>
    typeof window !== "undefined" &&
    window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt } }));

  const topDestination = geographyQuery.data?.[0];
  const healthStyles = getHealthStyles(healthQuery.data?.status ?? "unknown", t);
  const recentActivity = useMemo(() => (activityQuery.data ?? []).slice(0, 6), [activityQuery.data]);

  const momentumChart = useMemo(() => {
    if (trendsQuery.isLoading) {
      return (
        <LoadingState
          message={translate("admin.overview.loading.trends", "Loading admissions trends")}
          size="sm"
        />
      );
    }
    if (!trendsQuery.data?.length) {
      return (
        <p className="text-sm text-muted-foreground">
          {translate(
            "admin.overview.emptyStates.noAdmissions",
            "No admissions activity recorded for the selected period.",
          )}
        </p>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendsQuery.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="currentColor"
            tickLine={false}
            axisLine={false}
            className="text-xs text-muted-foreground"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            stroke="currentColor"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            className="text-xs text-muted-foreground"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Line
            type="monotone"
            dataKey="submitted"
            strokeWidth={2}
            dot={false}
            stroke="hsl(var(--chart-1))"
            name={translate("admin.overview.trends.submitted", "Submitted")}
          />
          <Line
            type="monotone"
            dataKey="enrolled"
            strokeWidth={2}
            dot={false}
            stroke="hsl(var(--chart-2))"
            name={translate("admin.overview.trends.enrolled", "Enrolled")}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, [translate, trendsQuery.data, trendsQuery.isLoading]);

  const secondaryFacts = [
    {
      key: "destination",
      label: translate("admin.overview.facts.topDestination", "Top destination"),
      value: topDestination?.country ?? "—",
      hint: topDestination
        ? translate("admin.overview.facts.applications", "{{count}} applications", {
            count: topDestination.applications,
          })
        : translate("admin.overview.facts.noPipeline", "No pipeline yet"),
    },
    {
      key: "agents",
      label: translate("admin.overview.kpis.totalAgents", "Agents"),
      value: formatValue(metricsQuery.data?.totalAgents ?? 0, undefined, undefined, i18n.language),
      hint: translate("admin.overview.facts.agentsHint", "Active partner network"),
    },
    {
      key: "universities",
      label: translate("admin.overview.kpis.totalUniversities", "University partners"),
      value: formatValue(
        metricsQuery.data?.totalUniversities ?? 0,
        undefined,
        undefined,
        i18n.language,
      ),
      hint: translate("admin.overview.facts.universitiesHint", "Institutions onboarded"),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {translate("admin.overview.title", "Operations overview")}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {translate(
              "admin.overview.subtitle",
              "Monitor admissions momentum, commercial health, and platform activity in one unified console.",
            )}
          </p>
        </div>
        <div className="page-header-actions w-full sm:w-auto">
          <AdminReportExportButton tenantId={tenantId} defaultReportType="admissions" />
        </div>
      </div>

      {/* KPI panels */}
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CONFIG.map((item) => {
          const value = metricsQuery.data?.[item.key] ?? 0;
          const display =
            "format" in item && item.format === "currency"
              ? formatValue(value, "currency", metricsQuery.data?.currency, i18n.language)
              : formatValue(value, undefined, undefined, i18n.language);
          const label = translate(item.labelKey, item.defaultLabel);
          const go = () => navigate(item.to);
          const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              go();
            }
          };
          const Icon = item.icon;
          const needsAttention = "accent" in item && item.accent && value > 0;

          return (
            <Card
              key={item.key}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={go}
              onKeyDown={handleKeyDown}
              className="flex h-full min-h-[154px] cursor-pointer flex-col transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CardHeader className="flex min-h-[60px] flex-row items-start justify-between gap-2 space-y-0 p-4 pb-1.5">
                <CardTitle className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                  {label}
                </CardTitle>
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    needsAttention ? "text-amber-500" : "text-muted-foreground",
                  )}
                />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {metricsQuery.isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p
                    className={cn(
                      "text-xl font-semibold tracking-tight sm:text-2xl",
                      needsAttention && "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {display}
                  </p>
                )}
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {translate("admin.overview.kpis.lastUpdated", "Updated {{time}}", {
                    time: metricsQuery.data?.lastUpdated
                      ? formatDistanceToNow(new Date(metricsQuery.data.lastUpdated), {
                          addSuffix: true,
                        })
                      : translate("admin.overview.kpis.justNow", "moments ago"),
                  })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-4">
          {/* Admissions momentum */}
          <Card>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-sm font-semibold sm:text-base">
                {translate("admin.overview.trends.title", "Admissions momentum")}
              </CardTitle>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {translate(
                  "admin.overview.trends.subtitle",
                  "Rolling six-month submission and enrollment cadence",
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="h-[200px] sm:h-[220px]">{momentumChart}</div>
              <div className="grid grid-cols-3 gap-2 border-t pt-4">
                {secondaryFacts.map((fact) => (
                  <div key={fact.key} className="min-w-0">
                    <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="truncate text-sm font-semibold sm:text-base">{fact.value}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{fact.hint}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 sm:p-5">
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  {translate("admin.overview.recentActivity.title", "Recent activity")}
                </CardTitle>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {translate(
                    "admin.overview.recentActivity.subtitle",
                    "Latest tenant-wide audit events",
                  )}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate("/admin/logs")}>
                {translate("admin.overview.recentActivity.viewAll", "View all")}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {activityQuery.isLoading ? (
                <div className="px-4 pb-4">
                  <LoadingState
                    message={translate("admin.overview.loading.activity", "Loading activity")}
                    size="sm"
                  />
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  {translate("admin.overview.recentActivity.empty", "No recent activity recorded.")}
                </p>
              ) : (
                <ul className="divide-y">
                  {recentActivity.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-medium">{item.action}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.user?.full_name
                            ? translate("admin.overview.recentActivity.entityByUser", "{{entity}} · {{name}}", {
                                entity: item.entity,
                                name: item.user.full_name,
                              })
                            : item.entity}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          {/* Action centre */}
          <Card>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-sm font-semibold sm:text-base">
                {translate("admin.overview.actions.title", "Action centre")}
              </CardTitle>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {translate("admin.overview.actions.subtitle", "Jump straight into daily operations")}
              </p>
            </CardHeader>
            <CardContent className="space-y-1 p-2 pt-0 sm:p-3 sm:pt-0">
              {ACTION_ITEMS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => navigate(action.to)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-foreground/70" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {translate(action.labelKey, action.defaultLabel)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {translate(action.descriptionKey, action.defaultDescription)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Platform status */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-5">
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  {translate("admin.overview.health.title", "Platform status")}
                </CardTitle>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {translate(
                    "admin.overview.health.subtitle",
                    "Security signals aggregated from the last 30 days",
                  )}
                </p>
              </div>
              <Badge className={cn(healthStyles.badge, "shrink-0 text-xs")}>{healthStyles.label}</Badge>
            </CardHeader>
            <CardContent className="flex items-baseline gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
              <Activity className={cn("h-4 w-4", healthStyles.accent)} />
              <p className={cn("text-2xl font-semibold", healthStyles.accent)}>
                {healthQuery.data?.score ?? 0}
              </p>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {translate("admin.overview.health.scoreLabel", "risk score")}
              </span>
            </CardContent>
          </Card>

          {/* Zoe operations briefing */}
          <Card>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {translate("admin.overview.zoe.title", "Operations briefing")}
              </CardTitle>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {translate(
                  "admin.overview.zoe.subtitle",
                  "Ask Zoe for today's priorities across admissions and verifications",
                )}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() =>
                  openZoe(
                    translate(
                      "admin.overview.zoe.prompt",
                      "Give me a concise briefing of today's top operational priorities across admissions, verifications and leads.",
                    ),
                  )
                }
              >
                {translate("admin.overview.zoe.cta", "Get today's briefing")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
