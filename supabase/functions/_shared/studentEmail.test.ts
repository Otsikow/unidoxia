import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendStudentEmail, emailHtml, type EmailContext, type EmailStore } from './studentEmail';
const id='11111111-1111-4111-8111-111111111111';
const context:EmailContext={studentId:'student-a',tenantId:'tenant-a',authorId:'staff-a',email:'student@example.test',applicationId:null};
const input={id,subject:'Application update',body:'Hello student',expectedEmail:'student@example.test'};
let rows:Map<string,any>;let store:EmailStore;const send=vi.fn();
const now=Date.parse('2026-10-31T12:00:00Z');
beforeEach(()=>{rows=new Map();send.mockReset().mockResolvedValue({ok:true,id:'provider-1'});store={find:async id=>rows.get(id)??null,insert:async row=>{if(rows.has(row.id as string))return false;rows.set(row.id as string,{...row,created_at:new Date(now).toISOString()});return true;},update:async(id,value)=>{rows.set(id,{...rows.get(id),...value});},recentCount:async()=>0};});
const execute=()=>sendStudentEmail(input,context,{enabled:true,store,send,now:()=>now});
describe('audited operational student email',()=>{
 it('sends to the server-resolved registered address and records provider acceptance only',async()=>{
  const result=await execute();expect(result.status).toBe('accepted');expect(send).toHaveBeenCalledWith(expect.objectContaining({to:'student@example.test',key:`student-email/${id}`}));expect(rows.get(id).status).toBe('accepted');expect(rows.get(id).provider_id).toBe('provider-1');
 });
 it('does not send again once an identical retry has been accepted',async()=>{await execute();await execute();expect(send).toHaveBeenCalledTimes(1);});
 it('retains an uncertain attempt and reuses its provider idempotency key',async()=>{
  send.mockRejectedValueOnce(new Error('network lost'));await expect(execute()).rejects.toThrow('uncertain');expect(rows.get(id).status).toBe('pending');await execute();expect(send.mock.calls[0][0].key).toBe(send.mock.calls[1][0].key);
 });
 it('keeps ambiguous provider responses pending and retries the stored signature unchanged',async()=>{
  send.mockResolvedValueOnce({ok:false,uncertain:true});await expect(execute()).rejects.toThrow('uncertain');expect(rows.get(id).status).toBe('pending');rows.get(id).signature='Approved archived signature';await execute();expect(send.mock.calls[1][0].text).toContain('Approved archived signature');expect(send.mock.calls[1][0].html).toContain('Approved archived signature');
 });
 it('never sends if the audit cannot be saved',async()=>{store.insert=async()=>{throw new Error('database unavailable');};await expect(execute()).rejects.toThrow();expect(send).not.toHaveBeenCalled();});
 it('rejects spoofed recipients, changed payloads and cross-student operation IDs',async()=>{
  await expect(sendStudentEmail({...input,expectedEmail:'other@example.test'},context,{enabled:true,store,send,now:()=>now})).rejects.toThrow('changed');
  await execute();send.mockClear();
  await expect(sendStudentEmail({...input,body:'Different message'},context,{enabled:true,store,send,now:()=>now})).rejects.toThrow('different draft');
  await expect(sendStudentEmail(input,{...context,studentId:'student-b'},{enabled:true,store,send,now:()=>now})).rejects.toThrow('different draft');expect(send).not.toHaveBeenCalled();
 });
 it('does not retry an uncertain email outside the provider idempotency window',async()=>{
  send.mockRejectedValueOnce(new Error('network lost'));await expect(execute()).rejects.toThrow();send.mockClear();
  await expect(sendStudentEmail(input,context,{enabled:true,store,send,now:()=>now+24*3600000})).rejects.toThrow('reconciliation');expect(send).not.toHaveBeenCalled();
 });
 it('reports provider decline and never claims delivery',async()=>{send.mockResolvedValue({ok:false});await expect(execute()).rejects.toThrow('declined');expect(rows.get(id).status).toBe('failed');});
 it('reports a pending audit if provider acceptance cannot be written back',async()=>{store.update=async()=>{throw new Error('database lost');};const result=await execute();expect(result.status).toBe('pending');expect(result).toHaveProperty('providerAccepted',true);expect(rows.get(id).status).toBe('pending');});
 it('rejects header injection, invalid identifiers, missing setup and rate limits without sending',async()=>{
  await expect(sendStudentEmail({...input,subject:'Hello\r\nBcc: someone@example.test'},context,{enabled:true,store,send,now:()=>now})).rejects.toThrow();
  await expect(sendStudentEmail({...input,id:'not-an-id'},context,{enabled:true,store,send,now:()=>now})).rejects.toThrow();
  await expect(sendStudentEmail(input,context,{enabled:false,store,send,now:()=>now})).rejects.toThrow('not enabled');
  store.recentCount=async()=>60;await expect(execute()).rejects.toThrow('hourly');expect(send).not.toHaveBeenCalled();
 });
 it('escapes message HTML and uses the approved signature',()=>{const html=emailHtml('<script>alert("x")</script> &');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('UniDoxia Team');expect(html).toContain('info@unidoxia.com');});
});

describe('receipt tag payload snapshots',()=>{
 it('keeps an opted-in retry tagged even if receipt rollout is turned off later',async()=>{
  send.mockRejectedValueOnce(new Error('lost response'));
  await expect(sendStudentEmail(input,context,{enabled:true,tagReceipts:true,store,send,now:()=>now})).rejects.toThrow('uncertain');
  await execute();expect(send.mock.calls[0][0].tags).toEqual([{name:'unidoxia_communication',value:id}]);expect(send.mock.calls[1][0].tags).toEqual(send.mock.calls[0][0].tags);
 });
 it('never adds tags to an existing untagged retry after rollout is enabled',async()=>{
  send.mockRejectedValueOnce(new Error('lost response'));await expect(execute()).rejects.toThrow('uncertain');
  await sendStudentEmail(input,context,{enabled:true,tagReceipts:true,store,send,now:()=>now});
  expect(send.mock.calls[0][0]).not.toHaveProperty('tags');expect(send.mock.calls[1][0]).not.toHaveProperty('tags');
 });
});
