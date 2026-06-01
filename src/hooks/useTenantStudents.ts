import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { agentStudentsQueryKey, type AgentStudent } from "./useAgentStudents";

interface TenantStudentRow {
  student_id: string;
  application_count: number | null;
  student: {
    id: string;
    tenant_id: string;
    profile_id: string;
    reference_code: string | null;
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

export const tenantStudentsQueryKey = (tenantId?: string | null) => [
  "tenant-students",
  tenantId ?? "anonymous",
];

const mapTenantStudent = (row: TenantStudentRow): AgentStudent | null => {
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
    referenceCode: (student as any).reference_code ?? null,
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

const fetchTenantStudents = async (
  tenantId: string,
): Promise<AgentStudent[]> => {
  const { data, error } = await supabase.rpc('get_students_by_tenant', { p_tenant_id: tenantId })

  if (error) {
    throw error satisfies PostgrestError;
  }

  const mapped =
    data
      ?.map(mapTenantStudent)
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

export const useTenantStudents = (tenantId?: string | null) =>
  useQuery({
    queryKey: tenantStudentsQueryKey(tenantId),
    queryFn: () => fetchTenantStudents(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });
