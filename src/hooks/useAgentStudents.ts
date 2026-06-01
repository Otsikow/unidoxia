import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

export interface AgentStudent {
  studentId: string;
  profileId: string;
  referenceCode: string | null;
  displayName: string;
  preferredName?: string | null;
  legalName?: string | null;
  email: string;
  phone?: string | null;
  country?: string | null;
  destinationCountries: string[];
  onboarded: boolean;
  applicationCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  username?: string | null;
}

interface AgentStudentRow {
  student_id: string;
  application_count: number | null;
  student: {
    id: string;
    tenant_id: string;
    profile_id: string;
    legal_name: string | null;
    preferred_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    current_country: string | null;
    created_at: string | null;
    updated_at: string | null;
    destination_countries: string[] | null;
    profile: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
      country: string | null;
      onboarded: boolean | null;
      username: string;
    } | null;
  } | null;
}

export const agentStudentsQueryKey = (agentProfileId?: string | null) => [
  "agent-students",
  agentProfileId ?? "anonymous",
];

const mapAgentStudent = (row: AgentStudentRow): AgentStudent | null => {
  const student = row.student;
  if (!student) {
    return null;
  }

  const profile = student.profile;

  const legalName = student.legal_name?.trim() || null;
  const preferredName = student.preferred_name?.trim() || null;

  const displayName =
    preferredName ||
    legalName ||
    profile?.full_name?.trim() ||
    "Unnamed Student";

  const email =
    student.contact_email?.trim() ||
    profile?.email?.trim() ||
    "unknown@example.com";

  const phone = student.contact_phone?.trim() || profile?.phone?.trim() || null;
  const country = profile?.country?.trim() || student.current_country || null;
  const destinationCountries = Array.from(
    new Set(student.destination_countries?.filter(Boolean) ?? []),
  ).sort();

  return {
    studentId: student.id,
    profileId: student.profile_id,
    displayName,
    preferredName,
    legalName,
    email,
    phone,
    country,
    destinationCountries,
    onboarded: Boolean(profile?.onboarded),
    applicationCount:
      typeof row.application_count === "number" ? row.application_count : 0,
    createdAt: student.created_at,
    updatedAt: student.updated_at ?? student.created_at,
    username: profile?.username ?? null,
  };
};

const fetchAgentStudents = async (
  agentProfileId: string,
): Promise<AgentStudent[]> => {
  // First, get the agent ID from the profile ID
  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("id")
    .eq("profile_id", agentProfileId)
    .maybeSingle();

  if (agentError) {
    throw agentError satisfies PostgrestError;
  }

  if (!agentData) {
    return [];
  }

  const { data, error } = await supabase
    .from("agent_student_links")
    .select(
      `
        student_id,
        application_count,
        student:students!inner(
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
          profile:profiles!students_profile_id_fkey(
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
    .eq("agent_id", agentData.id);

  if (error) {
    throw error satisfies PostgrestError;
  }

  const mapped =
    data
      ?.map(mapAgentStudent)
      .filter((student): student is AgentStudent => Boolean(student)) ?? [];

  return mapped.sort((a, b) => {
    if (a.updatedAt && b.updatedAt) {
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    if (a.updatedAt) return -1;
    if (b.updatedAt) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
};

export const useAgentStudents = (agentProfileId?: string | null) =>
  useQuery({
    queryKey: agentStudentsQueryKey(agentProfileId),
    queryFn: () => fetchAgentStudents(agentProfileId!),
    enabled: Boolean(agentProfileId),
    staleTime: 60_000,
  });
