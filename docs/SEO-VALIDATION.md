# SEO validation — 7 October 2026

Validated locally against the current anonymous/public Supabase records. No
production database writes, deployment, domain changes or merge were performed.

- `npm run build`: passed, including both postbuild verification scripts.
- `npm run lint`: passed (0 errors, 68 existing warnings).
- `npm test`: 162 tests passed across 34 files.
- `git diff --check`: passed.
- 1,535 sitemap URLs: every URL has a matching pre-rendered file, exactly one H1,
  a self-canonical, matching Open Graph metadata and the registered office footer.
- Detail coverage: 1,466 active courses, 24 active non-archived universities and
  11 published blog posts. Counts reflect records at build time, not the earlier
  estimates in the request. The remaining URLs include public static pages and
  public scholarship details.
- Catalogue titles and descriptions are unique. Identical course names use
  existing course code/campus/mode/duration where those distinguish the records;
  otherwise they use the stable course reference. No catalogue records were edited.
- `/faq` JSON-LD questions and answers exactly match the visible pre-rendered FAQ.
- React wildcard navigation renders `Page not found` and sets `noindex`; the test
  also checks noindex is removed when navigating back to a valid page.
- `dist/404.html` contains `Page not found`, `noindex`, and no homepage canonical.
- Optional Cloudflare adapter: locally verified public detail responses, unknown
  and absent-record 404 responses, valid auth/student/admin SPA entries, and www
  301 preserving the path and query. This is **not** a Cloudflare deployment test.

[Complete extracted examples](seo-verification.json) contain the requested title,
canonical, description, H1, footer text and parsed JSON-LD for one course, one
university, one blog post, `/faq` and `/`. Regenerate with `npm run build`.

Course URLs retain their UUIDs. Existing university UUID routes are retained in
the optional host's alias map and redirect to their existing slugs.

Prerequisite repairs: the committed HMR plugin lock entry did not satisfy
package.json, preventing `npm ci`; it now does. Eight existing lint errors were
fixed with a const declaration, explicit Set branching, TypeScript comment
cleanup, and equivalent ASCII filtering. No lint rules were disabled.

The current public site was independently checked and still returns 200 for an
unknown route and 302 for www. Follow [the hosting handoff](SEO-HOSTING.md) after
review/publication; the HTTP status fixes cannot be claimed live from this PR.
The optional Worker is not automatically used by Lovable.
