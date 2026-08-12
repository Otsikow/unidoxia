# University Showcase implementation

Last updated: 12 August 2026

| Feature | Status | Notes |
| --- | --- | --- |
| Production deployment discovery | Blocked | The repository has no GitHub Actions or committed hosting configuration. Production is served behind Cloudflare by an external deployment integration. Merge `7e2ce80d` did not deploy automatically. |
| Reproducible dependency installation | Completed | Lockfile regenerated with Node 22.23.1/npm 10.9.8. `npm ci --ignore-scripts` succeeds. Existing audit findings remain and require a separate dependency-security review. |
| Public university directory | Completed | Existing responsive directory retained; clean university slugs are used when available. |
| Public university profiles | Completed | Existing profile extended with listing/verification/partner distinction, international information, tuition guidance, accommodation, study levels and source links. |
| Initial institutions | Completed in migration | Teesside University, University of Sunderland and Northumbria University use official public sources checked 12 August 2026. Logos and campus images are intentionally omitted until authorised assets are supplied. |
| Initial courses | Completed with fee review flag | Six course names are seeded from official catalogues/pages. Tuition is stored as zero and rendered as “Check official tuition fee”; no free-course claim is shown. |
| Source provenance | Completed | University records include source URL/type, checked date and academic/fee year foundations. Seed programme provenance is stored in `requirements_json`. |
| Claim request | Completed in code | Institutional-domain enforcement, public-domain rejection, duplicate/rate controls, 30-minute hashed verification token and branded verification email. |
| Email verification | Completed in code | Single-use token moves a claim only to `awaiting_admin_review`; it never grants ownership. |
| Admin claim review | Completed in code | Protected admin queue and security-definer approval/rejection RPC. Approval requires verified email. |
| Team-ready ownership | Completed | `university_memberships` supports owner, administrator, admissions, editor and viewer roles. |
| University dashboard | Reused | Existing protected profile, media, programme, tuition, intake, requirement and scholarship management remains in place. Existing tenant RLS continues to enforce institution isolation. |
| Migration deployment | Pending | The migration and two Edge Functions must be applied to the linked Supabase production project. No production database mutation has been claimed. |
| Email service deployment | Pending | Deploy `submit-university-claim` and `verify-university-claim`; verify `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` and `SITE_URL`. |
| Live responsive QA | Pending | Local build is ready; production QA follows database/function deployment and external website publication. |

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

Apply the migration and Edge Functions to staging, run end-to-end email and approval tests, then publish the merged frontend through the external production deployment integration. Add authorised university logos/campus media and verified current tuition after source review.
