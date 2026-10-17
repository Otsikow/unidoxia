import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO, subMonths, subDays, startOfWeek, format } from "date-fns";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Nullable<T> = T | null | undefined;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ApplicationPipelineMetrics {
  byStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  total: number;
  submittedThisWeek: number;
  submittedLastWeek: number;
  weeklyChange: number;
  averageTimeToDecision: number;
}

export interface AttributionMetrics {
  bySource: {
    source: string;
    count: number;
    percentage: number;
  }[];
  byMedium: {
    medium: string;
    count: number;
  }[];
  byCampaign: {
    campaign: string;
    count: number;
  }[];
  topReferrers: {
    name: string;
    count: number;
  }[];
  total: number;
}

export interface UniversityCodeMetrics {
  topUniversities: {
    name: string;
    applications: number;
    enrolled: number;
    conversionRate: number;
  }[];
  totalActiveUniversities: number;
  totalApplicationsToPartners: number;
  averageApplicationsPerUniversity: number;
}

export interface CommissionReadinessMetrics {
  byStatus: {
    status: string;
    count: number;
    totalValue: number;
    percentage: number;
  }[];
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  pendingValue: number;
  approvedValue: number;
  paidValue: number;
  readinessScore: number; // % of enrolled applications with processed commission
  currency: string;
}

export interface ApplicationVelocityPoint {
  date: string;
  submitted: number;
  enrolled: number;
}

/* -------------------------------------------------------------------------- */
/* Utility Functions                                                          */
/* -------------------------------------------------------------------------- */

const safeCount = (count: Nullable<number>) =>
  typeof count === "number" && Number.isFinite(count) ? count : 0;

const safeNumber = (value: Nullable<number>) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100 * 10) / 10;
};

const formatStatusLabel = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/* -------------------------------------------------------------------------- */
/* Application Pipeline Hook                                                  */
/* -------------------------------------------------------------------------- */

