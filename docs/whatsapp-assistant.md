# UniDoxia WhatsApp student assistant

This is a prepared implementation, not a deployment. Merging does not enable WhatsApp sending. The migration prepares a daily retention job; templates are drafts, and no messages should be sent during repository verification.

## Owner setup

1. Apply `supabase/migrations/20261103000000_whatsapp_assistant.sql` in a test project first. It preserves student RLS and adds no consent backfill. Deploy `whatsapp-webhook`, `whatsapp-reply`, `whatsapp-config` and `zoe-handoff` only when authorised. Keep sending disabled.
2. Create or select the Meta Business portfolio, WhatsApp Business Account (WABA), and Meta app with WhatsApp enabled. Complete Meta business verification and display-name/number verification as required by WhatsApp Manager.
3. The existing launcher uses **447360961803**. Check eligibility for WhatsApp Business app/API coexistence through Meta's supported onboarding flow before registering it. Do not deregister or interrupt the existing business app. If coexistence is unavailable, use a new owner-approved number and update `src/config/whatsapp.ts` and the setup references together. A new number is a deliberate product change, not a silent fallback.
4. Start with Meta's test number and explicitly authorised test recipients. Create a system user in the Business portfolio, assign the WABA/app assets and generate the appropriate permanent system-user token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions. Store tokens only as Supabase secrets; rotate/revoke them through Meta. Confirm current permission and expiry requirements in Meta's dashboard.
5. Configure the callback `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook` with a random verify token. Subscribe to `messages` for the WABA. The GET verification route requires that same token. POST requests require an HMAC SHA-256 signature over the exact raw body, using the Meta app secret. The function returns 503 without that secret and 401 for an invalid signature.
6. Set the secrets below. Confirm the phone number ID belongs to the configured WABA; it is a Meta identifier, not the business telephone number. Outbound calls use Graph API **v21.0**, as requested. Confirm Meta still supports this version before activation.
7. Test the disabled/skipped path first, then set `WHATSAPP_ASSISTANT_ENABLED=true` **last**, in the test project. After owner approval and successful testing, repeat the sequence in production. The public config endpoint exposes only a readiness boolean. Student consent/linking/Zoe controls remain hidden on missing configuration or endpoint failure. Reload the page after configuration changes. Existing launcher behaviour and analytics remain intact.

| Secret | Value / purpose |
| --- | --- |
| `ZOE_HANDOFF_IP_SALT` | Random secret salt for SHA-256 IP hashes; missing salt refuses handoffs with the plain WhatsApp fallback |
| `WHATSAPP_VERIFY_TOKEN` | Random shared webhook verification token |
| `WHATSAPP_APP_SECRET` | Meta app secret for signature verification |
| `WHATSAPP_PROVIDER` | Exactly `meta` |
| `WHATSAPP_ACCESS_TOKEN` | Permanent system-user token, subject to Meta revocation |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID |
| `WHATSAPP_OPENING_HOURS` | Optional confirmed-hours JSON; no default |
| `WHATSAPP_ASSISTANT_ENABLED` | Exactly `true`, set last; unset or `false` disables sending |

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the edge runtime. Never put the service key, Meta token or app secret in a Vite environment variable. No new frontend environment variables are needed.

