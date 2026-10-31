-- Regression test for 20261107000000_restrict_signup_role_metadata.sql.
-- Run inside a transaction on a database where that migration is applied; it only rolls back.
begin;
do $$
begin
  assert public.resolve_signup_role('{"role":"admin"}', '{}') = 'student', 'user metadata must not grant admin';
  assert public.resolve_signup_role('{"role":"staff"}', '{}') = 'student', 'user metadata must not grant staff';
  assert public.resolve_signup_role('{"role":"counselor"}', '{}') = 'student', 'counselor blocked';
  assert public.resolve_signup_role('{"role":"finance"}', '{}') = 'student', 'finance blocked';
  assert public.resolve_signup_role('{"role":"school_rep"}', '{}') = 'student', 'school_rep blocked';
  assert public.resolve_signup_role('{"role":"verifier"}', '{}') = 'student', 'verifier blocked';
  assert public.resolve_signup_role('{"app_role":"admin"}', '{}') = 'student', 'app_role alias blocked';
  assert public.resolve_signup_role('{"role":"student"}', '{}') = 'student', 'student signup kept';
  assert public.resolve_signup_role('{"role":"agent"}', '{}') = 'agent', 'agent signup kept';
  assert public.resolve_signup_role('{"role":"partner"}', '{}') = 'partner', 'partner signup kept';
  assert public.resolve_signup_role('{"role":"university"}', '{}') = 'partner', 'university alias kept';
  assert public.resolve_signup_role('{}', '{}') = 'student', 'default is student';
  assert public.resolve_signup_role('{"role":"student"}', '{"role":"staff"}') = 'staff', 'trusted app metadata honoured';
  assert not has_function_privilege('anon', 'public.ensure_user_profile(uuid,text,text,text,text,text)', 'execute'), 'anon cannot call ensure_user_profile';
end $$;
rollback;
