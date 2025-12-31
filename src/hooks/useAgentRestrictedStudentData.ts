import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

/**
 * Represents student data accessible to agents.
 * Sensitive fields like passport_number, passport_expiry, visa_history_json,
 * and finances_json are excluded for privacy protection.
 */
export interface RestrictedStudentData {
  studentId: string;
  tenantId: string;
  profileId: string;
  dateOfBirth: string | null;
  nationality: string | null;
  address: Record<string, unknown> | null;
  educationHistory: Record<string, unknown> | null;
  testScores: Record<string, unknown> | null;
  guardian: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  legalName: string | null;
  preferredName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  currentCountry: string | null;
  consentFlagsJson: Record<string, unknown> | null;
  profileCompleteness: number | null;
  linkStatus: string | null;
  applicationCount: number;
}

export const agentRestrictedStudentDataQueryKey = (agentProfileId?: string | null) => [
  "agent-restricted-student-data",
  agentProfileId ?? "anonymous",
];

/**
 * Fetches student data for agents using the existing RLS-protected tables.
 * This ensures sensitive fields are not exposed to agents beyond what RLS allows.
 */
const fetchAgentRestrictedStudentData = async (
  agentProfileId: string
): Promise<RestrictedStudentData[]> => {
  // First get the agent record - using maybeSingle to handle non-agent users gracefully
  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("id")
    .eq("profile_id", agentProfileId)
    .maybeSingle();

  // Handle case where user is not an agent or no agent record exists
  if (!agentData) {
    if (agentError && agentError.code !== "PGRST116") {
      console.error("Error fetching agent:", agentError);
    }
    return [];
  }

  // Get applications for this agent to find linked students
  const { data: applications, error: appError } = await supabase
    .from("applications")
    .select(`
      student_id,
      students!inner (
        id,
        tenant_id,
        profile_id,
        date_of_birth,
        nationality,
        address,
        education_history,
        test_scores,
        guardian,
        created_at,
        updated_at,
        legal_name,
        preferred_name,
        contact_email,
        contact_phone,
        current_country,
        consent_flags_json,
        profile_completeness
      )
    `)
    .eq("agent_id", agentData.id);

  if (appError) {
    throw appError satisfies PostgrestError;
  }

  if (!applications || applications.length === 0) {
    return [];
  }

  // Deduplicate students and count applications
  const studentMap = new Map<string, RestrictedStudentData>();
  
  for (const app of applications) {
    const student = app.students;
    if (!student) continue;
    
    const studentId = student.id;
    const existing = studentMap.get(studentId);
    
    if (existing) {
      existing.applicationCount += 1;
    } else {
      studentMap.set(studentId, {
        studentId: student.id,
        tenantId: student.tenant_id,
        profileId: student.profile_id,
        dateOfBirth: student.date_of_birth,
        nationality: student.nationality,
        address: student.address as Record<string, unknown> | null,
        educationHistory: student.education_history as Record<string, unknown> | null,
        testScores: student.test_scores as Record<string, unknown> | null,
        guardian: student.guardian as Record<string, unknown> | null,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
        legalName: student.legal_name,
        preferredName: student.preferred_name,
        contactEmail: student.contact_email,
        contactPhone: student.contact_phone,
        currentCountry: student.current_country,
        consentFlagsJson: student.consent_flags_json as Record<string, unknown> | null,
        profileCompleteness: student.profile_completeness,
        linkStatus: "active",
        applicationCount: 1,
      });
    }
  }

  return Array.from(studentMap.values());
};

/**
 * Hook for agents to access student data.
 * Excludes sensitive fields: passport_number, passport_expiry,
 * visa_history_json, and finances_json are filtered out by this hook.
 *
 * @param agentProfileId - The profile ID of the agent
 * @returns Query result with restricted student data
 */
export const useAgentRestrictedStudentData = (agentProfileId?: string | null) =>
  useQuery({
    queryKey: agentRestrictedStudentDataQueryKey(agentProfileId),
    queryFn: () => fetchAgentRestrictedStudentData(agentProfileId!),
    enabled: Boolean(agentProfileId),
    staleTime: 60_000,
  });

/**
 * Alternative function to fetch student data directly.
 * Uses the students table with RLS which excludes sensitive fields for agents.
 */
export const fetchStudentDataFromView = async (studentIds: string[]) => {
  if (studentIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      tenant_id,
      profile_id,
      date_of_birth,
      nationality,
      address,
      education_history,
      test_scores,
      guardian,
      created_at,
      updated_at,
      legal_name,
      preferred_name,
      contact_email,
      contact_phone,
      current_country,
      consent_flags_json,
      profile_completeness
    `)
    .in("id", studentIds);

  if (error) {
    throw error satisfies PostgrestError;
  }

  return data;
};