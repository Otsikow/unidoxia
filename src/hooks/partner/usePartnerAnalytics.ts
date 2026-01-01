import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO, subMonths, format } from "date-fns";
import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface PartnerAnalyticsMetrics {
  totalApplications: number;
  acceptanceRate: number;
  averageProcessingTime: number; // in days
  qualityScore: number; // 0-100
  applicationTrends: {
    month: string;
    applications: number;
    offers: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
}

export const usePartnerAnalytics = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<PartnerAnalyticsMetrics>({
    queryKey: ["partner", "analytics", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant ID is required");

      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      const { data: applications, error } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          created_at,
          updated_at
        `)
        .eq("tenant_id", tenantId)
        .gte("created_at", formatISO(sixMonthsAgo));

      if (error) throw error;

      const totalApplications = applications.length;

      // Acceptance Rate
      const acceptedCount = applications.filter(app =>
        ["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"].includes(app.status || "")
      ).length;
      const completedCount = applications.filter(app =>
        app.status !== "draft" && app.status !== "screening" && app.status !== "submitted"
      ).length;

      const acceptanceRate = completedCount > 0
        ? Math.round((acceptedCount / completedCount) * 100)
        : 0;

      // Processing Time
      const processedApps = applications.filter(app => app.created_at && app.updated_at && app.status !== "draft");
      const totalProcessingDays = processedApps.reduce((acc, app) => {
        const start = new Date(app.created_at);
        const end = new Date(app.updated_at!);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      const averageProcessingTime = processedApps.length > 0
        ? Math.round(totalProcessingDays / processedApps.length)
        : 0;

      // Quality Score (Mock formula: base on acceptance rate + completeness)
      // Real implementation would look at missing documents, rework requests, etc.
      const qualityScore = Math.min(100, Math.round(acceptanceRate * 0.8 + 20));

      // Trends
      const months = Array.from({ length: 6 }, (_, i) => format(subMonths(now, 5 - i), "MMM"));
      const applicationTrends = months.map(month => {
        const monthApps = applications.filter(app => format(new Date(app.created_at), "MMM") === month);
        return {
          month,
          applications: monthApps.length,
          offers: monthApps.filter(app => ["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"].includes(app.status || "")).length
        };
      });

      // Status Distribution
      const statusCounts: Record<string, number> = {};
      applications.forEach(app => {
        const status = app.status || "Unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      return {
        totalApplications,
        acceptanceRate,
        averageProcessingTime,
        qualityScore,
        applicationTrends,
        statusDistribution
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
      queryClient.invalidateQueries({ queryKey: ["partner", "analytics", tenantId] });
    };

    const channel = supabase
      .channel(`partner-analytics-${tenantId}`)
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
