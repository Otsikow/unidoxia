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
  Loader2,
  MessageSquare,
  MoreVertical,
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

  return (
    <div className="space-y-6 pb-10">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Agency Network Control Panel</h1>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <Users className="h-4 w-4 mr-2" />
          Invite Agency
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
          <CardDescription>Monitor agencies and manage commission.</CardDescription>
          <Input
            placeholder="Search agent or country"
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