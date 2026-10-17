import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWhatsAppAvailable } from '@/hooks/useWhatsAppAvailable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhatsAppConsent } from './WhatsAppConsent';
import { whatsappLink, isUnder18 } from '@/config/whatsapp';
export function WhatsAppAccountCard({ settings = false }: { settings?: boolean }) {
  const available = useWhatsAppAvailable();
  const { user } = useAuth();
  const [number, setNumber] = useState('');
  const [dob, setDob] = useState<string | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [code, setCode] = useState('');
  const [expires, setExpires] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!available || !user) return;
    void supabase.from('students').select('whatsapp_number,whatsapp_opt_in,date_of_birth').eq('profile_id', user.id).maybeSingle().then(({ data }) => {
      setDob(data?.date_of_birth ?? null);
      setNumber(data?.whatsapp_number ?? ''); setOptIn(data?.whatsapp_opt_in ?? false);
    });
  }, [available, user?.id]);
  useEffect(() => {
    if (!expires) return;
    const timer = setTimeout(() => { setCode(''); setExpires(0); }, Math.max(0, expires - Date.now()));
    return () => clearTimeout(timer);
  }, [expires]);
  if (!available || !user) return null;
  const act = async (link: boolean) => {
    setBusy(true); setError('');
    try {
      if (!link) {
        if (!/^\+?[1-9][\d\s()-]{6,24}$/.test(number)) throw new Error('Enter your WhatsApp number with country code.');
        const { error } = await supabase.rpc('whatsapp_set_preferences', { p_number: number, p_opt_in: optIn && !isUnder18(dob) });
        if (error) throw error;
        setCode('');
      } else {
        const { data, error } = await supabase.rpc('whatsapp_create_link_code');
        if (error) throw error;
        setCode(data); setExpires(Date.now() + 14 * 60000);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update WhatsApp settings. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>Link WhatsApp to your account</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">Link the WhatsApp number in your profile so you can check your application status on WhatsApp. This is optional and doesn't sign you up for updates.</p>
    {settings && <><Label htmlFor="settings-whatsapp">WhatsApp number with country code</Label><Input id="settings-whatsapp" value={number} onChange={e => { setNumber(e.target.value); setOptIn(false); setCode(''); }} />{!isUnder18(dob) && <WhatsAppConsent checked={optIn} onChange={setOptIn} />}<Button type="button" variant="outline" disabled={busy} onClick={() => void act(false)}>Save WhatsApp preferences</Button></>}
    {!settings && <p className="text-sm">{number ? <>Saved number: {number}.<br />If you've changed your number, save it before you get a code.</> : 'Please save your WhatsApp number in Personal Information first.'}</p>}
    <Button type="button" disabled={busy} onClick={() => void act(true)}>Get a link code</Button>
    {code && <div className="space-y-2"><p>Send LINK {code} to UniDoxia on WhatsApp.</p><p className="text-sm text-muted-foreground">This code works for 15 minutes. Send it from your saved number and don't share it with anyone.</p><Button asChild variant="outline"><a href={whatsappLink(`LINK ${code}`)} target="_blank" rel="noopener noreferrer">Open WhatsApp</a></Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </CardContent></Card>;
}
