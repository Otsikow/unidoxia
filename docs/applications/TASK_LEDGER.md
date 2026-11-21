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

## Searchable nationality — 31 October 2026

Eric reported Ghana missing from the application's Nationality list. `PersonalInfoStep` incorrectly used the study-destination `COUNTRIES` array. Replaced only this field with a searchable, keyboard-accessible selector using the existing full `RESIDENCE_COUNTRIES` list (197 entries). Selected country names continue through the existing form state/save path; saved legacy nationality text remains visible until deliberately replaced. Destination selection remains unchanged. Tests exercise the actual PersonalInfoStep with the real selector: full list including Ghana and alphabetical endpoints, case-insensitive search and selection, keyboard selection/search reset, and legacy-value preservation on no results/dismissal. Local browser read-back confirmed Ghana search and selection, with no console errors; sample details only, no real application submitted. All 481 tests in 71 files, TypeScript, targeted lint and Vite build passed. Publication requires the normal manual Lovable handoff.

## Student-profile light-mode contrast — 31 October 2026

Eric's screenshot showed low-contrast amber document warnings on the admin student detail page. Changed light-mode warning headings, missing-document labels, upload icons, expanded-view title, archive warning and pending text to amber-800; strengthened label borders/hover colour, the pending count background and nearby green/red status/link text. Explicit dark variants preserve prior dark-theme colours. Layout and all actions remain unchanged. Local browser checks rendered the exact warning-section JSX from AdminStudentDetail with sample records, including the expanded view and dark theme, without console errors. Composited light-background contrast: document labels 1.47:1 before, 6.23:1 after; hovered labels 5.46:1; pending count 5.02:1. TypeScript and Vite build passed; targeted lint has no errors and two pre-existing useMemo dependency warnings at line 281. This is a styling-only change; no student record, upload or permission mutations. Manual Lovable publication and live read-back remain separate steps.

## Messages crash repair — 31 October 2026

Reproduced Eric's signed-in `/admin/messages` crash: the SDK rejected adding postgres_changes callbacks to an already subscribed `messages-<user>` topic. The actual StaffMessages page mounts useMessages twice, directly and through useAgentMessages. Gave every message and presence effect its own topic and owned cleanup, ignoring late callbacks and in-flight message events after unmount. Realtime setup failures no longer crash the page; authorised ordinary reads remain independent. No message payload, recipient, query, permission or schema changes. Seven new tests exercise simultaneous partner/internal hooks, multiple presence consumers, StrictMode/remount, event merge/deduplication, cleanup/in-flight guards, transport setup failure and actual StaffMessages tab switching. All 488 tests in 72 files, TypeScript, targeted lint, Vite build and diff checks pass. Local browser check mounted the actual page/chat components and hooks with a sample backend adapter that enforces SDK topic reuse; Partner and Internal Chats render with no new console errors after preview fixture setup. The production failure was inspected only; no messages sent, no conversation records or permissions changed. Publication and authenticated live verification remain separate release steps.

## Duplicate Tasks back control — 31 October 2026

Eric's screenshot showed the admin toolbar Back plus a second blue Back inside Tasks. Removed the page-level control and enabled the shared dashboard toolbar's normal Back behaviour. Admin Tasks keeps AdminLayout's existing Back; staff/agent Tasks keeps the shared toolbar Back. No task controls, navigation history handling, data or permissions changed. Existing Tasks integration tests, TypeScript, targeted lint and Vite build are the release checks; manual Lovable publication remains separate.

## Clickable task summaries — 31 October 2026

Eric requested clickable task cards and other useful drill-downs. Added native keyboard-accessible summary links for open, due-soon, overdue, completed, all/completion-rate, automatic/manual source, no-due-date and assigned tasks. Links clear conflicting task filters/page, preserve unrelated query parameters, highlight the selected view, and scroll/focus the results. The board now exposes URL-backed view/status/priority/page filters, reset controls and links to related application workspaces. PostgREST filters and matching count apply across all pages under the existing tenant/assignee scope; the query cache key includes the selected view. Due-soon keeps the summary's existing rolling 72-hour definition; no-date/source/owner views match its existing classifications, including completed tasks where those counters include them. No writes or access-policy changes.

Validation: 490 tests / 72 files passed, including actual Tasks summary-to-query routing, every view, keyboard activation and URL restoration. Final focused checks cover the linked application destination and related test typing corrections. Full application TypeScript check (`tsc -p tsconfig.app.json --noEmit`), targeted lint, Vite build and diff checks passed. Corrected test-only type errors in earlier nationality and messaging tests (unsupported role-query option and overloaded scroll mock); product behaviour is unchanged by those corrections. Local browser verification mounted actual Tasks components/hooks against sample records, confirmed overdue/completed results, browser Back, reload, reset and focus, with no console errors. Evidence is in the surrounding workspace's `outputs/unidoxia-clickable-tasks`. GitHub/Lovable release and manual publication are distinct steps; no real tasks or student records changed.

