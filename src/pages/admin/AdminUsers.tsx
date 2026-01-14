import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useAuth } from "@/hooks/useAuth";
import { AccountInspector } from "@/components/admin/AccountInspector";
import { formatPlanPrice, getPlanById, getPlanDisplayName } from "@/types/billing";

import { Mail, Shield } from "lucide-react";
import type { StudentPlanType } from "@/types/billing";

interface RoleSummary {
  role: string;
  users: number;
}

interface PlanRosterRow {
  id: string;
  plan_type: string | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
  payment_confirmed_at: string | null;
  assigned_agent_id: string | null;
  created_at: string | null;
  profile: Tables<"profiles"> | null;
}

interface AgentOption {
  id: string;
  name: string;
  email: string | null;
}

const AdminUsers = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Tables<"profiles">[]>([]);
  const [roleSummary, setRoleSummary] = useState<RoleSummary[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [planRows, setPlanRows] = useState<PlanRosterRow[]>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<Tables<"profiles"> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [studentRecord, setStudentRecord] = useState<Tables<"students"> | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<Tables<"student_documents">[]>([]);
  const [documentCount, setDocumentCount] = useState(0);

  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isOpeningDocument, setIsOpeningDocument] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  /* ---------------- Load Users ---------------- */
  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      if (!tenantId) {
        setRows([]);
        setRoleSummary([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, created_at, active, phone, country, timezone, onboarded"
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!mounted) return;

        setRows((data ?? []) as Tables<"profiles">[]);

        const summary = new Map<string, number>();
        for (const u of data ?? []) {
          summary.set(u.role, (summary.get(u.role) ?? 0) + 1);
        }

        setRoleSummary(
          Array.from(summary.entries()).map(([role, users]) => ({ role, users }))
        );
      } catch (err) {
        console.error("Failed to load admin users", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    let mounted = true;

    const loadStudentPlans = async () => {
      if (!tenantId) {
        setPlanRows([]);
        setPlanLoading(false);
        return;
      }

      try {
        setPlanLoading(true);
        const { data, error } = await supabase
          .from("students")
          .select(
            `
            id,
            plan_type,
            payment_amount_cents,
            payment_currency,
            payment_confirmed_at,
            assigned_agent_id,
            created_at,
            profiles:profiles (
              id,
              full_name,
              email,
              role,
              created_at,
              active,
              phone,
              country,
              timezone,
              onboarded
            )
          `
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!mounted) return;

        setPlanRows(
          (data ?? []).map((row) => ({
            id: row.id,
            plan_type: row.plan_type,
            payment_amount_cents: row.payment_amount_cents,
            payment_currency: row.payment_currency,
            payment_confirmed_at: row.payment_confirmed_at,
            assigned_agent_id: row.assigned_agent_id,
            created_at: row.created_at,
            profile: (row as any).profiles ?? null,
          }))
        );
      } catch (err) {
        console.error("Failed to load student plan roster", err);
      } finally {
        if (mounted) setPlanLoading(false);
      }
    };

    loadStudentPlans();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    let mounted = true;

    const loadAgents = async () => {
      if (!tenantId) {
        setAgentOptions([]);
        return;
      }

      try {
        setAgentsLoading(true);
        const { data, error } = await supabase
          .from("agents")
          .select(
            `
            id,
            company_name,
            profiles:profiles (
              full_name,
              email
            )
          `
          )
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .eq("verification_status", "verified")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!mounted) return;

        setAgentOptions(
          (data ?? []).map((agent) => ({
            id: agent.id,
            name:
              agent.company_name ||
              (agent as any).profiles?.full_name ||
              "Unnamed agent",
            email: (agent as any).profiles?.email ?? null,
          }))
        );
      } catch (err) {
        console.error("Failed to load agents", err);
      } finally {
        if (mounted) setAgentsLoading(false);
      }
    };

    loadAgents();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    setSelectedAgentId(studentRecord?.assigned_agent_id ?? null);
  }, [studentRecord]);

  const filteredRows = selectedRole
    ? rows.filter((u) => u.role === selectedRole)
    : rows;

  /* ---------------- Select User ---------------- */
  const handleSelectUser = async (user: Tables<"profiles">) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
    setDetailLoading(true);
    setStudentRecord(null);
    setStudentDocuments([]);
    setDocumentCount(0);

    try {
      const { data: student } = await supabase
        .from("students")
        .select(
          "id, legal_name, preferred_name, contact_email, contact_phone, nationality, current_country, profile_completeness, created_at, plan_type, payment_amount_cents, payment_currency, payment_confirmed_at, assigned_agent_id, agent_assigned_at"
        )
        .eq("profile_id", user.id)
        .maybeSingle();

      setStudentRecord(student as Tables<"students"> | null);

      if (student?.id) {
        const [{ data: docs }, { count }] = await Promise.all([
          supabase
            .from("student_documents")
            .select(
              "id, document_type, file_name, storage_path, verified_status, created_at"
            )
            .eq("student_id", student.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("student_documents")
            .select("id", { count: "exact", head: true })
            .eq("student_id", student.id),
        ]);

        setStudentDocuments((docs ?? []) as Tables<"student_documents">[]);
        setDocumentCount(count ?? 0);
      }
    } catch (err) {
      console.error("Failed to load student details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveAgentAssignment = async () => {
    if (!studentRecord) return;
    setIsSavingAssignment(true);

    try {
      const { error } = await supabase
        .from("students")
        .update({
          assigned_agent_id: selectedAgentId,
          agent_assigned_at: selectedAgentId ? new Date().toISOString() : null,
        })
        .eq("id", studentRecord.id);

      if (error) throw error;

      setStudentRecord((prev) =>
        prev
          ? {
              ...prev,
              assigned_agent_id: selectedAgentId,
              agent_assigned_at: selectedAgentId ? new Date().toISOString() : null,
            }
          : prev
      );

      setPlanRows((prev) =>
        prev.map((row) =>
          row.id === studentRecord.id
            ? { ...row, assigned_agent_id: selectedAgentId }
            : row
        )
      );
    } catch (err) {
      console.error("Failed to assign agent", err);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  /* ---------------- Status Update ---------------- */
  const updateUserStatus = async (active: boolean) => {
    if (!selectedUser) return;
    setIsStatusUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active })
        .eq("id", selectedUser.id);

      if (error) throw error;

      setRows((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, active } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, active } : prev));
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  /* ---------------- Open Document ---------------- */
  const handleViewDocument = async (doc: Tables<"student_documents">) => {
    setIsOpeningDocument(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("Failed to open document", err);
    } finally {
      setIsOpeningDocument(null);
    }
  };

  const planSummary = useMemo(() => {
    const summary = new Map<string, { total: number; needsAgent: number }>();

    planRows.forEach((row) => {
      const planType = (row.plan_type || "free") as StudentPlanType;
      const entry = summary.get(planType) ?? { total: 0, needsAgent: 0 };
      entry.total += 1;

      const isPaidAgentPlan =
        planType === "agent_supported" &&
        (row.payment_amount_cents || 0) >= 20000 &&
        !!row.payment_confirmed_at;

      if (isPaidAgentPlan && !row.assigned_agent_id) {
        entry.needsAgent += 1;
      }

      summary.set(planType, entry);
    });

    return Array.from(summary.entries()).map(([planType, stats]) => ({
      planType: planType as StudentPlanType,
      total: stats.total,
      needsAgent: stats.needsAgent,
    }));
  }, [planRows]);

  const formatPaymentAmount = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return "Not paid";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const isPaidAgentPlan = (record: Tables<"students"> | null) => {
    if (!record) return false;
    return (
      (record.plan_type || "free") === "agent_supported" &&
      (record.payment_amount_cents || 0) >= 20000 &&
      !!record.payment_confirmed_at
    );
  };

  const getAgentLabel = (agentId: string | null) => {
    if (!agentId) return "Unassigned";
    return agentOptions.find((agent) => agent.id === agentId)?.name ?? "Assigned";
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">User governance</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage administrative identities.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("zoe:open-chat", {
                detail: { prompt: "Outline role assignment gaps" },
              })
            )
          }
        >
          Ask Zoe
        </Button>
      </div>

      <AccountInspector />

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Role distribution</CardTitle>
          <CardDescription>Accounts grouped by role.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {loading && <Skeleton className="h-10 w-24" />}
          {!loading &&
            roleSummary.map((r) => (
              <button
                key={r.role}
                onClick={() =>
                  setSelectedRole((c) => (c === r.role ? null : r.role))
                }
                className={`rounded-full border px-4 py-2 text-sm ${
                  selectedRole === r.role
                    ? "bg-primary/10 border-primary text-primary"
                    : "hover:border-primary"
                }`}
              >
                <span className="font-semibold">{r.users}</span>{" "}
                <span className="uppercase text-xs ml-1">{r.role}</span>
              </button>
            ))}
        </CardContent>
      </Card>

      {/* Student Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Student plan overview</CardTitle>
          <CardDescription>
            Track plan coverage and agent assignments for paid students.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {planLoading && <Skeleton className="h-9 w-32" />}
            {!planLoading &&
              planSummary.map((summary) => (
                <div
                  key={summary.planType}
                  className="rounded-full border px-4 py-2 text-xs"
                >
                  <span className="font-semibold">{summary.total}</span>{" "}
                  <span className="uppercase">{summary.planType}</span>
                  {summary.needsAgent > 0 && (
                    <span className="ml-2 text-destructive">
                      {summary.needsAgent} need agents
                    </span>
                  )}
                </div>
              ))}
          </div>

          {planLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : planRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student plans found.</p>
          ) : (
            <div className="rounded-lg border">
              <div className="grid grid-cols-4 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Student</span>
                <span>Plan</span>
                <span>Payment</span>
                <span>Agent status</span>
              </div>
              <div className="divide-y">
                {planRows.map((row) => {
                  const planType = (row.plan_type || "free") as StudentPlanType;
                  const paymentStatus = row.payment_confirmed_at
                    ? `${formatPaymentAmount(row.payment_amount_cents, row.payment_currency)} paid`
                    : "Not confirmed";
                  const needsAgent =
                    planType === "agent_supported" &&
                    (row.payment_amount_cents || 0) >= 20000 &&
                    !!row.payment_confirmed_at &&
                    !row.assigned_agent_id;

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-4 gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {row.profile?.full_name || "Student profile"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.profile?.email || "No email on file"}
                        </p>
                      </div>
                      <div>
                        <Badge variant={planType === "free" ? "secondary" : "default"}>
                          {getPlanDisplayName(planType)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{paymentStatus}</div>
                      <div className="text-xs">
                        <span>{getAgentLabel(row.assigned_agent_id)}</span>
                        {needsAgent && (
                          <Badge className="ml-2" variant="destructive">
                            Needs agent
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>Click a user to review details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-2">
              {filteredRows.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="w-full text-left rounded border p-3 hover:bg-muted/50"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant={u.active ? "outline" : "destructive"}>
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User profile
            </SheetTitle>
            <SheetDescription>Review account and documents.</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <Skeleton className="h-20 w-full mt-4" />
          ) : selectedUser ? (
            <div className="mt-6 space-y-4">
              <p className="font-semibold text-lg">{selectedUser.full_name}</p>
              <div className="flex gap-2 text-sm">
                <Mail className="h-4 w-4" /> {selectedUser.email}
              </div>

              <Separator />

              {studentRecord && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">
                      Plan & billing
                    </Label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {getPlanDisplayName(
                          (studentRecord.plan_type || "free") as StudentPlanType
                        )}
                      </Badge>
                      {getPlanById(
                        (studentRecord.plan_type || "free") as StudentPlanType
                      ) && (
                        <span className="text-xs text-muted-foreground">
                          {formatPlanPrice(
                            getPlanById(
                              (studentRecord.plan_type || "free") as StudentPlanType
                            )!
                          )}{" "}
                          one-time
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payment status:{" "}
                      {studentRecord.payment_confirmed_at
                        ? `${formatPaymentAmount(
                            studentRecord.payment_amount_cents,
                            studentRecord.payment_currency
                          )} confirmed`
                        : "Not confirmed"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Agent assignment
                    </Label>
                    <Select
                      value={selectedAgentId ?? "unassigned"}
                      onValueChange={(value) =>
                        setSelectedAgentId(value === "unassigned" ? null : value)
                      }
                      disabled={
                        agentsLoading ||
                        isSavingAssignment ||
                        !isPaidAgentPlan(studentRecord)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {agentOptions.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                            {agent.email ? ` (${agent.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={saveAgentAssignment}
                      disabled={
                        isSavingAssignment ||
                        !isPaidAgentPlan(studentRecord)
                      }
                    >
                      {isSavingAssignment ? "Saving..." : "Save agent assignment"}
                    </Button>
                    {(studentRecord.plan_type || "free") !== "agent_supported" && (
                      <p className="text-xs text-muted-foreground">
                        Agent assignments are only available for the $200
                        Agent-Supported plan.
                      </p>
                    )}
                    {(studentRecord.plan_type || "free") === "agent_supported" &&
                      !studentRecord.payment_confirmed_at && (
                        <p className="text-xs text-muted-foreground">
                          Assignments unlock once the $200 payment is confirmed.
                        </p>
                      )}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Button
                  disabled={isStatusUpdating || selectedUser.active}
                  onClick={() => updateUserStatus(true)}
                >
                  Activate
                </Button>
                <Button
                  variant="outline"
                  disabled={isStatusUpdating || !selectedUser.active}
                  onClick={() => updateUserStatus(false)}
                >
                  Suspend
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUsers;
