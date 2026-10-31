# Partner workspace and active-staff safeguards

Status: prepared locally; not applied to production.

Read-only production inspection confirmed that authenticated users can execute `isolate_partner_profile(uuid)` without an owner/admin check. The routine bypasses row permissions and creates a tenant/university before reassigning the requested partner. Repeating calls also creates duplicate workspaces. Its status helper exposes another partner's isolation state. No live RPC was called to demonstrate these defects.

The forward migration `20261031134909_secure_partner_workspace_access.sql` adds an internal, non-browser-callable permission guard. Only an active partner acting on itself, active admin/staff in the target's current tenant, or the trusted service role can operate on an active partner. Anonymous execution is removed. The routine locks the partner row, checks isolation after acquiring that lock and reuses an existing dedicated workspace. It retains the existing university/contact creation fields. The migration changes functions/grants only, and does not move any existing profile or create any business row.

The existing `is_admin_or_staff(user_id)` helper now also requires the current profile to be active. Its role sources, argument name and active-account behaviour remain unchanged. Production inspection identified 70 policies referencing this helper. This closes that helper's inactive-admin/staff route; policies that directly use `has_role` or other predicates are outside this narrow change and are not claimed fixed.

## Validation

- `scripts/verify-partner-workspace-security.mjs`: 31 isolated PostgreSQL checks pass, including a baseline reproduction with transaction rollback, owner/foreign/student/inactive denial, anonymous/internal-helper denial, active-admin read access, inactive read/update/insert denial, owner and staff isolation, repeat/replay idempotency, trusted service operation and no migration business-row changes.
- Local Auth claim functions are stubs. These results do not constitute actual-Auth, concurrency or production acceptance.
- `staging/partner-workspace-auth-acceptance.mjs` and the explicitly isolated fixture schema prepare genuine Auth/Data API checks, including simultaneous owner RPCs and deactivating an already signed-in administrator. Credentials are environment-only, addresses reserved `.invalid`, no notifications/providers, exact fixture cleanup, and strict staging hostname guard.
- Actual-Auth staging results and migration-specific live approval/read-back are required before release to production. No new privileged accounts may be created in production for testing.

The CLI generated the forward filename using the current date. Its timestamp precedes already-recorded future-dated migrations; a live release must explicitly select and record this reviewed migration rather than assume an automatic latest-version comparison will apply it. The file does not depend on the unapplied receipt migration.

Reference: [Supabase database function security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).