## Next build: application readiness and document requests — 31 October 2026

Eric authorised starting the next implementation after clickable Tasks cards. Added a saved-record readiness checklist with document/follow-up/profile shortcuts and staff request creation/review within the application workspace. Requests retain their actual student-level scope; they are not misrepresented as application-specific blockers. Staff can record student-facing replacement feedback, link an actual application file when a request status update failed, or approve a request separately from verifying the application's file. Drafts persist across tabs and participate in the existing discard guard. Review writes check student/id/updated_at, and create retries retain a stable ID. Admin profile navigation uses its canonical admin route. No external message was sent and no real student record, schema or policy changed.

The full request lifecycle is not yet automated: read-only managed-policy inspection confirms students lack request UPDATE permission. Existing upload partial-success reporting is preserved; staff can reconcile the saved file. A narrow authenticated student submission operation and disposable-account acceptance tests remain follow-on work. Scope, operating steps, evidence and release boundaries: `READINESS_AND_REQUESTS.md`.

Final readiness-build checks: 499 tests in 74 files passed; full application TypeScript, targeted ESLint, Vite build and diff checks passed. The local browser verified request creation and replacement feedback read-back with synthetic records, retained feedback across tabs, and the unsaved-work guard. No new console errors were observed. Managed-policy inspection was read-only. No production Auth mutation acceptance was performed.

## Messaging scroll and movable sidebar — 31 October 2026

Eric requested access to the bottoms of messaging cards and confirmed the sidebar should scroll, resize and collapse. Implemented viewport-constrained flex panes, separate conversation/history scrolling, a non-shrinking reply box and visual-viewport sizing. Fixed the late-loading message scroll listener so older-message reading is preserved. Made the admin sidebar sticky with a scrolling menu and persistent desktop resizing, retained collapse/expand and the mobile drawer, and kept the resize handle clear of the collapse button. Messaging uses one page-level toolbar Back; mobile conversation Back remains separate. No message data, sending or permissions changed. Architecture, controls and browser evidence: `../admin/MESSAGING_LAYOUT.md`.

Validation: full suite 505 tests / 77 files passed; full application TypeScript and targeted lint passed. Final focused tests and Vite build verify the final source. Actual local admin/messages UI with 100 sample conversations and 80 sample messages reached each independent scroll boundary, resized via pointer, collapsed/restored remembered width and passed a 390×844 viewport check. No console errors in the final browser check; no real messages sent. Manual publication and live verification are outstanding release steps.

## Student communication centre — 31 October 2026

Eric requested a professional unified student communication workflow and approved keeping the existing UniDoxia Team signature. Implemented a student-search-first admin Messages workspace with application context, personalised email/WhatsApp templates, exact-account portal chat, separate source-labelled history/manual notes and per-student in-memory drafts. Added contact shortcuts to the student list/profile/sheet and corrected WhatsApp routing to registered WhatsApp details. Existing Team inbox, Zoe and partner chats remain available. Mobile/tablet use a single student pane; desktop uses separately scrolling contacts/workspace.

Added a SELECT-only, tenant-isolated operational audit migration and JWT-verified server function resolving staff identity, tenant, exact student, application and recipient on the server. Direct email is explicitly gated off unless the managed table/function/key and STUDENT_EMAIL_ENABLED=true are present. Audit-first sending, stable operation/provider keys, signature snapshots, uncertain-result recovery and a conservative 23-hour retry boundary prevent automatic duplicate resends. Provider acceptance is distinct from delivery; external WhatsApp/email replies and old histories are not claimed synchronised. No real student was contacted and no production database/provider setting was mutated.

Checks include full Vitest, frontend TypeScript, targeted ESLint, Vite build, Deno server check and isolated PostgreSQL migration replay/RLS denial tests. Local actual-component browser checks covered desktop/mobile/tablet, send-error recovery, notes/history identity and internal chat using sample adapters. The managed ledger was absent on read-only inspection. Exact activation sequence, remaining Auth-issued/send acceptance gates and researched official integration options: `../admin/COMMUNICATION_CENTRE.md`. Existing WhatsApp PR #1234 retains its separate approval/QC gate and is not changed by this build. GitHub/Lovable handoff and manual publication are separate from backend activation and public verification.

Final communication build validation: 536 tests in 83 files passed; frontend TypeScript, targeted ESLint (only the two known AdminStudentDetail warnings), Deno server check, isolated PostgreSQL replay/permission checks and Vite build passed. Final browser evidence showed no new console errors; phone/tablet document width matched viewport width, and the phone message pane reached its bottom action. No real sending or production Auth-issued mutation was tested.


## Communication follow-ups and identity prerequisite — 31 October 2026

