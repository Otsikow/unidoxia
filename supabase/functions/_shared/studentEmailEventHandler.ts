export interface StudentEmailReceipt {
  id:string;providerId:string;type:string;occurredAt:string;communicationId:string|null;recipient:string|null;
}
export async function recordStudentEmailReceipt(db:{rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>},event:StudentEmailReceipt):Promise<string>{
  const {data,error}=await db.rpc("record_student_email_delivery_event",{
    p_event_id:event.id,p_provider_id:event.providerId,p_event_type:event.type,p_occurred_at:event.occurredAt,
    p_communication_id:event.communicationId,p_recipient:event.recipient,
  });
  if(error||typeof data!=="string")throw new Error("Receipt not recorded");
  return data;
}
const MAX_BYTES = 65536;
const ALLOWED = new Set(['email.delivered','email.delivery_delayed','email.bounced','email.failed','email.suppressed','email.complained']);
const reply = (status: number, value: string) => new Response(JSON.stringify({status:value}), {
  status, headers: {'Content-Type':'application/json'},
});
async function boundedBody(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset=0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.byteLength; }
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function createStudentEmailEventHandler(deps: {
  enabled: boolean;
  verify: (raw: string, headers: Record<string,string>) => unknown;
  record: (event: StudentEmailReceipt) => Promise<string>;
  now?: () => number;
}) {
  return async (request: Request) => {
    if (request.method !== 'POST') return reply(405,'method_not_allowed');
    if (!deps.enabled) return reply(503,'receipts_not_configured');
    let raw: string | null;
    try { raw=await boundedBody(request); } catch { return reply(400,'invalid_body'); }
    if (raw === null) return reply(413,'payload_too_large');
    const id=request.headers.get('svix-id') ?? '';
    const timestamp=request.headers.get('svix-timestamp') ?? '';
    const signature=request.headers.get('svix-signature') ?? '';
    if (!id || id.length>200 || !timestamp || !signature) return reply(401,'invalid_signature');
    let event: unknown;
    try { event=deps.verify(raw,{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':signature}); }
    catch { return reply(401,'invalid_signature'); }
    if (!event || typeof event!=='object' || Array.isArray(event)) return reply(400,'invalid_event');
    const value=event as {type?:unknown;created_at?:unknown;data?:{email_id?:unknown;tags?:Record<string,unknown>;to?:unknown}};
    if (typeof value.type!=='string') return reply(400,'invalid_event');
    // No inbound messages, tracking pixels or unrelated provider events are imported.
    if (!ALLOWED.has(value.type)) return reply(202,'ignored');
    const provider=value.data?.email_id;
    const at=typeof value.created_at==='string' ? Date.parse(value.created_at) : NaN;
    if (typeof provider!=='string' || !provider || provider.length>200 || !Number.isFinite(at)
      || at>(deps.now?.() ?? Date.now())+300000) return reply(400,'invalid_event');
    const tag=value.data?.tags?.unidoxia_communication;
    if(tag!==undefined && (typeof tag!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tag))) return reply(400,'invalid_event');
    const recipients=value.data?.to;
    const recipient=Array.isArray(recipients)&&recipients.length===1&&typeof recipients[0]==='string' ? recipients[0] : null;
    try {
      const result=await deps.record({id,providerId:provider,type:value.type,occurredAt:new Date(at).toISOString(),communicationId:typeof tag==='string'?tag:null,recipient});
      if(result==='retry')return reply(503,'receipt_not_recorded');
      if (!['recorded','duplicate','ignored'].includes(result)) throw new Error('Invalid receipt result');
      return reply(200,result);
    } catch { return reply(503,'receipt_not_recorded'); }
  };
}
