# Verified email delivery receipts

## Scope

The communication centre can display a provider-confirmed delivery outcome on its original email record. Send acceptance and delivery stay separate. “Delivered” means the recipient’s mail server accepted the message; it does not prove inbox placement, a human read or a reply. No open/click tracking, inbound email content or WhatsApp history is imported by this build.

The receipt service is a separate, disabled-by-default endpoint, `student-email-events`. It accepts only signed provider POSTs, verifies the untouched raw body with the official pinned **Svix 2.9.1** SDK, limits bodies to 64 KiB and relies on the SDK’s timestamp/signature checks. Supabase user JWT verification is disabled only for this external-provider endpoint; the existing staff communication endpoint keeps its own user authentication and existing gateway configuration. A fake or absent signature cannot reach storage.

Supported events: delivered, delivery_delayed, bounced, failed, suppressed and complained. History uses readable labels and high-contrast states. A failed outcome links to its known application when available. Unknown provider messages and unrelated events are ignored without storing their bodies, contacts or metadata. No student outreach or automatic task creation is triggered.

## Exact association and reliability

`20261109000000_student_email_delivery_receipts.sql` adds optional delivery state/time, a per-attempt receipt-tag snapshot, a unique provider-email index and a server-only receipt event table. The service-only transaction function locks the original email, deduplicates on the signed event identifier and stores only its communication FK, event type and timestamps. Browser/anonymous callers cannot invoke it or read the private event table. The original communication ledger read grant is not restored by this migration.

New opted-in send attempts include a provider tag carrying their operation ID. The tag setting is snapshotted with the attempt: retries retain their exact original provider payload even if the rollout flag changes. Existing untagged attempts do not acquire a tag on retry. Known provider IDs correlate legacy accepted emails; an opted-in pending attempt may also recover an early signed receipt by exact operation ID and recipient match. Unknown or ambiguous association is not guessed from student name/email. An early mismatched receipt asks for retry without changing an attempt.

Persistence, early acceptance recovery and deduplication are atomic. Older receipts do not overwrite a newer outcome. A delay cannot erase confirmed delivery; confirmed failures/complaints are not cleared by weaker events. A conflicting signed event identifier rolls back the whole operation. Uncertain database writes return a retryable response to the provider. Existing pending attempts without a provider ID/tag retain the original same-operation retry/mailbox reconciliation process.

History reads remain compatible with the earlier schema: only an absent delivery column triggers a fallback to the original selected fields. Permission errors never trigger that fallback. Sending is audit-first and the new opt-in tag column is written only after the receipt rollout is explicitly enabled.

## Controlled activation — not done by this build

The identity migration was separately approved and applied, and the original staff history read grant was restored. The single previously authorised email test was accepted and the owner confirmed receipt with the correct signature; its temporary send flag was removed. This feature does not authorise its new production migration, a provider webhook/signing secret, further sending or frontend publication.

After the relevant approvals and security prerequisites:

1. Inspect the managed schema/constraints and apply/record **20261109000000** transactionally. Do not replay the original ledger migration to lift its hold. Back up/reconcile any unexpected duplicate provider identifiers first; never delete history to make an index pass.
2. Deploy the new receipt endpoint and the updated staff communication function/shared modules. Keep receipt and sending flags off during setup.
3. In the official Resend account create a webhook restricted to the six supported delivery events, using the receipt endpoint for the correct backend. Store its signing secret through the managed secure form as `STUDENT_EMAIL_WEBHOOK_SECRET`; never paste it into chat, frontend code or source control. Leave unrelated providers/mailboxes unconnected.
4. Enable **`STUDENT_EMAIL_EVENTS_ENABLED=true`** only after the signing secret, migration and endpoint are ready. This enables signature-verified receipts and snapshots tags for new send attempts. It does not itself enable outbound mail, which still requires the separate `STUDENT_EMAIL_ENABLED` flag and the existing server-only send key.
5. Obtain separate authority for a new receipt-enabled test after setup; the earlier one-email authorisation has already been used. Verify the send audit, actual provider receipt, history status and duplicate/retry behaviour. Check that unrelated provider emails are ignored and no response/read status is invented. Actual inbox placement still needs mailbox confirmation.
6. Roll back operationally by turning the receipt flag off and leaving the additive schema/history intact. Existing pending tagged attempts retain their snapshot. If sending is also held, keep that separate flag off. Do not remove recorded correspondence or weaken authentication to clear an error.

Native email replies require an approved inbound address or narrowly scoped official-mailbox integration and verified thread-to-student association. The separate official WhatsApp proposal retains its own review and account setup. Neither is declared synchronised here.

## Evidence and limits

- Focused tests cover signature gating, raw-body preservation, size limits, malformed/future events, unsupported event suppression, retry responses, minimal data retention, schema fallback and immutable send tags.
- Two Deno tests use real HMAC fixtures against the actual official SDK, including valid signatures, tampering, stale and future replay rejection. The actual receipt entry point is type-checked with Deno in an isolated temporary dependency cache, not by adding frontend dependencies.
- `scripts/verify-student-email-events.mjs` runs 25 isolated PostgreSQL checks for transactionality, duplicate conflicts, out-of-order events, early receipt recovery, recipient matching, migration replay and privilege/hold preservation. This is fixture-schema testing, not a production replay or real provider delivery.
- The exact committed receipt handler, official Svix 2.9.1 verifier and service-only recorder passed 16 real Auth/REST/RLS staging checks using synthetic signed events and Supabase JS 2.110.2. Independent managed read-back confirmed zero fixture accounts, profiles, students, applications, communications and receipt events after cleanup. The isolated backend has no production data/provider credentials; its loopback adapter does not validate the production Edge gateway or actual provider delivery.
- No provider signing key was collected, no webhook was configured and no production receipt migration was applied. The separate original controlled live test is recorded above. UI previews use explicitly synthetic records.

Official sources: [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [delivered event/tag fields](https://resend.com/docs/webhooks/emails/delivered), [supported event types](https://resend.com/docs/webhooks/event-types).
