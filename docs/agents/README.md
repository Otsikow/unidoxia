# Agent registration and certificate repair — 7 November 2026

## Findings

- ProfileInfoTab used an agent upsert. The repository grants owner SELECT/UPDATE but no self INSERT policy. PostgreSQL checks INSERT even on an upsert that updates an existing row. This matches Eric's supplied `agents` RLS error. Live policy definitions could not be read: the Lovable connector returned internal errors.
- The agent Documents tab rendered the student uploader and required a students row. Agency certificates had only a manual-link field.
- The secure signup trigger inserts agents without username/team_invite_code. Historical migrations make these NOT NULL without defaults. In the local representative schema the actual signup trigger catches this error and rolls back profile creation while Auth account creation succeeds. The proposed insert trigger fills only required identity fields from the stored profile/UUID. Whether these constraints are identical in production must be confirmed before activation.

## Change

- Existing agents save through an owner/tenant-filtered UPDATE with returned-row confirmation. A missing agent row has a narrowly restricted INSERT path based on the stored active agent profile, never signup metadata.
- Dedicated agent certificate uploader: PDF/JPEG/PNG, signature validation, 10 MB limit, unique object path, upload size verification and durable link before success. Failed uploads retain the selected file; response-loss recovery preserves potentially linked files. Replaced certificates remain private for review/audit.
- Private `agent-documents` bucket with owner read/upload and same-tenant active staff review. No overwrite policy. Owner cleanup only for unlinked files. New documents reset approval to pending. Protected identity, activation, approval, payout and commission fields cannot be self-edited.
- Admin Agents drawer resolves private certificates into five-minute signed links. Existing HTTPS external links remain supported.
- No existing accounts, roles, commission settings or document rows are changed by this migration.

## Validation

- `node docs/agents/agent-onboarding.pglite.mjs` with `AGENT_PGLITE_MODULE` pointing to an installed PGlite: actual signup function + forward migration, representative constraints and RLS, baseline reproductions, isolation/privilege checks.
- Vitest helper/component tests cover owner filters, missing-row repair, zero-row failure, link validation, upload/save rejection and retry, response loss and signed links.
- Manual GitHub backend-acceptance workflow now supports `agents`: real local Supabase Auth signup/login, Data API writes and private Storage round trip, cross-account and reviewer isolation, public access rejection, replacement review state and independent cleanup. It runs only on disposable localhost without production credentials/providers. This is a representative schema, not a production clone.

## Live activation gates

1. Read actual columns, defaults, NOT NULL/check/unique constraints, all triggers/functions on agents, `handle_new_user` and `ensure_user_profile`, and all agent/Storage policies. Confirm live grants and tenant-role helpers. Review all existing Storage policies, including any restrictive policies. This migration adds restrictive boundaries to prevent broad existing permissive grants from exposing certificates; local checks stress this with an intentionally broad grant.
2. Confirm the exact migration is absent from `supabase_migrations.schema_migrations`. Obtain Eric's migration-specific approval for `20261107153640_agent_profile_documents.sql` after reviewing its exact commit/hash. Apply only that migration transactionally and record the ledger entry. Do not apply unrelated pending migrations.
3. Read back the bucket privacy/limits, trigger bodies, policies and grants. Run Supabase security advisors. Verify existing profiles/agents/roles fingerprints are unchanged.
4. Merge only after review/checks and activation coordination. Confirm exact Lovable sync/preview and resolve any attributable build error. Publish only when Eric explicitly authorises it.
5. Test signed-in agent registration, profile save, certificate upload/open/refresh, rejected upload/retry and authorised reviewer access. Use an agreed isolated account; do not submit documents or mutate another agent's real data. New registrations may have existing Auth accounts and require login/password recovery rather than duplicate signup.

No live migration, publication or live authenticated agent test has been performed by this task. The public registration failure is not certified resolved until the above gates pass.

## Verified implementation result

- Application tests: 643/643 across 100 files; targeted ESLint, TypeScript and Vite build passed. Diff checks passed.
- Local SQL: 29/29 checks, including baseline reproductions and adversarial broad Storage grants.
- Actual localhost Auth/Data API/Storage: 18/18 checks passed at implementation commit `af44350` in [GitHub run 42388133126](https://github.com/Otsikow/unidoxia/actions/runs/42388133126). Independent SQL read-back confirmed zero synthetic Auth accounts, fixture rows or Storage objects, with original tenants unchanged. The first attempts exposed a reviewer-fixture role setup issue; the final fixture grants staff through trusted `user_roles`, matching the existing acceptance pattern.
- Reviewed forward migration SHA-256: `4903601df11645a7abe1bdf02e187e5f060725f4249a2b10072b16d4329b9df9`.
- Delivery: draft PR #1291, feature branch retained for review. Not merged, activated or published; exact Lovable preview of this change is not verified. The connector's project/database reads returned internal errors.
- Existing malformed accounts that also lack a profile or trusted role assignment require live reconciliation through the established account-repair/staff process. This task does not silently backfill or grant roles to existing accounts.
