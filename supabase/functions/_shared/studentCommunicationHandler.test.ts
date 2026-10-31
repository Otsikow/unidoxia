import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStudentCommunicationHandler } from './studentCommunicationHandler';
const actor='11111111-1111-4111-8111-111111111111',studentId='22222222-2222-4222-8222-222222222222',tenant='33333333-3333-4333-8333-333333333333';
let role:string,active:boolean,studentVisible:boolean,applicationVisible:boolean,ledgerAvailable:boolean,receiptColumnsAvailable:boolean;let historyError:string|null;let selections:string[];let scopes:any[];const provider=vi.fn();
const client={auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},from:(table:string)=>{
 let selected="";const chain:any={select:(fields:string)=>{selected=fields;selections.push(fields);return chain;},eq:(...args:any[])=>{scopes.push([table,...args]);return chain;},limit:()=>chain,order:()=>chain,range:async()=>({data:[],count:0,error:historyError?{code:historyError}:!receiptColumnsAvailable&&selected.includes("delivery_status")?{code:"42703"}:null}),single:async()=>({data:{id:actor,role,tenant_id:tenant,active},error:null}),maybeSingle:async()=>({data:table==='students'&&studentVisible?{id:studentId,tenant_id:tenant,contact_email:'student@example.test'}:table==='applications'&&applicationVisible?{id:'app'}:null,error:null}),then:(resolve:any)=>Promise.resolve({data:[],error:table==='student_communications'&&!ledgerAvailable?{message:'missing table'}:null}).then(resolve)};return chain;
}};
const env:Record<string,string>={SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'test-service',RESEND_API_KEY:'test-provider',STUDENT_EMAIL_ENABLED:'true'};
const createClient=vi.fn(()=>client);
const handler=()=>createStudentCommunicationHandler({createClient,env:key=>env[key],fetch:provider});
const request=(body:unknown,auth=true)=>new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer sample'}:{})},body:JSON.stringify(body)});
beforeEach(()=>{role='admin';active=true;studentVisible=true;applicationVisible=false;ledgerAvailable=true;receiptColumnsAvailable=true;historyError=null;selections=[];scopes=[];vi.clearAllMocks();});
describe('communication endpoint authorization',()=>{
 it('denies missing authentication and student/agent roles before any provider request',async()=>{
  expect((await handler()(request({action:'capabilities'},false))).status).toBe(401);
  for(const value of ['student','agent']){role=value;expect((await handler()(request({action:'capabilities'}))).status).toBe(403);}
  expect(provider).not.toHaveBeenCalled();
 });
 it('denies inactive staff',async()=>{active=false;expect((await handler()(request({action:'capabilities'}))).status).toBe(403);});
 it('looks up the exact selected student within the authenticated tenant',async()=>{
  studentVisible=false;expect((await handler()(request({action:'history',studentId}))).status).toBe(404);
  expect(scopes).toContainEqual(['students','id',studentId]);expect(scopes).toContainEqual(['students','tenant_id',tenant]);expect(provider).not.toHaveBeenCalled();
 });
 it('rejects a foreign application before creating a privileged client or sending',async()=>{
  const result=await handler()(request({action:'send_email',studentId,applicationId:'44444444-4444-4444-8444-444444444444'}));
  expect(result.status).toBe(403);expect(scopes).toContainEqual(['applications','student_id',studentId]);expect(createClient).toHaveBeenCalledTimes(1);expect(provider).not.toHaveBeenCalled();
 });
 it('reports capabilities honestly and fails closed when the ledger is absent',async()=>{
  ledgerAvailable=false;const result=await handler()(request({action:'capabilities'}));expect(await result.json()).toMatchObject({emailEnabled:false,historyEnabled:false,whatsappMode:'external',emailReplies:'external'});
  expect((await handler()(request({action:'send_email',studentId}))).status).toBe(503);expect(provider).not.toHaveBeenCalled();
 });
 it('keeps old managed schemas readable without removing tenant or student predicates',async()=>{
  receiptColumnsAvailable=false;const r=await handler()(request({action:'history',studentId}));expect(r.status).toBe(200);
  expect(selections.some(s=>s.includes('delivery_status'))).toBe(true);expect(selections).toContain('id,student_id,application_id,author_id,channel,status,recipient,subject,body,provider_id,created_at');
  expect(scopes.filter(s=>s[0]==='student_communications'&&s[1]==='tenant_id')).toHaveLength(2);
 });
 it('never treats an access denial as an absent receipt column',async()=>{
  historyError='42501';const r=await handler()(request({action:'history',studentId}));expect(r.status).toBe(503);
  expect(selections.filter(s=>s.includes('created_at'))).toHaveLength(1);
 });
 it('scopes shared history to one student and tenant',async()=>{
  expect((await handler()(request({action:'history',studentId}))).status).toBe(200);
  expect(scopes).toContainEqual(['student_communications','student_id',studentId]);expect(scopes).toContainEqual(['student_communications','tenant_id',tenant]);
 });
});
