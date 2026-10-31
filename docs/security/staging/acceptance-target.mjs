/** Explicitly isolated targets only. Local mode never falls back to a hosted backend. */
export function assertAcceptanceTarget(rawUrl, expectedRef, localMode=process.env.UNIDOXIA_LOCAL_ACCEPTANCE) {
  let url;
  try { url=new URL(rawUrl); } catch { throw new Error('An isolated acceptance target is required'); }
  const clean=!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/';
  const allowed=localMode==='true'
    ? expectedRef==='local-ci-only'&&url.origin==='http://127.0.0.1:54321'
    : expectedRef==='qazshxpvfbhlybkmmkaf'&&url.origin==='https://qazshxpvfbhlybkmmkaf.supabase.co';
  if(!clean||!allowed)throw new Error('Acceptance runner refused a non-isolated target');
}
