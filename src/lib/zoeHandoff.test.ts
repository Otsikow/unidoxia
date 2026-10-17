// @vitest-environment node
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createZoeHandoffHandler, ZOE_FALLBACK } from '../../supabase/functions/_shared/zoeHandoff';
import type { WhatsAppDatabase } from '../../supabase/functions/_shared/whatsappStore';
const request = (headers: Record<string,string> = {}, summary = 'Fictional enquiry') => new Request('https://example.test', {method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'192.0.2.1',...headers},body:JSON.stringify({summary})});
function fixture() {
  const rpc=vi.fn().mockResolvedValue({data:'0123456789abcdef0123',error:null});
  const getUser=vi.fn().mockResolvedValue({data:{user:{id:'verified-user'}},error:null});
  const db: WhatsAppDatabase={rpc,auth:{getUser},from:()=>{throw new Error('Unexpected direct table write');}};
  return {db,rpc,getUser};
}
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>vi.unstubAllGlobals());
describe('Zoe edge boundary and fallback',()=>{
  it('hashes only the trusted IP and never sends a raw IP to storage',async()=>{
    const f=fixture(); const handler=createZoeHandoffHandler(f.db,'test-only-salt');
    expect((await handler(request({'x-forwarded-for':'192.0.2.2, 192.0.2.3'}))).status).toBe(200);
    const args=f.rpc.mock.calls[0][1]; expect(args.p_ip_hash).toMatch(/^[a-f0-9]{64}$/); expect(args.p_user).toBeNull();
    expect(JSON.stringify(args)).not.toContain('192.0.2');
    await handler(request({'x-forwarded-for':'192.0.2.8'})); expect(f.rpc.mock.calls[1][1].p_ip_hash).toBe(args.p_ip_hash);
    await handler(request({'cf-connecting-ip':'','x-forwarded-for':'192.0.2.2, 192.0.2.3'})); const forwardedHash=f.rpc.mock.calls[2][1].p_ip_hash;
    await handler(request({'cf-connecting-ip':'192.0.2.2'})); expect(f.rpc.mock.calls[3][1].p_ip_hash).toBe(forwardedHash);
    await createZoeHandoffHandler(f.db,'different-test-salt')(request()); expect(f.rpc.mock.calls[4][1].p_ip_hash).not.toBe(args.p_ip_hash);
  });
  it('refuses missing salt and IP without storage',async()=>{
    const f=fixture(); for(const [handler,req] of [[createZoeHandoffHandler(f.db),request()],[createZoeHandoffHandler(f.db,'test'),request({'cf-connecting-ip':''})]] as const) {
      const result=await handler(req); expect(result.status).toBe(503); expect(await result.json()).toEqual({error:ZOE_FALLBACK});
    } expect(f.rpc).not.toHaveBeenCalled();
  });
  it('verifies any supplied JWT rather than trusting a browser user ID',async()=>{
    const f=fixture(); const handler=createZoeHandoffHandler(f.db,'test'); await handler(request({authorization:'Bearer test-session'}));
    expect(f.getUser).toHaveBeenCalledWith('test-session'); expect(f.rpc.mock.calls[0][1].p_user).toBe('verified-user');
    f.getUser.mockResolvedValue({data:{user:null},error:'invalid'});
    expect((await handler(request({authorization:'Bearer invalid'}))).status).toBe(401); expect(f.rpc).toHaveBeenCalledTimes(1);
    expect((await handler(request({authorization:'malformed'}))).status).toBe(401); expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it('returns the exact friendly fallback when the SQL limiter refuses creation',async()=>{
    const f=fixture(); f.rpc.mockResolvedValue({data:null,error:null}); const response=await createZoeHandoffHandler(f.db,'test')(request());
    expect(response.status).toBe(429); expect(await response.json()).toEqual({error:ZOE_FALLBACK});
  });
  it('returns the fallback on a storage failure',async()=>{
    const f=fixture(); f.rpc.mockRejectedValue(new Error('Unavailable')); const response=await createZoeHandoffHandler(f.db,'test')(request());
    expect(response.status).toBe(503); expect(await response.json()).toEqual({error:ZOE_FALLBACK});
  });
});
