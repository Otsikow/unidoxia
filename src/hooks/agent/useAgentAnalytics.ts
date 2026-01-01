import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO, subMonths, format, startOfMonth, addMonths } from "date-fns";
import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface AgentAnalyticsMetrics {
  applicationsInProgress: number;
  offersSecured: number;
  commissionForecast: number;
  commissionHistory: {
    month: string;
    amount: number;
  }[];
  applicationPipeline: {
    stage: string;
    count: number;
  }[];
}

export const useAgentAnalytics = (tenantId?: string | null, agentId?: string | null) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<AgentAnalyticsMetrics>({
    queryKey: ["agent", "analytics", tenantId, agentId],
    enabled: Boolean(tenantId), // Agent ID might be inferred from auth if not passed
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant ID is required");

      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Fetch applications linked to this agent (via students they manage)
      // Note: This assumes RLS policies handle "my students" filtering or we filter by agent's students
      // If the user is an agent, RLS on 'students' table typically filters to students they created/manage.

      const { data: applications, error: appsError } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          created_at,
          updated_at
        `)
        .eq("tenant_id", tenantId) // Filter by tenant
        // If we need to filter by specific agent ID, we'd need to join through students -> agent_student_links or similar
        // For now, assuming RLS scopes "applications" query to the logged-in agent's relevant applications.
        .gte("created_at", formatISO(sixMonthsAgo));

      if (appsError) throw appsError;

      const { data: commissions, error: commsError } = await supabase
        .from("commissions")
        .select("amount_cents, status, created_at")
        .eq("tenant_id", tenantId);

      if (commsError) throw commsError;

      // Metrics
      const applicationsInProgress = applications.filter(app =>
        !["draft", "withdrawn", "rejected", "enrolled", "deferred"].includes(app.status || "")
      ).length;

      const offersSecured = applications.filter(app =>
        ["conditional_offer", "unconditional_offer", "cas_loa", "visa"].includes(app.status || "")
      ).length;

      // Forecast: Pending commissions (not yet approved/paid)
      const commissionForecast = commissions
        .filter(c => c.status === "pending")
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100;

      // Pipeline
      const stages = ["screening", "submitted", "conditional_offer", "unconditional_offer", "visa", "enrolled"];
      const applicationPipeline = stages.map(stage => ({
        stage: stage.replace("_", " "),
        count: applications.filter(app => app.status === stage).length
      }));

      // Commission History (Last 6 months)
      const commissionHistory = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i);
        const monthLabel = format(d, "MMM");
        const monthStart = startOfMonth(d);
        const monthEnd = startOfMonth(addMonths(d, 1));

        const monthlyTotal = commissions
          .filter(c => {
             const cDate = new Date(c.created_at);
             return c.status === "paid" && cDate >= monthStart && cDate < monthEnd;
          })
          .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100;

        return { month: monthLabel, amount: monthlyTotal };
      });

      return {
        applicationsInProgress,
        offersSecured,
        commissionForecast,
        applicationPipeline,
        commissionHistory
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
      queryClient.invalidateQueries({ queryKey: ["agent", "analytics", tenantId, agentId] });
    };

    const channel = supabase
      .channel(`agent-analytics-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, handleChange)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, agentId, queryClient]);

  return query;
};
