"use client";

import { useEffect, useMemo, useState, Suspense, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  Bot,
  Building2,
  CalendarRange,
  CheckCircle2,
  CheckSquare,
  FileText,
  Filter,
  LineChart,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import BackButton from "@/components/BackButton";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format, isSameMonth, isValid } from "date-fns";
import { formatErrorForToast, logError } from "@/lib/errorUtils";
import StaffStudentsTable from "@/components/staff/StaffStudentsTable";
import StaffAgentsLeaderboard from "@/components/staff/StaffAgentsLeaderboard";
import StaffMessagesTable from "@/components/staff/StaffMessagesTable";
import StaffTasksBoard from "@/components/staff/StaffTasksBoard";
import StaffZoeInsightsTab from "@/components/staff/StaffZoeInsightsTab";
import { StaffTaskComposerProvider } from "@/components/staff/StaffTaskComposerProvider";
import { useStaffStudents } from "@/hooks/useStaffData";

const applicationProgressData = [
  { status: "Submitted", value: 12 },
  { status: "Screening", value: 9 },
  { status: "Documents", value: 7 },
  { status: "Offer", value: 6 },
  { status: "Visa", value: 4 },
  { status: "Enrolled", value: 3 },
];

const dailyActivityTrendData = [
  { day: "Mon", tasks: 9, approvals: 2 },
  { day: "Tue", tasks: 12, approvals: 3 },
  { day: "Wed", tasks: 10, approvals: 3 },
  { day: "Thu", tasks: 14, approvals: 4 },
  { day: "Fri", tasks: 11, approvals: 3 },
  { day: "Sat", tasks: 6, approvals: 1 },
  { day: "Sun", tasks: 5, approvals: 1 },
];

const chartTooltipStyles = {
  content: {
    background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--accent)) 100%)",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    color: "hsl(var(--card-foreground))",
    boxShadow: "0 12px 30px hsl(var(--foreground) / 0.12)",
    padding: "0.75rem",
  } satisfies CSSProperties,
  label: {
    color: "hsl(var(--primary))",
    fontWeight: 600,
    fontSize: "0.85rem",
    letterSpacing: "0.01em",
  } satisfies CSSProperties,
  item: {
    color: "hsl(var(--card-foreground))",
    fontWeight: 500,
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  } satisfies CSSProperties,
  wrapper: {
    outline: "none",
  } satisfies CSSProperties,
};

const quickLinks = [
  { label: "My Students", description: "Review assigned cases", to: "/dashboard/students", icon: Users },
  { label: "My Tasks", description: "Update progress", to: "/dashboard/tasks", icon: CheckSquare },
  { label: "My Agents", description: "Coordinate with partners", to: "/dashboard/agents", icon: Building2 },
];

type CommissionWithRelations = Tables<"commissions"> & {
  agents?: { profiles?: { full_name: string | null } | null } | null;
  applications?: { students?: { profiles?: { full_name: string | null } | null } | null } | null;
};

