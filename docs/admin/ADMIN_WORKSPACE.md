# One admin workspace

## Decision — 31 October 2026

Eric explicitly selected the simplified Admin Control Centre shown at `/admin/applications` as the single admin interface. The older `/dashboard/applications` screen used the same application data but a different sidebar and greeting panel, causing understandable confusion. This consolidation is a separate follow-up based on the merged Students build (#1255).

## Ownership

- `AdminLayout` is the only admin navigation shell. It renders either nested route content or supplied shared-tool content, with a compact header, theme control and grouped navigation.
- `AdminShellContext` identifies content already inside that shell. `DashboardLayout` returns its content directly there; shared tools therefore cannot nest a second admin sidebar.
- Standalone shared pages also choose `AdminLayout` for the resolved admin role. Staff, student, agent and partner shared layouts remain available for those roles. The old admin menu configuration and unused legacy admin-dashboard lazy import were removed.
- Essential operational tools have direct sidebar links. Less-frequent shared workspaces remain available in Tools. My profile, Preferences and platform Settings have distinct purposes; no settings functionality is silently replaced.

## Canonical routes and compatibility

`src/lib/adminNavigation.ts` is the compatibility map. Admin landing is `/admin/overview`; application listing and creation are `/admin/applications` and `/admin/applications/new`; students remain `/admin/students` and `/admin/students/:studentId`.

After all existing authentication, verification, signup and allowed-role checks pass, ProtectedRoute maps known older URLs for users with the database-derived admin role. Query strings, fragments and navigation state are retained, and redirects replace the old history entry. Non-admin users retain their shared paths. Unknown routes and other portals are not guessed into new destinations.

Every mapped target has an actual admin route. Existing shared tools are reused with their existing data hooks, backend functions and permissions. Distinct student payment history, team reports, resource library, recruitment leads and partner-directory tools are preserved as separate pages; they are not silently exchanged for the existing platform payment/report/resource pages. No financial behaviour changes.

Older in-app links in application creation and student records remain compatible via this central mapping. Avoid adding page-local admin redirect rules or another sidebar; extend the compatibility map and registered route tree together when necessary.

## Mobile and accessibility

The admin menu closes when a destination is selected. The menu has an accessible title/description, and the compact header reserves space for its menu button. Temporary browser viewport overrides were reset after testing.

## Verification and release limits

Tests cover canonical destination/route registration, query/hash/state preservation, unknown-route behaviour, sign-in/verification/signup/role gates, metadata role spoofing, one-shell rendering, staff layout preservation, and desktop/mobile admin navigation. The final full suite passed 461 tests in 66 files, including the route-registration regression check.

Local browser verification used a synthetic account and synthetic records. An actual old application URL redirected to the new URL with query/hash preserved; Applications and Students rendered under the same shell; a synthetic shared task page rendered exactly one admin shell; the mobile content width matched its viewport and selecting Students closed the menu. The task page was a navigation fixture, not a backend task acceptance test. No real student records, communications, account settings, permissions or financial transactions were changed.

No database migration or access policy change is required. Real Auth-issued mutation checks for the Students account-management changes remain outstanding. This document is implementation/review evidence, not confirmation of merge or live publication. Use the GitHub-to-Lovable release workflow and verify the exact merged commit before publishing.

Final validation: all 461 tests in 66 files passed; the existing agreement gate remains mounted for shared pages even when their navigation shell is supplied by AdminLayout. Targeted lint has no errors and one pre-existing App.tsx fast-refresh warning. TypeScript and Vite application build passed. The Students detail retains its previously documented hook warnings. No real Auth-issued account mutation acceptance or production publication is implied.
