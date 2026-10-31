import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWorkflowDate } from '@/lib/applicationWorkflow';
import type { Database } from '@/integrations/supabase/types';
type Request = Pick<Database['public']['Tables']['document_requests']['Row'], 'id' | 'document_type' | 'description' | 'status' | 'due_date'>;
const labels: Record<string, string> = { pending: 'Awaiting file', submitted: 'Submitted — awaiting review', received: 'Received — awaiting review', approved: 'Approved', rejected: 'Needs replacement' };
export function StudentDocumentRequests({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['student-document-requests-workspace', user?.id, studentId], enabled: Boolean(user?.id),
    queryFn: async () => {
      const rows: Request[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('document_requests').select('id,document_type,description,status,due_date')
          .eq('student_id', studentId).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
  });
  return <section className="space-y-3 border-t pt-4" aria-label="Student document requests">
    <h3 className="font-semibold">Student document requests</h3>
    <p className="text-xs text-muted-foreground">These requests belong to the student and may relate to other applications. Dates are those recorded on each request.</p>
    {query.isPending ? <p role="status">Loading requests…</p> : query.isError ? <p role="alert">Requests could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Try again</Button></p> : !query.data?.length ? <p className="text-sm text-muted-foreground">No document requests recorded for this student.</p> :
      <ul className="divide-y">{query.data.map(request => <li key={request.id} className="space-y-1 py-3"><div className="flex flex-wrap justify-between gap-2"><p className="capitalize">{request.document_type.replace(/_/g, ' ')}</p><Badge variant="secondary">{labels[request.status] || request.status}</Badge></div>{request.description && <p className="text-sm">{request.description}</p>}{request.due_date && <p className="text-xs text-muted-foreground">Request due: {formatWorkflowDate(request.due_date)}</p>}</li>)}</ul>}
  </section>;
}
