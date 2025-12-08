import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Filter,
  Download,
  Plus
} from 'lucide-react';

interface Commission {
  id: string;
  agentName: string;
  studentName: string;
  program: string;
  university: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  date: string;
  commissionRate: number;
}

const mockCommissions: Commission[] = [
  {
    id: '1',
    agentName: 'John Smith',
    studentName: 'Alice Johnson',
    program: 'MSc Computer Science',
    university: 'University of Toronto',
    amount: 2500,
    status: 'approved',
    date: '2024-01-15',
    commissionRate: 5
  },
  {
    id: '2',
    agentName: 'Jane Doe',
    studentName: 'Bob Wilson',
    program: 'MBA',
    university: 'Harvard University',
    amount: 5000,
    status: 'pending',
    date: '2024-01-20',
    commissionRate: 8
  },
  {
    id: '3',
    agentName: 'Mike Johnson',
    studentName: 'Sarah Davis',
    program: 'MA International Business',
    university: 'University of Oxford',
    amount: 3000,
    status: 'paid',
    date: '2024-01-10',
    commissionRate: 6
  }
];

export default function CommissionManagement() {
  const [commissions, setCommissions] = useState<Commission[]>(mockCommissions);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const filteredCommissions = commissions.filter(commission => {
    if (filterStatus !== 'all' && commission.status !== filterStatus) return false;
    if (filterAgent !== 'all' && commission.agentName !== filterAgent) return false;
    return true;
  });

  const totalCommissions = filteredCommissions.reduce((sum, commission) => sum + commission.amount, 0);
  const pendingCommissions = filteredCommissions.filter(c => c.status === 'pending').length;
  const paidCommissions = filteredCommissions.filter(c => c.status === 'paid').length;

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
                <p className="text-2xl font-bold">${totalCommissions.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{new Set(commissions.map(c => c.agentName)).size}</p>
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
                      {Array.from(new Set(commissions.map(c => c.agentName))).map(agent => (
                        <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commissions List */}
          <div className="space-y-4">
            {filteredCommissions.map((commission) => (
              <Card key={commission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{commission.agentName}</h3>
                        <Badge className={getStatusColor(commission.status)}>
                          {commission.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Student: {commission.studentName} • {commission.program} at {commission.university}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Date: {commission.date}</span>
                        <span>Rate: {commission.commissionRate}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${commission.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Commission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                {filteredCommissions.map((commission) => (
                  <div key={commission.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Agent</p>
                        <p className="font-semibold">{commission.agentName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Student</p>
                        <p className="font-semibold">{commission.studentName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Course</p>
                        <p className="font-semibold">{commission.program}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Amount</p>
                        <p className="font-semibold">${commission.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(commission.status)}>
                          {commission.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {commission.commissionRate}% commission rate
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
