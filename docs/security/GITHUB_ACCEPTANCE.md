# GitHub backend acceptance — no Lovable builder credits

Eric requested GitHub/local development to preserve the remaining Lovable credits. Do not send Lovable builder messages or use its AI for implementation/testing. Work in Git branches, local checks and this manual GitHub Actions workflow. Publishing and specifically approved live migrations remain separate release actions; this CI cannot deploy or contact a hosted database.

The workflow uses a standard ubuntu-24.04 runner in the public repository, with read-only repository permission and immutable official checkout/setup-node revisions. It installs pinned Supabase CLI2.122.0, JS2.110.2 and postgres3.4.9 into temporary tooling. No production secrets, hosted project links, artifact uploads, caches, provider keys or paid larger runners. Standard public runner compute is free; no artifact/cache storage is created by this workflow. It runs only on manual workflow_dispatch, not every push.

A disposable Supabase stack runs on the runner's localhost. The existing representative baseline, trusted identity helpers, billing guard and selected candidate migration/fixtures are loaded there. Harnesses must explicitly opt into local-ci-only and exactly http://127.0.0.1:54321; local mode refuses the hosted backend. Fifteen boundary checks cover wrong hosts, ports, credentials, protocols and paths. Local keys are masked and kept in runner temporary files, never source or artifacts. Actual Auth admin-create/password sign-in, Data API RLS, concurrency and (receipt suite) private Storage use synthetic accounts/files. Independent SQL read-back verifies zero accounts/fixture rows/objects and unchanged starter tenants. The stack is removed afterwards.

The fixture is not a full production clone: it preserves the earlier deliberately broad synthetic SELECT policies and a representative consent clamp. It establishes the tested write/ownership/quota/Storage boundaries, not complete Coursefinder, university onboarding, provider delivery, production read isolation or live operational acceptance.

Run from a candidate branch that includes this workflow/framework and its reviewed harness. The default main branch need not contain an unapproved candidate migration. Examples after merging the framework into the respective candidate branch:

    gh workflow run backend-acceptance.yml --ref codex/application-submission-guard -f suite=application
    gh workflow run backend-acceptance.yml --ref codex/document-request-submission -f suite=receipts

Check the actual run logs, commit/source hashes, semantic results and cleanup; never treat a dispatched or green compile-only run as passing backend acceptance. Retain prior failures and state which fixture/implementation changed. No live activation follows automatically from a passing test.

Sources: https://docs.github.com/en/billing/concepts/product-billing/github-actions and https://supabase.com/docs/guides/local-development/cli/getting-started.
