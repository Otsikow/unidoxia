import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { useDeleteLead } from "@/hooks/useDeleteLead";
import { Lead } from "@/types/lead";

interface LeadActionsProps {
  lead: Lead;
}

export default function LeadActions({ lead }: LeadActionsProps) {
  const deleteLeadMutation = useDeleteLead();
  const navigate = useNavigate();

  const handleDelete = () => {
    deleteLeadMutation.mutate(lead.id);
  };

  const handleView = () => {
    navigate(`/agent/students/${lead.id}`);
  };

  const handleEdit = () => {
    navigate(`/dashboard/applications/new?studentId=${lead.id}`);
  };

  const handleChat = () => {
    navigate(`/agent/students/${lead.id}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleView}>
        View
      </Button>
      <Button variant="outline" size="sm" onClick={handleEdit}>
        Start application
      </Button>
      <Button variant="outline" size="sm" onClick={handleChat}>
        <MessageSquare className="mr-2 h-4 w-4" />
        Chat
      </Button>
      <ConfirmDeleteDialog onConfirm={handleDelete} />
    </div>
  );
}
