import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  overviewApplications,
  overviewStudents,
  overviewTasks,
  type OverviewApplication,
  type OverviewStudent,
  type OverviewTask,
} from "@/lib/adminOverview";

export async function fetchOverviewStudents(tenantId?: string | null) {
  // Match the existing admin Students list: try its tenant, then its existing
  // RLS-scoped fallback only when that scope has no student records.
  for (const scoped of tenantId ? [true, false] : [false]) {
    const rows: OverviewStudent[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = supabase
        .from("students")
        .select(
          "id,archived_at,documents:student_documents(id,admin_review_status)",
        );
      if (scoped) query = query.eq("tenant_id", tenantId!);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    if (rows.length || !scoped) return overviewStudents(rows);
  }
  throw new Error("Student overview unavailable.");
}
export async function fetchOverviewApplications() {
  const rows: OverviewApplication[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("applications")
      .select(
        `id,app_number,status,created_at,
      student:students(legal_name),program:programs(name),documents:application_documents(id,verified),
      tasks(id,title,status,due_at,assignee_id)`,
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return overviewApplications(rows);
  }
}
export async function fetchOverviewTasks(tenantId: string) {
  const rows: OverviewTask[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id,title,status,due_at,assignee_id,application_id,assignee:profiles!tasks_assignee_id_fkey(full_name)",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return overviewTasks(rows);
  }
}
export function useAdminHome() {
  const { user, profile } = useAuth();
  const scope = [user?.id, profile?.tenant_id, profile?.role];
  const options = { staleTime: 30_000, refetchInterval: 60_000 };
  const students = useQuery({
    ...options,
    queryKey: ["admin-home", "students", ...scope],
    enabled: Boolean(user?.id),
    queryFn: () => fetchOverviewStudents(profile?.tenant_id),
  });
  const applications = useQuery({
    ...options,
    queryKey: ["admin-home", "applications", ...scope],
    enabled: Boolean(user?.id),
    queryFn: fetchOverviewApplications,
  });
  const tasks = useQuery({
    ...options,
    queryKey: ["admin-home", "tasks", ...scope],
    enabled: Boolean(user?.id && profile?.tenant_id),
    queryFn: () => fetchOverviewTasks(profile!.tenant_id!),
  });
  return {
    students,
    applications,
    tasks,
    taskScopeAvailable: Boolean(profile?.tenant_id),
  };
}
