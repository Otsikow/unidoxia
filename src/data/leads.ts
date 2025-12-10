import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Lead, LeadCore } from "@/types/lead";
import { enrichLeadWithQualification } from "@/lib/leadQualification";

const MOCK_LEADS: LeadCore[] = [
  {
    id: "mock-aisha",
    first_name: "Aisha",
    last_name: "Rahman",
    email: "aisha.rahman@example.com",
    country: "India",
    status: "documents_pending",
  },
  {
    id: "mock-diego",
    first_name: "Diego",
    last_name: "Morales",
    email: "diego.morales@example.com",
    country: "Mexico",
    status: "offer_ready",
  },
  {
    id: "mock-hana",
    first_name: "Hana",
    last_name: "Nguyen",
    email: "hana.nguyen@example.com",
    country: "Vietnam",
    status: "nurture",
  },
];

export const getLeads = async (): Promise<Lead[]> => {
  if (!isSupabaseConfigured) {
    return MOCK_LEADS.map((lead) => enrichLeadWithQualification(lead));
  }

  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,
      legal_name,
      preferred_name,
      contact_email,
      current_country,
      agent_student_links!inner(
        status
      )
    `
    )
    .eq("agent_student_links.status", "active");

  if (error) {
    console.error("Error fetching leads:", error);
    throw error;
  }

  // The type needs to be adjusted because Supabase returns the nested data
  // inside the 'agent_student_links' property.
  return (data as any[]).map((student) => {
    const nameParts = (student.legal_name || student.preferred_name || "").split(" ");
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");
    const baseLead: LeadCore = {
      id: student.id,
      first_name: firstName,
      last_name: lastName,
      email: student.contact_email || "",
      country: student.current_country || "",
      status: student.agent_student_links[0]?.status || "unknown",
    };
    return enrichLeadWithQualification(baseLead);
  }) as Lead[];
};

export const getStudent = async (
  studentId: string,
  tenantId?: string | null,
): Promise<Lead> => {
  if (!isSupabaseConfigured) {
    const mockLead = MOCK_LEADS.find((lead) => lead.id === studentId) || MOCK_LEADS[0];
    return enrichLeadWithQualification(mockLead);
  }

  if (!tenantId) {
    throw new Error("Missing tenant context for student lookup");
  }

  const { data, error } = await supabase.rpc("get_students_by_tenant", {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("Error fetching student:", error);
    throw error;
  }

  const studentRow = data?.find((row: any) => row.student_id === studentId);
  const tenantStudent = studentRow?.student as Record<string, any> | undefined;

  if (!tenantStudent || typeof tenantStudent !== "object") {
    throw new Error("Student not found");
  }

  const preferredName = tenantStudent.preferred_name as string | undefined;
  const legalName = tenantStudent.legal_name as string | undefined;
  const profile = tenantStudent.profile as Record<string, any> | undefined;
  const nameParts = (
    preferredName || legalName || profile?.full_name || ""
  ).split(" ");
  const firstName = nameParts.shift() || "";
  const lastName = nameParts.join(" ");
  const baseLead: LeadCore = {
    id: tenantStudent.id as string,
    first_name: firstName,
    last_name: lastName,
    email: (tenantStudent.contact_email as string) || profile?.email || "",
    country: (tenantStudent.current_country as string) || profile?.country || "",
    status: profile?.onboarded ? "onboarded" : "pending",
  };
  return enrichLeadWithQualification(baseLead) as Lead;
};

export const getApplicationDrafts = async (studentId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from("application_drafts")
    .select("last_step, updated_at")
    .eq("student_id", studentId);

  if (error) {
    console.error("Error fetching application drafts:", error);
    throw error;
  }

  return data;
};

export const deleteLead = async (leadId: string): Promise<void> => {
  const { error } = await supabase
    .from("agent_student_links")
    .delete()
    .eq("student_id", leadId);

  if (error) {
    console.error("Error deleting lead:", error);
    throw error;
  }
};

export const deleteLeads = async (leadIds: string[]): Promise<void> => {
  const { error } = await supabase
    .from("agent_student_links")
    .delete()
    .in("student_id", leadIds);

  if (error) {
    console.error("Error deleting leads:", error);
    throw error;
  }
};
