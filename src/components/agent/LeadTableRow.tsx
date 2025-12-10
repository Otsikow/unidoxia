import { Link } from "react-router-dom";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import LeadActions from "./LeadActions";
import LeadQualificationPopover from "./LeadQualificationPopover";
import { Lead } from "@/types/lead";

const STATUS_STYLES: Record<string, string> = {
  offer_ready: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  documents_pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  nurture: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case "offer_ready":
      return "Offer ready";
    case "documents_pending":
      return "Documents pending";
    case "nurture":
      return "Nurture";
    default:
      return status.replace(/_/g, " ");
  }
};

interface LeadTableRowProps {
  lead: Lead;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
}

export default function LeadTableRow({
  lead,
  isSelected,
  onSelect,
}: LeadTableRowProps) {
  return (
    <TableRow className={isSelected ? "bg-muted/40" : undefined}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(lead.id)}
        />
      </TableCell>
      <TableCell>
        <Link to={`/agent/students/${lead.id}`} className="hover:underline">
          {`${lead.first_name} ${lead.last_name}`}
        </Link>
      </TableCell>
      <TableCell>{lead.email}</TableCell>
      <TableCell>{lead.country}</TableCell>
      <TableCell>
        <Badge variant="outline" className={STATUS_STYLES[lead.status]}>
          {formatStatusLabel(lead.status)}
        </Badge>
      </TableCell>
      <TableCell className="align-top">
        <LeadQualificationPopover lead={lead} />
      </TableCell>
      <TableCell>
        <LeadActions lead={lead} />
      </TableCell>
    </TableRow>
  );
}
