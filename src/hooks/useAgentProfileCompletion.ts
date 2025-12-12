import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AgentProfileChecklistItem {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
}

export interface AgentProfileCompletionResult {
  percentage: number;
  missingFields: string[];
}

interface AgentProfileData {
  id: string;
  company_name: string | null;
  verification_document_url: string | null;
  verification_status: string | null;
  tenant_id: string;
  profile_id: string;
}

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

export function useAgentProfileCompletion() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const profileId = profile?.id ?? null;
  const isAgent = profile?.role === "agent";

  const query = useQuery<AgentProfileData | null>({
    queryKey: ["agent-profile-completion", profileId],
    enabled: Boolean(profileId && isAgent),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AgentProfileData | null> => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, verification_document_url, verification_status, tenant_id, profile_id")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching agent profile for completion", error);
        throw error;
      }

      if (data && data.profile_id !== profileId) {
        console.error("SECURITY: Agent profile isolation mismatch", {
          expectedProfile: profileId,
          returnedProfile: data.profile_id,
        });
        throw new Error("Profile isolation error: Agent record does not belong to your account");
      }

      return data;
    },
  });

  const checklist = useMemo<AgentProfileChecklistItem[]>(() => {
    if (!isAgent) return [];

    const safeProfile = {
      name: normalizeText(profile?.full_name),
      phone: normalizeText(profile?.phone ?? ""),
      country: normalizeText(profile?.country ?? ""),
    };

    const safeAgent = {
      company: normalizeText(query.data?.company_name),
      certificate: normalizeText(query.data?.verification_document_url),
    };

    return [
      {
        key: "name",
        label: "Full name",
        description: "Use your official name so universities recognize you.",
        isComplete: Boolean(safeProfile.name),
      },
      {
        key: "company",
        label: "Agency name",
        description: "Let students know which agency you represent.",
        isComplete: Boolean(safeAgent.company),
      },
      {
        key: "location",
        label: "Location",
        description: "Add your primary operating country.",
        isComplete: Boolean(safeProfile.country),
      },
      {
        key: "phone",
        label: "Contact number",
        description: "Provide a reachable phone number for escalations.",
        isComplete: Boolean(safeProfile.phone),
      },
      {
        key: "certificate",
        label: "Agency certificate",
        description: "Upload or link your accreditation/registration proof.",
        isComplete: Boolean(safeAgent.certificate),
      },
    ];
  }, [isAgent, profile?.country, profile?.full_name, profile?.phone, query.data]);

  const completion = useMemo<AgentProfileCompletionResult>(() => {
    if (!isAgent || checklist.length === 0) {
      return { percentage: 100, missingFields: [] };
    }

    const completedCount = checklist.filter((item) => item.isComplete).length;
    const percentage = Math.round((completedCount / checklist.length) * 100);

    return {
      percentage: Math.min(100, Math.max(0, percentage)),
      missingFields: checklist.filter((item) => !item.isComplete).map((item) => item.label),
    };
  }, [checklist, isAgent]);

  const refresh = async () => {
    await query.refetch();
  };

  const invalidate = async () => {
    if (!profileId) return;
    await queryClient.invalidateQueries({ queryKey: ["agent-profile-completion", profileId] });
  };

  return {
    completion,
    checklist,
    agent: query.data,
    hasAgentProfile: Boolean(query.data?.id),
    isLoading: query.isLoading,
    isRefetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refresh,
    invalidate,
  } as const;
}
