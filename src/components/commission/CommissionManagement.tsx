import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp, 
  Users, 
  Calendar,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/LoadingState';

interface Commission {
  id: string;
  amount_cents: number;
  currency: string | null;
  status: 'pending' | 'approved' | 'paid' | 'clawback';
  created_at: string | null;
  paid_at: string | null;
  rate_percent: number;
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

export default function CommissionManagement() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [agentNotFound, setAgentNotFound] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchCommissions = useCallback(async () => {
    // Reset state
    setAgentNotFound(false);
    
    try {
      setLoading(true);

      // First try to get the agent record
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      // Handle case where user is not an agent (no error, just no data)
      if (!agentData) {
        // Check if it's a "no rows" situation vs an actual error
        if (agentError && agentError.code !== 'PGRST116') {
          // This is an actual database error, not just "no rows found"
          console.error('Error fetching agent record:', agentError);
          toast({
            title: 'Unable to load commissions',
            description: 'There was an error accessing your agent profile.',
            variant: 'destructive'
          });
        }
        // User is not an agent - this is expected for non-agent users
        setAgentNotFound(true);
        setCommissions([]);
        return;
      }

      // Fetch commissions for this agent with related data
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          applications (
            students (
              profiles!students_profile_id_fkey (
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
          title: 'Unable to load commissions',
          description: 'Real-time commission data could not be retrieved.',
          variant: 'destructive'
        });
        setCommissions([]);
        return;
      }

      setCommissions(data || []);
    } catch (err) {
      console.error('Error loading commission data', err);
      toast({
        title: 'Unable to load commissions',
        description: 'An unexpected error occurred while loading commission data.',
        variant: 'destructive'
      });
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setCommissions([]);
      return;
    }
    void fetchCommissions();
  }, [fetchCommissions, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const agentName = user?.user_metadata?.full_name || 'You';

  const filteredCommissions = commissions.filter(commission => {
    if (filterStatus !== 'all' && commission.status !== filterStatus) return false;
    if (filterAgent !== 'all' && filterAgent !== agentName) return false;
    return true;
  });

  const { totalCommissions, pendingCommissions, paidCommissions } = useMemo(() => {
    const totals = filteredCommissions.reduce(
      (acc, commission) => {
        acc.totalCommissions += commission.amount_cents;
        if (commission.status === 'pending' || commission.status === 'approved') acc.pendingCommissions += 1;
        if (commission.status === 'paid') acc.paidCommissions += 1;
        return acc;
      },
      { totalCommissions: 0, pendingCommissions: 0, paidCommissions: 0 }
    );

    return totals;
  }, [filteredCommissions]);
  const agentCount = user ? 1 : 0;

  if (loading) {
    return <LoadingState message="Fetching your latest commission activity" />;
  }

  // If user is not an agent, show appropriate message
  if (agentNotFound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Commission Management
            </h2>
            <p className="text-muted-foreground">Track and manage agent commissions</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Agent profile required</AlertTitle>
              <AlertDescription>
                Commission management is available for registered agents. If you believe this is an error, please contact support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Commission Management
          </h2>
          <p className="text-muted-foreground">Track and manage agent commissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
                <p className="text-2xl font-bold">${(totalCommissions / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCommissions}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{paidCommissions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agents</p>
                <p className="text-2xl font-bold">{agentCount}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Commission Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="clawback">Clawback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select value={filterAgent} onValueChange={setFilterAgent}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      <SelectItem value={agentName}>{agentName}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commissions List */}
          <div className="space-y-4">
            {filteredCommissions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No commissions to show</AlertTitle>
                <AlertDescription>
                  Adjust your filters or check back when new enrollments are approved.
                </AlertDescription>
              </Alert>
            ) : (
              filteredCommissions.map((commission) => (
                <Card key={commission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agentName}</h3>
                          <Badge className={getStatusColor(commission.status)}>
                            {commission.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Student: {commission.applications?.students?.profiles?.full_name ?? 'Student name unavailable'} • {commission.applications?.programs?.name ?? 'Course'} at {commission.applications?.programs?.universities?.name ?? 'University'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Date: {commission.created_at ? new Date(commission.created_at).toLocaleDateString() : 'Not available'}</span>
                          <span>Rate: {commission.rate_percent}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${(commission.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-sm text-muted-foreground">Commission</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Details</CardTitle>
              <CardDescription>
                Detailed view of all commission transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCommissions.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No commission records</AlertTitle>
                    <AlertDescription>Commission transaction history will appear once available.</AlertDescription>
                  </Alert>
                ) : (
                  filteredCommissions.map((commission) => (
                    <div key={commission.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Agent</p>
                          <p className="font-semibold">{agentName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Student</p>
                          <p className="font-semibold">{commission.applications?.students?.profiles?.full_name ?? 'Student name unavailable'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Course</p>
                          <p className="font-semibold">{commission.applications?.programs?.name ?? 'Course'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Amount</p>
                          <p className="font-semibold">${(commission.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(commission.status)}>
                            {commission.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {commission.rate_percent}% commission rate
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                          {commission.status === 'pending' && (
                            <Button size="sm">
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
