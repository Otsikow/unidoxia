import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgentOverviewApplication {
  id: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  appNumber: string | null;
  intakeYear: number | null;
  intakeMonth: number | null;
  studentId: string | null;
  studentName: string;
  studentRef: string | null;
  programName: string;
  universityName: string;
  country: string | null;
}

export interface AgentOverviewTask {
  id: string;
  title: string;
  dueAt: string | null;
  priority: string | null;
  status: string | null;
}

export interface AgentOverviewDocumentRequest {
  id: string;
  documentType: string;
  status: string | null;
  dueDate: string | null;
  studentId: string;
  studentName: string;
}

export interface AgentOverviewData {
  agentId: string | null;
  tenantId: string | null;
  totalStudents: number;
  newStudents30d: number;
  applications: AgentOverviewApplication[];
  tasks: AgentOverviewTask[];
  documentRequests: AgentOverviewDocumentRequest[];
  commissionPaid: number;
  commissionPending: number;
  unreadMessages: number;
}

const studentDisplayName = (student: any): string =>
  student?.preferred_name ||
  student?.legal_name ||
  student?.profile?.full_name ||
  "Unknown Student";

export const fetchAgentOverview = async (
  agentProfileId: string,
): Promise<AgentOverviewData> => {
  const { data: agentData } = await supabase
    .from("agents")
    .select("id, tenant_id")
    .eq("profile_id", agentProfileId)
    .maybeSingle();

  const agentId = agentData?.id ?? null;
  const tenantId = agentData?.tenant_id ?? null;

  const empty: AgentOverviewData = {
    agentId,
    tenantId,
    totalStudents: 0,
    newStudents30d: 0,
    applications: [],
    tasks: [],
    documentRequests: [],
    commissionPaid: 0,
    commissionPending: 0,
    unreadMessages: 0,
  };

  if (!agentId) return empty;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [linksRes, appsRes, tasksRes, commissionsRes] = await Promise.all([
    supabase
      .from("agent_student_links")
      .select("student_id, created_at")
      .eq("agent_id", agentId),
    supabase
      .from("applications")
      .select(
        `id, status, created_at, updated_at, app_number, intake_year, intake_month, student_id,
         student:students ( id, legal_name, preferred_name, reference_code,
           profile:profiles!students_profile_id_fkey ( full_name ) ),
         program:programs ( name, university:universities ( name, country ) )`,
      )
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("tasks")
      .select("id, title, due_at, priority, status")
      .eq("assignee_id", agentProfileId)
      .neq("status", "done")
      .order("due_at", { ascending: true })
      .limit(25),
    supabase.from("commissions").select("amount, status").eq("agent_id", agentId),
  ]);

  const links = (linksRes.data ?? []) as Array<{ student_id: string; created_at: string | null }>;
  const studentIds = Array.from(new Set(links.map((l) => l.student_id).filter(Boolean)));

  let documentRequests: AgentOverviewDocumentRequest[] = [];
  if (studentIds.length) {
    const { data: docs } = await supabase
      .from("document_requests")
      .select(
        `id, document_type, status, due_date, student_id,
         student:students ( legal_name, preferred_name,
           profile:profiles!students_profile_id_fkey ( full_name ) )`,
      )
      .in("student_id", studentIds.slice(0, 200))
      .in("status", ["pending", "requested", "needs_resubmission"])
      .limit(50);

    documentRequests = ((docs ?? []) as any[]).map((d) => ({
      id: d.id,
      documentType: d.document_type,
      status: d.status,
      dueDate: d.due_date,
      studentId: d.student_id,
      studentName: studentDisplayName(d.student),
    }));
  }

  const applications: AgentOverviewApplication[] = ((appsRes.data ?? []) as any[]).map((app) => ({
    id: app.id,
    status: app.status ?? "draft",
    createdAt: app.created_at,
    updatedAt: app.updated_at ?? app.created_at,
    appNumber: app.app_number,
    intakeYear: app.intake_year ?? null,
    intakeMonth: app.intake_month ?? null,
    studentId: app.student_id ?? null,
    studentName: studentDisplayName(app.student),
    studentRef: app.student?.reference_code ?? null,
    programName: app.program?.name ?? "Programme not set",
    universityName: app.program?.university?.name ?? "University not set",
    country: app.program?.university?.country ?? null,
  }));

  let commissionPaid = 0;
  let commissionPending = 0;
  for (const c of (commissionsRes.data ?? []) as any[]) {
    const amount = Number(c.amount ?? 0);
    if (c.status === "paid") commissionPaid += amount;
    else if (c.status === "approved" || c.status === "pending") commissionPending += amount;
  }

  return {
    agentId,
    tenantId,
    totalStudents: studentIds.length,
    newStudents30d: links.filter((l) => (l.created_at ?? "") >= thirtyDaysAgo).length,
    applications,
    tasks: ((tasksRes.data ?? []) as any[]).map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.due_at,
      priority: t.priority,
      status: t.status,
    })),
    documentRequests,
    commissionPaid,
    commissionPending,
    unreadMessages: 0,
  };
};

export const useAgentOverviewData = (agentProfileId: string | null) =>
  useQuery({
    queryKey: ["agent-overview", agentProfileId],
    queryFn: () => fetchAgentOverview(agentProfileId as string),
    enabled: Boolean(agentProfileId),
    staleTime: 60_000,
  });

export const PIPELINE_STAGES: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "draft", label: "In preparation", statuses: ["draft"] },
  { key: "submitted", label: "Submitted", statuses: ["submitted"] },
  { key: "screening", label: "University review", statuses: ["screening"] },
  { key: "conditional_offer", label: "Conditional offer", statuses: ["conditional_offer"] },
  { key: "unconditional_offer", label: "Unconditional offer", statuses: ["unconditional_offer"] },
  { key: "cas_loa", label: "CAS / I-20", statuses: ["cas_loa"] },
  { key: "visa", label: "Visa stage", statuses: ["visa"] },
  { key: "enrolled", label: "Enrolled", statuses: ["enrolled"] },
  { key: "closed", label: "Closed", statuses: ["withdrawn", "deferred"] },
];
