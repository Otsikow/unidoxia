import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AGENT_AGREEMENT_VERSION } from "@/content/agentAgreementTerms";

const APPROVED_STATUSES = ["verified", "approved"];

export interface AgentAgreementState {
  loading: boolean;
  /** Agent record has been vetted and approved by UniDoxia */
  isApprovedAgent: boolean;
  hasSigned: boolean;
  signedAt: string | null;
  agentId: string | null;
  refresh: () => Promise<void>;
}

export function useAgentAgreement(): AgentAgreementState {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isApprovedAgent, setIsApprovedAgent] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || profile?.role !== "agent") {
      setLoading(false);
      setIsApprovedAgent(false);
      setHasSigned(false);
      return;
    }

    setLoading(true);
    try {
      const [agentRes, agreementRes] = await Promise.all([
        supabase
          .from("agents")
          .select("id, verification_status, active")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase
          .from("agent_agreements")
          .select("id, signed_at")
          .eq("profile_id", user.id)
          .eq("agreement_version", AGENT_AGREEMENT_VERSION)
          .maybeSingle(),
      ]);

      const agent = agentRes.data as { id: string; verification_status: string | null; active: boolean | null } | null;
      setAgentId(agent?.id ?? null);
      setIsApprovedAgent(
        Boolean(agent && agent.active !== false && APPROVED_STATUSES.includes((agent.verification_status ?? "").toLowerCase())),
      );

      const agreement = agreementRes.data as { id: string; signed_at: string } | null;
      setHasSigned(Boolean(agreement));
      setSignedAt(agreement?.signed_at ?? null);
    } catch (error) {
      console.error("useAgentAgreement: failed to load agreement state", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, isApprovedAgent, hasSigned, signedAt, agentId, refresh: load };
}
