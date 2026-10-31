# Partner workspace and active-staff safeguards

Status: prepared locally; not applied to production.

Read-only production inspection confirmed that authenticated users can execute `isolate_partner_profile(uuid)` without an owner/admin check. The routine bypasses row permissions and creates a tenant/university before reassigning the requested partner. Repeating calls also creates duplicate workspaces. Its status helper exposes another partner's isolation state. No live RPC was called to demonstrate these defects.

The forward migration `20261031134909_secure_partner_workspace_access.sql` adds an internal, non-browser-callable permission guard. Only an active partner acting on itself, active admin/staff in the target's current tenant, or the trusted service role can operate on an active partner. Anonymous execution is removed. The routine locks the partner row, checks isolation after acquiring that lock and reuses an existing dedicated workspace. It also repairs a missing university record in that existing tenant without creating a new tenant. The new `ensure_partner_workspace` client entry point is absent from legacy deployments, so the frontend cannot accidentally use the earlier unsafe implementation. It retains the existing university/contact creation fields. The migration changes functions/grants only, and does not move any existing profile or create any business row.

The existing `is_admin_or_staff(user_id)` and `has_role(p_user_id, p_role)` helpers now also require the current profile to be active. Their trusted role sources, argument names, existing grants and active-account behaviour remain unchanged. Read-only production inspection identified 70 policies referencing the staff helper and 20 using direct role checks. Both named helper paths are covered; unrelated custom predicates are not represented as a complete platform-wide security audit.

## Validation

- `scripts/verify-partner-workspace-security.mjs`: 37 isolated PostgreSQL checks pass, including a baseline reproduction with transaction rollback, owner/foreign/student/inactive denial, anonymous/internal-helper denial, active-admin read access, inactive read/update/insert denial, owner and staff isolation, repeat/replay idempotency, trusted service operation and no migration business-row changes.
- Local Auth claim functions are stubs. These results do not constitute actual-Auth, concurrency or production acceptance.
- `staging/partner-workspace-auth-acceptance.mjs` and the explicitly isolated fixture schema prepare genuine Auth/Data API checks, including simultaneous owner RPCs and deactivating an already signed-in administrator. Credentials are environment-only, addresses reserved `.invalid`, no notifications/providers, exact fixture cleanup, and strict staging hostname guard.
- Actual-Auth staging results and migration-specific live approval/read-back are required before release to production. No new privileged accounts may be created in production for testing.

The CLI generated the forward filename using the current date. Its timestamp precedes already-recorded future-dated migrations; a live release must explicitly select and record this reviewed migration rather than assume an automatic latest-version comparison will apply it. The file does not depend on the unapplied receipt migration.

Reference: [Supabase database function security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).


## Sign-in and dashboard recovery

Partner sign-in now calls the versioned guarded RPC and reloads the exact server-assigned profile before allowing dashboard access. It never creates tenants/universities or changes a profile tenant from the browser. Failed/mismatched read-back blocks the shared workspace with a recovery screen. Inactive accounts are blocked before onboarding and role redirects. The obsolete client profile-creation fallback was removed: live profile INSERT policies already deny its non-null-tenant write, so failed server repair now shows the existing account-repair screen rather than attempting more orphan tenant/university creation. Normal signup and existing attribution flows are retained.

Frontend validation: 568 tests passed, TypeScript and production build passed; targeted lint has zero errors and two pre-existing hook/export warnings in `useAuth.tsx`. The initial pre-frontend-refinement migration/harness revision `713d4a4c` passed 19/19 actual-Auth/Data API staging checks, including concurrent setup, with independent zero-fixture read-back. Revision 713fb694 also passed 19/19 actual-Auth checks for the versioned API and missing-university repair, with independently confirmed cleanup. The final extension covering both shared role helpers is undergoing its own staging rerun. No live user/account was altered.


Local schema-compatibility checks also mirror required tenant/university columns, unique tenant ownership and the production university-slug trigger. They pass without weakening these constraints. Staging is a minimal isolated schema, not a complete production clone. Read-only production preflight found no role entries without an active profile; private live counts are not stored here.
