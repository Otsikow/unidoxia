import { TableCell, TableRow } from "@/components/ui/table";
import { Lead } from "@/types/lead";
import LeadActions from "./LeadActions";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import LeadQualificationPopover from "./LeadQualificationPopover";

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
    <TableRow>
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
      <TableCell>{lead.status}</TableCell>
      <TableCell className="align-top">
        <LeadQualificationPopover lead={lead} />
      </TableCell>
      <TableCell>
        <LeadActions lead={lead} />
      </TableCell>
    </TableRow>
  );
}
