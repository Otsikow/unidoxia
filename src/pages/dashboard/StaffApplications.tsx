import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { applicationNeedsAttention, formatWorkflowDate, openFollowUps, isFollowUpOverdue, type ApplicationFollowUp, getNextApplicationAction, isActiveApplication, WORKFLOW_STATUSES } from '@/lib/applicationWorkflow';
import { StaffApplicationWorkspace } from '@/components/applications/StaffApplicationWorkspace';
import { ChooseApplicationStudent } from '@/components/applications/ChooseApplicationStudent';
import { Plus, RefreshCw } from 'lucide-react';

export interface StaffApplicationRow {
  id: string;
  app_number: string | null;
  student_id: string;
  program_id: string;
  status: string;
  intake_month: number;
  intake_year: number;
  updated_at: string;
  student: { legal_name: string | null; contact_email: string | null } | null;
  program: { name: string; university: { name: string; country: string } | null } | null;
  documents: { id: string; verified: boolean }[];
  tasks?: ApplicationFollowUp[];
}

const PAGE_SIZE = 20;
export default function StaffApplications() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('attention');
  const [page, setPage] = useState(0);
  const [choosingStudent, setChoosingStudent] = useState(false);
  const applicationId = params.get('application');
  const query = useQuery({
    queryKey: ['staff-applications-workspace', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      // Fetch all pages instead of silently truncating the admissions queue at
      // PostgREST's row limit. RLS remains the authority for accessible records.
      const rows: StaffApplicationRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('applications').select(`
          id, app_number, student_id, program_id, status, intake_month, intake_year, updated_at,
          student:students(legal_name, contact_email),
          program:programs(name, university:universities(name, country)),
          documents:application_documents(id, verified),
          tasks(id,title,status,due_at,assignee_id,assignee:profiles!tasks_assignee_id_fkey(full_name))
        `).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data as unknown as StaffApplicationRow[]));
        if (data.length < 500) return rows;
      }
    },
  });
  const rows = query.data ?? [];
  const filtered = rows.filter((row) => {
    const matchesStatus = filter === 'all' || (filter === 'attention' ? applicationNeedsAttention(row) : filter === 'active' ? isActiveApplication(row.status) : row.status === filter);
    const text = [row.app_number, row.student?.legal_name, row.student?.contact_email, row.program?.name, row.program?.university?.name].join(' ').toLowerCase();
    return matchesStatus && text.includes(search.trim().toLowerCase());
  });
  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, maxPage);
  const selectApplication = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('application', id); else next.delete('application');
    setParams(next);
  };

  return <DashboardLayout><div className="space-y-6 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground">Find a student, check what is needed, and take the next step.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh applications"><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={() => setChoosingStudent(true)}><Plus className="mr-2 h-4 w-4" />New application</Button></div>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[['attention', 'Needs attention', rows.filter(r => applicationNeedsAttention(r)).length], ['active', 'Active applications', rows.filter(r => isActiveApplication(r.status)).length], ['all', 'All applications', rows.length], ['enrolled', 'Enrolled', rows.filter(r => r.status === 'enrolled').length]].map(([value, label, count]) =>
        <Button key={value} variant={filter === value ? 'secondary' : 'outline'} className="h-auto flex-col items-start p-4" aria-pressed={filter === value} onClick={() => { setFilter(String(value)); setPage(0); }}>
          <span className="text-sm">{label}</span><span className="text-2xl font-bold">{query.isPending || query.isError ? '—' : count}</span>
        </Button>)}
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input aria-label="Search applications" placeholder="Search student, university, course or reference" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      <Select value={filter} onValueChange={value => { setFilter(value); setPage(0); }}><SelectTrigger className="sm:w-64" aria-label="Application stage"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="attention">Needs attention</SelectItem><SelectItem value="active">Active applications</SelectItem><SelectItem value="all">All applications</SelectItem>
        {WORKFLOW_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
      </SelectContent></Select>
    </div>
    {query.isPending ? <LoadingState message="Loading applications…" /> : query.isError ?
      <Alert variant="destructive"><AlertDescription>Applications could not be loaded. Refresh to try again.</AlertDescription></Alert> :
      <Card><CardContent className="p-0"><div className="hidden overflow-x-auto md:block"><Table>
        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course and intake</TableHead><TableHead>Stage</TableHead><TableHead>Documents</TableHead><TableHead>Next step</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader>
        <TableBody>{filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(row => <TableRow key={row.id}>
          <TableCell><p className="font-medium">{row.student?.legal_name || 'Student details unavailable'}</p><p className="text-xs text-muted-foreground">{row.app_number || row.id.slice(0, 8)}</p></TableCell>
          <TableCell><p>{row.program?.name || 'Course unavailable'}</p><p className="text-xs text-muted-foreground">{row.program?.university?.name || 'University unavailable'} · {row.intake_month}/{row.intake_year}</p></TableCell>
          <TableCell><ApplicationStage status={row.status} /></TableCell>
          <TableCell>{row.documents.length} uploaded<br /><span className="text-xs text-muted-foreground">{row.documents.filter(d => d.verified).length} verified</span></TableCell>
          <TableCell className="max-w-64 text-sm"><QueueNextStep row={row} userId={user?.id} /></TableCell>
          <TableCell><Button variant="outline" onClick={() => selectApplication(row.id)} aria-label={`Open application for ${row.student?.legal_name || row.app_number || 'student'}`}>Open</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></div><div className="divide-y md:hidden">{filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(row => <article key={row.id} className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2"><div><h2 className="font-semibold">{row.student?.legal_name || 'Student details unavailable'}</h2><p className="text-xs text-muted-foreground">{row.app_number || row.id.slice(0, 8)}</p></div><ApplicationStage status={row.status} /></div>
        <div className="text-sm"><p>{row.program?.name || 'Course unavailable'}</p><p className="text-muted-foreground">{row.program?.university?.name || 'University unavailable'} · {row.intake_month}/{row.intake_year}</p></div>
        <p className="text-xs text-muted-foreground">{row.documents.length} documents · {row.documents.filter(d => d.verified).length} verified</p>
        <div className="rounded-md bg-muted p-3 text-sm"><p className="mb-1 font-medium">Next step</p><QueueNextStep row={row} userId={user?.id} /></div>
        <Button className="w-full" variant="outline" onClick={() => selectApplication(row.id)} aria-label={`Open application for ${row.student?.legal_name || row.app_number || 'student'}`}>Open application</Button>
      </article>)}</div>{filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">{rows.length ? filter === 'attention' && !search ? 'No applications need attention. Choose Active applications to see work in progress.' : 'No applications match. Clear your search or change the stage.' : 'No applications yet. Choose a student to start.'}</p>}
      <div className="flex items-center justify-between gap-3 border-t p-4"><p className="text-sm text-muted-foreground">{filtered.length} applications · Page {currentPage + 1} of {maxPage + 1}</p><div className="flex gap-2"><Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>Next</Button></div></div>
      </CardContent></Card>}
    <ChooseApplicationStudent open={choosingStudent} onClose={() => setChoosingStudent(false)} />
    <StaffApplicationWorkspace applicationId={applicationId} onClose={() => selectApplication(null)} onSaved={() => void query.refetch()} />
  </div></DashboardLayout>;
}

function QueueNextStep({ row, userId }: { row: StaffApplicationRow; userId?: string }) {
  const task = openFollowUps(row.tasks)[0];
  if (!task) return <p>{getNextApplicationAction(row.status)}</p>;
  return <div><p>{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.assignee_id === userId ? 'You' : task.assignee?.full_name || 'Unassigned'} · {formatWorkflowDate(task.due_at)}</p>
    {(task.status === 'blocked' || isFollowUpOverdue(task)) && <p className="mt-1 text-xs font-medium text-destructive">{task.status === 'blocked' ? 'Blocked' : 'Overdue'}</p>}</div>;
}

function ApplicationStage({ status }: { status: string }) {
  return status === 'submitted' ? <Badge className="status-submitted">Received by UniDoxia</Badge> : <StatusBadge status={status} />;
}
