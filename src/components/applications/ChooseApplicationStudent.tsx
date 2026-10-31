import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';

export function ChooseApplicationStudent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const term = useDebounce(search.trim(), 250);
  const query = useQuery({
    queryKey: ['application-student-picker', user?.id, term],
    enabled: Boolean(open && user?.id),
    queryFn: async () => {
      let query = supabase.from('students').select('id, legal_name, reference_code')
        .is('archived_at', null).order('legal_name').order('id').limit(51);
      // Values go through the query builder, never SQL or PostgREST filter syntax.
      if (term) query = query.ilike('legal_name', `%${term.replace(/[%_]/g, '')}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>Choose a student</DialogTitle><DialogDescription>Start an application using the student’s saved profile.</DialogDescription></DialogHeader>
    <Input aria-label="Search students by name" placeholder="Search student name" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="max-h-80 space-y-2 overflow-y-auto">
      {query.isPending ? <p role="status">Loading students…</p> : query.isError ? <p role="alert">Students could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Try again</Button></p> : query.data?.length ? query.data.slice(0, 50).map(student =>
        <Button key={student.id} variant="outline" className="h-auto w-full justify-between gap-2 whitespace-normal text-left" onClick={() => navigate(`/dashboard/applications/new?studentId=${student.id}`)}>
          <span>{student.legal_name || 'Unnamed student'}</span><span className="text-xs text-muted-foreground">{student.reference_code}</span>
        </Button>) : <p>No matching students. Add the student in Students first.</p>}
    </div>
    {(query.data?.length ?? 0) > 50 && <p className="text-sm text-muted-foreground">Showing the first 50 students. Search by name to find another student.</p>}
  </DialogContent></Dialog>;
}
