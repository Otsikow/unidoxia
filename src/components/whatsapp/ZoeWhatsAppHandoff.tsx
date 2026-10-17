import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppAvailable } from '@/hooks/useWhatsAppAvailable';
import { whatsappLink } from '@/config/whatsapp';
import { logZoeWhatsAppHandoffClick } from '@/lib/analytics';
import { needsPerson } from '../../../supabase/functions/_shared/whatsappFlow';
export function ZoeWhatsAppHandoff({ messages }: { messages: { role: string; content: string }[] }) {
  const available = useWhatsAppAvailable();
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!available || !messages.slice(-3).some(m => needsPerson(m.content))) return null;
  const prepare = async () => {
    setBusy(true); setError('');
    // Only visible text, with URLs, long numbers and credentials redacted. No attachments.
    const summary = messages.slice(-4).map(m => `${m.role}: ${m.content
      .replace(/https?:\/\/\S+/g, '[link omitted]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email omitted]')
      .replace(/\b(?:passport|password|card|account)\b[^\n]*/gi, '[sensitive detail omitted]')
      .replace(/\b\d[\d\s-]{5,}\d\b/g, '[number omitted]')
      .slice(0, 400)}`).join('\n').slice(0, 1800);
    const { data, error } = await supabase.rpc('whatsapp_create_zoe_handoff', { p_summary: summary });
    if (error) setError('Unable to prepare the handover. Please try again.');
    else setRef(data);
    setBusy(false);
  };
  return <div className="px-5 py-2 space-y-2 text-sm">
    <p>Continue with the UniDoxia admissions team on WhatsApp. The last few messages shown here will be shared with the team. Do not include sensitive information.</p>
    {ref ? <Button asChild variant="outline"><a href={whatsappLink(`Hi UniDoxia, I was chatting with Zoe. Ref ZOE-${ref}`)} target="_blank" rel="noopener noreferrer" onClick={logZoeWhatsAppHandoffClick}>Continue on WhatsApp</a></Button>
      : <Button variant="outline" disabled={busy} onClick={() => void prepare()}>{busy ? 'Preparing handover...' : 'Continue on WhatsApp'}</Button>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
