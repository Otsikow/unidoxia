import { Button } from "@/components/ui/button";
import { Lead } from "@/types/lead";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { useDeleteLead } from "@/hooks/useDeleteLead";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeadActionsProps {
  lead: Lead;
}

export default function LeadActions({ lead }: LeadActionsProps) {
  const deleteLeadMutation = useDeleteLead();
  const navigate = useNavigate();

  const handleDelete = () => {
    deleteLeadMutation.mutate(lead.id);
  };

  const handleChat = () => {
    navigate(`/agent/students/${lead.id}`);
  };

  return (
    <div className="space-x-2">
      <Button variant="outline" size="sm">
        View
      </Button>
      <Button variant="outline" size="sm">
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={handleChat}>
        <MessageSquare className="mr-2 h-4 w-4" />
        Chat
      </Button>
      <ConfirmDeleteDialog onConfirm={handleDelete} />
    </div>
  );
}
