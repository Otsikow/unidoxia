# Signup role trust — prerequisite for student communication activation

Status: the reviewed identity safeguards were applied and read back on 31 October 2026 after Eric’s migration-specific approval. See the current activation note below; earlier findings and staging limits are retained for audit.
The communication table/function are deployed. Staff history access was restored after the security read-back; outbound sending was opened only for one owner-approved controlled test and is off. Provider receipts and native external conversations remain separate features.

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

## Release-ready migration — follow-up implementation

The prepared SQL is now packaged as `supabase/migrations/20261108000000_secure_communication_identity.sql` with transaction boundaries. The isolated harness loads this actual forward migration, rather than the earlier review copy, and accepts `COMMUNICATION_PGLITE_MODULE=/absolute/temp/node_modules/@electric-sql/pglite/dist/index.js` so no production connection or application dependency change is needed. The earlier `docs/security/20261107000000...sql` remains the historical review proposal and must not be independently applied as a second migration.

The forward migration does not restore the communication ledger grant, enable email, mint sessions, provision test tenants, modify existing accounts or deploy the separate WhatsApp implementation. Privileged account fixtures require isolated staging and specific authority. The local checks model actual SQL mutation/read-back against fixture policies; they do not prove production Auth behaviour or a complete schema replay. Existing historical privileged accounts are not silently reclassified.

## Authorised isolated actual-Auth acceptance — 31 October 2026

Eric subsequently approved isolated testing. A separate unpublished Lovable test backend was provisioned, using synthetic reserved-address accounts only. The corrected, production-SDK-pinned run passed 31/31 checks with cleanup; independent managed queries confirmed zero remaining accounts/application fixtures. Details and earlier failed setup attempts: `staging/RESULTS-2026-10-31.md`. The new project's runtime cannot host the original Edge format, so actual Auth/RLS handler checks used a loopback adapter; the Edge-gateway/full-production-clone limit remains explicit. This staging approval did not apply the security migration or restore communication access in production.

## Production identity activation — 31 October 2026

Eric explicitly approved migration `20261108000000_secure_communication_identity.sql` after the real-Auth staging result. Security PR #1268 was merged, and the byte-identical migration (SHA-256 `db396a1fb110cc42c9ed1cdce003cd271bb54c7436bd0e77218484e7af94dbe4`) was applied transactionally and recorded in `supabase_migrations.schema_migrations`. The first oversized apply/log request was rejected; read-back confirmed no partial changes. The successful ledger entry records the GitHub source/hash instead of duplicating the full SQL body.

Live read-back verified both signup/profile-repair paths use the safe resolver, both new guard triggers are enabled, the original direct-role guard remains enabled, anonymous profile repair/client role-resolution execution is denied and the trusted resolver grant remains. Baseline student/account/profile/application/document/message counts were unchanged. No privileged production test account was created and no existing account was reclassified.

After these checks, the originally approved communication-table SELECT grant was restored with active-staff/own-tenant RLS still enabled and browser INSERT/UPDATE still denied. The owner’s existing signed-in dashboard successfully read the live history through the deployed JWT-verified endpoint, providing a read-only check of that current gateway/handler path. This does not replace the stated full-schema/legacy-policy audit limits.

One authorised neutral email test was accepted by the provider and recorded once against the existing nominated test student. The owner subsequently confirmed mailbox receipt with the correct original signature. Provider acceptance alone is not mailbox delivery or a human reply. The sending flag was removed after the test; operational bulk/student messaging is not enabled by this record. Private recipient, audit identifiers and before/after counts stay in the owner’s private workspace evidence, not this public repository.

Residual legacy global inactive reads and the separate partner-isolation RPC issue remain tracked; this migration is not represented as a complete platform-wide security audit.
