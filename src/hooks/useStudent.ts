import { useQuery } from "@tanstack/react-query";
import { getStudent } from "@/data/leads";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export const useStudent = (studentId: string, tenantId?: string | null) => {
  return useQuery({
    queryKey: ["student", studentId, tenantId],
    queryFn: () => getStudent(studentId, tenantId),
    enabled: Boolean(studentId) && (!isSupabaseConfigured || Boolean(tenantId)),
    retry: 1,
  });
};
