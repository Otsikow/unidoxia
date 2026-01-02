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
    console.error("Error fetching leads:", {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    // Provide specific error messages
    let errorMessage = "Failed to fetch leads";
    if (error.code === 'PGRST116') {
      errorMessage = "No leads found";
    } else if (error.message?.includes('permission') || error.code?.startsWith('42501')) {
      errorMessage = "Access denied. You don't have permission to view leads.";
    } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
      errorMessage = "Network error while fetching leads. Please try again.";
    } else {
      errorMessage = `Failed to fetch leads: ${error.message}`;
    }

    throw new Error(errorMessage);
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

  const { data, error } = await supabase
    .from("agent_student_links")
    .select(
      `
        status,
        student:students (
          id,
          tenant_id,
          profile_id,
          legal_name,
          preferred_name,
          contact_email,
          contact_phone,
          current_country,
          created_at,
          updated_at,
          profile:profiles (
            id,
            full_name,
            email,
            phone,
            country,
            onboarded,
            username
          )
        )
      `,
    )
    .eq("student_id", studentId)
    .eq("status", "active")
    .eq("student.tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching student:", {
      studentId,
      tenantId,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    let errorMessage = "Failed to fetch student details";
    if (error.code === 'PGRST116') {
      errorMessage = `Student ${studentId} not found or not linked to your account`;
    } else if (error.message?.includes('permission') || error.code?.startsWith('42501')) {
      errorMessage = "Access denied. You don't have permission to view this student.";
    } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
      errorMessage = "Network error while fetching student. Please try again.";
    } else {
      errorMessage = `Failed to fetch student: ${error.message}`;
    }

    throw new Error(errorMessage);
  }

  const tenantStudent = data?.student as Record<string, any> | undefined;

  if (!tenantStudent || typeof tenantStudent !== "object") {
    console.error("Student data not found in response", {
      studentId,
      tenantId,
      hasData: !!data,
    });
    throw new Error(`Student ${studentId} not found or not linked to your tenant`);
  }

  const preferredName = (tenantStudent.preferred_name as string | undefined)?.trim();
  const legalName = (tenantStudent.legal_name as string | undefined)?.trim();
  const profile = tenantStudent.profile as Record<string, any> | undefined;
  const profileName = (profile?.full_name as string | undefined)?.trim();
  const nameParts = (preferredName || legalName || profileName || "").split(" ");
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
  const { error, count } = await supabase
    .from("agent_student_links")
    .delete({ count: 'exact' })
    .eq("student_id", leadId);

  if (error) {
    console.error("Error deleting lead:", {
      leadId,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    let errorMessage = "Failed to delete lead";
    if (error.code?.startsWith('23') && error.message?.includes('foreign key')) {
      errorMessage = "Cannot delete lead with active applications. Please remove applications first.";
    } else if (error.message?.includes('permission') || error.code?.startsWith('42501')) {
      errorMessage = "You don't have permission to delete this lead.";
    } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
      errorMessage = "Network error while deleting lead. Please try again.";
    } else {
      errorMessage = `Failed to delete lead: ${error.message}`;
    }

    throw new Error(errorMessage);
  }

  if (count === 0) {
    console.warn("No lead found to delete", { leadId });
    throw new Error(`Lead ${leadId} not found or already deleted`);
  }
};

export const deleteLeads = async (leadIds: string[]): Promise<void> => {
  if (!leadIds || leadIds.length === 0) {
    throw new Error("No leads specified for deletion");
  }

  const { error, count } = await supabase
    .from("agent_student_links")
    .delete({ count: 'exact' })
    .in("student_id", leadIds);

  if (error) {
    console.error("Error deleting leads:", {
      leadIds,
      count: leadIds.length,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    let errorMessage = "Failed to delete leads";
    if (error.code?.startsWith('23') && error.message?.includes('foreign key')) {
      errorMessage = "Cannot delete some leads with active applications. Please remove applications first.";
    } else if (error.message?.includes('permission') || error.code?.startsWith('42501')) {
      errorMessage = "You don't have permission to delete these leads.";
    } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
      errorMessage = "Network error while deleting leads. Please try again.";
    } else {
      errorMessage = `Failed to delete leads: ${error.message}`;
    }

    throw new Error(errorMessage);
  }

  if (count !== null && count < leadIds.length) {
    console.warn("Some leads were not found", {
      requested: leadIds.length,
      deleted: count,
      leadIds,
    });
  }

  if (count === 0) {
    throw new Error("No leads found to delete. They may have already been removed.");
  }
};
