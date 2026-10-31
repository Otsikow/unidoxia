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

Direct email additionally requires both the existing `RESEND_API_KEY` and **`STUDENT_EMAIL_ENABLED=true`**. Missing function/table/key/flag leaves direct email disabled and gives a clear setup message, with external WhatsApp, email-app drafting and internal chat available. The key stays server-side. Sender and reply-to are fixed to `info@unidoxia.com`; signature uses the UniDoxia Team identity with the existing official logo, linked WhatsApp/email/website and company disclosures.

Every email is audited before contacting Resend. Client operation IDs and provider idempotency keys are stable on retry. An accepted operation returns its stored result. Uncertain timeouts, 408/409/5xx responses and audit-update failures retain the same pending attempt; the composer locks that draft and offers recovery from history. The stored signature is reused on retries. Attempts older than 23 hours require reconciliation because Resend only retains idempotency keys for 24 hours. Provider acceptance is never labelled delivered/read. The hourly actor check (60) is a coarse guard, not an atomic global billing limit; configure provider limits before high-volume activation.

WhatsApp is an external `wa.me` launch, reviewed and sent in WhatsApp. Its optional audit says **launch requested**, not sent, delivered or synchronised. A blocked popup, closed window or failed launch audit does not prove contact. Email-app fallback is also an external draft, not confirmed sending. No student document attachment is transmitted by these links.

## Managed activation — identity gate completed, provider rollout still controlled

