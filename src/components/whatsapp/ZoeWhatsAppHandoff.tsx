import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppAvailable } from '@/hooks/useWhatsAppAvailable';
import { whatsappLink } from '@/config/whatsapp';
import { logZoeWhatsAppHandoffClick } from '@/lib/analytics';
import { ZOE_FALLBACK, ZOE_FALLBACK_MESSAGE } from '../../../supabase/functions/_shared/zoeHandoff';
import { showZoeHandoff } from '../../../supabase/functions/_shared/whatsappFlow';
export function ZoeWhatsAppHandoff({ messages }: { messages: { role: string; content: string }[] }) {
  const available = useWhatsAppAvailable();
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!available || !showZoeHandoff(messages)) return null;
  const prepare = async () => {
    setBusy(true); setError('');
    // Only visible text, with URLs, long numbers and credentials redacted. No attachments.
    const summary = messages.slice(-4).map(m => `${m.role}: ${m.content
      .replace(/https?:\/\/\S+/g, '[link omitted]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email omitted]')
      .replace(/\b(?:passport|password|card|account)\b[^\n]*/gi, '[sensitive detail omitted]')
      .replace(/\b\d[\d\s-]{5,}\d\b/g, '[number omitted]')
      .slice(0, 400)}`).join('\n').slice(0, 1800);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      // Override the client's default anon bearer header for signed-out visitors.
      const { data, error } = await supabase.functions.invoke('zoe-handoff', { body: { summary }, headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (error || !data?.ref) throw new Error('Handoff unavailable');
      setRef(data.ref);
    } catch { setError(ZOE_FALLBACK); }
    finally { setBusy(false); }
  };
  return <div className="px-5 py-2 space-y-2 text-sm">
    <p>You can carry on with the UniDoxia admissions team on WhatsApp. We'll share your last few messages here with the team, so please don't include passport numbers, card details or passwords.</p>
    {ref || error ? <Button asChild variant="outline"><a href={whatsappLink(ref ? `Hi UniDoxia, I was chatting with Zoe. Ref ZOE-${ref}` : ZOE_FALLBACK_MESSAGE)} target="_blank" rel="noopener noreferrer" onClick={logZoeWhatsAppHandoffClick}>Continue on WhatsApp</a></Button>
      : <Button variant="outline" disabled={busy} onClick={() => void prepare()}>{busy ? 'Getting WhatsApp ready...' : 'Continue on WhatsApp'}</Button>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
