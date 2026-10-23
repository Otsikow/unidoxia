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

PR #1239 was merged at `85f1566659c19c258f645ffc591de18f6889ae42`.

The existing `submit-website-lead` function was deployed successfully through Lovable Cloud. The project confirmed its function source was unchanged from that merge; its deployment tool reported source hash `5e236fe3078780fbb442b18a5c5a3b73bd1686f4027662b6dfb466d8375b0733`.

An independent production check returned HTTP 200 for OPTIONS and HTTP 400 for an initial enquiry missing email and consent. Only `email` and `consent` appeared in the validation errors, confirming the new short-enquiry branch. The request exits before persistence. No valid production enquiry was submitted.

The frontend was then published through Lovable (deployment request `2a055c84-00fe-4939-ba30-4902c33c6a8c`). Delivery is independently verified at **https://unidoxia.com**, including:

- `/free-consultation` serves its own initial HTML, title and canonical.
- The UK guide, directories and sampled article/course/scholarship pages return 200 with their own canonicals, one H1, substantive content and the corrected office. Sampled HTML contains no Blakey Close address.
- The live sitemap contains 1,537 public URLs, includes consultation and the UK guide, and excludes dashboard URLs.
- Live desktop and mobile checks pass for the short form and receipt with intercepted submission requests, all three featured profile links and their enquiry routes, and anonymous dashboard redirects to sign-in. There is no horizontal overflow in the checked form. No test request created a production enquiry or notification.
- A single mobile Lighthouse lab run on the published site scored performance **59**, accessibility **100**, SEO **100**, with a 632 KiB network payload. This is not a controlled before/after benchmark or field Core Web Vitals result. Further startup/rendering performance work remains; a 90+ performance result has not been demonstrated.

The dated production checks are saved in `docs/verification/`. They distinguish mocked browser success from real backend validation and explicitly retain the unresolved server-status results.

## Remaining account/hosting requirements

- Lovable serves the nested prerendered files but does not expose configurable unknown-route HTTP status or permanent redirect rules. `_headers`/`_redirects` are not a verified workaround on this host.
- DNS is currently on Namecheap's `registrar-servers.com` nameservers. There is no authenticated Cloudflare CLI account or connected access to these DNS controls in this task. Keep the current host; domain access is required to complete the existing 404/301 handoff. Do not claim the local adapter has been deployed.
- Search Console access is required to inspect coverage/query evidence and submit/check the sitemap. Analytics/consent-account access is required to enable and validate optional enquiry event reporting. Do not add a tracking ID or credentials by guessing, or send personal form values to analytics.
