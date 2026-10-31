/** Ephemeral loopback-only receipt acceptance; never a public deployment. */
import {createServer} from 'node:http';
import {createClient} from '@supabase/supabase-js';
import {Webhook} from 'svix';
import {createStudentCommunicationHandler} from '../../../supabase/functions/_shared/studentCommunicationHandler.ts';
import {createStudentEmailEventHandler,recordStudentEmailReceipt} from '../../../supabase/functions/_shared/studentEmailEventHandler.ts';
import {studentEmailEventVerifier} from '../../../supabase/functions/_shared/studentEmailEventVerification.ts';
export const RECEIPT_FIXTURE_KEY='synthetic-receipt-acceptance-key-only';
export async function startReceiptAdapter(config:{url:string;anon:string;key:string}){
 if(new URL(config.url).hostname!=='qazshxpvfbhlybkmmkaf.supabase.co')throw new Error('Wrong staging backend');
 const values:Record<string,string>={SUPABASE_URL:config.url,SUPABASE_ANON_KEY:config.anon,SUPABASE_SERVICE_ROLE_KEY:config.key};
 const staff=createStudentCommunicationHandler({createClient,env:name=>values[name],fetch});
 const db=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const verify=studentEmailEventVerifier(Webhook);
 const receipts=createStudentEmailEventHandler({enabled:true,
  verify:(raw,headers)=>verify('whsec_'+Buffer.from(RECEIPT_FIXTURE_KEY).toString('base64'),raw,headers),
  record:event=>recordStudentEmailReceipt(db,event)});
 const server=createServer(async(incoming,outgoing)=>{
  try{
   const parts:Buffer[]=[];let length=0;
   for await(const chunk of incoming){const p=Buffer.from(chunk);length+=p.byteLength;if(length>131072){outgoing.writeHead(413);outgoing.end();return;}parts.push(p);}
   const headers=new Headers();for(const [name,value]of Object.entries(incoming.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
   const method=incoming.method??'POST';
   const request=new Request('http://127.0.0.1'+incoming.url,{method,headers,...(method!=='GET'&&method!=='HEAD'?{body:new Uint8Array(Buffer.concat(parts)).buffer}:{})});
   const response=await(incoming.url==='/student-email-events'?receipts:staff)(request);
   outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch{outgoing.writeHead(500);outgoing.end('Synthetic adapter failed');}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve());});
 const address=server.address();if(!address||typeof address==='string')throw new Error('No loopback endpoint');
 return {origin:`http://127.0.0.1:${address.port}`,stop:()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})};
}
