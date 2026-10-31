# Application dashboard task ledger

## Review candidate — 31 October 2026

Request: make UniDoxia's application dashboard simple and operational for student university applications, using ApplyBoard/CourseFinder as functional benchmarks.

Completed locally: real staff queue; student-first application start; focused application workspace; explicit document view/verification; notes/status with conflict detection; manual university submission reference history; failed-upload recovery and durable document read-back; supported passport-photo storage; truthful UniDoxia receipt wording; application-document bucket correction. Existing branding and protected routes retained.

Superseded: the never-applied university-document SELECT policy was removed from the 31 October usability candidate. No database access changes are included.

Validation: 398 unit/component tests passed in 54 files; TypeScript check passed; Vite application build passed; diff whitespace check passed; new files lint clean; modified legacy form/review files retain three hook warnings. Local PostgreSQL 16 policy test passed, including repeat application and cross-university/anonymous denial. The queue and application workspace were visually checked at desktop and 390×844 phone size using an isolated local UI fixture with synthetic records (not real Auth/API evidence). No full managed-stack restoration, Auth-issued staging walkthrough or live student mutation performed.

Next: review; authenticated staging verification; resolve first-application agent access and historical student-document compatibility before claiming broad role readiness; exact-commit Lovable preview; Eric's Publish handoff. See README.md for evidence and limitations.

## Export gate

Automatic approval review rejected the combined GitHub push: the specific source-code/access-policy payload and repository destination require explicit user approval. The changes were then committed locally only. No branch push, pull request, merge, Lovable sync, managed migration or publication was performed. Request approval to export this exact branch to `Otsikow/unidoxia` and create a draft PR; that approval must not be treated as permission to apply the database migration or publish.

## Authenticated ApplyBoard benchmark — 31 October 2026

Eric supplied access to the signed-in Brave agent dashboard. Read-only inspection covered Home, Students/student profile, document-vault controls, search/eligibility controls, programme detail, Applications and My Tasks. No student data/actions, invitations, payments or applications were changed. Functional observations and limits are in APPLYBOARD_BENCHMARK.md; no personal student or private commercial data is retained. The key recommended change is separate stage/outcome/requirements/payment/submission evidence, with a simple owner/next-action/deadline queue and student-centred workspace. A complete application case was not available to inspect. Before further implementation, reconcile this older dashboard branch with published upload fix #1252; retain the newer upload code. This audit does not authorise publishing the remaining dashboard or changing production permissions.

## Usability implementation — 31 October 2026

Reconciled with published upload fix #1252; kept its upload helpers and new-application form unchanged. Removed the never-applied access-policy migration/fixture. Replaced sample staff applicants with authorised database records, defaulted the queue to needs attention, showed follow-up owners/dates and overdue/blocked flags, and added mobile cards. Simplified the workspace into Overview, Documents, Follow-ups and History, with next-action guidance, protected unsaved edits and conflict checks. Connected existing application tasks for creation, claim, completion and reopening; added read-only student document requests with explicit scope wording. Internal dates respect UK days and exclude Sundays.

Validation: 432 tests in 60 files passed; TypeScript passed; targeted workflow lint passed; Vite bundle build passed. Local browser checks covered the desktop queue/workspace, adding a synthetic follow-up and a 390×844 phone layout with no horizontal overflow. Screenshots are in `outputs/unidoxia-easier-dashboard` in the surrounding workspace. Synthetic UI checks do not replace authenticated backend mutation tests. No real student data, tasks, documents or permissions changed. GitHub export remains subject to the earlier exact-payload approval gate; no publication performed.

## GitHub review handoff — 31 October 2026

Eric explicitly approved exporting the tested candidate and opening its PR. Implementation commit `6405878d2cdf56bd0d07269b98bb4e281c894e7a` was pushed to `Otsikow/unidoxia`, branch `codex/application-workflow-end-to-end`. Draft PR #1253: https://github.com/Otsikow/unidoxia/pull/1253. Read-back confirmed OPEN, draft and MERGEABLE against `f0b5b3eac41b457d648dad86dd81dfc8a0274278`; no automated GitHub checks were reported at that read-back. This approval supersedes the earlier export block for this candidate only. No merge, Lovable publication or production database mutation was performed. Real Auth-issued workflow checks remain a release requirement.

## Admin navigation correction — 31 October 2026

Eric could not find Applications in the main admin dashboard after publishing #1253. Root cause: AdminLayout had no Applications entry, while both overview admissions shortcuts targeted `/admin/admissions`, which redirected back to the overview. Added `/admin/applications` inside the existing admin shell, reusing the same staff queue without nesting a second dashboard shell. Added a Students & Agents sidebar entry, fixed both overview shortcuts and redirected the legacy admissions URL to Applications. Existing `/dashboard/applications` and its role routing are preserved. No Auth, RLS, data, upload or workflow mutations changed.

Validation: 13 focused tests passed, including desktop/mobile admin navigation, both overview shortcuts and embedded queue rendering; TypeScript and Vite build passed. Targeted lint had no errors and one existing App.tsx fast-refresh warning. Local synthetic browser preview confirmed the Applications link and queue inside the admin navigation. Not yet merged or published at this entry.

## Next build: Students — 31 October 2026

Eric selected Students and confirmed the simple Applications style. Built a focused student queue with next actions, compact desktop rows, phone cards, optional advanced filters, separate archived records and direct profile-tab links. Preserved the application form, upload fixes, existing account/WhatsApp actions and permissions. Corrected hidden fetch errors, silently limited list reads, absent account confirmation dialogs and unconfirmed-success messages. Implementation, checks and limitations: `../students/README.md`. No production mutations or publication performed.

## Admin consolidation — 31 October 2026

Eric supplied screenshots of `/dashboard/applications` and `/admin/applications` and explicitly requested one dashboard using the simplified version. Prepared a separate follow-up from the now-merged Students build (#1255): one AdminLayout owner, context-based suppression of nested navigation, canonical admin redirects after existing route guards, preserved query/hash/history state, registered shared-tool aliases and accessible mobile menu behaviour. Other roles keep their existing shared navigation. Existing tools and distinct payment/report/resource workflows remain available. Architecture and release limitations: `../admin/ADMIN_WORKSPACE.md`. No production mutation, merge or publication performed during implementation.

## Professional admin overview — 31 October 2026

Eric requested that the main dashboard be beautiful, professional and useful. Built a focused admissions overview in the unified shell: compact summary cards, real priority cases, tenant-scoped follow-ups, truthful recorded-stage bars, New application and recruitment shortcuts. Added bounded URL filters to Students and Applications so the summary links open the matching queues. Existing uploads, reporting, financial operations, auth guards and role policies are preserved. Definitions, validation and limits are in `../admin/OVERVIEW.md`. No real student/task/account mutations or publication performed during development.

## Tasks page crash — 31 October 2026

Reproduced Eric's `/admin/tasks` failure in the authenticated live browser. Root cause: several actual Tasks consumers reused a subscribed Supabase topic, and unstable query-key array identities repeatedly restarted listeners. Added owned effect-lifetime topics, semantic query-key dependencies, idempotent cleanup/late-event guards and non-fatal realtime setup handling. Actual Tasks components now have integration tests and browser checks with synthetic records; the original navigation placeholder was not proof of task-page readiness. Full suite: 477 tests / 70 files. No task records or access policies changed. Details: `../admin/TASKS_REPAIR.md`.
