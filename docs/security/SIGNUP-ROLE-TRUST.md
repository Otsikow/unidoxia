# Communication activation: security prerequisite

## Current state — 31 October 2026

The additional security SQL in `20261107000000_restrict_signup_role_metadata.sql` is a review proposal. It has **not** been applied to production. No existing account has been changed by this review.

Concurrent work in the shared project applied and recorded the separately authorised `20261106000000` ledger migration and deployed `student-communication` with JWT verification. Managed read-back confirms the ledger is empty, RLS is enabled, and authenticated SELECT is temporarily revoked. Keep that containment: the handler probes the ledger as its caller and refuses history/note/email operations when that read fails. `STUDENT_EMAIL_ENABLED` is absent; email is disabled. Do not restore ledger access or enable email on the strength of local tests alone.

## Findings and proposed changes

- Live `handle_new_user()` accepts privileged roles from caller-editable signup metadata. Proposed resolver accepts student/agent/partner (including the university alias) from that metadata; privileged roles require trusted Auth app metadata.
- Live `ensure_user_profile()` accepts arbitrary target IDs and roles for profile-less users. Proposed repair is restricted to the caller's own identity, with the same role resolver; trusted service operations retain their administrative path.
- Own-profile UPDATE currently permits tenant and active changes. Proposed invoker trigger prevents self tenant changes and self-reactivation, preserves self-deactivation, and checks active admin/staff authority before changing another profile. Existing trusted server paths remain available.
- Existing role-management policy ignores active status. Proposed invoker trigger blocks inactive actors from inserting/updating/deleting roles, including promoting an alternate account. It preserves the existing own-student-role insert and trusted signup/role-sync operations.

The proposed SQL changes functions/triggers and introduces helpers; it does not update existing account rows. It is separate from the already authorised ledger migration and needs migration-specific production approval.

Auth service before-user-created hook settings were not observable. Unsafe database paths were verified by their live definitions and reproduced locally; no privileged production signup or exploitation was attempted. Role counts alone are not a historical security audit.

## Verification

`pglite/signup-role-trust.pglite.mjs` uses an isolated PostgreSQL runtime, a snapshot of live functions including the actual profile-repair routine, copied role/profile policies, and role-sync triggers. Every case starts fresh. Positive mutations require one affected row and a read-back; zero-row updates are tested separately. The final proposed version passes all 24 behaviour checks in isolated execution. These are database-role/JWT simulations, **not real Auth-issued sessions** and not a full managed-schema replay.

`scripts/verify-signup-role-prerequisite.mjs` additionally replays the proposal twice and exercises actual signup trigger outcomes for every privileged role, ordinary signup variants, trusted staff creation, student/agent record creation, own-only repair, anonymous denial and protected-field regression SQL. It uses a minimal fixture schema, not production Auth.

Use a pinned test-only `@electric-sql/pglite@0.5.14` outside application dependencies, then run from the repository:

```sh
COMMUNICATION_PGLITE_MODULE=/absolute/temp/node_modules/@electric-sql/pglite/dist/index.js node docs/security/pglite/signup-role-trust.pglite.mjs
COMMUNICATION_PGLITE_MODULE=/absolute/temp/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-signup-role-prerequisite.mjs
```

Never run fixture-creating SQL against production as a substitute for isolated testing. Real Auth-issued positive/negative role acceptance remains required.

## Disposable Auth fixture proposal — not created

Recommend an isolated managed staging backend with matching schema/function versions and synthetic data only. Do not copy production data, credentials or signing secrets. Existing global admin/staff policies mean a test tenant alone does not isolate a new privileged live account. Confirm any new project cost before provisioning.

Bounded set: two test tenants; nine Auth accounts covering tenant A admin, active staff, inactive staff, students A1/A2, agent and university partner, plus tenant B admin/student. Use reserved `.invalid` identifiers, generated ephemeral credentials, Auth-issued password sessions, and no invitation/confirmation/welcome/reset email or other outbound notification. Record exact fixture IDs; never expose tokens or impersonate real users. Revoke sessions and deactivate only the created identities after testing. Permanent cleanup requires its exact-ID scope and authorisation.

Acceptance must cover capabilities, per-student/tenant history, note write and refresh read-back, application ownership, duplicate operation IDs, failed responses, forbidden direct browser ledger writes, drafts, session expiry, role manipulation, self-reactivation and all requested denied roles. Real student-owned portal chat is tested separately under its existing permissions. Email remains disabled throughout; sending and mailbox delivery require later recipient-specific authorisation.

## Recovery and release gates

Lovable's Backups view lists a backup from **31 October 2026 07:10:28 UTC**. Inventory was verified; restoration was not tested. Use transaction rollback on migration failure and preserve/contain the new ledger after commit. Do not restore a whole production database as a routine test or silently restore insecure function definitions.

1. Obtain specific approval for the reviewed security SQL; recheck live definitions/history, apply transactionally and record its exact version.
2. Run real Auth tests in approved isolated staging and compare managed schema/function versions. Keep email off and production history contained while acceptance remains incomplete.
3. Restore ledger SELECT only after the security and scope checks pass; verify the actual published admin flow separately. Do not reapply the original ledger migration blindly because that would restore SELECT during the hold.
4. Prepare sender/domain verification and request separate approval for one controlled email test. Provider acceptance, mailbox delivery and operational email enablement are separate gates.
5. Keep WhatsApp PR #1234 separate. No native WhatsApp or historical mailbox synchronisation is provided by this activation.

## Separate existing issues

`isolate_partner_profile(uuid)` is SECURITY DEFINER and callable by authenticated users without a caller-ownership/admin check. It was inspected, never called, and is outside this narrow migration. Existing `is_admin_or_staff()` still ignores active status for other policies, including reads; this proposal closes the role-mutation bypass but does not establish that the whole platform is secure. The existing client-side partner tenant-isolation path also needs a separately reviewed repair. Record and review these before expanding access or calling the platform fully operational.
