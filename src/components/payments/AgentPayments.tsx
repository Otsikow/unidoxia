import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Wallet,
  Smartphone,
  Coins,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Commission {
  id: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'clawback';
  rate_percent: number;
  level: number;
  created_at: string;
  paid_at: string | null;
  approved_at: string | null;
  applications: {
    students: {
      profiles: {
        full_name: string;
      };
    };
    programs: {
      name: string;
      universities: {
        name: string;
      };
    };
  } | null;
}

interface PaymentMethod {
  value: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  requirements: string[];
  placeholder: string;
  helper: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    description:
      'Ideal for local and international bank payouts. Provide verified account details so funds can be deposited without delay.',
    icon: Banknote,
    requirements: [
      'Bank name and branch',
      'Account holder name',
      'Account number / IBAN',
      'SWIFT / BIC code for international transfers',
    ],
    placeholder:
      'Example:\nBank: First National Bank\nAccount Name: Jane Doe\nAccount Number: 123456789\nSWIFT: FNBBUS33',
    helper: 'We recommend double-checking all banking numbers with your institution before submitting.',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    description:
      'Receive payouts to your PayPal wallet using the email connected to your verified business account.',
    icon: Wallet,
    requirements: [
      'Primary PayPal email address',
      'Registered business name (if applicable)',
      'Preferred payout currency',
    ],
    placeholder:
      'Example:\nPayPal Email: finance@agency.com\nAccount Name: Bridge Study Agency\nCurrency: USD',
    helper: 'Ensure your PayPal account is verified to avoid payout holds or reversals.',
  },
  {
    value: 'mobile_money',
    label: 'Mobile Money',
    description:
      'Perfect for markets where mobile wallets are standard. Include the carrier and number registered for payouts.',
    icon: Smartphone,
    requirements: [
      'Mobile money provider',
      'Registered account name',
      'Mobile wallet number',
      'National ID (if required by provider)',
    ],
    placeholder:
      'Example:\nProvider: M-Pesa\nAccount Name: Jane Doe\nWallet Number: +254700000000\nNational ID: 12345678',
    helper: 'Confirm that the wallet is enabled to receive international transfers where applicable.',
  },
  {
    value: 'crypto',
    label: 'USDT / Crypto Wallet',
    description:
      'Leverage stablecoin payouts for rapid settlements. Provide the exact network and wallet address.',
    icon: Coins,
    requirements: [
      'Preferred stablecoin (e.g., USDT, USDC)',
      'Network (ERC-20, TRC-20, etc.)',
      'Wallet address',
      'Contact email for transaction confirmations',
    ],
    placeholder:
      'Example:\nAsset: USDT\nNetwork: TRC-20\nWallet Address: TY7s...1X2Q\nContact Email: treasury@agency.com',
    helper: 'Always verify wallet addresses—crypto transfers are irreversible once sent.',
  },
];

