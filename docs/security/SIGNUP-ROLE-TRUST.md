# Signup role trust — prerequisite for student communication activation

Status: CONFIRMED vulnerability (read-only verification, 31 Oct 2026). Fix prepared, NOT applied.
Student-communication migration and function deployment are ON HOLD until this is fixed.

## Confirmed (live database, read-only)
- `auth.users` trigger `on_auth_user_created` -> `public.handle_new_user()` sets
  `new_role := (raw_user_meta_data->>'role')::app_role` with no allow-list, and writes it to
  `profiles.role` and `user_roles`. Any public signup can send `options.data.role = 'admin'`.
- Second path: `public.ensure_user_profile(p_user_id, p_role, ...)` is SECURITY DEFINER, executable by
  `authenticated`, accepts any `p_role`, and any `p_user_id` (not restricted to `auth.uid()`). It creates a
  profile (not a `user_roles` row) for any profile-less user with the chosen role.
- `user_roles` policies only allow self-insert of `student`; `prevent_direct_role_update` blocks direct
  `profiles.role` updates. Neither covers the two SECURITY DEFINER paths above.
- The communication function and its RLS policy trust `profiles.role in ('admin','staff')`.
- Current data: 1 admin, 0 staff profiles. No evidence of exploitation was found in role counts; this was not audited further.

## Uncertain
- Auth "before user created" hooks are Auth service configuration, not visible from the database. No hook
  function exists in the database (no `*hook*`/`before_user*` functions). Treat as: no hook protection.

## Fix (proposed, `docs/security/20261107000000_restrict_signup_role_metadata.sql`)
- `resolve_signup_role(user_meta, app_meta)`: privileged roles only from `raw_app_meta_data` (service-role
  only); self-service `student`/`agent`/`partner` (+ `university` alias) from user metadata; else `student`.
- `handle_new_user` uses it; otherwise identical.
- `ensure_user_profile` only repairs the caller's own profile (service role may target others) and uses the
  same resolver.
- Kept working: student/agent/partner signup, `invite-student` / `invite-agent` (they set agent/student and
  upsert `user_roles` via service role). Trusted staff/admin creation must set `app_metadata.role`.
- Regression test: `supabase/tests/signup_role_trust.test.sql` (rolls back; run after apply).

## Disposable test fixtures (prepared, NOT executed — needs approval)
- 2 tenants: slugs `udx-test-a`, `udx-test-b`.
- Auth users (emails `<role>.<run-id>@udx-test.invalid`, created with the service role
  `auth.admin.createUser({ email_confirm: true, app_metadata: { role } })`, no invite or confirmation emails):
  tenant A admin, staff, student, agent, partner, inactive staff (`active=false`); tenant B admin (foreign
  tenant) + student.
- Each user's tenant/active state is set by the service role; all created IDs are logged to an audit list.
- Sessions: real Auth password sign-in with generated one-time passwords held in memory; tokens never printed.
- Access matrix for `student-communication` + `student_communications` RLS:
  no token 401; student/agent/partner/inactive staff 403; tenant A admin/staff allowed for tenant A
  student only; tenant B admin cannot read or write tenant A records. Email stays off (`STUDENT_EMAIL_ENABLED`
  unset), so only `note` / `whatsapp_launch` records, no external delivery.
- Cleanup by exact logged IDs: delete ledger rows, students/agents/profiles/user_roles, Auth users, then the 2
  tenants; verify zero rows remain.

## Order of release (after approval)
1. Apply this fix migration; run the regression test.
2. Then the communication ledger migration (wrapper removed, as approved) and function deployment.
3. Then fixture setup, access matrix, cleanup.

## Addendum (31 Oct 2026): protected profile fields — CONFIRMED by owner's live read
- `authenticated` can UPDATE `profiles.tenant_id` and `profiles.active`; the own-row policy checks only
  `id = auth.uid()`; `prevent_direct_role_update` covers `role` only. A user could switch tenant or reactivate
  themselves, defeating the communication function's tenant/active checks.
