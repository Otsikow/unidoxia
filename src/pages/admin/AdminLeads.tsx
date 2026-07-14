"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Flame, Snowflake, ThermometerSun, AlertTriangle, CheckCircle2 } from "lucide-react";

type Lead = {
  id: string;
  reference_code: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact: string | null;
  citizenship: string | null;
  current_country: string | null;
  preferred_destinations: string[] | null;
  program_level: string | null;
  study_area: string | null;
  intake_season: string | null;
  intake_year: string | null;
  budget_range: string | null;
  notes: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  lead_score: number;
  lead_temperature: "hot" | "warm" | "cold";
  stage: string;
  owner_id: string | null;
  next_follow_up_at: string;
  created_at: string;
  updated_at: string;
};

const STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Nurturing",
  "Not Ready",
  "Enrolled",
  "Lost Lead",
] as const;

const TERMINAL_STAGES: ReadonlySet<string> = new Set([
  "Enrolled",
  "Lost Lead",
  "Not Ready",
]);

const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string, o?: unknown) => {
      order: (col: string, o: { ascending: boolean }) => Promise<{ data: Lead[] | null; error: unknown; count?: number | null }>;
    };
    update: (row: Partial<Lead>) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
  };
};

function useLeads() {
  return useQuery({
    queryKey: ["website_leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from("website_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    refetchInterval: 30_000,
  });
}

function useLeadsHealth() {
  return useQuery({
    queryKey: ["website_leads_health"],
    queryFn: async () => {
      const start = Date.now();
      const { data, error } = await db
        .from("website_leads")
        .select("created_at", { count: "exact", head: false } as unknown as undefined)
        .order("created_at", { ascending: false });
      const latency = Date.now() - start;
      if (error) return { ok: false, latency, latest: null as string | null, error: String(error) };
      const latest = data && data.length > 0 ? data[0]?.created_at ?? null : null;
      return { ok: true, latency, latest, error: null };
    },
    refetchInterval: 60_000,
  });
}

const tempBadge = (t: Lead["lead_temperature"]) => {
  if (t === "hot") return <Badge className="bg-red-500/15 text-red-600 border-red-500/30"><Flame className="h-3 w-3 mr-1" />Hot</Badge>;
  if (t === "cold") return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30"><Snowflake className="h-3 w-3 mr-1" />Cold</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30"><ThermometerSun className="h-3 w-3 mr-1" />Warm</Badge>;
};

export function LeadsHealthCard() {
  const { data, isLoading } = useLeadsHealth();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Website Leads Health
        </CardTitle>
        <CardDescription>Live lead capture from /free-consultation</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : data?.ok ? (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500/15 text-green-700 border-green-500/30">Operational</Badge>
              <span className="text-muted-foreground">{data.latency}ms</span>
            </div>
            <div className="text-muted-foreground">
              {data.latest
                ? `Latest lead: ${format(new Date(data.latest), "PPp")}`
                : "No leads yet — table healthy and ready."}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Unable to reach leads table.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminLeads() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (tempFilter !== "all" && l.lead_temperature !== tempFilter) return false;
      if (!s) return true;
      const hay = `${l.full_name ?? ""} ${l.email ?? ""} ${l.phone ?? ""} ${l.reference_code ?? ""} ${l.campaign ?? ""} ${l.source ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [leads, search, stageFilter, tempFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    return {
      total: leads.length,
      newLeads: leads.filter((l) => l.stage === "New Lead").length,
      hot: leads.filter((l) => l.lead_temperature === "hot").length,
      overdue: leads.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at) < now && !TERMINAL_STAGES.has(l.stage)).length,
    };
  }, [leads]);

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    setSavingId(id);
    try {
      const { error } = await db.from("website_leads").update(patch).eq("id", id);
      if (error) throw error;
      toast({ title: "Lead updated" });
      qc.invalidateQueries({ queryKey: ["website_leads"] });
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Website Leads</h1>
        <p className="text-sm text-muted-foreground">Submissions from the /free-consultation page.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Leads</CardDescription><CardTitle className="text-2xl">{kpis.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>New</CardDescription><CardTitle className="text-2xl">{kpis.newLeads}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Hot</CardDescription><CardTitle className="text-2xl text-red-600">{kpis.hot}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Overdue Follow-ups</CardDescription><CardTitle className="text-2xl text-amber-600">{kpis.overdue}</CardTitle></CardHeader></Card>
      </div>

      <LeadsHealthCard />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Leads</CardTitle>
              <CardDescription>Searchable list with stage & follow-up management.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search name, email, campaign…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tempFilter} onValueChange={setTempFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Score" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No leads yet. Share <span className="font-mono">/free-consultation</span> to start capturing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Intake</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Next Follow-up</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const overdue = l.next_follow_up_at && isPast(new Date(l.next_follow_up_at)) && !isToday(new Date(l.next_follow_up_at)) && !TERMINAL_STAGES.has(l.stage);
                  return (
                    <TableRow key={l.id} className={savingId === l.id ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-xs">{l.reference_code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{l.full_name || `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim()}</div>
                        <div className="text-xs text-muted-foreground">{l.email}</div>
                        <div className="text-xs text-muted-foreground">{l.phone} {l.preferred_contact && <span>• {l.preferred_contact}</span>}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(l.preferred_destinations ?? []).join(", ") || "—"}
                        {l.program_level && <div className="text-muted-foreground">{l.program_level}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{[l.intake_season, l.intake_year].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div>{l.source || "direct"}</div>
                        {l.campaign && <div className="text-muted-foreground">{l.campaign}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tempBadge(l.lead_temperature)}
                          <span className="text-xs text-muted-foreground">{l.lead_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={l.stage} onValueChange={(v) => updateLead(l.id, { stage: v })}>
                          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="date"
                            className="h-8 w-36 text-xs"
                            value={l.next_follow_up_at ? l.next_follow_up_at.slice(0, 10) : ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) updateLead(l.id, { next_follow_up_at: new Date(v + "T12:00:00Z").toISOString() });
                            }}
                          />
                          {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(l.created_at), "MMM d, HH:mm")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
