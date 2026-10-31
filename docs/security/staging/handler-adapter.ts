/** Loopback-only staging HTTP adapter: real Auth/REST/RLS, no simulated sessions. */
import {createServer} from 'node:http';
import {createClient} from '@supabase/supabase-js';
import {createStudentCommunicationHandler} from '../../../supabase/functions/_shared/studentCommunicationHandler.ts';
export async function startStagingHandlerAdapter(config:{url:string;anon:string;key:string}){
  if(new URL(config.url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Only the isolated staging backend is allowed');
  const values:Record<string,string>={SUPABASE_URL:config.url,SUPABASE_ANON_KEY:config.anon,SUPABASE_SERVICE_ROLE_KEY:config.key};
  const handler=createStudentCommunicationHandler({createClient,env:key=>values[key],fetch});
  const server=createServer(async(incoming,outgoing)=>{
    try{
      const parts:Buffer[]=[];let size=0;
      for await(const chunk of incoming){const part=Buffer.from(chunk);size+=part.byteLength;if(size>65536){outgoing.writeHead(413);outgoing.end();return;}parts.push(part);}
      const headers=new Headers();
      for(const [name,value] of Object.entries(incoming.headers)){if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);}
      const method=incoming.method??'POST';
      const request=new Request('http://127.0.0.1/student-communication',{method,headers,...(method!=='GET'&&method!=='HEAD'?{body:Buffer.concat(parts)}:{})});
      const response=await handler(request);
      outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
    }catch{outgoing.writeHead(500,{'content-type':'application/json'});outgoing.end('{"error":"Staging adapter failed"}');}
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve());});
  const address=server.address();if(!address||typeof address==='string')throw new Error('Loopback adapter unavailable');
  return {endpoint:`http://127.0.0.1:${address.port}/student-communication`,
    stop:async()=>{await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();});}};
}
