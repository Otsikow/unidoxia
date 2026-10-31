import { verifyStudentEmailEvent } from './signature.ts';
const keyText='synthetic-webhook-signing-key-only';
const secret='whsec_'+btoa(keyText);
const raw=JSON.stringify({type:'email.delivered',data:{email_id:'synthetic'}});
async function headers(timestamp=Math.floor(Date.now()/1000)){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(keyText),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`synthetic-event.${timestamp}.${raw}`)));
 return {'svix-id':'synthetic-event','svix-timestamp':String(timestamp),'svix-signature':'v1,'+btoa(String.fromCharCode(...bytes))};
}
function rejects(fn:()=>unknown){try{fn();}catch{return;}throw new Error('Invalid signature was accepted');}
Deno.test('Official Svix verifier accepts a genuine signed raw fixture',async()=>{
 const result=verifyStudentEmailEvent(secret,raw,await headers()) as {type:string};
 if(result.type!=='email.delivered')throw new Error('Unexpected verified event');
});
Deno.test('Official Svix verifier rejects tampering and stale replay',async()=>{
 rejects(()=>verifyStudentEmailEvent(secret,raw+' ',{'svix-id':'synthetic-event','svix-timestamp':'1','svix-signature':'v1,invalid'}));
 const stale=await headers(Math.floor(Date.now()/1000)-600);
 rejects(()=>verifyStudentEmailEvent(secret,raw,stale));
 const future=await headers(Math.floor(Date.now()/1000)+600);rejects(()=>verifyStudentEmailEvent(secret,raw,future));
 const valid=await headers();rejects(()=>verifyStudentEmailEvent(secret,raw+' ',valid));
});
