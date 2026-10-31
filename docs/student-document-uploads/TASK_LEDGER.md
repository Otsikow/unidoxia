# Student document uploads task ledger

## Review candidate — 31 October 2026

Eric requested fixes for upload problems affecting some students and did not have an exact error example.

Implemented locally: schema-compatible replacement; content-based file validation; removal of filename-only fake verification from the application form; supported application passport-photo mapping; exact-object storage confirmation; safe upload/record response-loss recovery; original-file preservation; checked application batch writes/retries; private request-file URLs; honest request-update failure messages; saved-document aliases and repeated-file selection/overlapping-upload safeguards.

Read-only checks: verified live column/enum/bucket/request-policy configuration. Four historical student-document records have no file object or same-student/same-size candidate; original contents need verified recovery or re-upload. Existing students cannot directly UPDATE request status; the UI now reports file-saved/request-not-updated rather than claiming fulfilment. No production writes made.

Validation results and export state are recorded below. Next: explicit GitHub export approval, draft PR, authenticated staging/Storage verification, then normal UniDoxia GitHub-to-Lovable release and Eric's manual Publish boundary. No database migration or permission change is needed for these frontend fixes. A backend request-fulfilment operation is separate work.

Validation complete: 411 tests passed in 55 files; TypeScript check passed; Vite production bundle build passed; targeted ESLint passed with no errors or warnings; git diff --check passed. The two legacy NewApplication hook dependency warnings were corrected. These are local automated checks; authenticated managed Storage/browser upload verification and public publication remain unperformed.

Export gate: the earlier automatic approval review rejected GitHub export without explicit repository/payload approval. This focused branch is saved locally only. No push, draft PR, merge, Lovable sync or publication is claimed. Ask Eric to approve uploading this exact commit/branch to Otsikow/unidoxia for a draft PR. That does not authorise publication or a future database permission change.

## Staff upload recovery — 31 October 2026

The administrator student-profile missing-document action used a separate raw upload/insert path. Its catch block removed the new object on any insert error, including a lost response after a successful save. It now reuses uploadVerifiedDocument and saveStudentDocument, confirms exact stored bytes, recovers a save by a stable record ID and preserves uncertain saves. Unique UUID paths replace timestamp-only names. New uploads remain pending staff review. No permission, schema, existing-file or publication changes.

Validation: 18 focused persistence tests (including new-upload lost-response recovery and unconfirmed-save preservation), TypeScript and targeted lint with zero errors/two existing AdminStudentDetail memo-dependency warnings. No real student upload was performed. Full suite: 580 tests in 88 files passed; Vite production bundle passed. GitHub/Lovable handoff is tracked with the release.
