import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Mail, Phone, Globe, Calendar, Shield, FileText } from "lucide-react";
import type { AgentRecord } from "./types";
import { formatCurrency, getInitials, getStatusColor, getComplianceColor } from "./utils";
import WhatsAppButton from "./WhatsAppButton";
import { format } from "date-fns";

interface Props {
  agent: AgentRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCommission: (agent: AgentRecord) => void;
}

export default function AgentProfileDrawer({ agent, open, onOpenChange, onOpenCommission }: Props) {
  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {getInitials(agent.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{agent.name}</SheetTitle>
              {agent.companyName && (
                <p className="text-sm text-muted-foreground">{agent.companyName}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className={`text-xs capitalize ${getStatusColor(agent.status)}`}>
                  {agent.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={`text-xs capitalize ${getComplianceColor(agent.complianceStatus)}`}>
                  {agent.complianceStatus}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-5">
          <WhatsAppButton phone={agent.phone} message={`Hi ${agent.name}, `} />
          <Button variant="outline" onClick={() => agent.email && (window.location.href = `mailto:${agent.email}`)} disabled={!agent.email}>
            <Mail className="h-4 w-4 mr-2" /> Email
          </Button>
          <Button variant="outline" onClick={() => onOpenCommission(agent)}>
            Commission
          </Button>
        </div>

        <Separator className="my-5" />

        {/* Contact Info */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
          <div className="grid gap-2 text-sm">
            {agent.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${agent.email}`} className="text-primary hover:underline">{agent.email}</a>
              </div>
            )}
            {agent.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{agent.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>{agent.country}</span>
            </div>
            {agent.createdAt && (
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(agent.createdAt), "dd MMM yyyy")}</span>
              </div>
            )}
          </div>
        </section>

        <Separator className="my-5" />

        {/* Performance */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Students", value: agent.totalStudents },
              { label: "Applications", value: agent.applicationsSubmitted },
              { label: "Offers", value: agent.offersReceived },
              { label: "Enrolled", value: agent.enrolledStudents },
              { label: "Conversion", value: agent.conversionRate > 0 ? `${agent.conversionRate.toFixed(0)}%` : "—" },
              { label: "Revenue", value: formatCurrency(agent.revenueGenerated) },
            ].map((item) => (
              <div key={item.label} className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="my-5" />

        {/* Commission */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
              <p className="text-xs text-muted-foreground">L1 Rate</p>
              <p className="text-lg font-semibold">{agent.commissionRateL1}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-muted-foreground">Owed</p>
              <p className="text-lg font-semibold text-amber-400">{formatCurrency(agent.commissionOwed)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-semibold text-emerald-400">{formatCurrency(agent.commissionPaid)}</p>
            </div>
          </div>
        </section>

        <Separator className="my-5" />

        {/* Compliance */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compliance & Documents</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Verification Status</span>
              </div>
              <Badge variant="outline" className={`text-xs capitalize ${getComplianceColor(agent.complianceStatus)}`}>
                {agent.verificationStatus || agent.complianceStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Documents</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs">Review</Button>
            </div>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
