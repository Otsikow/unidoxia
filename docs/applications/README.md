# UniDoxia application workflow

## Current state — 31 October 2026

Development/review candidate on `codex/application-workflow-end-to-end`, based on GitHub/Lovable commit `07a8d1a7e22a6441117e2503259906ebd25eb14e`. Not production-certified or published. No live students, documents, roles or permissions were modified.

The authenticated public Applications page displayed five hard-coded sample applications, three in its default assigned filter. A read-only database reconciliation returned one real application (`submitted`). The old page's totals were not operational evidence.

## Simple workflow

1. Staff choose New application, then select a real student.
2. Complete the existing profile/course/intake/document/review form.
3. Submit to UniDoxia. Completion requires read-back of supplied document records. Failures retain a recovery reference instead of reporting success.
4. Open the real staff queue: find a student, inspect documents, explicitly mark files verified, save staff notes and the application stage.
5. Submit externally through the university's approved channel, then record its route/reference. Recording a reference does not send an external application.
6. Record offers, CAS/LOA, visa progress and enrolment using the existing statuses and sharing/profile gates.

`submitted` means received by UniDoxia, not received by a university. An uploaded file or client-side AI result is not verification. Preserve the approved design system and existing registration, sharing authorisation and billing rules.

## Implementation

- `StaffApplications`: RLS-scoped real records; all database pages read rather than silently truncating at the server limit; local search/stage filtering; 20-row display pages; query identity includes the signed-in user.
- `ChooseApplicationStudent`: minimal name/reference picker; explicit first-50 cap and search prompt.
- `StaffApplicationWorkspace`: profile/course/intake, short-lived private document links, explicit staff verification, notes, stage updates, manual university reference and progress history. An `updated_at` comparison detects conflicting application edits.
- `applicationDocuments`: checks every upload and record write, reads records back, skips already-persisted types on retry, keeps files on ambiguous record-response loss, never trusts a browser verification flag. Passport photos use the actual supported `other` enum and a recognisable filename; the live enum has no `passport_photo` member.
- `NewApplication`: per-user/student/course/intake recovery ID and synchronous double-click guard. Profile persistence failures block success. Notification errors are logged separately; the success message does not promise email delivery.
- University application-document viewing selects its actual bucket instead of passing application-document IDs to the student-document edge function.

Application-row creation and Storage writes remain separate operations. A partially uploaded application can exist as `submitted`; the form reports it as incomplete and preserves its reference for retry. Recovery is per browser tab/session, not global cross-device deduplication. A server-side submission job/transaction with a unique idempotency key is the recommended subsequent architecture improvement.

`timeline_json` is an operational history, not an immutable audit ledger. A manually entered university reference is not independently verified receipt.

## Prepared database change

`supabase/migrations/20261031091259_application_document_review_access.sql` adds only a SELECT policy for verified application documents using the existing `can_manage_university_application(auth.uid(), application_id)` helper. No roles, assignments, existing policies or verification flags are changed. Partners are scoped to their own university. Existing Storage policies remain unchanged and need separate security verification.

The migration was applied twice to an isolated PostgreSQL 16 fixture. Correct-university verified access passed; pending, cross-university, unrelated-user, missing-identity and anonymous reads were denied. This is a synthetic policy regression test, not a full Supabase Auth/Storage test or a representative production restoration.

Before any approved managed migration: inspect the real schema/helper/policy and migration ledger again. Current source contains future-dated migration filenames; do not assume filename order equals the managed ledger. Apply only the specifically approved migration in a transaction and record the version through the established Lovable workflow. No production migration was executed.

## Release gates / known issues

- Perform an authenticated staging walkthrough with disposable student, staff and partner accounts: create application, upload, interrupt/retry, reopen after reload, verify document visibility, save notes/status and record a university handoff. Exercise real Storage and sharing/profile gates.
- Obtain migration-specific approval before changing production access. Verify exact-commit Lovable preview before Eric's manual Publish action.
- Agent first-application submission is not certified. Live policies inspected have agent SELECT but no application INSERT or application-Storage upload permission. The existing agent/student-link table permits agents to create their own links: never expand student-data access solely from such a self-created link. Establish a staff/student-authorised assignment model and test least-privilege operations before certifying agents.
- The existing university student-document fallback/edge function selects `university_access_approved`, absent from the inspected live student-document schema. Historical student-only documents need a separate compatibility repair. New application-document uploads use the dedicated path; this change does not certify all historical files.
- Automatic ApplyBoard/CourseFinder/university submission needs an authorised documented integration or an operator in the approved portal. No API, partnership or university receipt is invented.
- Validate course/intake availability, institution-specific requirements, fees, offers and notification delivery with authenticated accounts. Catalogue presence does not imply a recruitment agreement.
- Three hook-dependency warnings remain in modified legacy form/review files. New workflow files lint clean. The Vite bundle check is separate from SEO postbuild/network checks.
- The present small queue supports all-page loading. Before large-volume rollout, move scoped search/filter/count into an indexed server query.

## Benchmarks

Requirements were compared with official product descriptions, not private competitor architecture:

- [ApplyBoard application experience](https://www.applyboard.com/info/application-whats-new): visible requirements, application progress and accessible responsive information.
- [ApplyBoard recruiter quick start](https://assist.applyboard.com/hc/en-us/articles/6478309161485-Recruiters-How-to-Use-ApplyBoard-A-Quick-Start-Guide): student profile, course/intake and submission journey.
- [CourseFinder](https://coursefinder.ai/): self-service profiles, documents and application status.

Do not claim feature parity, superiority or live end-to-end readiness from development tests.
