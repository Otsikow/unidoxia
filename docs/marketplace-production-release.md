# Marketplace controlled production release

Last pre-flight: 12 August 2026

## GitHub state

- PR: #1197, draft and mergeable
- Head: `e910c5120f3698134abea2c412468b45bbc563c0` at pre-flight start
- Base: `552c7ee9c1b2b03687e59be2da0370d3d68d1fa1`
- Latest `main` is an ancestor of the feature branch; no reconciliation commit was required.
- GitHub reported no status checks, submitted reviews or PR comments.

## Read-only production pre-flight

The public production API confirmed the expected pilot universities and IDs:

- Teesside: `20000000-0000-4000-8000-000000000001`
- Sunderland: `20000000-0000-4000-8000-000000000002`
- Northumbria: `20000000-0000-4000-8000-000000000003`

Each university currently has two active seeded programmes. The catalogue migration is not applied: `program_intakes`, `programs.catalogue_status` and `search_programmes` are absent. Anonymous access correctly cannot enumerate application relationships.

The six stable seeded IDs now map explicitly to reviewed official variants. This prevents duplicate creation and preserves any application foreign keys:

| Seed | Reviewed official variant | Planned action |
| --- | --- | --- |
| Teesside MSc Computer Science | Computer Science MSc | update existing ID |
| Teesside MSc International Management | International Business Management MSc | update existing ID |
| Sunderland BSc (Hons) Computer Science | same official title | update existing ID |
| Sunderland MSc International Business Management | same official title | update existing ID |
| Northumbria International Business Management MSc | 1 year full-time September variant | update existing ID |
| Northumbria MSc Computer Science | 1 year full-time September variant | update existing ID |

Privileged read-only confirmation of application counts remains required before apply. The importer never deletes or replaces these IDs.

## Migration and recovery

Static migration safety tests confirm additive structures, active-only public reads, no anonymous writes, no programme reset/delete, indexed paginated search and historical intake states. Partner hard-delete access is removed in favour of archive/publish.

A disposable Postgres/Supabase runtime is not installed in the current Codex environment, so an executable fresh-database migration test remains a release gate. If production migration fails, stop before import; do not improvise alternate SQL. Because the migration is additive and import has not begun, recovery is to diagnose and deploy a reviewed follow-up correction from GitHub.

## Dependency advisories

Compatible patches reduced production audit findings to two moderate React Router advisories:

- `GHSA-wrjc-x8rr-h8h6`: open redirect through backslash navigation. Authentication redirects already reject backslashes, and notification action URLs are now restricted to same-origin paths. Remaining dynamic navigation should continue to use controlled internal routes.
- `GHSA-337j-9hxr-rhxg`: constructor injection in SSR error hydration. UniDoxia is a Vite client SPA using `BrowserRouter`, not React Router SSR hydration, so the affected SSR path is not used.

npm only offers React Router 7 for complete remediation. That breaking migration is deferred to a separately reviewed change; `npm audit fix --force` was not used.

## Outstanding production gates

1. Provide service-role and database access through an approved secret mechanism, never chat or source files.
2. Run privileged read-only application-link and schema/RLS inspection.
3. Execute all migrations against a disposable database representing `main`.
4. Run the production importer in dry-run mode and reconcile exact creates, updates, unchanged, skips and archive candidates.
5. Complete PR review, merge, exact migration deployment, post-migration dry-run and controlled import.
6. Read back production counts, deploy merged `main`, then complete database search, sitemap, analytics, admin, university-management, desktop and mobile QA.

University outreach is not part of this release.
