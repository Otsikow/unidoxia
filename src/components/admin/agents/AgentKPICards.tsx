import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Clock, AlertTriangle, TrendingUp, Coins, FileText, GraduationCap } from "lucide-react";
import type { AgentRecord } from "./types";
import { formatCurrency } from "./utils";

interface Props {
  agents: AgentRecord[];
}

export default function AgentKPICards({ agents }: Props) {
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const pendingAgents = agents.filter((a) => a.status === "pending").length;
  const atRiskAgents = agents.filter((a) => a.status === "at_risk").length;
  const totalRevenue = agents.reduce((s, a) => s + a.revenueGenerated, 0);
  const totalCommissionOwed = agents.reduce((s, a) => s + a.commissionOwed, 0);
  const totalApplications = agents.reduce((s, a) => s + a.applicationsSubmitted, 0);
  const totalEnrolments = agents.reduce((s, a) => s + a.enrolledStudents, 0);

  const cards = [
    { label: "Total Agents", value: totalAgents, icon: Users, color: "text-primary" },
    { label: "Active Agents", value: activeAgents, icon: UserCheck, color: "text-emerald-400" },
    { label: "Pending Approval", value: pendingAgents, icon: Clock, color: "text-amber-400" },
    { label: "At Risk", value: atRiskAgents, icon: AlertTriangle, color: "text-red-400" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-emerald-400" },
    { label: "Commission Owed", value: formatCurrency(totalCommissionOwed), icon: Coins, color: "text-amber-400" },
    { label: "Applications", value: totalApplications, icon: FileText, color: "text-primary" },
    { label: "Enrolments", value: totalEnrolments, icon: GraduationCap, color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="hover:shadow-md transition-shadow border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