Eric approved the original communication ledger/service and one test to his nominated recipient. During initial activation the ledger read grant was held while pre-existing signup/profile permission weaknesses were reviewed. He then separately approved **20261108000000** after 31/31 genuine Auth/REST/RLS staging checks. The fix was merged through [PR #1268](https://github.com/Otsikow/unidoxia/pull/1268), applied transactionally and read back with unchanged baseline business/account counts. The current security report is `../security/SIGNUP-ROLE-TRUST.md`.

The staff SELECT grant has now been restored, with active-staff/own-tenant RLS and no browser audit writes. The existing signed-in owner dashboard successfully loaded its live history through the deployed JWT-verified service. One authorised neutral test was accepted by the provider and saved once. The temporary send flag was removed afterward; the owner subsequently confirmed actual receipt and the correct signature. No other student was contacted or changed.

Current release boundaries:

1. **Identity gate completed:** source, actual-Auth staging, live functions/trigger/permission read-back and unchanged baseline counts are recorded. Do not replay old migrations to restore permissions.
2. **Staging limit remains:** its newer runtime could not deploy the original Edge format. Actual handler/Auth/database acceptance used a loopback HTTP adapter; it was not a full production schema clone. No privileged production fixture was created.
3. **Controlled sending completed:** one test only, using the existing official sender/key/signature and existing nominated student record. The send switch is off after the test. Operational enablement and any recipient action remain explicit decisions, not inferred from preview/publication.
4. **Delivery receipts are separate:** the new migration/function/signing secret/rollout must follow `EMAIL_DELIVERY_RECEIPTS.md`; synthetic signed staging tests do not count as a real provider receipt.
5. **Native external replies remain unconnected:** do not claim mailbox/WhatsApp synchronisation, merge the separately held WhatsApp proposal, change DNS/OAuth/credentials or publish the frontend merely because these identity checks passed.

The separately tracked partner-isolation RPC and inactive reads under older global policies remain documented. These targeted guards are not a complete platform-wide security audit.

No inbound webhook, DNS, OAuth scope, Meta/Twilio paid setup or production credential was added. For native WhatsApp history, review #1234's consent, webhook signature, contact-to-student identity, window/templates and Auth acceptance first. For email replies, choose either a dedicated Resend inbound subdomain plus verified webhooks or a minimally scoped official-mailbox OAuth integration. Preserve threading and prove exact student association before displaying any inbound history. Delivery/read badges need signed provider event handling and event deduplication; they are not inferred from send success.

References: [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp/api), [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Resend inbound](https://resend.com/features/inbound).

## Verification

- Unit/integration tests exercise the actual centre/composer with isolated adapters: personalised templates, approved signature, canonical recipient, foreign applications, inactive/unauthorised access, send failure/retry, provider acceptance, source-labelled history, per-student draft isolation, unavailable-service fallback and internal recipient boundaries.
- The server entry point passes `deno check`. Frontend TypeScript, targeted ESLint, Vite build and diff checks are release gates. Existing AdminStudentDetail has two pre-existing useMemo warnings; no new lint errors.
- `scripts/verify-student-communication-rls.mjs` applies the migration twice in isolated PostgreSQL (PGlite 0.5.14), checking tenant reads and anonymous/student/inactive/browser-write denial. It uses synthetic roles and a fixture schema; it is not a full managed migration replay or real Auth-issued acceptance.
- To reproduce outside application dependencies: install `@electric-sql/pglite@0.5.14` in a temporary directory, then set `COMMUNICATION_PGLITE_MODULE=/absolute/temp/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-student-communication-rls.mjs` from the repository.
- Local Brave verification uses actual AdminLayout, centre, workspace and internal chat components against sample adapters. No real contact is opened or messaged. Desktop, 768×1024 tablet and 390×844 phone checks cover scrolling, personalised links, note read-back, another student's empty history and sample failed-send recovery. Screenshots are in the surrounding workspace's `outputs/unidoxia-communication-centre`.

## Follow-up build — 31 October 2026

The communication workspace now includes **Follow-ups**, reusing the application's existing task list, assignee, Monday–Saturday date validation, stable create ID, optimistic update checks, completion/reopen and claim actions. Tasks are scoped to the exact selected application and tenant. Staff select the application context before creating a dated action; students without applications are directed to their existing profile/application journey. Drafts stay mounted across channel tabs and student switches; changing application asks before discarding follow-up edits. Field IDs are unique per student/application and inactive panes do not fetch. Phone channel controls wrap so Follow-ups remains discoverable. Changing context after an accepted email starts a new editable message rather than keeping the old accepted state.

No new follow-up table, messaging provider or automated non-response inference is introduced. A task can say to check for a response, but only the real external conversation or a staff record establishes whether a reply exists. This build does not enable outbound messaging or import inbox/WhatsApp history.

## Isolated acceptance plan (prepared, not provisioned)

Use a disposable backend containing schema and application code only: no production rows, passwords, session tokens, provider secrets or mailbox contents. Seed synthetic tenants A/B and reserved `.invalid` accounts for active/inactive admin, staff, student, agent and partner roles. Use genuine Auth-issued sessions with generated credentials kept out of logs. Test role metadata, cross-user repair, tenant changes, reactivation, role mutation/sync, direct client audit write denial and exact student/application scoping. Keep outbound providers stubbed and email off. Record only created fixture IDs and results; delete/revoke the exact test sessions/accounts and dispose of the backend after verification. Provisioning this staging backend and its test accounts requires owner approval; no privileged production fixtures are an acceptable substitute.

Those gates subsequently passed for the specifically approved identity migration; it was applied and history reads restored before the one authorised test. Provider mailbox delivery, actual email replies and WhatsApp history must each be verified against their own underlying integration. No scheduled bulk follow-up or student outreach is authorised by this implementation.

## Current operational read-back — 31 October 2026

The identity migration was explicitly approved, merged, applied transactionally and read back with unchanged baseline business/account counts. The held staff SELECT grant on communication history was then restored under its original approval; RLS and denial of browser audit writes remain. An existing signed-in administrator successfully loaded live history without a minted/impersonated session. One owner-approved neutral email test was accepted by the provider and saved once; the owner subsequently confirmed receipt with the correct signature. The temporary send flag was removed afterward. No other student was contacted or changed. See `../security/SIGNUP-ROLE-TRUST.md` for the activation evidence and remaining legacy-policy limits. The new delivery-receipt feature has been tested with synthetic signed events in staging but remains a separate, unactivated provider integration.


### Branded signature — 31 October follow-up

The owner confirmed that the controlled email arrived with the correct original signature and requested a more professional branded version. New attempts use the official logo (existing production `favicon-96.png`), WhatsApp +44 7360 961803 (existing Contact page), official email/website and the legal identity/office/ICO details already maintained in `src/config/business.ts`. The legal identity and office were cross-checked against the public Contact page. The HTML signature uses presentation tables and inline styles, readable contact text when images are blocked, and a full plain-text alternative. The composer previews the fixed HTML; external email-app drafts retain plain text. Pending legacy attempts retain their exact old HTML/text payload. No second test or sending enablement is implied by this signature change.

### Social signature links — 31 October follow-up

Added the seven official destinations already maintained in the website footer: LinkedIn, Facebook, Instagram, TikTok, X, Reddit and the WhatsApp Channel. The direct WhatsApp contact link remains separate. HTML uses readable text links that wrap without depending on icon images; plain-text email/app drafts include the full URLs. A regression check reconciles these destinations with the website footer.

The original branded V1 renderer/text are retained. An exact provider-payload hash verifies that uncertain V1 retries keep their existing HTML and plaintext after the social-link update, alongside the original legacy signature handling. No new email, recipient action, sending flag, migration or receipt integration is implied by this change. Validation: 578 tests, TypeScript, targeted lint, Deno shared-service check and Vite production build pass; desktop/mobile previews fit at 390px.