export const useApplicationPipeline = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<ApplicationPipelineMetrics>({
    queryKey: ["admin", "tracking", "application-pipeline", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!tenantId) {
        throw new Error("Tenant not available");
      }

      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subDays(thisWeekStart, 7);

      // Fetch all applications and their statuses
      const [allApps, thisWeekApps, lastWeekApps, decisionsData] = await Promise.all([
        supabase
          .from("applications")
          .select("id, status")
          .eq("tenant_id", tenantId),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .neq("status", "draft")
          .gte("submitted_at", formatISO(thisWeekStart)),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .neq("status", "draft")
          .gte("submitted_at", formatISO(lastWeekStart))
          .lt("submitted_at", formatISO(thisWeekStart)),
        supabase
          .from("applications")
          .select("submitted_at, updated_at, status")
          .eq("tenant_id", tenantId)
          .in("status", ["conditional_offer", "unconditional_offer", "enrolled", "withdrawn"]),
      ]);

      // Count by status
      const statusCounts = new Map<string, number>();
      for (const app of allApps.data ?? []) {
        const status = app.status ?? "draft";
        statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
      }

      const total = allApps.data?.length ?? 0;
      const byStatus = Array.from(statusCounts.entries())
        .map(([status, count]) => ({
          status: formatStatusLabel(status),
          count,
          percentage: calculatePercentage(count, total),
        }))
        .sort((a, b) => b.count - a.count);

      // Weekly velocity
      const submittedThisWeek = safeCount(thisWeekApps.count);
      const submittedLastWeek = safeCount(lastWeekApps.count);
      const weeklyChange = submittedLastWeek > 0
        ? Math.round(((submittedThisWeek - submittedLastWeek) / submittedLastWeek) * 100)
        : submittedThisWeek > 0 ? 100 : 0;

      // Average time to decision (in days)
      let avgDays = 0;
      if (decisionsData.data && decisionsData.data.length > 0) {
        const times = decisionsData.data
          .filter((app) => app.submitted_at && app.updated_at)
          .map((app) => {
            const submitted = new Date(app.submitted_at!);
            const updated = new Date(app.updated_at!);
            return Math.max(1, Math.round((updated.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24)));
          });

        if (times.length > 0) {
          avgDays = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
      }

      return {
        byStatus,
        total,
        submittedThisWeek,
        submittedLastWeek,
        weeklyChange,
        averageTimeToDecision: avgDays || 14,
      };
    },
  });

  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "application-pipeline", tenantId] });
    };

    const channel = supabase
      .channel(`admin-tracking-pipeline-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, handleChange)
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

/* -------------------------------------------------------------------------- */
/* Attribution Metrics Hook                                                   */
/* -------------------------------------------------------------------------- */

export const useAttributionMetrics = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<AttributionMetrics>({
    queryKey: ["admin", "tracking", "attribution", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) {
        throw new Error("Tenant not available");
      }

      const { data, error } = await supabase
        .from("attributions")
        .select(`
          id,
          source,
          medium,
          campaign,
          referral_id,
          referrals:referral_id (
            code
          )
        `)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const total = data?.length ?? 0;

      // Count by source
      const sourceCounts = new Map<string, number>();
      for (const attr of data ?? []) {
        const source = attr.source || "Direct";
        sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      }

      const bySource = Array.from(sourceCounts.entries())
        .map(([source, count]) => ({
          source,
          count,
          percentage: calculatePercentage(count, total),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Count by medium
      const mediumCounts = new Map<string, number>();
      for (const attr of data ?? []) {
        const medium = attr.medium || "None";
        mediumCounts.set(medium, (mediumCounts.get(medium) ?? 0) + 1);
      }

      const byMedium = Array.from(mediumCounts.entries())
        .map(([medium, count]) => ({ medium, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Count by campaign
      const campaignCounts = new Map<string, number>();
      for (const attr of data ?? []) {
        if (attr.campaign) {
          campaignCounts.set(attr.campaign, (campaignCounts.get(attr.campaign) ?? 0) + 1);
        }
      }

      const byCampaign = Array.from(campaignCounts.entries())
        .map(([campaign, count]) => ({ campaign, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top referrers
      const referrerCounts = new Map<string, number>();
      for (const attr of data ?? []) {
        const referralData = attr.referrals as { code?: string } | null;
        if (referralData?.code) {
          referrerCounts.set(referralData.code, (referrerCounts.get(referralData.code) ?? 0) + 1);
        }
      }

      const topReferrers = Array.from(referrerCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        bySource,
        byMedium,
        byCampaign,
        topReferrers,
        total,
      };
    },
  });

  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "attribution", tenantId] });
    };

    const channel = supabase
      .channel(`admin-tracking-attribution-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attributions" }, handleChange)
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

/* -------------------------------------------------------------------------- */
/* University Code Metrics Hook                                               */
/* -------------------------------------------------------------------------- */

export const useUniversityCodeMetrics = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<UniversityCodeMetrics>({
    queryKey: ["admin", "tracking", "university-codes", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) {
        throw new Error("Tenant not available");
      }

      // Fetch applications with university info
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          program:programs (
            university_id,
            university:universities (
              id,
              name,
              active
            )
          )
        `)
        .eq("tenant_id", tenantId);

      if (appError) throw appError;

      // Fetch active universities count
      const { count: activeUniversities } = await supabase
        .from("universities")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("active", true);

      // Aggregate by university
      const universityStats = new Map<string, { name: string; applications: number; enrolled: number }>();

      for (const app of appData ?? []) {
        const program = app.program as { university?: { id: string; name: string; active: boolean } | null } | null;
        const university = program?.university;
        if (university?.id && university?.name) {
          const existing = universityStats.get(university.id) ?? {
            name: university.name,
            applications: 0,
            enrolled: 0,
          };
          existing.applications++;
          if (app.status === "enrolled") {
            existing.enrolled++;
          }
          universityStats.set(university.id, existing);
        }
      }

      const topUniversities = Array.from(universityStats.values())
        .map((u) => ({
          ...u,
          conversionRate: u.applications > 0 ? Math.round((u.enrolled / u.applications) * 100) : 0,
        }))
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 8);

      const totalApplicationsToPartners = Array.from(universityStats.values()).reduce(
        (sum, u) => sum + u.applications,
        0
      );

      const numUniversitiesWithApps = universityStats.size;

      return {
        topUniversities,
        totalActiveUniversities: safeCount(activeUniversities),
        totalApplicationsToPartners,
        averageApplicationsPerUniversity:
          numUniversitiesWithApps > 0
            ? Math.round(totalApplicationsToPartners / numUniversitiesWithApps)
            : 0,
      };
    },
  });

  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "university-codes", tenantId] });
    };

    const channel = supabase
      .channel(`admin-tracking-universities-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "universities" }, handleChange)
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

/* -------------------------------------------------------------------------- */
/* Commission Readiness Hook                                                  */
/* -------------------------------------------------------------------------- */

export const useCommissionReadiness = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<CommissionReadinessMetrics>({
    queryKey: ["admin", "tracking", "commission-readiness", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!tenantId) {
        throw new Error("Tenant not available");
      }

      // Fetch all commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from("commissions")
        .select("id, status, amount_cents, currency")
        .eq("tenant_id", tenantId);

      if (commissionsError) throw commissionsError;

      // Count enrolled applications
      const { count: enrolledApps } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "enrolled");

      // Aggregate by status
      const statusStats = new Map<string, { count: number; totalValue: number }>();

      for (const comm of commissions ?? []) {
        const status = comm.status ?? "pending";
        const existing = statusStats.get(status) ?? { count: 0, totalValue: 0 };
        existing.count++;
        existing.totalValue += safeNumber(comm.amount_cents);
        statusStats.set(status, existing);
      }

      const totalCommissions = commissions?.length ?? 0;
      const byStatus = Array.from(statusStats.entries())
        .map(([status, stats]) => ({
          status: formatStatusLabel(status),
          count: stats.count,
          totalValue: stats.totalValue / 100, // Convert cents to dollars
          percentage: calculatePercentage(stats.count, totalCommissions),
        }))
        .sort((a, b) => b.count - a.count);

      const pendingStats = statusStats.get("pending") ?? { count: 0, totalValue: 0 };
      const approvedStats = statusStats.get("approved") ?? { count: 0, totalValue: 0 };
      const paidStats = statusStats.get("paid") ?? { count: 0, totalValue: 0 };

      // Readiness score: % of enrolled applications with at least approved/paid commissions
      const processedCommissions = approvedStats.count + paidStats.count;
      const enrolledCount = safeCount(enrolledApps);
      const readinessScore = enrolledCount > 0
        ? Math.round((processedCommissions / enrolledCount) * 100)
        : 0;

      const currency = (commissions?.[0] as { currency?: string } | undefined)?.currency ?? "USD";

      return {
        byStatus,
        totalPending: pendingStats.count,
        totalApproved: approvedStats.count,
        totalPaid: paidStats.count,
        pendingValue: pendingStats.totalValue / 100,
        approvedValue: approvedStats.totalValue / 100,
        paidValue: paidStats.totalValue / 100,
        readinessScore: Math.min(100, readinessScore),
        currency,
      };
    },
  });

  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "commission-readiness", tenantId] });
    };

    const channel = supabase
      .channel(`admin-tracking-commissions-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, handleChange)
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

/* -------------------------------------------------------------------------- */
/* Application Velocity (7-day trend) Hook                                    */
/* -------------------------------------------------------------------------- */

export const useApplicationVelocity = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<ApplicationVelocityPoint[]>({
    queryKey: ["admin", "tracking", "velocity", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) {
        throw new Error("Tenant not available");
      }

      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);

      const { data, error } = await supabase
        .from("applications")
        .select("id, status, submitted_at, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", formatISO(sevenDaysAgo));

      if (error) throw error;

      // Group by day
      const dailyStats = new Map<string, { submitted: number; enrolled: number }>();

      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const key = format(date, "d MMM");
        dailyStats.set(key, { submitted: 0, enrolled: 0 });
      }

      for (const app of data ?? []) {
        const createdAt = app.created_at ? new Date(app.created_at) : null;
        if (!createdAt) continue;

        const key = format(createdAt, "d MMM");
        const stats = dailyStats.get(key);
        if (stats) {
          if (app.status !== "draft") {
            stats.submitted++;
          }
          if (app.status === "enrolled") {
            stats.enrolled++;
          }
        }
      }

      return Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        submitted: stats.submitted,
        enrolled: stats.enrolled,
      }));
    },
  });

  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "velocity", tenantId] });
    };

    const channel = supabase
      .channel(`admin-tracking-velocity-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, handleChange)
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
