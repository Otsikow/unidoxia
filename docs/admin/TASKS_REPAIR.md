# Tasks page realtime crash repair

## Reproduced failure

Eric reported a full-page error at `/admin/tasks`. The authenticated live browser reproduced it. The console reported `cannot add postgres_changes callbacks ... after subscribe()` for the shared staff task topic.

The task summary, automation panel and board all call the existing staff data hooks. Each consumer attempted to register callbacks on the same table/tenant topic. The installed Supabase client reuses an existing channel for a topic and rejects callback registration after subscription. In addition, query-key arrays were reconstructed on every render, repeatedly tearing down/recreating the subscriptions.

## Repair

`useRealtimeInvalidate` now owns a fresh topic for each effect lifetime, preserves the existing table/tenant filter, and keys its lifecycle by the serialised primitive query-key value instead of array identity. Cleanup removes only that effect's channel, is idempotent and ignores late callbacks. Effect replay and rapid remounts cannot reuse a still-closing channel. Optional realtime setup/cleanup failures are handled without crashing the normal authorised queries or manual refresh.

The same helper serves existing staff students, agents, tasks, messages and payments queries. No query scope, mutation payload, role, database permission or financial operation was changed.

## Verification

- Regression tests reproduce the real SDK's topic reuse/subscribe constraint, simultaneous task consumers, stable rerenders, key/scope changes, late callbacks, StrictMode replay, rapid remount and unavailable realtime setup.
- Integration tests mount the actual StaffTasks summary, automation panel, board and composer inside the real unified AdminLayout. They verify data rendering and Add task without a second sidebar or conflicting subscriptions. The UI also remains usable when realtime setup fails.
- Local browser checks use these actual components with synthetic records and an adapter enforcing the SDK's collision behaviour. Filtering to Completed and restoring All statuses worked; Add task opened the real form; no browser console errors were recorded. No task was created or updated.
- 477 tests passed in 70 files. The final seven focused checks, TypeScript, Vite build, targeted lint and whitespace checks passed. A read-only managed-database query confirmed task/profile join fields; this is not real Auth-issued mutation acceptance.

The earlier admin consolidation's task fixture verified navigation composition only. It did not exercise this actual page and was insufficient to establish task-page readiness. Future route readiness checks must mount the real page, its providers and its data/subscription hooks; label synthetic and authenticated verification separately.

Existing task automation descriptions and end-to-end automation behaviour are outside this crash repair's certification. The next recommended product build remains an application-readiness/document-request loop with real role-based acceptance tests.
