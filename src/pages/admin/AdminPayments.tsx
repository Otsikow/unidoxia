import { formatUkDate } from '@/lib/dateFormat';
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  CalendarRange,
  Download,
  DollarSign,
  GraduationCap,
  Layers3,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

const agentCommissionData = [
  {
    id: "acct_1ABC",
    name: "Global Pathways Agency",
    email: "finance@globalpathways.io",
    total: 56200,
    pending: 11800,
    paid: 44400,
    lastPayout: "2024-05-15T14:00:00Z",
    status: "active" as const,
    nextPayout: "2024-05-22T14:00:00Z",
  },
  {
    id: "acct_2DEF",
    name: "Scholars Connect",
    email: "revenue@scholarsconnect.com",
    total: 48950,
    pending: 9200,
    paid: 39750,
    lastPayout: "2024-05-12T10:30:00Z",
    status: "active" as const,
    nextPayout: "2024-05-19T10:30:00Z",
  },
  {
    id: "acct_3GHI",
    name: "EduBridge Africa",
    email: "finance@edubridge.africa",
    total: 33600,
    pending: 7400,
    paid: 26200,
    lastPayout: "2024-04-30T09:00:00Z",
    status: "review" as const,
    nextPayout: "2024-05-24T09:00:00Z",
  },
  {
    id: "acct_4JKL",
    name: "Premier Student Advisors",
    email: "finance@premieradvisors.org",
    total: 27800,
    pending: 4200,
    paid: 23600,
    lastPayout: "2024-05-08T16:45:00Z",
    status: "active" as const,
    nextPayout: "2024-05-21T16:45:00Z",
  },
];

const universityPayouts = [
  {
    id: "po_1",
    university: "Oxford International College",
    amount: 125000,
    status: "Paid",
    payoutDate: "2024-05-16T09:15:00Z",
    invoiceUrl: "https://dashboard.stripe.com/invoices/inv_0001",
    contact: "treasury@oxfordintcollege.ac.uk",
  },
  {
    id: "po_1b",
    university: "Pineapple University",
    amount: 96800,
    status: "Scheduled",
    payoutDate: "2024-05-22T10:30:00Z",
    invoiceUrl: "https://dashboard.stripe.com/invoices/inv_pineapple",
    contact: "finance@pineapple.university",
  },
  {
    id: "po_2",
    university: "Toronto Metropolitan University",
    amount: 98650,
    status: "Scheduled",
    payoutDate: "2024-05-20T11:00:00Z",
    invoiceUrl: "https://dashboard.stripe.com/invoices/inv_0002",
    contact: "finance@torontomu.ca",
  },
  {
    id: "po_3",
    university: "University of Melbourne",
    amount: 143200,
    status: "Processing",
    payoutDate: "2024-05-18T13:30:00Z",
    invoiceUrl: "https://dashboard.stripe.com/invoices/inv_0003",
    contact: "accounts@unimelb.edu.au",
  },
  {
    id: "po_4",
    university: "King's College London",
    amount: 112400,
    status: "Paid",
    payoutDate: "2024-05-10T08:45:00Z",
    invoiceUrl: "https://dashboard.stripe.com/invoices/inv_0004",
    contact: "bursar@kcl.ac.uk",
  },
];

