# Simple Students workspace

## Scope

The next build after Applications simplifies the existing main-admin Students page at `/admin/students`. It preserves the admin navigation, student profile, upload/document review rules, manual status choices, WhatsApp links and existing account-management operations. There are no schema migrations, new roles or permission changes.

## Everyday journey

1. Search by name, UDX reference, email, destination or course.
2. Choose Active students, Needs attention, Documents to review or With applications. Archived and All students are available in the queue selector. Status and intake filters are behind More filters; Clear filters resets search and filters together.
3. Read the next action, then Open student. This opens the relevant Overview, Documents or Applications profile tab through a validated `tab` URL parameter. Education remains available in the profile; unknown tabs fall back to Overview.
4. Use the actions menu for New application, WhatsApp, referral/contact/joined information and existing account operations. The application action opens the established application form with the selected student; existing profile/sharing requirements still apply.
5. Open duplicate-record checks when needed. No duplicate report is automatically fetched on every list visit.

Desktop uses a compact table; narrower screens use cards. Counters represent students, not the number of outstanding files. A needs-attention flag is a cue based on existing operational/document-review statuses, not an admissions eligibility or university-readiness guarantee.

## Reliability

- Read every 500-row database page in deterministic creation-date/ID order; display 20 students per UI page. Existing tenant filtering and authorised fallback behaviour remain, with RLS as the database authority.
- Surface load errors and offer refresh; do not substitute an empty list or zero counters for a failed request. Ignore older responses after a newer fetch or auth-profile context change.
- Confirm a returned row for archive, restore, suspension and manual-status updates before displaying success. Denied/zero-row writes show an error; account dialogs and unsaved archive reason remain available for retry. A synchronous guard prevents repeated writes.
- Connect the existing archive/restore/suspend menu actions to explicit confirmation dialogs; those dialogs were absent despite the handlers already being present. Permanent deletion retains its explicit DELETE confirmation and existing edge function; no real account actions were performed during development.
- Suspension uses the existing profile `active=false` operation; this change does not claim token/session revocation or introduce new Auth controls.

## Validation and limits

445 tests passed across 63 files before final layout refinements, including new queue, search, pagination, error and failed-account-write checks. TypeScript and Vite build passed; targeted lint has no errors and two pre-existing student-detail hook warnings. Desktop and 390×844 browser checks used synthetic records; phone content and viewport widths matched, with no horizontal overflow. Read-only managed-database inspection confirmed the selected student/profile columns; this is not a real Auth-issued mutation test.

No live student records, documents, WhatsApp messages or account permissions changed. Real authenticated staging checks remain necessary before claiming full account-management readiness. Large-volume server-side filtering/counts remain future work; this release loads all authorised list pages. Publication is separate from GitHub export.
