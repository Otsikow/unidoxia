import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWhatsAppAvailable } from '@/hooks/useWhatsAppAvailable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhatsAppConsent } from './WhatsAppConsent';
import { whatsappLink } from '@/config/whatsapp';
export function WhatsAppAccountCard({ settings = false }: { settings?: boolean }) {
  const available = useWhatsAppAvailable();
  const { user } = useAuth();
  const [number, setNumber] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [code, setCode] = useState('');
  const [expires, setExpires] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!available || !user) return;
    void supabase.from('students').select('whatsapp_number,whatsapp_opt_in').eq('profile_id', user.id).maybeSingle().then(({ data }) => {
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
        const { error } = await supabase.rpc('whatsapp_set_preferences', { p_number: number, p_opt_in: optIn });
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
  return <Card><CardHeader><CardTitle>Get updates on WhatsApp</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">Link the WhatsApp number saved in your student profile to check high-level application status. Linking is optional and does not consent to updates.</p>
    {settings && <><Label htmlFor="settings-whatsapp">WhatsApp number with country code</Label><Input id="settings-whatsapp" value={number} onChange={e => { setNumber(e.target.value); setOptIn(false); setCode(''); }} /><WhatsAppConsent checked={optIn} onChange={setOptIn} /><Button type="button" variant="outline" disabled={busy} onClick={() => void act(false)}>Save WhatsApp preferences</Button></>}
    {!settings && <p className="text-sm">Saved number: {number || 'Save your WhatsApp number in Personal Information first.'} Save any number changes before generating a code.</p>}
    <Button type="button" disabled={busy} onClick={() => void act(true)}>Generate link code</Button>
    {code && <div className="space-y-2"><p>Send LINK {code} to UniDoxia on WhatsApp</p><p className="text-sm text-muted-foreground">Code valid for up to 15 minutes. Use your saved number. Keep this code private.</p><Button asChild variant="outline"><a href={whatsappLink(`LINK ${code}`)} target="_blank" rel="noopener noreferrer">Open WhatsApp</a></Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </CardContent></Card>;
}
