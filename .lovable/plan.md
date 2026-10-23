# Release capabilities and blockers (inspection only, nothing changed)

## 1. Deploying `submit-website-lead`
- This project runs on Lovable Cloud. Pushing to GitHub or merging PR #1239 does **not** deploy edge functions. Migrations also never apply automatically.
- Supported route: once the PR is merged into the synced branch and its code shows up in this project, ask me in chat. I then deploy `submit-website-lead` with the Cloud deploy tool, check its logs, and call it with a test request.
- `supabase/config.toml` already has `[functions.submit-website-lead] verify_jwt = false`. Leave that unchanged.
- Any secrets the new function needs have to be present in Cloud secrets first. I check this before deploying.

## 2. Hosting checks (live as of 23 Oct 2026)
- `/this-page-does-not-exist` returns HTTP 200. The SPA fallback is active.
- `/about` already returns its own canonical in raw HTML. The `dist/<route>/index.html` prerender files are being served.
- `www` → apex redirect is **302**, with path and query preserved.

## 3. What Lovable hosting can and cannot do
| Requirement | Possible through Lovable? |
|---|---|
| Serve nested `dist/<route>/index.html` | Yes. It works in production today |
| Real HTTP 404 + `X-Robots-Tag: noindex` for unknown paths | No. The fallback is fixed, and `_redirects`, `_headers` and similar files are ignored. The React NotFound page only adds a meta noindex, and the status stays 200 |
| Keep auth/dashboard routes as SPA routes | Yes. This is the default |
| University UUID → slug 301 | No server-side redirect is available. Client-side only |
| www → apex | The Domains toggle exists, but its status code is not documented or configurable. Today it is 302 |

## 4. Configuration outside Lovable
- **www 301**: a Cloudflare Single Redirect rule as written in `docs/SEO-HOSTING.md`. This needs whoever controls the unidoxia.com Cloudflare zone. I cannot verify that from here.
- **Real 404s and selective fallback**: either (a) Lovable hosting support adds selective fallback, which I cannot confirm exists, or (b) the opt-in Cloudflare Worker in `hosting/`. Option (b) replaces the frontend origin, requires a deliberate hosting decision, a Cloudflare account and the wrangler deploy, and future releases must deploy the Worker and `dist` together.
- Proxying the zone in front of Lovable is a separate option. Lovable supports that through proxy mode, but this was not tested.

## 5. Release steps once you give the instruction
1. Merge PR #1239 into the synced branch and confirm the sync reached this project.
2. In chat: deploy `submit-website-lead`, then smoke test it and check its logs (no notifications).
3. Apply any new migrations only if you list them.
4. Publish the frontend (Publish → Update).
5. Re-run the `curl` acceptance checks. 404 and 301 will only pass after the external steps in section 4.
