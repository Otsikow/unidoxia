// @vitest-environment node
// Exercise the actual request handler with isolated Auth/database/Stripe adapters; no payment is created.
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {describe,it,expect,vi} from 'vitest';
function setup(stripeConfigured=true){
  const create=vi.fn(async()=>({id:'synthetic-session',url:'https://checkout.example.test/session'}));
  const lookup=vi.fn(async()=>({data:{id:'student',plan_type:'free',tenant_id:'tenant'},error:null}));
  let handler:(request:Request)=>Promise<Response>;
  const source=readFileSync(new URL('./index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  runInNewContext(code,{
    Request,Response,console,
    Deno:{env:{get:(key:string)=>({SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',SUPABASE_ANON_KEY:'synthetic-anon',STRIPE_SECRET_KEY:stripeConfigured?'synthetic-stripe':undefined}[key])}},
    serve:(callback:typeof handler)=>{handler=callback;},
    createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'owner',email:'synthetic@example.test'}},error:null})},from:()=>({select:()=>({eq:()=>({single:lookup})})})}),
    Stripe:class {checkout={sessions:{create}};},
  });
  return {call:(planCode:unknown,authenticated=true)=>handler(new Request('https://api.example.test',{method:'POST',headers:{'content-type':'application/json',...(authenticated?{authorization:'Bearer synthetic'}:{})},body:JSON.stringify({planCode})})),create,lookup};
}
describe('checkout retirement boundary',()=>{
  it.each(['self_service','toString','__proto__',null])('rejects unavailable plan %s before a payment session or student lookup',async plan=>{
    const api=setup();const response=await api.call(plan);
    expect(response.status).toBe(400);expect(api.create).not.toHaveBeenCalled();expect(api.lookup).not.toHaveBeenCalled();
  });
  it('retains the supported plan and its existing amount',async()=>{
    const api=setup();expect((await api.call('agent_supported')).status).toBe(200);
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({metadata:expect.objectContaining({plan_code:'agent_supported'}),line_items:[expect.objectContaining({price_data:expect.objectContaining({unit_amount:20000})})]}));
  });
  it('reports an unavailable provider without a simulated-success flag',async()=>{
    const api=setup(false);const response=await api.call('agent_supported');
    expect(response.status).toBe(503);expect(await response.json()).not.toHaveProperty('demo');expect(api.create).not.toHaveBeenCalled();
  });
  it('still requires authentication',async()=>{
    const api=setup();expect((await api.call('agent_supported',false)).status).toBe(401);expect(api.create).not.toHaveBeenCalled();
  });
});
