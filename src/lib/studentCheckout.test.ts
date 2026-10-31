import {beforeEach,describe,it,expect,vi} from 'vitest';
import {startStudentCheckout} from './studentCheckout';
const api=vi.hoisted(()=>({session:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:api.session},functions:{invoke:api.invoke}}}));
beforeEach(()=>{vi.resetAllMocks();api.session.mockResolvedValue({data:{session:{access_token:'synthetic-token'}},error:null});api.invoke.mockResolvedValue({data:{url:'https://checkout.stripe.com/c/pay/synthetic'},error:null});});
const start=()=>startStudentCheckout('agent_supported','https://unidoxia.com','/pricing?payment=cancelled');
describe('secure checkout handoff',()=>{
  it('returns the real hosted checkout link without activating a plan',async()=>{
    expect(await start()).toBe('https://checkout.stripe.com/c/pay/synthetic');
    expect(api.invoke).toHaveBeenCalledWith('create-checkout-session',expect.objectContaining({body:{planCode:'agent_supported',successUrl:'https://unidoxia.com/student/dashboard?payment=success',cancelUrl:'https://unidoxia.com/pricing?payment=cancelled'}}));
  });
  it.each([{data:{demo:true},error:null},{data:null,error:{context:{body:{demo:true}}}},{data:{},error:null},{data:{url:'https://checkout.stripe.com/c/pay/test',demo:true},error:null}])('rejects legacy simulation, errors and missing sessions',async result=>{
    api.invoke.mockResolvedValue(result);await expect(start()).rejects.toThrow();
  });
  it.each(['javascript:alert(1)','https://checkout.stripe.com.attacker.test/pay','http://checkout.stripe.com/pay','https://user@checkout.stripe.com/pay','not-a-url'])('rejects unsafe handoff %s',async url=>{
    api.invoke.mockResolvedValue({data:{url},error:null});await expect(start()).rejects.toThrow();
  });
  it('does not invoke checkout with an expired login',async()=>{api.session.mockResolvedValue({data:{session:null},error:null});await expect(start()).rejects.toThrow('Sign in');expect(api.invoke).not.toHaveBeenCalled();});
  it('does not offer a retired plan even through a stale link',async()=>{await expect(startStudentCheckout('self_service','https://unidoxia.com','/pricing')).rejects.toThrow('not available');expect(api.invoke).not.toHaveBeenCalled();});
});
