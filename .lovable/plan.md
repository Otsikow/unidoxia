# Student communication activation — preflight findings and safe execution plan

All checks below were read-only. Nothing was applied, deployed, created or sent.

## Preflight findings

**Source** — synced head is `0d4ef9ee` (merge of PR #1266). Migration file is 36 lines and creates one table, `public.student_communications`. The function `student-communication` sits in `config.toml` with `verify_jwt = true`.

**Live state**
- `student_communications` does not exist, so there is no existing data.
- The function is not deployed (HTTP 404).
- `supabase_migrations.schema_migrations` has 137 rows, the newest `20260904150334`, and none for `20261106000000`. The project's own tracker holds 0000–0005.
- FK targets `tenants.id`, `students.id`, `applications.id` and `profiles.id` are all uuid primary keys, so the types match.
- `profiles.role` (enum), `active` (boolean) and `tenant_id` (uuid) exist. The function reads exactly these and requires role admin/staff, `active = true` and a non-null tenant.
- Row counts: 71 students across 2 tenants, 1 application, 298 student documents, 45 conversation messages, 0 legacy messages, 85 profiles, 85 auth users, 31 tenants.
- Profiles by role: 70 student, 6 agent, 8 partner (university), 1 admin, 0 staff. All 85 are active. Only 1 tenant has an admin or staff user.
- Relevant triggers: `profiles` has `trg_prevent_direct_role_update`. Event triggers are only the platform's standard ones (graphql, pgrst, cron, net).
- Disruption risk: low. The migration only adds things (new table, indexes, its own policy) and changes no existing table, policy or function. The `ON DELETE CASCADE/SET NULL` rules only act on the new table.
- `STUDENT_EMAIL_ENABLED` is unset (false). The function sends email only when it equals the literal `"true"` and `RESEND_API_KEY` is also present. `RESEND_API_KEY` exists, so the email path is held back only by this flag.

**Blockers and differences in the migration**
1. **Blocker:** the file has its own `begin;` / `commit;`. The migration tool refuses transaction-control statements and runs every migration in its own transaction. The file cannot be applied byte-for-byte. Option: apply lines 2–35 verbatim, removing only the begin/commit wrapper. Rollback behaviour stays the same.
2. `grant all ... to service_role` also grants TRUNCATE, REFERENCES and TRIGGER. That differs from the tightened pattern of migration 0005 (service_role limited to SELECT, INSERT, UPDATE and DELETE). This is noted, not changed, unless you say otherwise.
3. The read policy checks `profiles.role` rather than `user_roles`. It matches the function's own check and current project practice.

## Recovery options

- **Failure during apply:** verified mechanism. The tool runs the migration in one transaction and rolls back the migration file and journal entry on error.
- **Containment after commit, without deleting anything:** delete or undeploy the function only, and leave `STUDENT_EMAIL_ENABLED` unset. The ledger table is kept, and since clients cannot write to it, it can stay in place.
- **Backups:** daily backups and in-place restore are documented for Lovable Cloud. I cannot observe the backup inventory, and no restore has been verified. Point-in-time recovery is not available. To confirm, check the newest timestamp under More → Database → Manage → Backups before applying. An optional export first would preserve the current state.

## Test sessions

- Preview auth status is `signed_out`. `lovable auth-session` can mint real Auth-issued sessions for **existing** users without changing passwords, profiles or emails, and tokens stay in a local file. Minting for a specific user needs your approval for each user.
- Whether minting a session for someone else's account counts as impersonation is your call. I treat it as impersonation for real user accounts (students, agents, university users).
- **Missing fixtures:** no staff user, no inactive user, and no admin in a second tenant. The only admin is in the tenant that holds 70 of the 71 students. Testing staff, inactive and foreign-tenant rejection needs dedicated test accounts on test-only addresses that you create or approve, plus a test tenant. This is not possible under the current "create no users" rule.
- Without fixtures, verification is limited to: no token → 401; invalid validation payloads; RLS read checks through SQL. No real student rows would be messaged.

## Exact execution plan (after you approve, and once you decide on blocker 1)

1. Re-check that head `0d4ef9ee` is unchanged and the table is still absent.
2. Apply the migration through the migration tool, with only the begin/commit lines removed. Record it in the tracker as 0006.
3. Verify read-only: table, columns, checks, 4 indexes, RLS on, one SELECT policy TO authenticated; grants anon none, authenticated SELECT, service_role as written; existing row counts unchanged.
4. Deploy only `student-communication` and confirm `verify_jwt = true`. Leave `STUDENT_EMAIL_ENABLED` unset and do not touch PR #1234.
5. Smoke tests only: OPTIONS, then a POST without a token, which must return 401. Send no valid message, create no rows, and contact no student or external recipient. Check the function logs.
6. Role tests only if you provide or approve test fixtures (step above). Otherwise report them as not verified.
7. If any step fails, stop and use the containment option above. Do not publish the frontend.

## Decisions needed from you
- Approve removing `begin;` / `commit;` (blocker 1), or have the file changed on main.
- Keep `grant all` to service_role as written, or match the 0005 pattern?
- Test fixtures: authorise creating test-only accounts and a test tenant, or accept verification without them.
