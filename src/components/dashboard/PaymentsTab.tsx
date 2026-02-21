import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { Search, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  application_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  purpose: string;
  created_at: string;
  applications?: {
    students?: {
      profiles?: {
        full_name: string;
      };
    };
  };
}

interface Commission {
  id: string;
  application_id: string;
  agent_id: string;
  level: number;
  rate_percent: number;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  agents?: {
    profiles?: {
      full_name: string;
    };
  };
  applications?: {
    students?: {
      profiles?: {
        full_name: string;
      };
    };
  };
}

export default function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          application_id,
          amount_cents,
          currency,
          status,
          purpose,
          created_at,
          applications (
            students (
              profiles!students_profile_id_fkey (
                full_name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select(`
          id,
          application_id,
          agent_id,
          level,
          rate_percent,
          amount_cents,
          currency,
          status,
          created_at,
          agents (
            profiles (
              full_name
            )
          ),
          applications (
            students (
              profiles!students_profile_id_fkey (
                full_name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payments and commissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionStatusUpdate = async (commissionId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', commissionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Commission status updated successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error updating commission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update commission status',
        variant: 'destructive',
      });
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      pending: 'secondary',
      succeeded: 'default',
      failed: 'destructive',
      refunded: 'secondary',
    };
    return colors[status] || 'secondary';
  };

  const getCommissionStatusBadge = (status: string) => {
    const colors: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      pending: 'secondary',
      approved: 'default',
      paid: 'default',
      clawback: 'destructive',
    };
    return colors[status] || 'secondary';
  };

  const filteredPayments = payments.filter(
    (payment) =>
      (statusFilter === 'all' || payment.status === statusFilter) &&
      (!searchQuery ||
        payment.applications?.students?.profiles?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        payment.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCommissions = commissions.filter(
    (commission) =>
      (statusFilter === 'all' || commission.status === statusFilter) &&
      (!searchQuery ||
        commission.agents?.profiles?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        commission.applications?.students?.profiles?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  const totalPayments = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const totalCommissionsPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const totalCommissionsPending = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + c.amount_cents, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(totalPayments / 100).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions Paid</p>
                <p className="text-2xl font-bold">${(totalCommissionsPaid / 100).toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions Pending</p>
                <p className="text-2xl font-bold">${(totalCommissionsPending / 100).toLocaleString()}</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Payments and Commissions */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payments Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading payments...
                        </TableCell>
                      </TableRow>
                    ) : filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.applications?.students?.profiles?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.purpose.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.currency} ${(payment.amount_cents / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusBadge(payment.status)}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
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

        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commission Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search commissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="clawback">Clawback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Commissions Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading commissions...
                        </TableCell>
                      </TableRow>
                    ) : filteredCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No commissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {commission.agents?.profiles?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {commission.applications?.students?.profiles?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">L{commission.level}</Badge>
                          </TableCell>
                          <TableCell>{commission.rate_percent}%</TableCell>
                          <TableCell className="font-medium">
                            {commission.currency} ${(commission.amount_cents / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getCommissionStatusBadge(commission.status)}>
                              {commission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {commission.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleCommissionStatusUpdate(commission.id, 'approved')
                                  }
                                >
                                  Approve
                                </Button>
                              )}
                              {commission.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleCommissionStatusUpdate(commission.id, 'paid')
                                  }
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </div>
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
      </Tabs>
    </div>
  );
}
