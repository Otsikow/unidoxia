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

-- Protected profile fields: real DB checks as the authenticated role. Everything rolls back.
-- Run as the database owner after the migration is applied. Uses throwaway rows only.
begin;
do $$
declare
  t_a uuid := gen_random_uuid(); t_b uuid := gen_random_uuid();
  u_student uuid := gen_random_uuid(); u_admin uuid := gen_random_uuid(); u_inactive_admin uuid := gen_random_uuid();
  u_target uuid := gen_random_uuid();
  ok boolean;
begin
  insert into public.tenants (id, name, slug, email_from, active) values
    (t_a, 'Test A', 'rt-a-' || t_a, 'noreply@udx-test.invalid', true),
    (t_b, 'Test B', 'rt-b-' || t_b, 'noreply@udx-test.invalid', true);
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role) values
    (u_student, 's@udx-test.invalid', '{"role":"admin"}', '{}', 'authenticated', 'authenticated'),
    (u_admin, 'a@udx-test.invalid', '{}', '{"role":"admin"}', 'authenticated', 'authenticated'),
    (u_inactive_admin, 'ia@udx-test.invalid', '{}', '{"role":"admin"}', 'authenticated', 'authenticated'),
    (u_target, 't@udx-test.invalid', '{"role":"student"}', '{}', 'authenticated', 'authenticated');
  assert (select role from public.profiles where id = u_student) = 'student', 'signup metadata admin ignored';
  assert (select role from public.profiles where id = u_admin) = 'admin', 'trusted app_metadata admin kept';
  update public.profiles set tenant_id = t_a where id in (u_student, u_admin, u_inactive_admin, u_target);
  update public.profiles set active = false where id in (u_inactive_admin, u_target);

  perform set_config('role', 'authenticated', true);

  perform set_config('request.jwt.claims', json_build_object('sub', u_student, 'role', 'authenticated')::text, true);
  begin update public.profiles set tenant_id = t_b where id = u_student; ok := true;
  exception when insufficient_privilege then ok := false; end;
  assert not ok, 'self tenant switch blocked';
  begin update public.profiles set active = false where id = u_student; ok := true;
  exception when insufficient_privilege then ok := false; end;
  assert ok, 'self deactivation allowed';
  begin update public.profiles set active = true where id = u_student; ok := true;
  exception when insufficient_privilege then ok := false; end;
  assert not ok, 'self reactivation blocked';

  perform set_config('request.jwt.claims', json_build_object('sub', u_inactive_admin, 'role', 'authenticated')::text, true);
  begin update public.profiles set active = true where id = u_target; ok := true;
  exception when insufficient_privilege then ok := false; end;
  assert not ok, 'inactive admin cannot reactivate others';

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  begin update public.profiles set active = true where id = u_target; ok := true;
  exception when insufficient_privilege then ok := false; end;
  assert ok, 'active admin can reactivate (AdminUsers workflow)';

  perform set_config('role', 'service_role', true);
  update public.profiles set tenant_id = t_b where id = u_target; -- trusted path allowed
  perform set_config('role', 'postgres', true);
end $$;
rollback;
