# Student communication centre

## Purpose and current behaviour

The admin Messages route (`/admin/messages`) now starts with a student search and one student workspace. Search uses name, preferred name, registered email and reference, with 25-row pagination. The selected student's registered contacts, profile and application context stay visible. Each opened student retains their own in-memory draft while switching within the centre; leaving the page clears unsent drafts. No message bodies are written to browser storage. Cache keys include the signed-in user and tenant; changing identity unmounts old workspaces.

Email, WhatsApp, internal portal chat and source-labelled communication history are separate tabs. On phones and tablets, student search and the workspace are separate views; desktop uses two independently scrolling panels. Existing Team inbox, partner/internal chat and Zoe remain under **Team inbox & Zoe**. The existing sidebar scroll, resizing, collapse and mobile drawer remain available.

Student list actions, profile page and profile sheet link to the centre and personalised WhatsApp drafts. WhatsApp uses `students.whatsapp_number`, with only the explicit legacy `address.whatsapp` fallback. Ordinary `contact_phone` is never silently treated as a WhatsApp number. International country-code format is required; local-format numbers must be corrected in the student's record. Templates do not assert unverified offers, submissions or visa outcomes. Staff must review actual case details before sending.

## Existing services reviewed

- Portal messages use the existing `useMessages` and ChatArea infrastructure. The centre explicitly opens the exact linked student account and checks tenant, current administrator and participants before rendering. It excludes mixed-student conversations. The last internal sender indicates whether an internal reply may be outstanding; external response status is unknown.
- Contact/application email already uses Resend and `info@unidoxia.com`. Broadcast dispatch is a separate marketing workflow, with a different sender/recipient ledger; it is not reused for operational student correspondence.
- Broadcast dispatch has a Twilio WhatsApp transport. No inbound production synchronisation was verified.
- Open PR [#1234](https://github.com/Otsikow/unidoxia/pull/1234) already proposes an official Meta Cloud API assistant/inbox, with consent, signed webhooks and handover. Its description retains an explicit Eric approval/QC gate. This build does not merge, enable or replace it. Prefer reviewing and completing that existing implementation over starting a competing native WhatsApp backend.
- Official mailbox replies and historical WhatsApp conversations are not imported. The communication ledger records only this centre's email attempts, external launch requests and manual staff notes. Staff can record a response/follow-up note and open application follow-ups for a dated task.

## New backend and permissions

`supabase/migrations/20261106000000_student_communication_ledger.sql` creates the operational audit, indexes and SELECT-only RLS. It sorts after existing main migrations, which already have future dates. The migration is safe to replay without replacing data or changing existing student/application policies. Active admin/staff can read their own tenant's audit; authenticated clients cannot insert, update or delete it. It contains personal correspondence; it is not an immutable regulatory archive and follows existing student deletion through its FK. No additional retention/purge policy is invented by this change.

`student-communication` is a JWT-verified Edge Function (a server-side request handler). It revalidates the actual authenticated user, active staff/admin profile, tenant, exact student and optional application before privileged writes. Recipient email/WhatsApp is resolved from that student's registered record, never accepted as an arbitrary client destination. A changed email snapshot stops sending. Role metadata supplied by a browser is not trusted.

Direct email additionally requires both the existing `RESEND_API_KEY` and **`STUDENT_EMAIL_ENABLED=true`**. Missing function/table/key/flag leaves direct email disabled and gives a clear setup message, with external WhatsApp, email-app drafting and internal chat available. The key stays server-side. Sender and reply-to are fixed to `info@unidoxia.com`; signature is the user-approved existing UniDoxia Team signature.

Every email is audited before contacting Resend. Client operation IDs and provider idempotency keys are stable on retry. An accepted operation returns its stored result. Uncertain timeouts, 408/409/5xx responses and audit-update failures retain the same pending attempt; the composer locks that draft and offers recovery from history. The stored signature is reused on retries. Attempts older than 23 hours require reconciliation because Resend only retains idempotency keys for 24 hours. Provider acceptance is never labelled delivered/read. The hourly actor check (60) is a coarse guard, not an atomic global billing limit; configure provider limits before high-volume activation.

WhatsApp is an external `wa.me` launch, reviewed and sent in WhatsApp. Its optional audit says **launch requested**, not sent, delivered or synchronised. A blocked popup, closed window or failed launch audit does not prove contact. Email-app fallback is also an external draft, not confirmed sending. No student document attachment is transmitted by these links.

## Managed activation — still required

No production schema, credentials, provider setting or real student communication was changed during implementation. Read-only managed inspection found no `student_communications` table. A frontend publication alone does not activate direct email/history.

After migration-specific approval, use the established Lovable-managed stack, not a separate Supabase login:

1. Inspect the actual managed migration ledger and referenced columns, then apply/record **20261106000000_student_communication_ledger.sql** transactionally. Do not replay unrelated pending migrations blindly.
2. Deploy the committed `student-communication` function with JWT verification. Keep `STUDENT_EMAIL_ENABLED` unset/false initially. Reuse the existing Resend key; do not expose or duplicate credentials in frontend settings.
3. Verify an actual Auth-issued active admin/staff session can access its own student only. Check inactive staff, student, agent, anonymous and foreign-tenant/app denial. Confirm browser audit writes are denied.
4. Verify the official sender/domain and an owner-approved disposable test recipient. Enable direct email only for a controlled acceptance check, check provider acceptance and actual mailbox delivery, then confirm the audit with the same operation ID after a simulated dropped response. Do not use real students as unapproved test recipients. Turn the flag off if acceptance fails.
5. Only then approve operational use. Refresh the capability query by reloading the centre. Test the published `/admin/messages` route separately from the local/preview build.

No inbound webhook, DNS, OAuth scope, Meta/Twilio paid setup or production credential was added. For native WhatsApp history, review #1234's consent, webhook signature, contact-to-student identity, window/templates and Auth acceptance first. For email replies, choose either a dedicated Resend inbound subdomain plus verified webhooks or a minimally scoped official-mailbox OAuth integration. Preserve threading and prove exact student association before displaying any inbound history. Delivery/read badges need signed provider event handling and event deduplication; they are not inferred from send success.

References: [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp/api), [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Resend inbound](https://resend.com/features/inbound).

## Verification

- Unit/integration tests exercise the actual centre/composer with isolated adapters: personalised templates, approved signature, canonical recipient, foreign applications, inactive/unauthorised access, send failure/retry, provider acceptance, source-labelled history, per-student draft isolation, unavailable-service fallback and internal recipient boundaries.
- The server entry point passes `deno check`. Frontend TypeScript, targeted ESLint, Vite build and diff checks are release gates. Existing AdminStudentDetail has two pre-existing useMemo warnings; no new lint errors.
- `scripts/verify-student-communication-rls.mjs` applies the migration twice in isolated PostgreSQL (PGlite 0.5.14), checking tenant reads and anonymous/student/inactive/browser-write denial. It uses synthetic roles and a fixture schema; it is not a full managed migration replay or real Auth-issued acceptance.
- To reproduce outside application dependencies: install `@electric-sql/pglite@0.5.14` in a temporary directory, then set `COMMUNICATION_PGLITE_MODULE=/absolute/temp/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-student-communication-rls.mjs` from the repository.
- Local Brave verification uses actual AdminLayout, centre, workspace and internal chat components against sample adapters. No real contact is opened or messaged. Desktop, 768×1024 tablet and 390×844 phone checks cover scrolling, personalised links, note read-back, another student's empty history and sample failed-send recovery. Screenshots are in the surrounding workspace's `outputs/unidoxia-communication-centre`.
