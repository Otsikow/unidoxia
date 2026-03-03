import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpRight,
  Filter,
  AlertTriangle,
  Hourglass,
  Loader2,
  MessageSquare,
  MoreVertical,
  Circle,
  Coins,
  TrendingDown,
  Send,
  Users,
} from "lucide-react";

import BackButton from "@/components/BackButton";
import { InviteAgencyDialog } from "@/components/admin/InviteAgencyDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

type ComplianceStatus = "green" | "amber" | "red";

interface ReferredStudentSummary {
  id: string;
  fullName: string;
  email: string;
  preferredCountry: string;
  preferredCourse: string;
  profileCompleteness: number;
}

interface AgentRecord {
  id: string;
  profileId: string;
  name: string;
  country: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  totalStudents: number;
  applicationsSubmitted: number;
  offersReceived: number;
  enrolledStudents: number;
  conversionRate: number;
  revenueGenerated: number;
  commissionRate: number;
  commissionOwed: number;
  commissionPaid: number;
  complianceStatus: ComplianceStatus;
  lastActivityAt: string | null;
  referredStudents: ReferredStudentSummary[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

const normalizePhone = (phone: string | null) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
};

const AdminAgents = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [commissionDrafts, setCommissionDrafts] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);

    const { data: agentsData } = await supabase
      .from("agents")
      .select(`
        id,
        profile_id,
        company_name,
        active,
        commission_rate_l1,
        profiles:profiles (
          full_name,
          country,
          email,
          phone
        )
      `)
      .eq("tenant_id", profile.tenant_id);

    const transformed: AgentRecord[] =
      agentsData?.map((agent: any) => ({
        id: agent.id,
        profileId: agent.profile_id,
        name: agent.company_name || agent.profiles?.full_name || "Unnamed Agent",
        country: agent.profiles?.country || "Unknown",
        email: agent.profiles?.email ?? null,
        phone: agent.profiles?.phone ?? null,
        active: Boolean(agent.active),
        totalStudents: 0,
        applicationsSubmitted: 0,
        offersReceived: 0,
        enrolledStudents: 0,
        conversionRate: 0,
        revenueGenerated: 0,
        commissionRate: Number(agent.commission_rate_l1 ?? 0),
        commissionOwed: 0,
        commissionPaid: 0,
        complianceStatus: "green",
        lastActivityAt: null,
        referredStudents: [],
      })) ?? [];

    setAgents(transformed);

    setCommissionDrafts(
      Object.fromEntries(
        transformed.map((a) => [a.id, a.commissionRate.toFixed(2)])
      )
    );

    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInternalMessage = (agent: AgentRecord) => {
    navigate(`/dashboard/messages?contact=${encodeURIComponent(agent.profileId)}`);
  };

  const handleEmail = (agent: AgentRecord) => {
    if (!agent.email) {
      toast({
        title: "No email found",
        description: "This agent has no email on file.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = `mailto:${agent.email}`;
  };

  const handleWhatsApp = (agent: AgentRecord) => {
    const phone = normalizePhone(agent.phone);
    if (!phone) {
      toast({
        title: "Invalid phone",
        description: "No valid WhatsApp number found.",
        variant: "destructive",
      });
      return;
    }

    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleCommissionSave = async (agentId: string) => {
    const value = Number(commissionDrafts[agentId]);
    if (!Number.isFinite(value)) return;

    await supabase
      .from("agents")
      .update({ commission_rate_l1: value })
      .eq("id", agentId);

    toast({
      title: "Commission Updated",
      description: "New commission rate saved.",
    });

    fetchData();
  };

  const filteredAgents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
  }, [agents, searchQuery]);

  const monthlyApplications = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.applicationsSubmitted, 0),
    [agents],
  );

  const monthlyOffers = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.offersReceived, 0),
    [agents],
  );

  const monthlyEnrollments = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.enrolledStudents, 0),
    [agents],
  );

  const agentsWithStudents = useMemo(
    () => agents.filter((agent) => agent.totalStudents > 0).length,
    [agents],
  );

  const totalStudents = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.totalStudents, 0),
    [agents],
  );

  const totalCommissionOwed = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.commissionOwed, 0),
    [agents],
  );

  const totalCommissionPaid = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.commissionPaid, 0),
    [agents],
  );

  const attentionCount = useMemo(
    () => agents.filter((agent) => agent.complianceStatus !== "green").length,
    [agents],
  );

  const metricCards = [
    { label: "Total active agents", value: agents.filter((agent) => agent.active).length },
    { label: "Agents with active students", value: agentsWithStudents },
    { label: "Total students from agents", value: totalStudents },
    { label: "This month applications", value: monthlyApplications },
    { label: "This month offers", value: monthlyOffers },
    { label: "This month enrolments", value: monthlyEnrollments },
    { label: "Commission owed (this month)", value: formatCurrency(totalCommissionOwed) },
    { label: "Commission paid (this month)", value: formatCurrency(totalCommissionPaid) },
    { label: "Agents requiring attention", value: attentionCount },
  ];

  const performanceBadges = [
    { label: "All" },
    { label: "High Performers", icon: <Circle className="h-3.5 w-3.5 fill-blue-500 text-blue-500" /> },
    { label: "Medium Performers", icon: <Circle className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> },
    { label: "Low Performers", icon: <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" /> },
    { label: "At Risk", icon: <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> },
    { label: "Pending Approval", icon: <Hourglass className="h-3.5 w-3.5 text-amber-300" /> },
    { label: "High Revenue", icon: <Coins className="h-3.5 w-3.5 text-emerald-300" /> },
    { label: "Declining Performance", icon: <TrendingDown className="h-3.5 w-3.5 text-sky-300" /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Agency Network Control Panel</h1>
          <p className="text-muted-foreground">
            Revenue, conversion, compliance, and intervention command centre.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
          Invite Agency
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-3">
              <CardDescription className="uppercase text-xs tracking-widest">{card.label}</CardDescription>
              <CardTitle className="text-4xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> 0%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Table</CardTitle>
          <CardDescription>
            Use this table to monitor conversion, financial risk, compliance, and direct actions in one view.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            {performanceBadges.map((badge, index) => (
              <Badge
                key={badge.label}
                variant={index === 0 ? "default" : "outline"}
                className="px-4 py-1.5 rounded-full text-base font-normal gap-2"
              >
                {badge.icon}
                {badge.label}
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Search agent, country, or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Commission Owed</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>{agent.name}</TableCell>
                    <TableCell>{agent.country}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={commissionDrafts[agent.id]}
                          onChange={(e) =>
                            setCommissionDrafts((c) => ({
                              ...c,
                              [agent.id]: e.target.value,
                            }))
                          }
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCommissionSave(agent.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(agent.commissionOwed)}</TableCell>
                    <TableCell>{formatCurrency(agent.revenueGenerated)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleInternalMessage(agent)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Internal Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmail(agent)}>
                            <Send className="mr-2 h-4 w-4" />
                            Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleWhatsApp(agent)}>
                            <Send className="mr-2 h-4 w-4" />
                            WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteAgencyDialog
        tenantId={profile?.tenant_id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default AdminAgents;