- Fix (appended to the proposed SQL): `trg_guard_protected_profile_fields` (BEFORE UPDATE OF tenant_id, active),
  SECURITY INVOKER so it sees the real caller; no bypass GUC.
  - Trusted callers pass: `service_role` (invite-agent, delete-user), SECURITY DEFINER functions such as
    `isolate_partner_profile` / `sync_profile_role_from_user_roles`, migrations.
  - Self: may deactivate own account (Settings → Account); may NOT change tenant or reactivate.
  - Others: only actor with admin/staff in `user_roles` AND `profiles.active = true`
    (`actor_is_active_admin_or_staff`). Keeps AdminUsers / UserManagement / AdminStudents active toggles.
- Behaviour change to note: `useAuth.tsx` partner self-isolation does a client `update({ tenant_id })`. That path
  already depends on a client tenant INSERT, which tenants RLS allows only for admin/staff, so it does not work
  for partners today; after this fix it stays blocked. Proper route: the existing `isolate_partner_profile` function.
- Not changed (residual, separate decision): `is_admin_or_staff` (used by the `user_roles` ALL policy and others)
  ignores `active`. An inactive admin keeps role-management rights until roles are removed. Fixing it touches many
  policies, so it is left out of this narrow change; recommended follow-up.
- Tests: `supabase/tests/signup_role_trust.test.sql` part 2 runs real UPDATEs as `authenticated` with JWT claims
  on throwaway users/tenants inside a rolled-back transaction (self tenant switch blocked, self deactivate allowed,
  self reactivate blocked, inactive admin blocked, active admin allowed, service role allowed).

## Update 2026-10-31 — user_roles guard, isolated PGlite results, fixtures (REVIEW ONLY)

**Added to the proposed migration:** `guard_user_roles_mutation()` (SECURITY INVOKER) + `trg_guard_user_roles_mutation`
BEFORE INSERT/UPDATE/DELETE on `public.user_roles`. For `authenticated`/`anon` callers it requires
`actor_is_active_admin_or_staff(auth.uid())`, except the existing self-signup insert of the caller's own `student` row.
Trusted callers (service_role, SECURITY DEFINER signup/sync owners, migrations) pass via `current_user`; no settable flag.
Closes: an inactive admin/staff (whose `is_admin_or_staff` still returns true) promoting a newly registered alternate account.
The existing "Admins can manage user roles" policy is unchanged.

**Isolated test:** `docs/security/pglite/signup-role-trust.pglite.mjs` (PGlite, in-memory; never touches production).
Baseline = read-only snapshot of live functions (`baseline_live_functions.sql`) + copied live policies/triggers.
Every case uses a fresh DB and verifies by superuser readback; UPDATE/DELETE "success" counts only with `affected === 1`,
and 0-row updates are asserted as such. Result 2026-10-31: BASELINE 11 DEFECT / 13 SECURE; PROPOSED 24/24 SECURE.
Covered: privileged signup metadata, legit student/agent/partner signup, trusted app_metadata invite, self tenant switch,
self reactivation, self deactivation, AdminUsers active toggle by active admin, inactive-admin tenant/active/role
insert/update/delete, role-sync (grant staff → profile.role staff; revoke → student), service_role grants, direct
profiles.role edit, ensure_user_profile cross-user and own privileged repair.
Limits: the original `ensure_user_profile` is stubbed in baseline (defect previously confirmed against the live definition);
auth.uid()/role() are local stubs of the JWT claim functions; the live `app.bypass_role_guard` GUC in
`prevent_direct_role_update` remains (not settable through the Data API; noted, not changed).

**Separate existing issue (not in scope, not called):** `public.isolate_partner_profile(uuid)` is SECURITY DEFINER,
executable by `authenticated`, with no own-id/admin check. Track and fix separately; no RPC rewrite here.

**Residual (unchanged):** `is_admin_or_staff()` still ignores `active` for reads under existing policies.

**Fixtures:** must be created in an isolated staging/draft backend, not production — current global admin/staff policies
mean a test tenant in production cannot contain a new privileged account. Proposed set (reserved `.invalid` emails,
no notifications): tenants A/B; A: active admin, inactive admin, active staff, student, agent, partner, inactive student;
B: admin, student. Record created IDs; clean up by exact ID. Requires Eric's specific approval.

**Approval gates:** migration not applied to production; communication ledger SELECT remains revoked; no sessions, sends, or fixtures.