Eric asked to continue the remaining communication instructions. Reconciled the concurrent security preparation and packaged it as forward migration 20261108000000 in separate draft PR #1268, without applying or merging it. The local PostgreSQL harness now tests the executable migration: baseline shows 11 defects in 24 cases; proposed rules pass all 24. Live activation stays contained (ledger SELECT revoked, email flag off); no external sends or real-user changes in this build.

Added Follow-ups inside the student communication workspace using the existing application task workflow, explicit application selection, tenant-qualified reads/cache, unique form identifiers, retained drafts across channels, and a discard guard on context changes. Phone channel tabs wrap instead of hiding the final action. Fixed the accepted-email state when selecting a new application. Existing Tasks/calendar/assignee/status semantics remain authoritative; no external response is inferred. The new UI, migration, isolated versus real-Auth acceptance limits and remaining integration setup are described in ../admin/COMMUNICATION_CENTRE.md and ../security/SIGNUP-ROLE-TRUST.md.

Follow-up interface checks: 539 tests across 83 files passed; final focused follow-up tests, frontend TypeScript, targeted ESLint, Vite build and diff checks passed. Actual-component local Brave checks verified a committed 2 November date, save/read-back, completion, channel-switch draft retention, application-change cancellation, 390px no-overflow and independently reachable bottom controls. All browser mutations used sample adapters. Security migration validation belongs to separate draft #1268 (24/24 isolated PostgreSQL checks); no production fixture or new live security mutation in this interface build.

## Verified email delivery receipts — 31 October 2026

Continued Eric's operational messaging instructions while isolated identity acceptance completed. Added a separately gated signed-provider receipt service, server-only event metadata/RPC migration, exact email association, retry/deduplication/out-of-order protection, immutable per-attempt tags and receipt-aware history with readable high-contrast outcomes. Existing history reads fall back only for missing new columns, preserving permission denial. Delivery-to-mail-server is distinguished from send acceptance, human reading and replies; external mailbox/WhatsApp synchronisation is not invented.

No provider account/key, live receipt migration, outbound message or operational flag changed. Activation sequence and source-backed limitations: ../admin/EMAIL_DELIVERY_RECEIPTS.md. The separately authorised real-Auth staging run for the security draft passed 31/31 with the production SDK and verified zero synthetic fixture leftovers; its new-runtime Edge gateway limitation remains explicit in the security branch's staging report.


### 31 October — branded communication signature and receipt evidence
- Owner confirmed receipt of the single authorised live test with the correct signature. Sending was switched off after that test; no further email was sent.
- Added a branded HTML/plain-text signature using the official logo, existing business WhatsApp, email, website and company/registered-office/ICO details. Pending legacy retries preserve their original payload.
- Receipt source passed 16 real Auth/REST/RLS isolated staging checks, with exact fixture cleanup; production receipt migration/provider webhook remain unactivated and require their own approval/setup.
- Validation: 554 automated tests passed; source type/lint/build and desktop/mobile signature checks recorded with the release.

### 31 October — next operational hardening
- Confirmed the unguarded partner-workspace mutation/status RPCs and repeated-workspace creation risk by source/read-only database review.
- Merged PR #1273 and applied the specifically approved, guarded/idempotent workspace migration with active-profile enforcement in both role helpers. Live profile/role fingerprints and business counts stayed unchanged.
- 37 isolated SQL/RLS checks pass against required-column/unique-tenant/slug-trigger fixtures. Three 19/19 real-Auth staging revisions passed, including the final source covering staff and direct-role helpers with verified fixture cleanup. Partner sign-in uses the guarded versioned RPC; inactive and failed-setup profiles cannot open protected dashboards. 571 frontend/unit tests (combined with current main), TypeScript and production build passed. Production migration 20261031134909 was explicitly approved, applied and read back; frontend publication remains separate.

### 31 October — public-page loading flash
- Replaced the bare prerender first view with independently styled public content and the existing homepage hero image/logo.
- Kept that useful view until the finished React route commits; no intermediate loader or arbitrary timeout, with working no-JavaScript links and preserved SEO content.
- 575 tests, TypeScript, full production/SEO build and actual built-page desktop/mobile/offline/handoff checks pass. See ../performance/FIRST_PAINT.md. Publication remains separate.

### 31 October — signature social links
- Added all seven existing footer social destinations to the email HTML/plain-text signature, with readable mobile-wrapping labels and a distinct WhatsApp Channel link.
- Preserved original branded retry payloads byte-for-byte. 578 tests, TypeScript, lint, Deno and production bundle build pass; desktop/mobile preview verified. No email sent or flag/schema changed.

### 31 October — GitHub application guard acceptance
Manual GitHub run 41221293187 passed 24 actual local Auth/Data API checks and independent zero-fixture SQL read-back, with unchanged reviewed migration hash. See SUBMISSION_GUARD.md for exact source and limits. Lovable builder credits were not used. PR #1282 remains draft pending specific live migration approval; no production activation or Publish.