const transactionLog = [
  {
    id: "txn_1",
    user: "Oxford International College",
    amount: 125000,
    type: "university_payout",
    status: "paid",
    date: "2024-05-16T09:15:00Z",
  },
  {
    id: "txn_1b",
    user: "Pineapple University",
    amount: 96800,
    type: "university_payout",
    status: "scheduled",
    date: "2024-05-22T10:30:00Z",
  },
  {
    id: "txn_2",
    user: "Global Pathways Agency",
    amount: 6400,
    type: "agent_commission",
    status: "paid",
    date: "2024-05-15T14:00:00Z",
  },
  {
    id: "txn_3",
    user: "Toronto Metropolitan University",
    amount: 98650,
    type: "university_payout",
    status: "scheduled",
    date: "2024-05-20T11:00:00Z",
  },
  {
    id: "txn_4",
    user: "EduBridge Africa",
    amount: 4200,
    type: "agent_commission",
    status: "pending",
    date: "2024-05-18T09:30:00Z",
  },
  {
    id: "txn_5",
    user: "Platform Fees",
    amount: 12800,
    type: "platform_fee",
    status: "captured",
    date: "2024-05-17T18:10:00Z",
  },
  {
    id: "txn_6",
    user: "King's College London",
    amount: 112400,
    type: "university_payout",
    status: "paid",
    date: "2024-05-10T08:45:00Z",
  },
  {
    id: "txn_7",
    user: "Premier Student Advisors",
    amount: 4200,
    type: "agent_commission",
    status: "paid",
    date: "2024-05-08T16:45:00Z",
  },
  {
    id: "txn_8",
    user: "Stripe Processing Fees",
    amount: 3150,
    type: "platform_fee",
    status: "captured",
    date: "2024-05-14T07:20:00Z",
  },
  {
    id: "txn_9",
    user: "University Fees",
    amount: 198400,
    type: "university_fee",
    status: "settled",
    date: "2024-05-13T12:05:00Z",
  },
  {
    id: "txn_10",
    user: "Scholars Connect",
    amount: 9200,
    type: "agent_commission",
    status: "pending",
    date: "2024-05-19T10:30:00Z",
  },
];

const stripeBalance = {
  available: 82450,
  pending: 19800,
  currency: "USD",
  instantPayoutEligible: true,
  lastUpdated: "2024-05-18T10:30:00Z",
  nextPayout: "2024-05-20T15:00:00Z",
};

const rangeOptions: Record<string, () => Date> = {
  "7d": () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  },
  "30d": () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  },
  "90d": () => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date;
  },
  ytd: () => new Date(new Date().getFullYear(), 0, 1),
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDate = (value: string) =>
  formatUkDate(value);

