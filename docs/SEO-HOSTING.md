# SEO hosting handoff

This PR is not a production deployment. Leave it open for review. Do not assume a
Lovable preview or GitHub merge changes the public site's HTTP responses.

## Current evidence (7 October 2026)

- `https://unidoxia.com/this-page-does-not-exist` returned HTTP 200.
- `https://www.unidoxia.com/courses?seo-check=1` returned HTTP 302 with
  `Location: https://unidoxia.com/courses?seo-check=1`.
- The server header says Cloudflare; this does **not** establish that the site is
  deployed to Cloudflare Pages or that this account controls its edge rules.

## Lovable hosting

Publish the reviewed build with all of `dist`, including nested `index.html`
files, `sitemap.xml` and `404.html`. The sitemap is now generated **in dist** after
Vite builds; `public/sitemap.xml` is no longer the deployment source of truth.

A React catch-all and a static 404 file cannot override a host that rewrites every
URL to `/index.html` with status 200. I could not verify a documented Lovable
setting for selective fallbacks, so there is no claimed Lovable toggle in this PR.
Ask Lovable hosting support to apply this exact routing policy:

1. Serve each public path in `dist/seo-routes.json` from its own
   `dist/<path>/index.html` (root from `dist/index.html`), status 200.
2. Preserve SPA entry responses for the actual route patterns in
   `dist/seo-hosting.json` → `spaRoutes`, including authentication callbacks,
   dashboards and nested student/partner routes. Do not blanket-404 these routes.
3. Resolve university UUID aliases from `universityAliases` to their existing
   slug with status 301, preserving the query string. Course UUIDs stay unchanged.
4. Serve existing static assets normally. Return `dist/404.html` with **HTTP 404**
   and `X-Robots-Tag: noindex` for all other paths, including absent/archived course
   IDs and university slugs. Do not rewrite unknown paths to the homepage.
5. Change www → apex from 302 to 301, preserving path and query.

Rebuild and publish when catalogue/blog/scholarship visibility changes; static
snapshots cannot reflect a record deletion until a new build is deployed. Build
query failures now fail the build instead of silently dropping records.

## Exact Cloudflare www rule (if the zone is controlled in your account)

In **unidoxia.com → Rules → Redirect Rules → Single Redirects**, create or edit:

- Match expression: `(http.host eq "www.unidoxia.com")`
- Target: **Dynamic**
- Target expression: `concat("https://unidoxia.com", http.request.uri.path)`
- Status: **301**
- **Preserve query string: enabled**
- Place above competing www redirect rules; replace the old 302 rule.

The www DNS record must be proxied through the zone where this rule is applied.
Do not point the apex at a different origin merely to change this redirect.

[Cloudflare Single Redirect settings](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/)

## Optional Cloudflare Workers asset host

If Lovable cannot implement the routing policy, this PR includes an **opt-in**
static-assets Worker adapter and configuration. This is an alternative hosting
handoff, not something Lovable automatically runs. Nothing has been provisioned,
deployed, attached to DNS, or billed by this PR.

After reviewing the hosting choice, build with Node 22.18+ and public Supabase
credentials, then use the supplied configuration:

```sh
npm ci
npm run build
npx wrangler dev --config hosting/wrangler.jsonc
# Only after account, hosting and deployment approval:
npx wrangler deploy --config hosting/wrangler.jsonc
```

The exact required settings are already present:
`assets.directory = "../dist"`, `binding = "ASSETS"`,
`run_worker_first = true`, `html_handling = "none"`,
`not_found_handling = "none"`. Do not enable `single-page-application` fallback.
The Worker checks rendered records, preserves the router's other paths, serves
real 404s, and permanently redirects www with path and query intact.

Test the workers.dev deployment first. To activate this alternative, use Workers
& Pages → the Worker → Settings → Domains & Routes → Add → Custom Domain for
`unidoxia.com` and `www.unidoxia.com`. This replaces the frontend hosting origin
and requires an explicit hosting decision; retain the previous DNS configuration
for rollback. Future updates must deploy the same freshly built Worker and assets
together. Backend configuration and `.env` remain unchanged.

[Workers asset configuration](https://developers.cloudflare.com/workers/static-assets/binding/)
[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)

## Acceptance after publication / host configuration

Check HTTP status **and raw HTML** (not just the JavaScript-rendered screen):

```sh
curl -i 'https://unidoxia.com/this-page-does-not-exist'
curl -i 'https://unidoxia.com/courses/00000000-0000-0000-0000-000000000000'
curl -i 'https://unidoxia.com/universities/this-university-does-not-exist'
curl -I 'https://www.unidoxia.com/courses?seo-check=1'
```

The first three must return 404, `Page not found` and `noindex`. The fourth must
return 301 and `Location: https://unidoxia.com/courses?seo-check=1`.
Check `/auth/login`, `/auth/callback` and a nested dashboard/student route still
load the app, and one real course/university/blog path returns its own metadata.
`vite preview` uses a SPA fallback and is **not** evidence of production 404 status.

## Address source

Registered office verified against [Companies House, company 16172129](https://find-and-update.company-information.service.gov.uk/company/16172129):
Office 10 Seagreen Turner Street, Redcar, England, TS10 1AZ.