type CommissionPayment = Tables<"payments"> & { metadata: Record<string, unknown> | null };

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [updatingCommissionId, setUpdatingCommissionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch actual student count from the database
  const { data: studentsData } = useStaffStudents(1);
  const studentCount = studentsData?.total ?? 0;

  const personalOverviewKpis = useMemo(
    () => [
      {
        title: "Students Assigned",
        value: String(studentCount),
        description: "Total students in system",
        icon: Users,
        to: "/dashboard/students",
      },
      {
        title: "Applications Processed",
        value: "18",
        description: "Completed in the last 7 days",
        icon: FileText,
        trend: { value: 8, isPositive: true },
        to: "/dashboard/applications",
      },
      {
        title: "Tasks Pending",
        value: "7",
        description: "2 flagged as urgent",
        icon: CheckSquare,
        trend: { value: 5, isPositive: false },
        to: "/dashboard/tasks",
      },
      {
        title: "Approvals Today",
        value: "5",
        description: "Across student finances",
        icon: AlarmClock,
        trend: { value: 3, isPositive: true },
        to: "/dashboard/payments",
      },
    ],
    [studentCount],
  );

  const financeQuery = useQuery({
    queryKey: ["staff-dashboard", "finance"],
    queryFn: async (): Promise<{ commissions: CommissionWithRelations[]; payments: CommissionPayment[] }> => {
      const [commissionsResult, paymentsResult] = await Promise.all([
        supabase.from("commissions").select(`*, agents:agents ( profiles:profiles ( full_name ) ), applications:applications ( students:students ( profiles:profiles ( full_name ) ) )`).order("created_at", { ascending: false }),
        // @ts-expect-error - commission_payout type not in enum
        supabase.from("payments").select("id, amount_cents, currency, status, created_at, metadata, purpose, application_id").eq("purpose", "commission_payout").order("created_at", { ascending: false }),
      ]);

      if (commissionsResult.error) throw commissionsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      return {
        commissions: (commissionsResult.data ?? []) as CommissionWithRelations[],
        payments: (paymentsResult.data ?? []) as CommissionPayment[],
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const allCommissionRows = useMemo(() => {
    if (!financeQuery.data) return [];
    const paymentByCommissionId = new Map<string, CommissionPayment>();

    financeQuery.data.payments.forEach((payment) => {
      const metadata = payment.metadata as Record<string, unknown> | null;
      const commissionId = metadata?.commission_id as string | null;
      if (commissionId) paymentByCommissionId.set(commissionId, payment);
    });

    return financeQuery.data.commissions.map((c) => {
      const p = paymentByCommissionId.get(c.id);
      const payoutStatus = c.status === "paid" || p?.status === "succeeded" ? "paid" : "pending";
      return {
        id: c.id,
        agentName: c.agents?.profiles?.full_name ?? "Unassigned",
        studentName: c.applications?.students?.profiles?.full_name ?? "Student",
        ratePercent: c.rate_percent,
        amountCents: c.amount_cents,
        currency: c.currency ?? p?.currency ?? "USD",
        payoutStatus,
        createdAt: p?.created_at ?? c.created_at ?? null,
      };
    });
  }, [financeQuery.data]);

  const filteredCommissions =
    payoutStatusFilter === "all" ? allCommissionRows : allCommissionRows.filter((r) => r.payoutStatus === payoutStatusFilter);

  const handleMarkReviewed = async (id: string) => {
    try {
      setUpdatingCommissionId(id);
      const { error } = await supabase.from("commissions").update({ approved_at: new Date().toISOString(), status: "approved" }).eq("id", id);
      if (error) throw error;
      toast({ title: "Commission reviewed successfully" });
      queryClient.invalidateQueries({ queryKey: ["staff-dashboard", "finance"] });
    } catch (e) {
      logError(e, "markReviewed");
      toast(formatErrorForToast(e, "Failed to mark commission as reviewed"));
    } finally {
      setUpdatingCommissionId(null);
    }
  };

  const formatCurrency = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <StaffTaskComposerProvider>
        <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <BackButton fallback="/dashboard" label="Back" />
            <h1 className="text-3xl font-bold tracking-tight">Staff Command Centre</h1>
            <p className="text-sm text-muted-foreground">Manage operations and monitor commissions.</p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link to="/dashboard/ai-insights">
              <Sparkles className="h-5 w-5" /> Open AI Insights
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto rounded-lg border bg-background p-1">
            <TabsTrigger value="overview">🏠 Overview</TabsTrigger>
            <TabsTrigger value="students">🎓 Students</TabsTrigger>
            <TabsTrigger value="agents">🤝 Agents</TabsTrigger>
            <TabsTrigger value="tasks">📁 Tasks</TabsTrigger>
            <TabsTrigger value="payments">💸 Payments</TabsTrigger>
            <TabsTrigger value="ai">🧠 Zoe</TabsTrigger>
          </TabsList>

          {/* === Overview Tab === */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {personalOverviewKpis.map((stat) => (
                  <StatsCard key={stat.title} {...stat} />
                ))}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LineChart className="h-5 w-5 text-primary" /> Application Progress
                    </CardTitle>
                    <CardDescription>Status mix across assigned students.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={applicationProgressData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="status" tick={{ fill: "hsl(var(--foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--foreground))" }} />
                        <RechartsTooltip
                          contentStyle={chartTooltipStyles.content}
                          labelStyle={chartTooltipStyles.label}
                          itemStyle={chartTooltipStyles.item}
                          wrapperStyle={chartTooltipStyles.wrapper}
                        />
                        <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Activity</CardTitle>
                    <CardDescription>Tasks & Approvals (last 7 days)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={dailyActivityTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: "hsl(var(--foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--foreground))" }} />
                        <RechartsTooltip
                          contentStyle={chartTooltipStyles.content}
                          labelStyle={chartTooltipStyles.label}
                          itemStyle={chartTooltipStyles.item}
                          wrapperStyle={chartTooltipStyles.wrapper}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="tasks" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                        <Line type="monotone" dataKey="approvals" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* === Students === */}
          <TabsContent value="students">
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
              <StaffStudentsTable />
            </Suspense>
          </TabsContent>

          {/* === Agents === */}
          <TabsContent value="agents">
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
              <StaffAgentsLeaderboard />
            </Suspense>
          </TabsContent>

          {/* === Tasks === */}
          <TabsContent value="tasks">
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
              <StaffTasksBoard />
            </Suspense>
          </TabsContent>

          {/* === Payments === */}
          <TabsContent value="payments">
            <Card>
              <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Payments & Commissions
                  </CardTitle>
                  <CardDescription>Monitor payouts and monthly totals.</CardDescription>
                </div>
                <Select value={payoutStatusFilter} onValueChange={(v) => setPayoutStatusFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payouts</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Rate %</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financeQuery.isPending ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                          </TableCell>
                        </TableRow>
                      ) : filteredCommissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-4">
                            No commissions found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCommissions.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.agentName}</TableCell>
                            <TableCell>{row.studentName}</TableCell>
                            <TableCell>{row.ratePercent}%</TableCell>
                            <TableCell>{formatCurrency(row.amountCents, row.currency)}</TableCell>
                            <TableCell>
                              <Badge variant={row.payoutStatus === "paid" ? "secondary" : "outline"}>
                                {row.payoutStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updatingCommissionId === row.id}
                                onClick={() => handleMarkReviewed(row.id)}
                                className="gap-2"
                              >
                                {updatingCommissionId === row.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" /> Mark reviewed
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === Zoe === */}
          <TabsContent value="ai">
            <StaffZoeInsightsTab />
          </TabsContent>
        </Tabs>
        </div>
      </StaffTaskComposerProvider>
    </DashboardLayout>
  );
}