const AdminPayments = () => {
  const [dateRange, setDateRange] = useState<keyof typeof rangeOptions>("30d");

  const selectedRangeStart = useMemo(() => {
    const startFactory = rangeOptions[dateRange];
    return startFactory ? startFactory() : new Date(0);
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    return transactionLog.filter((transaction) => new Date(transaction.date) >= selectedRangeStart);
  }, [selectedRangeStart]);

  const filteredAgents = useMemo(() => {
    return agentCommissionData.filter((agent) => new Date(agent.lastPayout) >= selectedRangeStart);
  }, [selectedRangeStart]);

  const filteredPayouts = useMemo(() => {
    return universityPayouts.filter((payout) => new Date(payout.payoutDate) >= selectedRangeStart);
  }, [selectedRangeStart]);

  const financeKpis = useMemo(() => {
    const payoutsTotal = filteredTransactions
      .filter((transaction) => transaction.type === "university_payout" || transaction.type === "agent_commission")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalFees = filteredTransactions
      .filter((transaction) => transaction.type === "university_fee")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const platformRevenue = filteredTransactions
      .filter((transaction) => transaction.type === "platform_fee")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const pendingCommissions = filteredAgents.reduce((sum, agent) => sum + agent.pending, 0);

    return {
      payoutsTotal,
      totalFees,
      platformRevenue,
      pendingCommissions,
    };
  }, [filteredAgents, filteredTransactions]);

  const handleExportCsv = () => {
    if (typeof window === "undefined") return;

    const headers = ["Transaction ID", "User", "Amount (USD)", "Type", "Status", "Date"];
    const rows = filteredTransactions.map((transaction) => [
      transaction.id,
      transaction.user,
      transaction.amount.toFixed(2),
      transaction.type,
      transaction.status,
      new Date(transaction.date).toISOString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((value) => `"${value}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `finance-transactions-${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "captured":
      case "settled":
        return "secondary" as const;
      case "processing":
      case "scheduled":
        return "outline" as const;
      case "pending":
      case "review":
        return "default" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="page-header">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Finance &amp; Stripe payouts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monitor platform revenue, university remittances, and agent commissions pulled from live Stripe balances.
          </p>
        </div>
        <div className="page-header-actions w-full sm:w-auto">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
            <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as keyof typeof rangeOptions)}>
              <SelectTrigger className="w-[120px] sm:w-[140px] border-none bg-transparent p-0 text-xs sm:text-sm shadow-none">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            <span className="sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total payouts</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-semibold">{formatCurrency(financeKpis.payoutsTotal)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Agent + university payouts via Stripe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-semibold">{formatCurrency(financeKpis.pendingCommissions)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Awaiting agent release</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Uni fees</CardTitle>
            <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-semibold">{formatCurrency(financeKpis.totalFees)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Cleared payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-semibold">{formatCurrency(financeKpis.platformRevenue)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Platform fees retained</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full gap-1 sm:gap-2 grid-cols-3 h-auto p-1">
          <TabsTrigger value="agents" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2"><span className="hidden sm:inline">Agent </span>Commissions</TabsTrigger>
          <TabsTrigger value="universities" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2"><span className="hidden sm:inline">University </span>Payouts</TabsTrigger>
          <TabsTrigger value="platform" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">Platform<span className="hidden sm:inline"> Summary</span></TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent commission ledger</CardTitle>
              <CardDescription>
                Aggregated from Stripe Connect balances with payout forecasting for upcoming releases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Stripe account</TableHead>
                    <TableHead className="text-right">Total earned</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Paid out</TableHead>
                    <TableHead className="text-right">Last payout</TableHead>
                    <TableHead className="text-right">Next payout</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.email}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{agent.id}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(agent.total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(agent.pending)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(agent.paid)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatDate(agent.lastPayout)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatDate(agent.nextPayout)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusBadgeVariant(agent.status)} className="justify-end">
                          {agent.status === "active" ? "Active" : "Under review"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        No commission activity inside this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="universities">
          <Card>
            <CardHeader>
              <CardTitle>University payout pipeline</CardTitle>
              <CardDescription>Stripe payout batches with invoice links for bursar reconciliation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Payout date</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div className="font-medium">{payout.university}</div>
                        <div className="text-xs text-muted-foreground">{payout.contact}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(payout.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(payout.status)}>{payout.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatDate(payout.payoutDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" className="h-auto px-0 text-xs text-primary">
                          <a href={payout.invoiceUrl} target="_blank" rel="noreferrer">
                            View invoice
                            <ExternalLink className="ml-1 inline h-3 w-3" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPayouts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No university payouts scheduled for the selected range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stripe balance summary</CardTitle>
                <CardDescription>Realtime balances pulled from Stripe&apos;s reporting API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Available</p>
                    <p className="text-lg font-semibold">{formatCurrency(stripeBalance.available)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Pending</p>
                    <p className="text-lg font-semibold">{formatCurrency(stripeBalance.pending)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Currency</p>
                    <p className="text-lg font-semibold">{stripeBalance.currency}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Next payout</p>
                    <p className="text-lg font-semibold">{formatDate(stripeBalance.nextPayout)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Layers3 className="h-4 w-4" />
                  Last synced {formatDate(stripeBalance.lastUpdated)} · Instant payouts {stripeBalance.instantPayoutEligible ? "enabled" : "disabled"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Platform performance</CardTitle>
                <CardDescription>Transaction mix &amp; settlement health.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span>Total transactions</span>
                    <span className="font-semibold">{filteredTransactions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average transaction size</span>
                    <span className="font-semibold">{formatCurrency(1380)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dispute rate</span>
                    <span className="font-semibold">0.4%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Refund volume</span>
                    <span className="font-semibold">{formatCurrency(5400)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Settlement reconciliation is sourced from Stripe reports and normalized against internal ledger balances to highlight gaps early.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Transaction log</CardTitle>
          <CardDescription>
            Detailed activity feed of payouts, commissions, and platform fees filtered by the selected reporting window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{transaction.user}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell className="capitalize">{transaction.type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(transaction.status)}>{transaction.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatDate(transaction.date)}</TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No transactions fall within the selected date range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
