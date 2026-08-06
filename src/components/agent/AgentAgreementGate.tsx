import { AgentAgreementDialog } from "@/components/agent/AgentAgreementDialog";
import { useAgentAgreement } from "@/hooks/agent/useAgentAgreement";

/**
 * Renders the recruitment agent agreement for approved agents who have not signed yet.
 * Invisible for every other user and for agents that are not yet vetted/approved.
 */
export function AgentAgreementGate() {
  const { loading, isApprovedAgent, hasSigned, refresh } = useAgentAgreement();

  if (loading || !isApprovedAgent || hasSigned) return null;

  return <AgentAgreementDialog open onSigned={() => void refresh()} />;
}

export default AgentAgreementGate;