Opening hours are configured only through `WHATSAPP_OPENING_HOURS`, using Europe/London daylight saving internally. The schema is `{"days":[1],"open":"09:00","close":"17:00"}` (an illustrative Monday only, not UniDoxia's opening hours). Days are Monday=1 through Saturday=6. Unset or invalid configuration means unknown hours and the generic handover, with no schedule or response-time promise. **Eric must confirm the actual hours before launch.** Outside confirmed hours the assistant gives only the next opening date and time, such as Monday 19 October from 9am UK time.

## Operation and safety

The inbox is `/admin/whatsapp`, available to admin and staff through existing role helpers. Staff can take over, hand back, assign themselves, close, and reply. Student-initiated contact permits enquiry replies; optional profile consent is separate from account linking and from simply supplying a number at sign-up. Reply START resumes service replies without granting application-update or marketing consent; STOP/UNSUBSCRIBE confirms once and suppresses subsequent messages, including staff replies, until START. Consent commands work in human mode. The profile box controls application-update consent only. Saving it unticked without previous consent does not record a withdrawal and does not block replies. Only STOP sets contact `opted_out_at`, and only START clears it. A profile change never changes that field. A number change revokes account links and resets consent; students must explicitly consent for the new number.

Account link codes last 15 minutes, are six digits, single use and number-bound. Issuance invalidates older codes, and repeated requests within one minute are refused; plaintext codes are returned once and only SHA-256 hashes are stored. A contact has at most five verification attempts per 15 minutes. Codes and failures reveal no student identity. Status replies recheck the saved number. Application summaries use the existing `applications.updated_at`, labelled “Last updated”, never “Last status change”. No application trigger is added. No documents, fees, decisions, notes or staff details are returned.

Zoe context is created through the `zoe-handoff` edge endpoint using salted IP hashes and the limits described below. On failure the panel retains a plain WhatsApp button. References are single use, expire after 24 hours and never authorise account status access.

Messages are processed synchronously before webhook acknowledgement. Inbound message IDs are claimed transactionally; counters and ingestion deduplicate together. Messages from the same contact are claimed and processed one at a time. A lost state update drops its stale reply; only three consecutive losses hand over. Interrupted processing after ingestion is routed to the admissions team where the database remains available. Failed/uncertain provider sends are not retried automatically, and skipped replies are never replayed when enabling. Review the inbox and Meta before retrying any uncertain send. Non-text media are not downloaded. Status receipts update message delivery state without downgrading a read receipt.

Only free-form text replies inside the **24-hour customer service window** from the student's last inbound message are implemented. Outside that window, Meta requires an approved template. This inbox refuses the send and explains the requirement. The templates below are drafts for approval, not a template-sending implementation. Confirm policy details in [Meta Cloud API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/overview).

Meta pricing varies by message category and the recipient's country. Many students are in Nigeria, Ghana, India, Pakistan and other markets with different rates from the UK. Check the **current rate card in WhatsApp Manager** and [Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing/) before enabling. Do not assume UK rates or that replies are free. No prices are hardcoded. Meta documentation returned HTTP 429 during preparation, so account-specific coexistence, Graph version support, pricing and verification requirements remain owner verification steps.

The WhatsApp privacy section names Global Talent Gateway Ltd using the existing footer's company details, identifies Meta Platforms Ireland Limited as processor, and explains international processing and UK safeguards. Eric must confirm the account's applicable processor and transfer terms before launch.

Automatic replies are limited to ten per contact per rolling hour through an atomic database reservation. The next enquiry receives one handover and moves to human mode, then the assistant stays silent. STOP and START remain available. Notifications are inserted only on an atomic assistant-to-human transition, including concurrent and interrupted processing. Request bodies larger than 256 KB return 413 before signature verification; signatures use the received bytes.

`canSendWhatsAppTemplate({ studentOptInAt, contactOptedOutAt, studentOptedOutAt, enabled })` in `whatsappSend.ts` is a mandatory gate for **every future template sender**, immediately before delivery with freshly read consent. No template sender exists. Never treat an existing sign-up number, account link or START as template consent. START sets contact `service_resumed_at`; nullable `marketing_consent_at` is never granted by code. STOP unlinks the contact and withdraws update consent from linked students and all students whose normalised WhatsApp number matches the contact. Every template sender must look up the contact by the student's number and pass its opted_out_at. Application-update consent can be renewed explicitly in profile settings.

Sign-up metadata is not consumed by the existing `handle_new_user`. The new `whatsapp_capture_signup_consent` RPC runs on signed-in student profile load, after existing profile creation. It reads only that user's explicit metadata, calls `whatsapp_set_preferences`, and marks capture once. It does not override an existing preference or withdrawal. Failed capture rolls back so it can be tried on a later profile load. Existing auth triggers are not replaced. The student guard is SECURITY INVOKER and changes only the new consent fields; the separate privileged sync trigger unlinks contacts when a saved number changes, without opting them out. No student/application RLS is changed.

## Test plan

Repository tests mock all fetches and cannot send real WhatsApp messages. Run `npx vite build` and `npx vitest run` before review. The existing `npm run build` also runs a network-dependent SEO postbuild step. If shared dependencies are read-only, keep caches local to this checkout without changing configuration, or use `npx vitest run --no-cache`. No deployment, hosted migration application, Graph call or external message is authorised by this document.

In an owner-authorised test project with Meta's test number:

- Apply the migration twice; verify idempotence. Run `supabase/tests/whatsapp_rls.sql` as the test database owner. As anonymous/student/agent, verify inbox/contact/message/code rows cannot be read or updated. Test admin and staff access. A student can change their own consent; agents, staff and admins must not change another student's consent. Existing student record policies must be unchanged.
- Verify GET token challenge, missing app secret 503, bad/mutated signatures 401, duplicate inbound IDs and out-of-order delivery receipts. Use a deliberately wrong phone-number ID and confirm it is ignored.
- With sending disabled, verify replies are `skipped`, the original launcher still works and new student controls remain hidden. Enabling must not replay skipped messages.
- Test the full menu, subject/level/optional-country course search, published destinations and the existing course/search links. Check catalogue filters against live records.
- Link from the number saved in the student's profile; test malformed, missing, expired, already-used, wrong-number and throttled codes. All failures must give the same generic reply. Reuse a code and change the saved number, confirming no status access. Check linking does not imply opt-in and status content contains only university, programme, stage and last-updated date.
- Test every escalation phrase, Zoe reference (valid/expired/reused/unknown), unknown messages twice, non-text handling, opening hours and UK daylight saving. Verify notifications reach both admin and staff accounts in the existing notification centre.
- Test STOP twice, ignored subsequent messages, blocked staff reply, START, and profile withdrawal both before and after linking. Change a number, confirm the old link is revoked and a fresh opt-in is required.
- Staff: reply within 24 hours, exactly at 24 hours, closed window, opted out, missing/expired JWT, student/agent JWT, take over, assign to self, hand back, close and new inbound reopening. Confirm students cannot invoke staff actions. Test responsive inbox, error messages and older-message pagination.
- Confirm Meta acceptance, delivery and read receipts separately. Neither a skipped database row nor a provider acceptance proves recipient delivery.

## Draft UTILITY templates for Meta approval

Use British English, no promotional text. Submit through WhatsApp Manager; Meta decides category and approval. Send only for an expected active application with valid consent. Avoid sensitive documents or decisions in template parameters; dashboard links must be first-party HTTPS links. These examples use fictional sample values and do not assert real application outcomes.

| Name | Draft body | Sample parameter values |
| --- | --- | --- |
| `application_status_update` | Hello {{1}}, there's an update on your application to {{2}} for {{3}}. It's now at: {{4}}. Sign in to your UniDoxia dashboard to see the details: https://unidoxia.com/student/applications. Reply STOP to stop these messages. | 1: Alex; 2: Example University; 3: MSc Computing; 4: Screening |
| `document_request_reminder` | Hello {{1}}, we still need your {{2}} for your application. Please upload it at https://unidoxia.com/student/documents. Please don't send documents on WhatsApp. Reply STOP to stop these messages. | 1: Alex; 2: transcript |
| `application_decision_update` | Hello {{1}}, a university has updated your application to {{2}} for {{3}}. Please sign in to your UniDoxia dashboard to see it. Reply STOP to stop these messages. | 1: Alex; 2: Example University; 3: MSc Computing |
| `team_reply_waiting` | Hello {{1}}, the UniDoxia admissions team has replied to your enquiry. Reply here to carry on the chat. Reply STOP to stop these messages. | 1: Alex |

Each template starts and ends with fixed text, has at most five variables and no adjacent variables. Variables must be short, single-line text with no carriage returns or new lines. Use only a short document type, never a file name, passport detail, document content or personal decision detail. **Eric must approve all four templates in Meta and confirm opening hours before activation.** Meta approval alone does not authorise sending without recorded consent.

## Retention

`public.whatsapp_purge_expired()` is SECURITY DEFINER with a fixed search path, executable only by service_role. It removes messages older than 12 months and empty conversations, except where `retain_until` is in the future. It clears old embedded Zoe context, deletes expired link codes and Zoe handoffs older than 30 days. Contacts with no conversation and no opt-out are deleted. Opted-out contacts with no conversation are minimised to their number and opt-out timestamp (plus the structural row ID); profile name, link, reply times and other metadata are cleared.

The idempotent migration schedules `whatsapp-purge-expired` daily at 03:30 in the pg_cron scheduler's configured time zone (normally UTC). It does not install extensions. If pg_cron is unavailable it emits a NOTICE and skips scheduling. **Before launch, verify the job exists and succeeds, or arrange the same service-role purge daily at 03:30.** Retention runs on Sundays too because this is data housekeeping, not admissions work.

Staff can use the `whatsapp-reply` action `retain` with `conversationId`, `reason` (`active_application` or `complaint`) and ISO `retainUntil`, at most 24 months after the last message. The service-only `whatsapp_retain` RPC enforces the cap on every request, so repeated extensions cannot bypass it, and records `retain_set_by`. Verify the active application or complaint before extending. Direct table writes cannot set retention. Review extensions when cases close; never retain indefinitely. Example request shape uses placeholders only: `{ "action": "retain", "conversationId": "<thread-id>", "reason": "active_application", "retainUntil": "<ISO-date-within-24-months-of-last-message>" }`.

## Manual RLS and database acceptance

Use an isolated test project with fictional records, never production student data. Keep sending disabled throughout.

1. Apply the migration twice, run `supabase/tests/whatsapp_rls.sql`, and inspect grants and policies. Anonymous users have no table privileges. Authenticated users have SELECT subject to staff RLS, and only column UPDATE on conversation `unread_count`. Contacts, messages, codes and handoffs have no UPDATE policy.
2. With real test JWTs for anonymous, ordinary student and agent roles, SELECT each WhatsApp table. Anonymous gets a privilege error; non-staff gets no rows. Attempt INSERT, DELETE and UPDATE and confirm denial.
3. With admin and staff JWTs, read fictional inbox rows and update `unread_count`. Attempt to change contact opt-out, message body/status, conversation mode, inbound time and retention; all must be denied. Also attempt to change another student's WhatsApp consent: staff, admins and agents must receive "Only the student can change WhatsApp consent". The owner column is `students.profile_id`. Only that student or the service role may change consent. Invoke equivalent authorised actions through `whatsapp-reply` instead.
4. Confirm students can set only their own preferences through the RPC. Sign up with consent checked and unchecked, complete email verification and sign in, then verify student consent columns. Withdraw, sign out/in and confirm metadata cannot re-enable consent. Test an already saved number with no checkbox consent and confirm no opt-in. Do not change existing auth triggers or student/application policies.
5. Invoke `zoe-handoff` with verified signed-in sessions and without a session. Configure `ZOE_HANDOFF_IP_SALT`; the edge function reads `cf-connecting-ip`, otherwise the first `x-forwarded-for` hop. Only salted SHA-256 IP hashes are stored. Test 3 per IP per rolling hour, 10 per rolling day and 5 per signed-in user per hour. Anonymous capacity is 300 per UTC hour, with a circuit breaker notification once per tripped hour for each staff inbox recipient. The same sanitised summary hash plus IP hash within 10 minutes returns the same ref without consuming capacity. Missing salt, invalid JWT, limits and errors must show the exact fallback copy and a working plain wa.me link. No raw IP is persisted. Test long/control-character summaries and the 2,000-character cap. The old browser RPC grant is revoked; only service_role can invoke creation.
6. Send eleven fictional inbound payloads locally with mocked transport; verify ten automatic replies, one handover, one transition notification and silence thereafter. STOP must still withdraw both contact and linked student consent. Test concurrent handovers in PostgreSQL, since the in-memory adapter cannot prove locking.
7. As service_role, create old messages, an empty thread, a future-retained thread, an expired code, an old Zoe handoff and an opted-out contact. Run the purge; verify the old/empty records are removed, the retained thread survives and opted-out numbers remain. Verify anon/authenticated cannot invoke the purge, inspect `cron.job` for the named job and `cron.job_run_details` after a scheduled run.

Local unit tests and static SQL assertions are not PostgreSQL/RLS, cron or Meta acceptance evidence. Those checks remain required before activation.

## Additional QC acceptance and launch gates

The under-18 option uses the existing `students.date_of_birth`: profile, settings and complete sign-up hide the updates box for a known under-18, and the preferences RPC refuses opt-in for them. New sign-up has no saved date of birth; the guardian privacy line remains. Gate D5: Eric must confirm the approach and any parental-consent requirements before activation. Gate D6: Eric must confirm the Meta transfer wording and privacy release timing. The privacy text describes the Business Platform and must be deliberately timed with the switch from the Business app. Gate D4 remains with Eric: Zoe's visa prompt was not changed by this QC revision; only its earlier fixed WhatsApp escalation sentence is retained.

Links expire after 180 days and are rechecked before application status access. STOP unlinks immediately. `whatsapp_link_codes` and `zoe_handoffs` have no authenticated RLS policy, including for staff. The inbox sees only context copied into its conversation. Link codes are stored only as SHA-256 hashes.

Inbound processing uses service-only `whatsapp_claim_next` and `whatsapp_finish_claim`. A per-wa_id advisory transaction lock protects each claim and finish, with a durable token preventing overlapping edge flows. New ingests queue behind the active claim and are drained from fresh snapshots in database queue order. A stale state write drops its reply and records a loss; only three consecutive losses hand over. Abandoned claims after five minutes are marked processed and handed over because delivery might be uncertain; they are never replayed. Staff takeover and STOP still win the immediate sending guard.

The Zoe panel checks only the student's last messages plus Zoe's exact escalation sentence. Handoff creation runs through the edge function rather than the anonymous RPC. An IP-key advisory lock protects dedupe and IP limits; a user-key lock protects signed-in limits. A bounded hourly counter row reserves anonymous capacity atomically, without a global advisory lock. The inbox labels browser-written context as unverified.

T4 is optional for Eric to decide: many people who message first will not have ticked updates consent, so `canSendWhatsAppTemplate` will block `team_reply_waiting`. Meta approval alone does not permit sending without recorded consent.

For plain local PostgreSQL, use a disposable database and run:

```sh
psql -v ON_ERROR_STOP=1 -f supabase/tests/whatsapp_local_stub.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261103000000_whatsapp_assistant.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261103000000_whatsapp_assistant.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/whatsapp_rls.sql
```

The stub is test-only, never a migration. It mirrors the owner column, role helpers and notification arguments used by this migration. The SQL suite rolls back fictional fixtures, checks grants, exercises consent ownership, STOP by number, retention/purge, queue claims and link privacy. It also tests Zoe IP/hour/day/user limits, dedupe and breaker notifications. Local PostgreSQL is not hosted Supabase, cron, browser or Meta acceptance evidence. Confirm `cron.job` contains `whatsapp-purge-expired` and verify a successful run before switching on.

## Verification of the QC revision

`npx vite build` passed. `npx vitest run` passed 381 tests across 45 files, including the new flow, orchestration, edge-boundary and fallback UI checks. Fetches are mocked; no real messages were sent. No dependencies or protected build/test configuration files changed.

Plain PostgreSQL execution remains unverified in this sandbox: `initdb` failed with `could not create shared memory segment: Operation not permitted`, and the existing local socket was also denied. The SQL stub and expanded transactional checks are prepared, but repeat migration application, actual RLS/locking, and SQL rate-limit execution must be run in an allowed disposable database using the commands above. Hosted Supabase, trusted edge headers, cron execution, Meta and signed-in browser acceptance remain unverified. No commit, push or deployment was performed.
