import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAgentCertificateUrl, uploadAgentCertificate } from '@/lib/agentDocuments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AgentDocumentsTab({ profile }: { profile: { id: string; tenant_id: string } }) {
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['agent-certificate', profile.id],
    queryFn: async () => {
      const result = await supabase.from('agents').select('verification_document_url,verification_status')
        .eq('profile_id', profile.id).eq('tenant_id', profile.tenant_id).maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const upload = async () => {
    if (!file || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await uploadAgentCertificate(profile, file);
      setFile(null); if (input.current) input.current.value = '';
      await Promise.all([
        client.invalidateQueries({ queryKey: ['agent-certificate', profile.id] }),
        client.invalidateQueries({ queryKey: ['roleData', profile.id] }),
        client.invalidateQueries({ queryKey: ['agent-profile-completion', profile.id] }),
      ]);
      setMessage('Certificate uploaded successfully. UniDoxia will review it.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed. Please retry.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const open = async () => {
    if (!query.data?.verification_document_url) return;
    setError('');
    try {
      const url = await getAgentCertificateUrl(query.data.verification_document_url);
      window.location.assign(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open certificate.'); }
  };
  return <Card>
    <CardHeader><CardTitle>Agency documents</CardTitle><CardDescription>
      Upload your agency registration or accreditation certificate for UniDoxia to review. PDF, JPG or PNG, up to 10 MB.
    </CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {query.isLoading && <p role="status">Loading certificate…</p>}
      {query.isError && <div role="alert">We could not load your certificate. <Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>}
      {query.data?.verification_document_url && <div className="space-y-2">
        <p>Certificate saved · Review status: {query.data.verification_status || 'pending'}</p>
        <Button variant="outline" onClick={open}>Open saved certificate</Button>
      </div>}
      <div className="space-y-2"><Label htmlFor="agent-certificate">Registration or accreditation certificate</Label>
        <Input ref={input} id="agent-certificate" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy}
          onChange={e => { setFile(e.target.files?.[0] ?? null); setError(''); setMessage(''); }} />
      </div>
      {file && <p className="text-sm break-all">Selected: {file.name}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {message && <p role="status">{message}</p>}
      <Button disabled={!file || busy || query.isLoading || query.isError} onClick={upload}>{busy ? 'Uploading…' : 'Upload certificate'}</Button>
      <p className="text-sm text-muted-foreground">Uploaded files are private. Only your account and authorised UniDoxia reviewers can open them.</p>
    </CardContent>
  </Card>;
}
