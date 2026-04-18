import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Download, Loader2 } from "lucide-react";

import BackButton from "@/components/BackButton";
import { InviteAgencyDialog } from "@/components/admin/InviteAgencyDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import AgentKPICards from "@/components/admin/agents/AgentKPICards";
import AgentFiltersBar from "@/components/admin/agents/AgentFilters";
import AgentTable from "@/components/admin/agents/AgentTable";
import AgentProfileDrawer from "@/components/admin/agents/AgentProfileDrawer";
import CommissionEditorDialog from "@/components/admin/agents/CommissionEditorDialog";
import type { AgentRecord, AgentFilters } from "@/components/admin/agents/types";
import { DEFAULT_FILTERS } from "@/components/admin/agents/types";
import { TablePagination } from "@/components/common/TablePagination";

const AGENTS_PAGE_SIZE = 20;

const AdminAgents = () => {
  const { toast } = useToast();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [filters, setFilters] = useState<AgentFilters>(DEFAULT_FILTERS);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileAgent, setProfileAgent] = useState<AgentRecord | null>(null);
  const [commissionAgent, setCommissionAgent] = useState<AgentRecord | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const { data: agentsData } = await supabase
      .from("agents")
      .select(`
        id,
        profile_id,
        company_name,
        active,
        commission_rate_l1,
        commission_rate_l2,
        verification_status,
        created_at,
        profiles:profiles (
          full_name,
          country,
          email,
          phone,
          avatar_url
        )
      `)
      .eq("tenant_id", profile.tenant_id);

    const transformed: AgentRecord[] =
      agentsData?.map((agent: any) => {
        const active = Boolean(agent.active);
        const verStatus = agent.verification_status || "pending";
        return {
          id: agent.id,
          profileId: agent.profile_id,
          name: agent.company_name || agent.profiles?.full_name || "Unnamed Agent",
          companyName: agent.company_name || null,
          country: agent.profiles?.country || "Unknown",
          email: agent.profiles?.email ?? null,
          phone: agent.profiles?.phone ?? null,
          active,
          status: active ? "active" as const : verStatus === "pending" ? "pending" as const : "suspended" as const,
          performanceBand: "medium" as const,
          totalStudents: 0,
          applicationsSubmitted: 0,
          offersReceived: 0,
          enrolledStudents: 0,
          conversionRate: 0,
          revenueGenerated: 0,
          commissionRateL1: Number(agent.commission_rate_l1 ?? 0),
          commissionRateL2: Number(agent.commission_rate_l2 ?? 0),
          commissionOwed: 0,
          commissionPaid: 0,
          complianceStatus: verStatus === "approved" ? "verified" as const : "pending" as const,
          verificationStatus: verStatus,
          lastActivityAt: null,
          createdAt: agent.created_at,
          avatarUrl: agent.profiles?.avatar_url ?? null,
        };
      }) ?? [];

    setAgents(transformed);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const countries = useMemo(() => {
    const set = new Set(agents.map((a) => a.country).filter((c) => c !== "Unknown"));
    return Array.from(set).sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const q = filters.search.toLowerCase();
      if (q && !a.name.toLowerCase().includes(q) && !a.country.toLowerCase().includes(q) && !(a.email?.toLowerCase().includes(q)) && !a.id.includes(q)) return false;
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.performance !== "all" && a.performanceBand !== filters.performance) return false;
      if (filters.compliance !== "all" && a.complianceStatus !== filters.compliance) return false;
      if (filters.country && a.country !== filters.country) return false;
      return true;
    });
  }, [agents, filters]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredAgents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAgents.map((a) => a.id)));
    }
  };

  const handleExport = () => {
    const headers = ["Name", "Email", "Country", "Status", "Commission Rate", "Revenue"];
    const rows = filteredAgents.map((a) => [a.name, a.email || "", a.country, a.status, `${a.commissionRateL1}%`, `${a.revenueGenerated}`]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agents-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filteredAgents.length} agents exported to CSV.` });
  };

  return (
    <div className="space-y-6 pb-10">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage partner agents, monitor performance, commissions, compliance, and communication.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <AgentKPICards agents={agents} />

      {/* Filters + Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Agent Directory
              {!loading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredAgents.length} of {agents.length})
                </span>
              )}
            </CardTitle>
            {selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground">{selectedIds.size} selected</p>
            )}
          </div>
          <AgentFiltersBar filters={filters} onChange={setFilters} countries={countries} />
        </CardHeader>
        <CardContent className="p-0">
          <AgentTable
            agents={filteredAgents}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onOpenProfile={setProfileAgent}
            onOpenCommission={setCommissionAgent}
          />
        </CardContent>
      </Card>

      {/* Drawers & Dialogs */}
      <AgentProfileDrawer
        agent={profileAgent}
        open={!!profileAgent}
        onOpenChange={(open) => !open && setProfileAgent(null)}
        onOpenCommission={(a) => { setProfileAgent(null); setCommissionAgent(a); }}
      />

      <CommissionEditorDialog
        agent={commissionAgent}
        open={!!commissionAgent}
        onOpenChange={(open) => !open && setCommissionAgent(null)}
        onSaved={fetchData}
      />

      <InviteAgencyDialog
        tenantId={profile?.tenant_id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default AdminAgents;
