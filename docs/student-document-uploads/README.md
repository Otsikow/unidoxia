# Student document upload reliability — 31 October 2026

## Release state

Focused local fix branch `codex/student-document-upload-fixes`, based on `origin/main` at `07a8d1a7e22a6441117e2503259906ebd25eb14e`. Separate from the unpushed dashboard branch. The correct connected Lovable project was verified as UniDoxia, `85578b91-45ce-4a22-b275-f732009d9503`, still reporting that source commit. No student file, student record, production permission, migration or deployment was changed.

This branch has no new schema migration, permissions or package dependencies. Export remains subject to the earlier automatic approval review requiring explicit approval of the GitHub destination and payload. Prepare a draft PR only after that approval; do not publish automatically.

## Verified causes and fixes

1. **Every My Documents replacement attempted nonexistent columns.** Live `student_documents` has no `university_access_approved`, `_at` or `_by`. Replacement now writes the actual review fields only, resets review metadata/checksum, checks that the row changed, and removes the old object only after the replacement is confirmed saved.
2. **Browser MIME-only rejection.** Application file selection rejected a legitimate PDF/JPEG if the browser supplied no MIME type. It now uses the existing content/signature/PDF-integrity checks, preserves the 10 MB/type limits, and shows file-check results. File format checks do not constitute authenticity, expiry or academic review.
3. **Mock filename verification blocked valid files.** The old `verify-document` endpoint was demonstrative filename logic, not AI/OCR. A filename containing `invalid` or `expired` could block progress regardless of actual bytes. The application form no longer calls it. Actual corrupt PDFs remain blocked; staff review remains required. The unused endpoint itself is not deployed or modified by this frontend fix.
4. **Unsupported application passport-photo enum.** Live `application_documents.document_type` does not include `passport_photo`. UI photos now use `other` with a recognisable `passport_photo_` object name. A passport photo page remains `passport`; these are not conflated.
5. **False storage-size failures.** List/search returns substring matches, so its first item is not necessarily the requested object. Confirmation now matches the exact filename and downloads that exact object if listing metadata is unavailable. A network/visibility failure is not labelled as truncation and does not trigger destructive cleanup.
6. **Lost responses caused unsafe cleanup and repeat applications.** Stable record IDs support read-back after ambiguous writes. Preserve new and old files when the outcome cannot be confirmed. Application submission keeps its per-user/student/course/intake recovery marker and synchronous double-click guard, checks every supplied file record and reports partial failure instead of success. Recovery is per browser session, not global cross-device deduplication.
7. **Private request files used public URLs/wrong buckets.** Request records store private object paths; staff/partner/university request views resolve short-lived caller-authorised signed URLs in the matching bucket, including legacy `document-requests/` paths. A saved file is not reported as a fulfilled request when its status update fails or affects no row.
8. **Saved-document aliases and retries.** Reuse SOP files stored as `sop` or `personal_statement`, and English test certificates using existing test aliases. Do not count a degree certificate as an academic transcript. Clear the settings file input after completion/failure so choosing the same file again triggers a retry. Explicit guards prevent overlapping uploads.

Use `src/lib/documentUpload.ts` for storage confirmation and student/application record writes. Keep verified files unverified on new/replacement uploads until explicit staff review. Never call getPublicUrl for these private buckets. Do not remove a file merely because a record response or verification request timed out. Retain this implementation when later integrating the older dashboard branch; do not overwrite it with that branch's earlier upload helper.

## Read-only production reconciliation

- Both document buckets are private and limited to 10,485,760 bytes. The configured allowed formats match the retained PDF/JPEG/PNG/DOC/DOCX UI policy.
- 298 student-document records: four point to missing Storage objects, including after bucket-prefix normalisation. None of those four had another same-student object with the same recorded byte size. The remaining linked objects had matching recorded sizes.
- Two application-document records: neither had a missing object or size mismatch at inspection.
- These counts are time-specific, aggregate read-only evidence. They do not establish why the four files disappeared. No file contents or personal student information are stored here. Originals require a verified backup or student re-upload; a database record cannot recreate file bytes.
- Existing document-request policies grant students SELECT, not UPDATE. Student request-status changes can therefore be denied even after the file is saved. This fix reports that accurately and keeps the file available for staff to handle. A narrowly authorised server-side fulfilment operation needs a separately reviewed backend change; do not add a broad student UPDATE policy to work around it.

## Tests and acceptance

Regression tests cover genuine blank-MIME PDFs/JPEGs, corrupt PDFs, harmless filenames containing `expired`, exact storage-object matching, absent list metadata, upload response loss, confirmed size mismatch, ambiguous record saves, denied/no-op replacement, preservation of originals, pending verification flags, supported photo mapping, batch retry/read-back, private bucket routing including legacy paths, and requested-upload failure/partial-success messages.

Before live sign-off, use disposable authenticated student accounts to exercise My Documents new upload/replacement, Settings upload/retry, application document selection/submission/retry and requested-document upload under real RLS/Storage. Verify persistence and view/download after reload. These local tests do not replace that check. No production data repair or publication is claimed.

Large uploads on poor connections can still require restarting the upload if the file did not reach Storage. For a future resumable-upload implementation, consult the [official Supabase upload guidance](https://supabase.com/docs/guides/storage/uploads/standard-uploads); do not weaken file-integrity or access checks to suppress errors.
