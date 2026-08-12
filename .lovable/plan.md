# University Showcase & Claim System — production readiness report

Read-only audit. Nothing was changed in code or the database.

## Findings

**1. Migration `20260812110000_university_showcase_claims.sql` — NOT applied**
- `university_claims` and `university_memberships` do not exist in the production database.
- None of the new `universities` columns exist (`slug`, `listing_status`, `verification_status`, `partnership_tier`, `claimed_at`, `source_url`, `source_type`, `last_source_checked_at`, `academic_year`, `fee_year`, `outreach_status`).

**2. Edge Functions — NOT deployed**
- `submit-university-claim` and `verify-university-claim` both return `NOT_FOUND` on the live functions host. The code exists in the repo and both are declared in `supabase/config.toml` with `verify_jwt = false`.

**3. Secrets**
- `RESEND_API_KEY` — configured.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — injected automatically into every function at runtime; no action needed.
- `SITE_URL` — not configured. Not a blocker: `submit-university-claim` falls back to `https://unidoxia.com`, which is the correct production origin.

**4. Published frontend**
- The live bundle at unidoxia.com already contains the claim code (the `submit-university-claim` / `university-claims/verify` strings are present in the deployed JS), and the public routes `/universities/:id/claim`, `/university-claims/verify` and admin `university-claims` are registered. The published site is on the 41c0ce31 feature code; the frontend is ahead of the backend, so the claim UI currently fails at the API layer.

**5. Migration conflict check against live data**
- 3 universities exist; no duplicate name-derived slugs, so the backfill plus `NOT NULL` plus unique index is safe.
- No tenant with slug `teesside-university`, `university-of-sunderland` or `northumbria-university`; no university named the same; none of the seed program IDs exist. The seed adds 3 new tenants, 3 universities and 6 programs without touching existing records.
- `tenants.slug` is unique, so the `ON CONFLICT (slug)` upserts are valid.
- The `set_university_slug` trigger fires on insert/update of `name`/`slug` only; it does not conflict with existing university triggers.

**Defect found in the migration — missing table grants**
The migration creates `university_claims` and `university_memberships`, enables RLS and adds policies, but issues no `GRANT` statements. Without grants the Data API returns a permission error, so the admin claim-review page (`AdminUniversityClaims.tsx`) and the claimant read policy will fail even after the migration runs. This must be fixed before applying.

## Blockers

1. Migration not applied (and missing grants as written).
2. Edge Functions not deployed.

Neither blocks anything else; both are actionable from this project.

## Safest activation sequence

1. Apply the migration with grants added — a `GRANT SELECT, INSERT, UPDATE, DELETE ON public.university_claims TO authenticated`, the same for `university_memberships`, and `GRANT ALL` on both to `service_role` (no `anon` grant; claims are never publicly readable). Everything else in the file is already idempotent.
2. Deploy `submit-university-claim` and `verify-university-claim` (automatic once the functions are touched in a build step).
3. Smoke test read-only first: confirm `/universities` still lists, then confirm a claim submission with a public-domain email is rejected and a mismatched-domain email is rejected, before any real institutional submission.
4. Verify one real end-to-end claim: submit, receive the Resend verification email, follow the link, confirm the claim moves to `awaiting_admin_review`, then approve it from the admin queue.
5. Optionally set `SITE_URL` as a secret only if you ever want verification links pointed at a non-production origin.

## What I can do from here

- Apply the migration (with the grant fix) — yes, via the migration flow with your approval.
- Deploy both Edge Functions — yes.
- Set secrets — no; `SITE_URL` would need to be added by you in Project Settings → Secrets, and it is not required.
- Publish the frontend — not required; the live site already has the code.
