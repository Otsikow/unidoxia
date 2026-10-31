# Student document-request receipts

Status: prepared and tested locally; no production migration or file/account mutation performed.

The student upload dialog previously saved an application file and attempted a direct UPDATE of document_requests. Current live policies allow students to read their requests but reserve general updates for staff/partners. A successful upload could therefore remain outstanding. The new server RPC accepts only request/document IDs and the original updated_at value. It resolves the exact active student, application, requesting workspace, supported category and actual private Storage object/size before setting received. It never approves a request or verifies a document, never accepts client-supplied URLs/status/owner IDs, and adds no general student UPDATE policy.

Existing data has no application_id on document_requests. Student-level requests can use that student's application; university-tenant requests must match the application's university workspace. The student application page now displays requests only for the current student/university workspace. Requests within two applications at the same university are still student/workspace-scoped, not represented as having a stored application binding.

The request row is locked and compared with its exact raw updated_at (no millisecond conversion). Same-file retries return the existing receipt without changing its timestamp, while changed/reviewed requests cannot be overwritten. On a new receipt, private storage_path replaces old URL fields and prior reviewer markers are cleared; staff instructions remain. Verification flags are untouched.

The dialog retains a saved-file receipt attempt after a failure, keeps the form open and offers Retry request update without uploading/saving the file again. Refresh application allows a fresh view of a concurrent review. Files are not deleted as part of receipt linking. Received/approved requests no longer offer another student upload from this page.

Validation:
- 586 automated tests (including lost-response retry, receipt identity, version conflict and private-file linking); TypeScript and production bundle build pass. Targeted lint has zero errors and the pre-existing ApplicationDetails effect-dependency warning.
- 24 isolated PostgreSQL/RLS checks: no direct student UPDATE, ownership/tenant/category/path/MIME/size boundaries, actual-object metadata requirement, inactive/anonymous/server-key denial, approved/stale-state protection, private-path linking, photo mapping, replacement, idempotency and migration replay. Auth and Storage metadata are fixtures in these checks.
- A separate actual-Auth/private-Storage acceptance harness is prepared under docs/security/staging. Its results and exact cleanup must pass before proposing production activation.

The CLI-generated migration 20261031142407 precedes already-recorded future-dated migrations; explicitly select and record this source on an authorised live release. No dependency on the unactivated email-receipt migration. Staff/partner legacy upload pages are a separate follow-up; this change addresses the student application request response path.
