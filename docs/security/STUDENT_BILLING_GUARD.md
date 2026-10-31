# Student billing and ownership guard — 31 October 2026

Read-only live review confirmed table INSERT/UPDATE privilege for authenticated users, an owning-student UPDATE policy, no billing guard, and public student plan/payment/assignment columns. The existing Coursefinder trigger validates admissions fields; it does not restrict billing/ownership changes. No attempt to exploit or alter a live student record was made. Historical repository upgrade/limit functions are absent live, so they are not evidence of current protection.

The forward trigger reserves student ownership/workspace, plan/payment confirmation and staff assignment fields for current active trusted staff, signed service calls or direct trusted database maintenance. Ordinary personal/academic edits remain available, including for existing paid accounts. Student-created records must start free with no payment or assignment claims. Caller-editable metadata is not a privilege source; a missing JWT alone is not trusted. Trigger execution is not exposed as an RPC. No existing rows, plans, files or grants are rewritten by activation.

Local SQL/RLS acceptance uses actual PostgreSQL roles/policies and stub Auth claims in PGlite; real Auth/Data API acceptance against a representative isolated schema is required before live approval. Stage schema fixture only adds required columns and reproduces the write policies under review; its older broad synthetic read policy is preserved and is not evidence of production read isolation. Production RLS read policies stay unchanged.

Stage runner permits only the isolated backend, forbids configured payment/email providers, uses reserved synthetic Auth accounts, bounded calls, checkpointed exact cleanup and actual password sign-ins. No live payment/event/email is created. Migration-specific approval, transaction/ledger registration and source/ACL/data fingerprint read-back are required for production. Existing request-receipt migration approval remains separate.

This does not complete webhook settlement atomicity/idempotency, live application-limit enforcement, agent referral attribution, or inactive-student ordinary-edit policy review; those are separate priorities.
