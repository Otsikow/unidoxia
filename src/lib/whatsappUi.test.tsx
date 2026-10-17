import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZoeWhatsAppHandoff } from '@/components/whatsapp/ZoeWhatsAppHandoff';
import { isUnder18, whatsappLink } from '@/config/whatsapp';
import { ZOE_FALLBACK, ZOE_FALLBACK_MESSAGE } from '../../supabase/functions/_shared/zoeHandoff';
const { invoke } = vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/hooks/useWhatsAppAvailable',()=>({useWhatsAppAvailable:()=>true}));
vi.mock('@/lib/analytics',()=>({logZoeWhatsAppHandoffClick:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:null}})},functions:{invoke}}}));
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
    expect(isUnder18('2008-10-18',now)).toBe(true); expect(isUnder18('2008-10-17',now)).toBe(false); expect(isUnder18(null,now)).toBe(false);
  });
});
