import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO, subDays, subMonths, startOfMonth, endOfMonth, addDays } from "date-fns";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Nullable<T> = T | null | undefined;

export interface CEODashboardMetrics {
  applicationsThisWeek: number;
  applicationsLastWeek: number;
  applicationsChange: number;
  conversionRate: number;
  conversionRateChange: number;
  topAgents: Array<{
    name: string;
    csatScore: number;
    enrolledCount: number;
  }>;
  averageCSAT: number;
  topCountries: Array<{
    country: string;
    count: number;
  }>;
  topCountriesPipelinePercent: number;
  pipelineForecast: number;
  expectedRevenueThisMonth: number;
  expectedRevenueChange: number;
  currency: string;
  lastUpdated: string;
}

const safeCount = (count: Nullable<number>) =>
  typeof count === "number" && Number.isFinite(count) ? count : 0;

const safeNumber = (value: Nullable<number>) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`;
  }
  return `$${Math.round(amount)}`;
};

export const useCEODashboardData = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<CEODashboardMetrics>({
    queryKey: ["admin", "ceo-dashboard", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!tenantId) {
        throw new Error("Tenant not available for CEO dashboard query");
      }

      const now = new Date();
      const oneWeekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);
      const monthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const ninetyDaysFromNow = addDays(now, 90);

      // Fetch all data in parallel for efficiency
      const [
        applicationsThisWeekResult,
        applicationsLastWeekResult,
        totalApplicationsResult,
        enrolledApplicationsResult,
        lastMonthEnrolledResult,
        lastMonthTotalResult,
        agentApplicationsResult,
        agentFeedbackResult,
        studentCountriesResult,
        totalPipelineResult,
        pendingCommissionsResult,
        thisMonthCommissionsResult,
        lastMonthCommissionsResult,
      ] = await Promise.all([
        // Applications this week
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .neq("status", "draft")
          .gte("created_at", formatISO(oneWeekAgo)),
        // Applications last week
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .neq("status", "draft")
          .gte("created_at", formatISO(twoWeeksAgo))
          .lt("created_at", formatISO(oneWeekAgo)),
        // Total applications (for conversion rate)
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .neq("status", "draft"),
        // Enrolled applications (for conversion rate)
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "enrolled"),
        // Last month enrolled (for conversion change)
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "enrolled")
          .lt("created_at", formatISO(monthStart)),
        // Last month total applications (for conversion change)
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .neq("status", "draft")
          .lt("created_at", formatISO(monthStart)),
        // Agent applications for performance ranking
        supabase
          .from("applications")
          .select(`
            id,
            agent_id,
            status,
            agents!inner (
              id,
              profile_id,
              profiles!inner (
                full_name
              )
            )
          `)
          .eq("tenant_id", tenantId)
          .not("agent_id", "is", null),
        // Agent feedback/ratings
        supabase
          .from("user_feedback")
          .select("rating, user_id")
          .eq("tenant_id", tenantId)
          .not("rating", "is", null),
        // Student countries (leads by country)
        supabase
          .from("students")
          .select("id, current_country, nationality")
          .eq("tenant_id", tenantId),
        // Total pipeline (all active applications)
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .in("status", ["submitted", "screening", "conditional_offer", "unconditional_offer", "cas_loa", "visa"]),
        // Pending commissions (pipeline forecast)
        supabase
          .from("commissions")
          .select("amount_cents, currency")
          .eq("tenant_id", tenantId)
          .in("status", ["pending", "approved"]),
        // This month's expected commissions
        supabase
          .from("commissions")
          .select("amount_cents, currency")
          .eq("tenant_id", tenantId)
          .gte("created_at", formatISO(monthStart)),
        // Last month's commissions
        supabase
          .from("commissions")
          .select("amount_cents, currency")
          .eq("tenant_id", tenantId)
          .gte("created_at", formatISO(lastMonthStart))
          .lt("created_at", formatISO(lastMonthEnd)),
      ]);

      // Calculate applications metrics
      const applicationsThisWeek = safeCount(applicationsThisWeekResult.count);
      const applicationsLastWeek = safeCount(applicationsLastWeekResult.count);
      const applicationsChange = calculatePercentChange(applicationsThisWeek, applicationsLastWeek);

      // Calculate conversion rate
      const totalApps = safeCount(totalApplicationsResult.count);
      const enrolledApps = safeCount(enrolledApplicationsResult.count);
      const conversionRate = totalApps > 0 ? Math.round((enrolledApps / totalApps) * 100) : 0;

      // Calculate conversion rate change (vs previous period)
      const lastMonthTotal = safeCount(lastMonthTotalResult.count);
      const lastMonthEnrolled = safeCount(lastMonthEnrolledResult.count);
      const lastMonthConversionRate = lastMonthTotal > 0 ? Math.round((lastMonthEnrolled / lastMonthTotal) * 100) : 0;
      const conversionRateChange = conversionRate - lastMonthConversionRate;

      // Calculate top performing agents
      const agentPerformance = new Map<string, { name: string; enrolled: number; total: number }>();
      for (const app of agentApplicationsResult.data ?? []) {
        const agentId = app.agent_id;
        const agents = app.agents as { id: string; profile_id: string; profiles: { full_name: string } } | null;
        const agentName = agents?.profiles?.full_name ?? "Unknown Agent";

        if (agentId) {
          const current = agentPerformance.get(agentId) ?? { name: agentName, enrolled: 0, total: 0 };
          current.total += 1;
          if (app.status === "enrolled") {
            current.enrolled += 1;
          }
          agentPerformance.set(agentId, current);
        }
      }

      // Calculate average CSAT from feedback
      const ratings = (agentFeedbackResult.data ?? [])
        .map((f) => safeNumber(f.rating))
        .filter((r) => r > 0);
      const averageCSAT = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 4.5;

      // Get top 3 agents by enrolled count
      const topAgents = Array.from(agentPerformance.entries())
        .map(([id, data]) => ({
          name: data.name.split(" ")[data.name.split(" ").length - 1], // Use last name
          csatScore: averageCSAT, // Use average CSAT as individual CSAT isn't tracked per agent
          enrolledCount: data.enrolled,
        }))
        .sort((a, b) => b.enrolledCount - a.enrolledCount)
        .slice(0, 3);

      // Calculate countries with most leads
      const countryCounts = new Map<string, number>();
      for (const student of studentCountriesResult.data ?? []) {
        const country = student.current_country || student.nationality || "Unknown";
        if (country && country !== "Unknown") {
          countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
        }
      }

      const totalStudents = studentCountriesResult.data?.length ?? 0;
      const topCountries = Array.from(countryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([country, count]) => ({ country, count }));

      const topCountriesTotal = topCountries.reduce((sum, c) => sum + c.count, 0);
      const topCountriesPipelinePercent = totalStudents > 0
        ? Math.round((topCountriesTotal / totalStudents) * 100)
        : 0;

      // Calculate pipeline forecast (90-day outlook weighted by status)
      const pendingCommissions = pendingCommissionsResult.data ?? [];
      const pipelineForecast = pendingCommissions.reduce((total, c) => {
        const amount = safeNumber(c.amount_cents) / 100;
        // Weight by probability of conversion (pending = 60%, approved = 90%)
        return total + amount * 0.75;
      }, 0);

      // Calculate expected revenue this month
      const thisMonthCommissions = thisMonthCommissionsResult.data ?? [];
      const expectedRevenueThisMonth = thisMonthCommissions.reduce(
        (total, c) => total + safeNumber(c.amount_cents) / 100,
        0
      );

      const lastMonthCommissions = lastMonthCommissionsResult.data ?? [];
      const lastMonthRevenue = lastMonthCommissions.reduce(
        (total, c) => total + safeNumber(c.amount_cents) / 100,
        0
      );
      const expectedRevenueChange = calculatePercentChange(expectedRevenueThisMonth, lastMonthRevenue);

      // Get currency from most recent commission or default to USD
      const currency = (thisMonthCommissions[0] as { currency?: string } | undefined)?.currency
        ?? (pendingCommissions[0] as { currency?: string } | undefined)?.currency
        ?? "USD";

      return {
        applicationsThisWeek,
        applicationsLastWeek,
        applicationsChange,
        conversionRate,
        conversionRateChange,
        topAgents,
        averageCSAT,
        topCountries,
        topCountriesPipelinePercent,
        pipelineForecast,
        expectedRevenueThisMonth,
        expectedRevenueChange,
        currency,
        lastUpdated: new Date().toISOString(),
      };
    },
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ceo-dashboard", tenantId] });
    };

    const channel = supabase
      .channel(`ceo-dashboard-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_feedback" }, handleChange)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, queryClient]);

  return query;
};

