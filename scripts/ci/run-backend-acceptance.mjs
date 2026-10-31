import {readFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import postgres from 'postgres';
import {assertAcceptanceTarget} from '../../docs/security/staging/acceptance-target.mjs';
const suite=process.env.ACCEPTANCE_SUITE;
if(!['application','receipts'].includes(suite)||process.env.CI!=='true')throw new Error('Explicit isolated CI suite required');
const status=JSON.parse(await readFile(process.env.SUPABASE_STATUS_PATH,'utf8'));
const url=status.API_URL,anon=status.ANON_KEY,service=status.SERVICE_ROLE_KEY,dbUrl=status.DB_URL;
assertAcceptanceTarget(url,'local-ci-only','true');
const parsedDb=new URL(dbUrl);
if(parsedDb.hostname!=='127.0.0.1'||parsedDb.port!=='54322'||!anon||!service)throw new Error('Only the disposable local database is allowed');
for(const value of [anon,service,dbUrl])console.log(`::add-mask::${value}`);
if(process.env.STRIPE_SECRET_KEY||process.env.RESEND_API_KEY)throw new Error('External provider credentials are forbidden');
const env={...process.env,UNIDOXIA_LOCAL_ACCEPTANCE:'true',EXPECTED_STAGING_PROJECT_REF:'local-ci-only',STAGING_SUPABASE_URL:url,STAGING_SUPABASE_ANON_KEY:anon,STAGING_SUPABASE_SERVICE_ROLE_KEY:service};
const db=postgres(dbUrl,{max:1,ssl:false,onnotice:()=>{},connect_timeout:10});
const sourceRoot=process.cwd();
const hash=text=>createHash('sha256').update(text).digest('hex');
async function apply(file){const text=await readFile(path.join(sourceRoot,file),'utf8');console.log(`Reviewed source ${file}: ${hash(text)}`);await db.unsafe(text);}
let failure;
try {
 await apply('docs/security/staging/acceptance-baseline.sql');
 await apply('supabase/migrations/20261108000000_secure_communication_identity.sql');
 await apply('scripts/ci/bootstrap-backend.sql');
 await apply('supabase/migrations/20261031134909_secure_partner_workspace_access.sql');
 await apply('docs/security/staging/student-billing-fixture-schema.sql');
 await apply('supabase/migrations/20261031150148_protect_student_billing_fields.sql');
 const tenantBaseline=JSON.stringify(await db`select id from public.tenants order by id`);
 let runner;
 if(suite==='application'){
  await apply('docs/security/staging/application-submission-fixture-schema.sql');
  await apply('supabase/migrations/20261031162745_guard_application_submission.sql');
  runner='docs/security/staging/application-submission-auth-acceptance.mjs';
 }else{
  await apply('docs/security/staging/document-request-fixture-schema.sql');
  await apply('supabase/migrations/20261031142407_receive_student_document_request.sql');
  runner='docs/security/staging/document-request-storage-acceptance.mjs';
 }
 await db.unsafe("notify pgrst,'reload schema'");
 // Wait for actual Data API schema visibility, without printing credentials or private responses.
 const probe=suite==='application'?'applications?select=id,status':'application_documents?select=id,storage_path';
 let ready=false;
 for(let attempt=0;attempt<30;attempt++){
  const response=await fetch(`${url}/rest/v1/${probe}`,{headers:{apikey:service,Authorization:`Bearer ${service}`},signal:AbortSignal.timeout(5000)});
  if(response.ok){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(!ready)throw new Error('Local Data API schema did not become ready');
 console.log(`Acceptance runner ${runner}: ${hash(await readFile(runner,'utf8'))}`);
 const result=spawnSync(process.execPath,[runner],{env,stdio:'inherit',timeout:240000});
 if(result.error||result.status!==0)failure=new Error('Actual Auth/Data API acceptance failed; see semantic results above');
 const tables=['profiles','user_roles','students','agents','applications','programs','universities'];
 if(suite==='receipts')tables.push('application_documents','document_requests');
 for(const table of tables){const rows=await db.unsafe(`select count(*)::int as count from public.${table}`);if(rows[0].count!==0)throw new Error(`Fixture cleanup incomplete: ${table}`);}
 const auth=await db`select count(*)::int as count from auth.users`;
 const objects=await db`select count(*)::int as count from storage.objects`;
 if(auth[0].count||objects[0].count||tenantBaseline!==JSON.stringify(await db`select id from public.tenants order by id`))throw new Error('Independent cleanup/baseline read-back failed');
 console.log('PASS: independent SQL read-back: zero Auth accounts/fixture rows/Storage objects; original tenants unchanged.');
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### ${suite} isolated backend acceptance\n- Source commit: ${process.env.GITHUB_SHA}\n- Actual Auth/Data API${suite==='receipts'?' and private Storage':''}; synthetic accounts only.\n- Independent cleanup verified.\n- ${failure?'Acceptance failed; retain release hold.':'Acceptance passed.'}\n- Minimal representative schema, not a production clone; no hosted backend, Lovable builder, payment, email or deployment.\n`);
 if(failure)throw failure;
}catch(error){console.error('Acceptance stopped:',error.code??error.name,error.message);process.exitCode=1;}finally{await db.end({timeout:5});}