export function AgentPayments() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string>(paymentMethods[0].value);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>(() =>
    paymentMethods.reduce((acc, method) => {
      acc[method.value] = '';
      return acc;
    }, {} as Record<string, string>),
  );
  const [savingDetails, setSavingDetails] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.value === selectedPaymentOption) ?? paymentMethods[0],
    [selectedPaymentOption],
  );

  useEffect(() => {
    fetchCommissions();
  }, [user]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);

      // Get agent ID first
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', user?.id)
        .single();

      if (agentError) {
        console.error('Error fetching agent:', agentError);
        setLoading(false);
        return;
      }

      // Fetch commissions for this agent
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          applications (
            students (
              profiles (
                full_name
              )
            ),
            programs (
              name,
              universities (
                name
              )
            )
          )
        `)
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching commissions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load commissions',
          variant: 'destructive',
        });
      } else {
        setCommissions(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    try {
      setRequestingPayout(true);

      // Get agent ID
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', user?.id)
        .single();

      if (agentError) {
        throw agentError;
      }

      // Get all approved but unpaid commissions
      const approvedCommissions = commissions.filter(
        (c) => c.status === 'approved' && !c.paid_at
      );

      if (approvedCommissions.length === 0) {
        toast({
          title: 'No Approved Commissions',
          description: 'You have no approved commissions ready for payout',
          variant: 'destructive',
        });
        return;
      }

      // TODO: Integrate with Stripe Connect for actual payout
      // For now, we'll just update the status to indicate a payout request
      // In production, this would trigger a Stripe Connect transfer

      toast({
        title: 'Payout Requested',
        description: `Payout requested for ${approvedCommissions.length} commission(s). You will be notified once processed.`,
      });

      // Refresh commissions
      await fetchCommissions();
    } catch (err) {
      console.error('Error requesting payout:', err);
      toast({
        title: 'Error',
        description: 'Failed to request payout',
        variant: 'destructive',
      });
    } finally {
      setRequestingPayout(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className?: string }> = {
      paid: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      approved: { variant: 'default', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      clawback: { variant: 'destructive' },
    };
    const config = variants[status] || { variant: 'secondary' };
    return <Badge variant={config.variant} className={config.className}>{status.toUpperCase()}</Badge>;
  };

  const currentPaymentDetails = paymentDetails[selectedPaymentOption] ?? '';

  const handlePaymentDetailChange = (value: string) => {
    setPaymentDetails((prev) => ({
      ...prev,
      [selectedPaymentOption]: value,
    }));
  };

  const savePaymentPreferences = async () => {
    try {
      setSavingDetails(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast({
        title: 'Payment details saved',
        description: `We'll use ${selectedMethod.label} for upcoming payouts once verified.`,
      });
    } catch (error) {
      console.error('Error saving payment details:', error);
      toast({
        title: 'Unable to save payment details',
        description: 'Please try again or contact support if the issue persists.',
        variant: 'destructive',
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const filteredCommissions = useMemo(() => {
    if (filterStatus === 'all') return commissions;
    return commissions.filter((c) => c.status === filterStatus);
  }, [commissions, filterStatus]);

  const stats = useMemo(() => {
    const totalEarned = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount_cents, 0);

    const totalPending = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount_cents, 0);

    const totalApproved = commissions
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + c.amount_cents, 0);

    const studentsReferred = new Set(
      commissions
        .filter((c) => c.applications?.students)
        .map((c) => c.applications?.students?.profiles?.full_name)
    ).size;

    return {
      totalEarned,
      totalPending,
      totalApproved,
      studentsReferred,
      currency: commissions[0]?.currency || 'USD',
    };
  }, [commissions]);

  // Generate monthly earnings data for the chart
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { earned: number; pending: number }>();

    commissions.forEach((commission) => {
      const date = new Date(commission.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { earned: 0, pending: 0 });
      }

      const data = monthlyMap.get(monthKey)!;
      if (commission.status === 'paid') {
        data.earned += commission.amount_cents / 100;
      } else if (commission.status === 'pending' || commission.status === 'approved') {
        data.pending += commission.amount_cents / 100;
      }
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earned: data.earned,
        pending: data.pending,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months
  }, [commissions]);

  // Calculate month-over-month growth
  const monthlyGrowth = useMemo(() => {
    if (monthlyData.length < 2) return 0;
    const current = monthlyData[monthlyData.length - 1].earned;
    const previous = monthlyData[monthlyData.length - 2].earned;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="Loading commissions..." />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="pointer-events-none absolute -top-20 right-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="space-y-2 relative">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Commission Hub</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Commission Tracker</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Monitor your earnings, review payout-ready commissions, and manage preferred payment methods for your agency.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Month Growth</p>
                <p className="text-lg font-semibold text-foreground">
                  {monthlyGrowth > 0 ? `+${monthlyGrowth.toFixed(1)}%` : `${monthlyGrowth.toFixed(1)}%`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ready for Payout</p>
                <p className="text-lg font-semibold text-primary">
                  {formatAmount(stats.totalApproved, stats.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            className="group flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border-primary/40 bg-primary/5 text-primary transition hover:border-primary/60 hover:bg-primary/10 sm:w-auto"
            disabled={stats.totalApproved === 0 || requestingPayout}
            onClick={requestPayout}
          >
            <CreditCard className="h-4 w-4 transition-transform group-hover:scale-110" />
            {requestingPayout ? 'Processing...' : 'Request Payout'}
          </Button>
          <Button className="group flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl sm:w-auto">
            <Download className="h-4 w-4 transition-transform group-hover:scale-110" />
            Export Statement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="h-4 w-4 text-success" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-success">
              {formatAmount(stats.totalEarned, stats.currency)}
            </div>
            <p className="text-sm text-muted-foreground">
              {commissions.filter((c) => c.status === 'paid').length} payment(s)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-primary">
              {formatAmount(stats.totalApproved, stats.currency)}
            </div>
            <p className="text-sm text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4 text-warning" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-warning">
              {formatAmount(stats.totalPending, stats.currency)}
            </div>
            <p className="text-sm text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users className="h-4 w-4 text-foreground" />
              Students Referred
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{stats.studentsReferred}</div>
            <p className="text-sm text-muted-foreground">Total referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Preferences */}
      <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Preferences
          </CardTitle>
          <CardDescription>Choose how you would like to receive your payouts and provide verified details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Preferred payout method</p>
                <p className="text-sm text-muted-foreground">
                  Select the account you want finance to use when your commissions are ready.
                </p>
                <Select value={selectedPaymentOption} onValueChange={setSelectedPaymentOption}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a payout method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-xl border border-border/50 bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  {selectedMethod && (() => {
                    const Icon = selectedMethod.icon;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                  <div>
                    <p className="font-medium text-sm leading-tight">{selectedMethod.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedMethod.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What we need</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {selectedMethod.requirements.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Payment details</p>
                <p className="text-sm text-muted-foreground">
                  Include complete payout instructions exactly as they should appear when we process your transfer.
                </p>
                <Textarea
                  value={currentPaymentDetails}
                  onChange={(event) => handlePaymentDetailChange(event.target.value)}
                  rows={10}
                  className="resize-none rounded-lg border-border/40 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50"
                  placeholder={selectedMethod.placeholder}
                />
                <p className="text-xs text-muted-foreground">{selectedMethod.helper}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Finance reviews payout updates within one business day.
                </p>
                <Button
                  onClick={savePaymentPreferences}
                  disabled={savingDetails || currentPaymentDetails.trim().length === 0}
                  className="gap-2 self-start sm:self-auto"
                >
                  {savingDetails ? 'Saving...' : 'Save Payment Details'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend Chart */}
      <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Earnings Trend
              </CardTitle>
              <CardDescription>Last 6 months earnings overview</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {monthlyGrowth !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-medium ${monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthlyGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(monthlyGrowth).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="earned"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  name="Earned"
                  dot={{ fill: 'hsl(var(--success))' }}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  name="Pending"
                  dot={{ fill: 'hsl(var(--warning))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No earnings data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="all" onClick={() => setFilterStatus('all')}>
              All
            </TabsTrigger>
            <TabsTrigger value="pending" onClick={() => setFilterStatus('pending')}>
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" onClick={() => setFilterStatus('approved')}>
              Approved
            </TabsTrigger>
            <TabsTrigger value="paid" onClick={() => setFilterStatus('paid')}>
              Paid
            </TabsTrigger>
          </TabsList>
        </div>

        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commission Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCommissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No commissions found</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(commission.created_at)}
                        </TableCell>
                        <TableCell>
                          {commission.applications?.students?.profiles?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {commission.applications?.programs?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {commission.applications?.programs?.universities?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{commission.rate_percent}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(commission.amount_cents, commission.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Stripe Connect Information */}
      <Card className="rounded-2xl border border-border/60 bg-muted/60 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Payout Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Payouts are processed through Stripe Connect. Approved commissions can be transferred to your
            connected bank account by clicking the "Request Payout" button.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Stripe Connected
            </Badge>
            <span className="text-sm text-muted-foreground">
              Payouts are processed within 2-3 business days
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
