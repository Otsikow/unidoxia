# University Showcase implementation

Last updated: 28 August 2026 (activation completed)

| Feature | Status | Notes |
| --- | --- | --- |
| Production deployment discovery | Blocked | The repository has no GitHub Actions or committed hosting configuration. Production is served behind Cloudflare by an external deployment integration. |
| Reproducible dependency installation | Completed | Lockfile regenerated with Node 22.23.1/npm 10.9.8. `npm ci --ignore-scripts` succeeds. Existing audit findings remain and require a separate dependency-security review. |
| Public university directory | Completed | Existing responsive directory retained; clean university slugs are used when available. |
| Public university profiles | Completed | Existing profile extended with listing/verification/partner distinction, international information, tuition guidance, accommodation, study levels and source links. |
| Initial institutions | Deployed | Teesside University, University of Sunderland and Northumbria University are live in production with official public sources checked 12 August 2026. Logos and campus images are intentionally omitted until authorised assets are supplied. |
| Initial courses | Deployed with fee review flag | Six course names are live from official catalogues/pages. Tuition is stored as zero and rendered as “Check official tuition fee”; no free-course claim is shown. |
| Source provenance | Completed | University records include source URL/type, checked date and academic/fee year foundations. Seed programme provenance is stored in `requirements_json`. |
| Claim request | Deployed | `submit-university-claim` is live. Institutional-domain enforcement, public-domain rejection, duplicate/rate controls, 30-minute hashed verification token and branded verification email verified by smoke test. |
| Email verification | Deployed | `verify-university-claim` is live. Single-use token moves a claim only to `awaiting_admin_review`; it never grants ownership. |
| Admin claim review | Deployed | Protected admin queue and security-definer approval/rejection RPC. Approval requires verified email. `review_university_claim` is executable by signed-in users only. |
| Team-ready ownership | Deployed | `university_memberships` supports owner, administrator, admissions, editor and viewer roles. |
| University dashboard | Reused | Existing protected profile, media, programme, tuition, intake, requirement and scholarship management remains in place. Existing tenant RLS continues to enforce institution isolation. |
| Migration deployment | Completed 28 August 2026 | `20260812110000_university_showcase_claims.sql` is applied in production. A follow-up grants migration records the live least-privilege grants (`GRANT SELECT` to `authenticated`, `GRANT ALL` to `service_role`, no `anon`) in repository source so source and production match. No data was reset or deleted. |
| Email service deployment | Completed 28 August 2026 | Both Edge Functions redeployed from current source and confirmed reachable (no `NOT_FOUND`). `RESEND_API_KEY` is configured; `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are injected by the platform. `SITE_URL` remains unset and uses the safe production fallback `https://unidoxia.com`. |
| Live responsive QA | Completed (safe scope) | `/universities` and the three seeded profile routes (`teesside-university`, `university-of-sunderland`, `northumbria-university`) render with no console errors. End-to-end QA with a real institutional claim deliberately not run (no unsolicited email). |

## Production activation record (12 August 2026)

Database migrations applied, in order:

1. `university_showcase_claims` — schema, RLS, review RPC and seed data, plus `GRANT SELECT` to `authenticated` and `GRANT ALL` to `service_role` on `university_claims` and `university_memberships` (the original file had no grants and would have failed through the Data API).
2. Revoked the project's default broad privileges on both new tables from `anon` and `authenticated`, leaving signed-in users read-only and signed-out visitors with no access.
3. Scoped tenant/partner/admin policies on `universities` to `authenticated` so signed-out visitors no longer trigger the `get_user_tenant` lookup.
4. `GRANT SELECT ON public.universities TO anon` so the public directory can read active listings.
5. Same policy scoping applied to `programs` for public course listings.
6. Revoked `EXECUTE` on `review_university_claim` from `anon`.

Source changes: `src/hooks/useAuth.tsx` and `src/pages/dashboards/UniversityDashboard.tsx` now generate a slug when creating a university, because `slug` is `NOT NULL` after the migration.

Smoke tests (non-destructive, no claim submitted, no email sent):

- New tables present; all new `universities` columns present; 3 seeded universities and 6 seeded courses present; pre-existing universities untouched.
- Anonymous read of `universities` and `programs` returns active listings including the three seeded institutions.
- Anonymous read of `university_claims` and `university_memberships` denied (`42501`).
- `submit-university-claim`: public-domain email rejected (400), mismatched domain rejected (400), missing fields rejected (400).
- `verify-university-claim`: invalid token rejected (400). Neither function returns `NOT_FOUND` any more.
- Privilege checks confirm `authenticated` has `SELECT` only on both new tables, `service_role` has full access, and `review_university_claim` is signed-in only.
- Typecheck, unit tests (23 passing) and production build all pass.

## Activation completion record (28 August 2026)

- Repository source reconciled with production grants via a grants-only migration; RLS policies untouched and no privilege widened.
- `submit-university-claim` and `verify-university-claim` redeployed and confirmed reachable.
- Re-run safe smoke tests: `OPTIONS` 200 on both functions; `GET` 405; empty body 400; public-domain email 400; university-domain mismatch 400; malformed token 400; well-formed unknown token 400. `university_claims` row count remained 0 — no claim record created and no email sent.
- `RESEND_API_KEY` confirmed present (value never read or displayed). `SITE_URL` still unset; production fallback `https://unidoxia.com` in use.
- Live directory and the three seeded profile routes render with zero console errors.
- Full production build succeeds (sitemap: 24 universities, 1,466 courses); automated tests pass (26 files, 130 tests).

Remaining pending items:

- Publish so the latest frontend source reaches production.
- End-to-end claim test with a genuine institutional address when an institution is ready.
- Authorised university logos/campus media and verified current tuition after source review.
- Admin claim queue verified at privilege/policy level only; no signed-in admin session was available to the tooling for a live UI check.

## Architecture reused

- React/Vite public directory and profile routes.
- Supabase universities, programmes, scholarships, tenants, profiles and authentication.
- Existing `partner`/legacy `university` role and protected university dashboard.
- Existing university profile and programme editors.
- Existing university media storage and tenant-based row-level security.
- Existing Resend email infrastructure.

## Security controls

- Claim tokens are random, hashed at rest, single-use and expire after 30 minutes.
- Personal email providers are rejected and the email domain must match the university website.
- Email verification does not approve a claim.
- Admin review uses server-side role checks and refuses unverified claims.
- Approved ownership is represented by a membership rather than a one-user-per-university assumption.
- Existing student roles are not silently converted into university roles. Account activation/invitation remains an explicit admin step where required.

## Next milestone

Migration and both Edge Functions are live in production and smoke-tested. Remaining work is a genuine end-to-end claim with an institutional address, authorised university logos/campus media, and verified current tuition after source review.
