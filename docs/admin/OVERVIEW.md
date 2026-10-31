# Professional admissions overview

## Purpose

Eric requested a more professional, beautiful and useful main dashboard. This redesign keeps the unified Admin Control Centre and the approved Students/Applications workflows, while replacing oversized generic counters and a sparse trend chart with an operational overview.

The page at `/admin/overview` provides a compact navy header, New application and Refresh actions, four linked summary cards, application cases needing attention, overdue/blocked team follow-ups, a recorded-stage pipeline and shortcuts to recruitment/reporting tools. The existing reporting export, commissions, system activity and Zoe entry points remain accessible. Light and dark themes use the existing theme system.

## Data definitions

- Students: current, non-archived rows in `students`, matching the Students list's existing tenant selection and RLS-scoped fallback when its tenant has no records. It is not a count of Auth/profile accounts.
- Files to review: individual student document rows with `admin_review_status=awaiting_admin_review` belonging to those current students. The card links to the Students document-review view; it does not imply application-document verification or university approval.
- Active applications: the same `isActiveApplication` rule as the Applications workspace, explicitly including drafts and deferrals. Application attention uses that workspace's existing document/task rules.
- Overdue tasks: non-completed tasks due before the current UK calendar day, scoped to the same staff tenant as the task workspace. No missing task scope is represented as zero. Blocked work also appears in the follow-up list.
- Pipeline: current recorded stages, grouped into Draft, UniDoxia review, Offers, CAS/LOA & visa and Enrolled. Visa records are never counted as enrolled. This is a stage distribution, not a historical conversion/trend calculation; deferred, withdrawn and rejected records are outside those bars.

Each source reads all 500-row API pages in deterministic order. Students/documents, applications and tasks load independently, so an unavailable source does not fabricate zeros or suppress the others. Query keys include user, tenant and profile role; data refreshes on the existing query lifecycle and every minute, with a manual refresh action. Rows remain subject to the caller's RLS policies. No service credentials, new schema or access policies are introduced.

## Useful navigation

`?view=review` selects the Students review queue. `?stage=active`, `?stage=attention` and `?stage=all` select existing Applications queues. Unknown filter values fall back to their existing defaults. Selected application links continue to use `?application=<id>`. The filter controls keep the corresponding URL parameter in sync.

No real records, statuses, documents, tasks, payments or messages are written by this overview. New application still uses the existing student picker/form and existing profile/sharing checks. Reporting and account-management functions are unchanged.

## Verification

The full suite passed 470 tests in 68 files. Final TypeScript, Vite build, targeted lint and whitespace checks passed. Focused tests cover summary arithmetic, exact enrolment stage, archived-file exclusions, UK overdue dates, permission/network error propagation, tenant fallback, all-page reads, unavailable/loading UI states, New application, reporting access and the two destination-filter deep links.

A read-only managed-database query confirmed the current student/document/application/task fields and relationships. Browser checks use an isolated local preview with explicitly synthetic records; it is not real Auth-issued API acceptance. Desktop light/dark and 390×844 phone layouts were reviewed, including text contrast, meaningful link labels and no horizontal overflow. The live admin overview was opened read-only for baseline review. Publication is separate from implementation, merge and preview verification.

The current queue sizes support client aggregation. Indexed server-side aggregation and nested-relation limits should be addressed before a substantially larger deployment; no large-volume readiness claim is made here.
