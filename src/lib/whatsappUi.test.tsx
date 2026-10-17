import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppAccountCard } from '@/components/whatsapp/WhatsAppAccountCard';
import { ZoeWhatsAppHandoff } from '@/components/whatsapp/ZoeWhatsAppHandoff';
import { isAdultForWhatsApp, whatsappLink } from '@/config/whatsapp';
import { ZOE_FALLBACK, ZOE_FALLBACK_MESSAGE } from '../../supabase/functions/_shared/zoeHandoff';
const { invoke } = vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/hooks/useWhatsAppAvailable',()=>({useWhatsAppAvailable:()=>true}));
vi.mock('@/lib/analytics',()=>({logZoeWhatsAppHandoffClick:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'fictional-student'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{date_of_birth:null,whatsapp_number:'+447700900123',whatsapp_opt_in:false}})})})}),auth:{getSession:async()=>({data:{session:null}})},functions:{invoke}}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('WhatsApp student controls',()=>{
  it.each(['limit','network'])('leaves a working WhatsApp button after %s',async failure=>{
    if(failure==='limit') invoke.mockResolvedValue({error:new Error('limited')}); else invoke.mockRejectedValue(new Error('network'));
    render(<ZoeWhatsAppHandoff messages={[{role:'user',content:'I want to speak to a person'}]} />);
    fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}));
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe(ZOE_FALLBACK));
    expect(screen.getByRole('link',{name:'Continue on WhatsApp'}).getAttribute('href')).toBe(whatsappLink(ZOE_FALLBACK_MESSAGE));
  });
  it('links to the reference on success',async()=>{
    invoke.mockResolvedValue({data:{ref:'0123456789abcdef0123'},error:null});
    render(<ZoeWhatsAppHandoff messages={[{role:'user',content:'human please'}]} />);
    fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}));
    await waitFor(()=>expect(screen.getByRole('link').getAttribute('href')).toContain('ZOE-0123456789abcdef0123'));
  });
  it('uses the eighteenth birthday for the updates box gate',()=>{
    const now=new Date('2026-10-17T12:00:00Z');
    expect(isAdultForWhatsApp('2008-10-18',now)).toBe(false); expect(isAdultForWhatsApp('2008-10-17',now)).toBe(true);
    for (const dob of [null, undefined, '', 'invalid', '2000-02-30', '2000-13-01', '2099-01-01']) expect(isAdultForWhatsApp(dob,now)).toBe(false);
  });
  it('handles leap birthdays without admitting someone before they turn 18',()=>{
    expect(isAdultForWhatsApp('2008-02-29',new Date('2026-02-28T12:00:00Z'))).toBe(false);
    expect(isAdultForWhatsApp('2008-02-29',new Date('2026-03-01T12:00:00Z'))).toBe(true);
    expect(isAdultForWhatsApp('2026-03-01',new Date('2044-02-29T12:00:00Z'))).toBe(false);
  });
  it('hides the settings consent box without a saved date of birth',async()=>{
    render(<WhatsAppAccountCard settings />);
    await waitFor(()=>expect((screen.getByLabelText('WhatsApp number with country code') as HTMLInputElement).value).toBe('+447700900123'));
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
