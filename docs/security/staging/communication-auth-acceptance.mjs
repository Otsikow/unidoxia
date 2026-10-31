/** Disposable staging only. Never uses production users, tokens or provider keys. */
import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const url = process.env.STAGING_SUPABASE_URL;
const anon = process.env.STAGING_SUPABASE_ANON_KEY;
const key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const expected = process.env.EXPECTED_STAGING_PROJECT_REF;
const STAGING_REF = 'qazshxpvfbhlybkmmkaf';
if (!url || !anon || !key || expected !== STAGING_REF || new URL(url).hostname !== `${STAGING_REF}.supabase.co`)
  throw new Error('Only the explicitly approved isolated staging backend is allowed.');
if (process.env.RESEND_API_KEY || process.env.STUDENT_EMAIL_ENABLED === 'true')
  throw new Error('External sending must remain unconfigured and disabled.');
const client = (token) => createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
  ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
});
const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let stopAdapter;
let endpoint = `${url}/functions/v1/student-communication`;
if (process.env.STAGING_TEST_TRANSPORT === 'local-handler') {
  const {startStagingHandlerAdapter} = await import('./handler-adapter.ts');
  const adapter = await startStagingHandlerAdapter({url,anon,key});
  endpoint=adapter.endpoint;stopAdapter=adapter.stop;
}
const run = randomUUID();
const ids = { tenants: [], users: [], students: [], applications: [], communications: [] };
const sessions = [];
const results = [];
const check = async (name, fn) => {
  try { if (!(await fn())) throw new Error('assertion'); results.push({ name, pass: true }); console.log(`PASS ${name}`); }
  catch { results.push({ name, pass: false }); console.log(`FAIL ${name}`); }
};
const requireResult = (result, label) => { if (result.error) throw new Error(`${label} failed`); return result.data; };
const profile = async (id) => requireResult(await service.from('profiles').select('id,tenant_id,role,active').eq('id', id).single(), 'profile read');
const userRoles = async (id) => requireResult(await service.from('user_roles').select('role').eq('user_id', id), 'role read').map(r => r.role);
const patchProfile = async (id, values) => requireResult(await service.from('profiles').update(values).eq('id', id).select('id').single(), 'fixture profile update');
async function account(label, role = 'student', tenant, active = true, requestedRole) {
  const email = `${label}.${run}@udx-test.invalid`;
  const password = randomBytes(32).toString('base64url');
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: `Synthetic ${label}`, ...(requestedRole ? { role: requestedRole } : {}) },
    ...(role !== 'student' ? { app_metadata: { role } } : {}),
  });
  if (created.error || !created.data.user) throw new Error('Synthetic Auth creation failed');
  const id = created.data.user.id; ids.users.push(id);
  // GoTrue may apply app_metadata after the signup trigger has created a student.
  // Privileged fixtures therefore use the legitimate trusted server role workflow.
  if (role !== 'student') requireResult(await service.from('user_roles').upsert({user_id:id,role},{onConflict:'user_id,role',ignoreDuplicates:true}), 'trusted fixture role assignment');
  await patchProfile(id, { tenant_id: tenant, active });
  const student = requireResult(await service.from('students').select('id').eq('profile_id', id).maybeSingle(), 'fixture student lookup');
  if (student) { ids.students.push(student.id); requireResult(await service.from('students').update({ tenant_id: tenant }).eq('id', student.id), 'fixture student scope'); }
  const auth = client();
  const signed = await auth.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) throw new Error('Real Auth password sign-in failed');
  sessions.push(auth);
  return { id, studentId: student?.id, auth, api: client(signed.data.session.access_token), token: signed.data.session.access_token, email };
}
async function edge(actor, body) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anon,
    ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
  }, body: JSON.stringify(body) });
  return { code: response.status, body: await response.json().catch(() => ({})) };
}
async function taskTenant(label) {
  const id = randomUUID();
  requireResult(await service.from('tenants').insert({ id, slug: `udx-stage-${label}-${run}` }), 'synthetic tenant');
  ids.tenants.push(id); return id;
}
try {
  const a = await taskTenant('a'), b = await taskTenant('b');
  const admin = await account('admin', 'admin', a);
  const staff = await account('staff', 'staff', a);
  const student = await account('student', 'student', a);
  const agent = await account('agent', 'agent', a);
  const partner = await account('partner', 'partner', a);
  const inactive = await account('inactive-staff', 'staff', a, false);
  const inactiveAdmin = await account('inactive-admin', 'admin', a, false);
  const other = await account('foreign-admin', 'admin', b);
  const otherStudent = await account('foreign-student', 'student', b);
  const forged = await account('metadata-admin', 'student', a, true, 'admin');
  const inactiveStudent = await account('inactive-student', 'student', a, false);
  const target = await account('role-sync-target', 'student', a);
  const appA = randomUUID(), appB = randomUUID(); ids.applications.push(appA, appB);
  requireResult(await service.from('applications').insert([
    { id: appA, tenant_id: a, student_id: student.studentId, app_number: 'SYNTHETIC-A' },
    { id: appB, tenant_id: b, student_id: otherStudent.studentId, app_number: 'SYNTHETIC-B' },
  ]), 'synthetic applications');
  await check('Caller-editable signup metadata cannot create an administrator', async () =>
    (await profile(forged.id)).role === 'student' && !(await userRoles(forged.id)).includes('admin'));
  await check('Trusted server role assignment creates the intended admin and staff fixtures', async () =>
    (await profile(admin.id)).role === 'admin' && (await profile(staff.id)).role === 'staff');
  await check('Self tenant change is rejected and saved tenant is unchanged', async () => {
    const r = await student.api.from('profiles').update({ tenant_id: b }).eq('id', student.id).select('id');
    return Boolean(r.error) && (await profile(student.id)).tenant_id === a;
  });
  await check('Inactive student cannot reactivate their own account', async () => {
    const r = await inactiveStudent.api.from('profiles').update({ active: true }).eq('id', inactiveStudent.id).select('id');
    return Boolean(r.error) && (await profile(inactiveStudent.id)).active === false;
  });
  await check('Active admin can deactivate another synthetic student', async () => {
    const r = await admin.api.from('profiles').update({ active: false }).eq('id', target.id).select('id');
    return !r.error && r.data?.length === 1 && (await profile(target.id)).active === false;
  });
  await patchProfile(target.id, { active: true });
  await check('Inactive administrator cannot reactivate another account', async () => {
    const r = await inactiveAdmin.api.from('profiles').update({ active: true }).eq('id', inactiveStudent.id).select('id');
    return Boolean(r.error) && (await profile(inactiveStudent.id)).active === false;
  });
  await check('Inactive administrator cannot promote an alternate account', async () => {
    const r = await inactiveAdmin.api.from('user_roles').insert({ user_id: target.id, role: 'staff' });
    return Boolean(r.error) && !(await userRoles(target.id)).includes('staff');
  });
  await check('Active administrator grant preserves normal role synchronisation', async () => {
    const r = await admin.api.from('user_roles').insert({ user_id: target.id, role: 'staff' }).select('id');
    return !r.error && r.data?.length === 1 && (await profile(target.id)).role === 'staff';
  });
  await check('Active administrator revoke restores the student role', async () => {
    const r = await admin.api.from('user_roles').delete().eq('user_id', target.id).eq('role', 'staff').select('id');
    return !r.error && r.data?.length === 1 && (await profile(target.id)).role === 'student';
  });
  await check('Direct profile role changes remain blocked', async () => {
    const r = await student.api.from('profiles').update({ role: 'admin' }).eq('id', student.id).select('id');
    return Boolean(r.error) && (await profile(student.id)).role === 'student';
  });
  await check('Own profile repair cannot elevate an existing student', async () => {
    const r = await student.api.rpc('ensure_user_profile', { p_role: 'admin' });
    return !r.error && (await profile(student.id)).role === 'student';
  });
  await check('Cross-user profile repair is rejected', async () => {
    const r = await student.api.rpc('ensure_user_profile', { p_user_id: otherStudent.id, p_role: 'admin' });
    return !r.error && r.data?.success === false && (await profile(otherStudent.id)).role === 'student';
  });
  await check('No signed-in session cannot access the Edge Function', async () => (await edge(null, {})).code === 401);
  const caps = await edge(admin, { action: 'capabilities' });
  await check('Actual administrator session is accepted but email remains off', async () =>
    caps.code === 200 && caps.body.historyEnabled === true && caps.body.emailEnabled === false);
  if (caps.code !== 200 || caps.body.emailEnabled !== false) throw new Error('Unsafe or unusable staging capabilities');
  for (const [label, actor] of [['student', student], ['agent', agent], ['partner', partner], ['inactive staff', inactive], ['inactive admin', inactiveAdmin]])
    await check(`${label} is denied the communication service`, async () =>
      (await edge(actor, { action: 'history', studentId: student.studentId })).code === 403);
  await check('Administrator can read their own tenant student history', async () =>
    (await edge(admin, { action: 'history', studentId: student.studentId })).code === 200);
  await check('Staff can read their own tenant student history', async () =>
    (await edge(staff, { action: 'history', studentId: student.studentId })).code === 200);
  await check('Foreign tenant administrator cannot read another tenant student', async () =>
    (await edge(other, { action: 'history', studentId: student.studentId })).code === 404);
  await check('Foreign application cannot be associated with a student communication', async () =>
    (await edge(admin, { action: 'record_note', id: randomUUID(), studentId: student.studentId, applicationId: appB, body: 'Synthetic only' })).code === 403);
  const noteId = randomUUID(); ids.communications.push(noteId);
  const note = { action: 'record_note', id: noteId, studentId: student.studentId, applicationId: appA, body: 'Synthetic acceptance note only' };
  await check('Authorised staff note is saved with exact student and tenant', async () => {
    const r = await edge(admin, note);
    const saved = requireResult(await service.from('student_communications').select('student_id,tenant_id,application_id').eq('id', noteId).maybeSingle(), 'audit read');
    return r.code === 200 && saved?.student_id === student.studentId && saved?.tenant_id === a && saved?.application_id === appA;
  });
  await check('Same note retry does not create a duplicate', async () => {
    const r = await edge(admin, note);
    const rows = requireResult(await service.from('student_communications').select('id').eq('id', noteId), 'audit count');
    return r.code === 200 && rows.length === 1;
  });
  await check('Changed note cannot reuse an earlier operation identifier', async () =>
    (await edge(admin, { ...note, body: 'Changed synthetic note' })).code === 409);
  await check('Foreign tenant RLS hides saved communication records', async () => {
    const r = await other.api.from('student_communications').select('id').eq('id', noteId);
    return !r.error && r.data.length === 0;
  });
  await check('Student RLS hides saved communication records', async () => {
    const r = await student.api.from('student_communications').select('id').eq('id', noteId);
    return !r.error && r.data.length === 0;
  });
  await check('Browser clients cannot insert communication audit records', async () => {
    const id = randomUUID(); ids.communications.push(id);
    const r = await admin.api.from('student_communications').insert({ id, tenant_id: a, student_id: student.studentId,
      author_id: admin.id, channel: 'note', status: 'recorded', body: 'Must not be saved' });
    const saved = requireResult(await service.from('student_communications').select('id').eq('id', id), 'denied write check');
    return Boolean(r.error) && saved.length === 0;
  });
  await check('Email send is blocked before an audit or external delivery', async () => {
    const id = randomUUID(); ids.communications.push(id);
    const r = await edge(admin, { action: 'send_email', id, studentId: student.studentId, subject: 'Disabled synthetic test', body: 'Must not send', expectedEmail: student.email });
    const saved = requireResult(await service.from('student_communications').select('id').eq('id', id), 'email hold check');
    return r.code === 503 && saved.length === 0;
  });
} catch {
  results.push({ name: 'Staging acceptance setup/execution completed', pass: false });
  console.log('FAIL Staging acceptance setup/execution completed');
} finally {
  // Password sign-in only for synthetic users. Revoke those sessions before deleting fixtures.
  for (const auth of sessions) await auth.auth.signOut({ scope: 'global' }).catch(() => {});
  let cleanupOk = true;
  const remove = async (table, column, values) => {
    if (!values.length) return;
    const r = await service.from(table).delete().in(column, values); if (r.error) cleanupOk = false;
  };
  await remove('student_communications', 'student_id', ids.students);
  await remove('student_communications', 'id', ids.communications);
  await remove('applications', 'id', ids.applications);
  await remove('students', 'profile_id', ids.users);
  await remove('agents', 'profile_id', ids.users);
  await remove('user_roles', 'user_id', ids.users);
  await remove('profiles', 'id', ids.users);
  for (const id of ids.users) if ((await service.auth.admin.deleteUser(id)).error) cleanupOk = false;
  await remove('tenants', 'id', ids.tenants);
  for (const [table, column, values] of [['profiles', 'id', ids.users], ['students', 'id', ids.students], ['applications', 'id', ids.applications], ['student_communications', 'id', ids.communications], ['tenants', 'id', ids.tenants]]) {
    if (!values.length) continue; const r = await service.from(table).select(column).in(column, values);
    if (r.error || r.data.length) cleanupOk = false;
  }
  // Store ONLY disposable fixture identifiers and test outcomes; never credentials or sessions.
  await writeFile(process.env.STAGING_ACCEPTANCE_REPORT ?? '/tmp/unidoxia-staging-acceptance.json', JSON.stringify({ run, results, fixtureIds: ids, cleanupOk }, null, 2));
  console.log(`${cleanupOk ? 'PASS' : 'FAIL'} Exact-fixture cleanup and session sign-out`);
  await stopAdapter?.();
  if (!cleanupOk || results.some(r => !r.pass)) process.exitCode = 1;
}
