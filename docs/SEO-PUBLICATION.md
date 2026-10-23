# Authorized release — 23 October 2026

The owner authorized completing the fixes, merging PR #1239 and publishing. The current release keeps the existing Lovable host and backend.

## Additional fixes and checks

- Resized and encoded the existing homepage artwork and logo as WebP, preserving the artwork and layout. Added explicit image dimensions and lazy loading for the journey cards. The measured local homepage payload fell from 3,396 KiB to 1,772 KiB.
- Added accessible names to the destination and study-level controls, used the journey cards' visible content as their accessible names, and retained sign-in guidance for assistive technology. Darkened the existing blue slightly so white button labels pass contrast checks.
- Kept private dashboard dependencies off public pages with the existing guarded lazy loader. Added desktop/mobile browser checks that anonymous dashboard visitors still reach the sign-in form.
- Incorporated the latest upstream preview authentication-storage fix. Full repository lint has zero errors; existing warnings remain.
- Unit tests: 237 pass. Browser checks: 30 pass, including desktop, mobile, retry and simulated Slow 3G. TypeScript and the production build pass. The build verifies 1,537 public pages and the opt-in hosting adapter's routing behavior.
- Local mobile Lighthouse: performance 56, accessibility 100, SEO 100. The local server does not compress assets, and render-blocking CSS remains a lab limitation. The 90+ performance target has not been demonstrated. This is not a field Core Web Vitals or conversion result. The measurements are in `lighthouse-release-local-2026-10-23.json`; earlier results are retained for context.

## Publication status

The application release requires the updated `submit-website-lead` function first, then publication of the synced frontend. Production form testing must use rejected validation requests only; no real or test enquiries or notifications should be created. Successful submission and persistence are verified with mocked browser requests and the real handler against an in-memory database boundary.

## Remaining account/hosting requirements

- Lovable serves the nested prerendered files but does not expose configurable unknown-route HTTP status or permanent redirect rules. `_headers`/`_redirects` are not a verified workaround on this host.
- DNS is currently on Namecheap's `registrar-servers.com` nameservers. There is no authenticated Cloudflare CLI account or connected access to these DNS controls in this task. Keep the current host; domain access is required to complete the existing 404/301 handoff. Do not claim the local adapter has been deployed.
- Search Console access is required to inspect coverage/query evidence and submit/check the sitemap. Analytics/consent-account access is required to enable and validate optional enquiry event reporting. Do not add a tracking ID or credentials by guessing, or send personal form values to analytics.