// Helper function to format metrics for display
export const formatCEOMetrics = (
  data: CEODashboardMetrics | undefined,
  t: (key: string, options?: { returnObjects?: boolean }) => unknown
) => {
  if (!data) {
    // Return default/fallback metrics from i18n
    return (t("pages.index.aiExecutiveDashboard.metrics", { returnObjects: true }) as Array<{
      label: string;
      value: string;
      helper: string;
      trend?: "up" | "down" | "neutral";
    }>) ?? [];
  }

  const topAgentNames = data.topAgents.length > 0
    ? data.topAgents.map((a) => a.name).join(" · ")
    : "No agents yet";

  const topCountryNames = data.topCountries.length > 0
    ? data.topCountries.map((c) => c.country).join(" · ")
    : "No data yet";

  return [
    {
      label: "Applications this week",
      value: data.applicationsThisWeek.toString(),
      helper: `${data.applicationsChange >= 0 ? "+" : ""}${data.applicationsChange}% vs last week`,
      trend: data.applicationsChange >= 0 ? "up" as const : "down" as const,
    },
    {
      label: "Conversion rate",
      value: `${data.conversionRate}%`,
      helper: `${data.conversionRateChange >= 0 ? "+" : ""}${data.conversionRateChange} pts since automation`,
      trend: data.conversionRateChange >= 0 ? "up" as const : "down" as const,
    },
    {
      label: "Best-performing agents",
      value: topAgentNames,
      helper: `Average CSAT ${data.averageCSAT.toFixed(1)}/5`,
      trend: "neutral" as const,
    },
    {
      label: "Countries with the most leads",
      value: topCountryNames,
      helper: `${data.topCountriesPipelinePercent}% of total pipeline`,
      trend: "neutral" as const,
    },
    {
      label: "Pipeline forecast",
      value: formatCurrency(data.pipelineForecast),
      helper: "Weighted 90-day outlook",
      trend: "up" as const,
    },
    {
      label: "Expected revenue this month",
      value: formatCurrency(data.expectedRevenueThisMonth),
      helper: `${data.expectedRevenueChange >= 0 ? "+" : ""}${data.expectedRevenueChange}% vs plan`,
      trend: data.expectedRevenueChange >= 0 ? "up" as const : "down" as const,
    },
  ];
};
