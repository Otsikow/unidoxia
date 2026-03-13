import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreVertical,
  MessageSquare,
  Mail,
  Eye,
  Users,
  FileText,
  Settings,
  UserX,
  Trash2,
} from "lucide-react";
import type { AgentRecord } from "./types";
import { formatCurrency, getInitials, getStatusColor, getComplianceColor, getWhatsAppUrl } from "./utils";
import WhatsAppButton from "./WhatsAppButton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Props {
  agents: AgentRecord[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onOpenProfile: (agent: AgentRecord) => void;
  onOpenCommission: (agent: AgentRecord) => void;
}

export default function AgentTable({
  agents,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onOpenProfile,
  onOpenCommission,
}: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const allSelected = agents.length > 0 && selectedIds.size === agents.length;

  const handleEmail = (agent: AgentRecord) => {
    if (!agent.email) {
      toast({ title: "No email", description: "This agent has no email on file.", variant: "destructive" });
      return;
    }
    window.location.href = `mailto:${agent.email}`;
  };

  const handleInternalMessage = (agent: AgentRecord) => {
    navigate(`/dashboard/messages?contact=${encodeURIComponent(agent.profileId)}`);
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No agents found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No agents match your current filters. Try adjusting your search or invite a new agency.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/60">
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
            </TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Apps</TableHead>
            <TableHead className="text-right">Offers</TableHead>
            <TableHead className="text-right">Enrolled</TableHead>
            <TableHead className="text-right">Conv.</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-20 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow
              key={agent.id}
              className="group cursor-pointer border-border/40 hover:bg-accent/40"
              onClick={() => onOpenProfile(agent)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(agent.id)}
                  onCheckedChange={() => onToggleSelect(agent.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border/60">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{agent.name}</p>
                    {agent.email && (
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">{agent.country}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs capitalize ${getStatusColor(agent.status)}`}>
                  {agent.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">{agent.applicationsSubmitted}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">{agent.offersReceived}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">{agent.enrolledStudents}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {agent.conversionRate > 0 ? `${agent.conversionRate.toFixed(0)}%` : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm font-medium">
                {formatCurrency(agent.revenueGenerated)}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onOpenCommission(agent)}
                  className="text-sm tabular-nums text-primary hover:underline font-medium"
                >
                  {agent.commissionRateL1 > 0 ? `${agent.commissionRateL1}%` : "Set"}
                </button>
                {agent.commissionOwed > 0 && (
                  <p className="text-xs text-amber-400">{formatCurrency(agent.commissionOwed)} owed</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs capitalize ${getComplianceColor(agent.complianceStatus)}`}>
                  {agent.complianceStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {agent.lastActivityAt
                  ? format(new Date(agent.lastActivityAt), "dd MMM yyyy")
                  : "Never"}
              </TableCell>
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1">
                  <WhatsAppButton phone={agent.phone} size="sm" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onOpenProfile(agent)}>
                        <Eye className="mr-2 h-4 w-4" /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleInternalMessage(agent)}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Internal Message
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEmail(agent)}>
                        <Mail className="mr-2 h-4 w-4" /> Send Email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onOpenCommission(agent)}>
                        <Settings className="mr-2 h-4 w-4" /> Commission Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" /> View Documents
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Users className="mr-2 h-4 w-4" /> View Students
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-amber-400">
                        <UserX className="mr-2 h-4 w-4" /> Suspend Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
