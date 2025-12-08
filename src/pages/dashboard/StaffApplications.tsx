import { useState, type KeyboardEvent } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import BackButton from '@/components/BackButton';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, FileText, Download, Eye, Calendar, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type QuickAction = 'total' | 'assigned' | 'highPriority' | 'pendingReview';

interface Application {
  id: string;
  studentName: string;
  studentId: string;
  program: string;
  university: string;
  status: string;
  submittedDate: string;
  lastUpdated: string;
  assignedTo: string;
  priority: 'high' | 'medium' | 'low';
}

export default function StaffApplications() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction>('assigned');

  // Mock data - replace with actual data from your backend
  const applications: Application[] = [
    {
      id: 'APP-001',
      studentName: 'John Smith',
      studentId: 'STU-2024-001',
      program: 'MSc Computer Science',
      university: 'University of Oxford',
      status: 'screening',
      submittedDate: '2024-01-15',
      lastUpdated: '2024-01-18',
      assignedTo: 'You',
      priority: 'high',
    },
    {
      id: 'APP-002',
      studentName: 'Sarah Johnson',
      studentId: 'STU-2024-002',
      program: 'MBA',
      university: 'Cambridge University',
      status: 'submitted',
      submittedDate: '2024-01-16',
      lastUpdated: '2024-01-17',
      assignedTo: 'You',
      priority: 'medium',
    },
    {
      id: 'APP-003',
      studentName: 'Michael Chen',
      studentId: 'STU-2024-003',
      program: 'MA International Business',
      university: 'Imperial College London',
      status: 'conditional_offer',
      submittedDate: '2024-01-10',
      lastUpdated: '2024-01-19',
      assignedTo: 'Jane Doe',
      priority: 'low',
    },
    {
      id: 'APP-004',
      studentName: 'Emily Davis',
      studentId: 'STU-2024-004',
      program: 'MSc Data Science',
      university: 'University College London',
      status: 'screening',
      submittedDate: '2024-01-17',
      lastUpdated: '2024-01-17',
      assignedTo: 'You',
      priority: 'high',
    },
    {
      id: 'APP-005',
      studentName: 'David Wilson',
      studentId: 'STU-2024-005',
      program: 'LLM International Law',
      university: 'London School of Economics',
      status: 'visa',
      submittedDate: '2024-01-05',
      lastUpdated: '2024-01-20',
      assignedTo: 'John Smith',
      priority: 'medium',
    },
  ];

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.program.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter;
    const matchesQuickAction = (() => {
      switch (activeQuickAction) {
        case 'assigned':
          return app.assignedTo === 'You';
        case 'highPriority':
          return app.priority === 'high';
        case 'pendingReview':
          return app.status === 'submitted' || app.status === 'screening';
        default:
          return true;
      }
    })();
    return matchesSearch && matchesStatus && matchesPriority && matchesQuickAction;
  });

  const aiRecommendations = filteredApplications.slice(0, 3).map((app) => {
    const needsOfferDocs = app.status === 'submitted' || app.status === 'screening';
    const needsVisaDocs = app.status === 'conditional_offer' || app.status === 'visa';

    const actions = [] as string[];

    if (needsOfferDocs) {
      actions.push('Request transcripts, passport scan, and reference letters to finalise the university review.');
    }

    if (needsVisaDocs) {
      actions.push('Confirm CAS/offer details and prompt the student to upload financial evidence for visa readiness.');
    }

    if (app.priority === 'high') {
      actions.push('High priority — send a quick update to the student and university contact with next steps.');
    }

    if (actions.length === 0) {
      actions.push('All core materials present. Keep the student informed while awaiting the next milestone.');
    }

    return {
      id: app.id,
      label: `${app.studentName} · ${app.university}`,
      actions,
    };
  });

  const quickActionLabels: Record<QuickAction, string> = {
    total: 'Total Applications',
    assigned: 'Assigned to Me',
    highPriority: 'High Priority',
    pendingReview: 'Pending Review',
  };

  const activeQuickActionLabel =
    activeQuickAction !== 'total'
      ? quickActionLabels[activeQuickAction]
      : null;

  const handleQuickAction = (action: QuickAction) => {
    if (action === 'total') {
      setActiveQuickAction('total');
      setStatusFilter('all');
      setPriorityFilter('all');
      return;
    }

    const isSameAction = activeQuickAction === action;
    const nextAction = isSameAction ? 'total' : action;

    setActiveQuickAction(nextAction);

    if (!isSameAction) {
      setStatusFilter('all');
      setPriorityFilter('all');
    }
  };

  const getCardInteractionProps = (action: QuickAction) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': quickActionLabels[action],
    'aria-pressed': activeQuickAction === action,
    onClick: () => handleQuickAction(action),
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleQuickAction(action);
      }
    },
    className: cn(
      'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      activeQuickAction === action &&
        'border-primary ring-2 ring-primary/50 focus-visible:ring-primary/80',
    ),
  });

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-destructive/10 text-destructive border-destructive/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      low: 'bg-muted text-muted-foreground border-muted',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        {/* Header */}
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Applications Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Review and manage student applications
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-primary/15 p-2 text-primary">
                <Shield className="h-4 w-4" />
              </span>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">You are viewing your assigned students</p>
                <p className="text-muted-foreground">
                  Only applications assigned to you are shown by default. Switch filters if you need a wider view for team coverage.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-muted-foreground/20 bg-background/60 p-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">AI checks</p>
                <p className="text-muted-foreground">We highlight missing documents or next steps so you can advise students before universities review.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card {...getCardInteractionProps('total')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          <Card {...getCardInteractionProps('assigned')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assigned to Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {applications.filter((app) => app.assignedTo === 'You').length}
              </div>
            </CardContent>
          </Card>
          <Card {...getCardInteractionProps('highPriority')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {applications.filter((app) => app.priority === 'high').length}
              </div>
            </CardContent>
          </Card>
          <Card {...getCardInteractionProps('pendingReview')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {applications.filter((app) => app.status === 'submitted' || app.status === 'screening').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {activeQuickActionLabel && (
          <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wide">
                {activeQuickActionLabel}
              </Badge>
              <span className="text-muted-foreground">Quick filter applied</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleQuickAction('total')}>
              Clear
            </Button>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, ID, or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="conditional_offer">Conditional Offer</SelectItem>
                  <SelectItem value="unconditional_offer">Unconditional Offer</SelectItem>
                  <SelectItem value="visa">Visa Stage</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              AI document coach
            </div>
            <CardDescription>
              Quick prompts tailored to the applications you can view so you can nudge students before universities review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiRecommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="rounded-xl border border-muted-foreground/20 bg-muted/30 p-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {recommendation.label}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {recommendation.actions.map((action, index) => (
                    <li key={`${recommendation.id}-action-${index}`} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Applications List</CardTitle>
                <CardDescription>
                  {filteredApplications.length} application(s) found
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{app.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{app.studentName}</div>
                          <div className="text-xs text-muted-foreground">{app.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={app.program}>
                          {app.program}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="truncate" title={app.university}>
                          {app.university}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityBadge(app.priority)}>
                          {app.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{app.assignedTo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(app.lastUpdated).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/student/applications/${app.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredApplications.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No applications found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
