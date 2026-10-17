import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
// The server reads secrets. Missing deployment/configuration keeps every new student UI hidden.
let readiness: Promise<boolean> | undefined;
export function useWhatsAppAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    readiness ??= supabase.functions.invoke('whatsapp-config').then(({ data, error }) => !error && data?.enabled === true).catch(() => false);
    void readiness.then(value => { if (alive) setAvailable(value); });
    return () => { alive = false; };
  }, []);
  return available;
}
