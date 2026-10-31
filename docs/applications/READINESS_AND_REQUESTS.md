# Application readiness and document requests

This build adds a saved-record checklist to the existing application workspace and staff request/review controls in its Documents section. It does not submit to universities or make admission/eligibility decisions.

## What the checklist means

Checks cover the saved application stage, student name/email, course/university, intake, the presence and recorded verification of all application files, and blocked follow-ups. These checks do not establish that a stored binary remains available, that the institution's course-specific requirements are met, or that sharing authorisation remains valid. Those final checks remain explicitly assigned to staff. No universal passport/English-test checklist is invented for every course.

Requests remain student-level because the existing table has no application link. They can refer to other applications and therefore do not automatically block an application's checklist. An application-specific request/checklist model requires a separately designed migration and permission review.

## Staff workflow

1. Open Applications, select the student and review Application readiness.
2. Use its Documents/Follow-ups/profile shortcuts to resolve recorded gaps. Admin profile navigation stays under `/admin`.
3. In Documents choose Request a document. Select the type, give student-facing instructions and optionally a Monday–Saturday follow-up date. An unfinished same-type request is flagged rather than duplicated.
4. Save. The request is stored in the student portal. This action sends no email or WhatsApp message. Requests have a stable client ID so an ambiguous insert retry cannot silently create another copy of that request.
5. The student uses the existing request upload dialogue. Existing byte validation, private storage and application-file persistence remain unchanged.
6. Staff select the actual request file or a file from the current application, open/check it, and approve the request or request replacement. Replacement feedback is required and is visible to the student. The request update records reviewer/time and checks its original `updated_at`; access loss or a conflicting update fails visibly.
7. Verify application files separately after inspection, check institution requirements and sharing authorisation, then use the existing manually recorded university handoff.

## Existing student status limitation

Read-only inspection of the managed database confirms students currently have SELECT but no UPDATE policy for document_requests. A student upload can persist successfully while its existing attempt to mark the request received is refused. The upload dialogue already reports this partial success accurately. This build provides a staff recovery path: select the saved application file in the request review control, then review it. It does not widen student permissions, alter the upload route, or claim that the request-to-received transition is automated end to end. Correcting that transition needs a narrow server-side ownership-checked submission operation and its own authenticated acceptance tests.

## Drafts and access

Request drafts remain mounted across tabs. Closing the workspace or opening a profile warns before discarding unsaved request feedback/forms, alongside existing application/follow-up edits. Staff/admin management controls follow current role checks; server-side RLS remains authoritative. Signed file links use the existing caller-scoped private Storage helper. Approved request files remain viewable where Storage permits.

## Validation and release

Unit/component tests cover empty and unverified files, missing identity/course/intake, blocked tasks, request creation, duplicate prevention, review requirements, concurrency/access failure and read-only agent controls. The actual workspace was exercised locally with synthetic records: readiness navigation, tab-preserved feedback, discard warning, request creation and replacement read-back. No real student request or message was created.

Release requires the usual GitHub-to-Lovable exact-commit preview and manual Publish handoff. A local test adapter and policy inspection do not replace Auth-issued staff/student acceptance testing against disposable records. No schema migration or production policy change is included.
