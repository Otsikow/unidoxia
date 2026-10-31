# ApplyBoard authenticated workflow benchmark

Reviewed 31 October 2026, using Eric's signed-in ApplyBoard recruitment-partner account in Brave. Read-only inspection of normal UI. No student fields were edited, no files were uploaded/replaced/deleted, no invitations/messages were sent, no application was created/submitted, and no payment was initiated. No student names, IDs, contact information, document contents, private commercial terms or account-manager details are retained here.

## Observed UI evidence

- **Home** (`https://app.applyboard.com/agent`): live summary counts for tasks, applications, accepted/rejected outcomes and students; primary Add new student action; onboarding steps spanning profile, application, payment, requirements, school submission and tracking; performance reporting and support links.
- **Students** (`https://app.applyboard.com/students`): searchable/filterable student registry and per-student workspace.
- **Student workspace**: Profile, Search and Apply, Applications and Unpaid Applications tabs. Section completion indicators/progress; personal information, address/background, education/schools, test scores and optional additional/emergency sections. Invite-student and staff-assignment controls are available but were not used.
- **Document vault**: file-level classification, Received/Unidentified labels, preview, replace and delete controls. Their presence does not prove automated authenticity, expiry or academic verification. Files were not opened or changed during the benchmark.
- **Programme search** (`https://app.applyboard.com/search`): destination/institution and advanced filters; optional student eligibility controls; saved filters and selected quick filters. Existing-student and blank guest matching modes are distinct. Guest fields include education country, previous level, grading scheme and English evidence; grading-scheme input depends on education country and level. Filters were inspected and dismissed without applying them or selecting a student.
- **Programme detail**: overview, admission requirements, scholarships and similar-programme tabs; programme-specific application and wishlist actions. These were inspected without starting an application or saving a wishlist item.
- **Applications** (`https://app.applyboard.com/applications`): payment/apply/start dates, application/student references, programme/school, status, requirements and current stage appear as separate columns. Filters separate payment, outcomes and lifecycle stage. Observed lifecycle labels include pre-payment, pre-submission, submission, post-submission, admission, visa, pre-arrival, arrival and post-arrival/commission. No filter was applied.
- **Tasks** (`https://app.applyboard.com/tasks`): filters for intake, due date, application, stage, student, school/country and assignee; task status/type; deadline-source distinction between school-provided and ApplyBoard-estimated due dates; overdue visibility.

## Limits

The available application/task views did not provide an application case through which to inspect real requirement fulfilment, payment, school submission, decision, visa or commission handling. No example was created to fill that gap. This is a verified UI-structure benchmark, not an end-to-end test or knowledge of ApplyBoard's private database, integrations, algorithms, service performance or architecture. Visible controls do not prove their underlying behaviour. No commercial offer, institution entitlement or eligibility conclusion is inferred.

## UniDoxia design decisions recommended from these observations

These are our implementation recommendations, not claims about ApplyBoard internals:

1. **Student-centred workflow:** one reusable profile, versioned document vault, shortlist, applications and communication history, within the approved UniDoxia design. At submission, retain the exact document versions used; later replacement must not silently change previously submitted evidence.
2. **Separate workflow concerns:** application lifecycle stage, outcome/decision, requirement completeness, payment state and actual submission receipt must be distinct. A single status field cannot explain all five. Use existing data deliberately and migrate compatibly; never silently reinterpret historical rows.
3. **Requirements become actionable tasks:** each requirement records the application, required evidence/answer, owner, due date, deadline source, current state and review result. File saved, request received and staff verified remain different events. School deadlines and internal estimates must be labelled accurately.
4. **Submission remains evidence-based:** keep internal receipt separate from approved external handoff, and preserve route, reference, submitted/acknowledged timestamps and supporting evidence. No automatic university submission is claimed without a real authorised integration.
5. **Eligibility support remains source-based:** reuse verified profile information and published course requirements; show missing information and uncertainties, allow human review, and avoid invented match percentages or admissions guarantees. Conditional inputs can reduce form complexity.
6. **Simple daily interface:** default to actionable work and a compact queue, with advanced filters available when needed. Every row should make the next action, owner, due date, missing requirements and current stage clear. Preserve approved branding/navigation and improve the existing components instead of copying ApplyBoard's interface.
7. **Shared secure server workflow:** authenticate/authorise record operations; validate permitted transitions and required evidence on the server; make retries safe across devices; write an auditable event history. Browser-only checks and unit tests are insufficient for live role/Storage certification.

## Implementation order

1. Reconcile the prepared real-dashboard branch with published upload fix PR #1252/main `f0b5b3eac41b457d648dad86dd81dfc8a0274278`. The older branch overlaps NewApplication/upload helpers; retain the newer upload implementation. The published staff page's sample records must be replaced by real authorised data.
2. Finish the student-centred application workspace plus requirements/tasks, ownership and deadline-source representation. Keep advanced detail off the default daily view.
3. Resolve request-fulfilment and assigned-agent/university document access using least-privilege server operations. A self-created agent/student link must not grant student access. Review any migration separately before production application.
4. Verify programme/intake/fee/requirement data and approved receiving routes, then test the complete journey with disposable student/staff/agent/partner accounts in an isolated test environment.
5. Add proven notifications, recovery, reporting and supported integrations after the core journey passes. Publish each reviewed scope explicitly; this read-only audit authorises no new deployment.

Success measure: an authorised operator can identify and complete the correct next step without reconstructing the application from scattered pages or mistaking an internal status for a university decision.
