# Organic discovery baseline and release checks

Baseline: 30 October 2026, against public unidoxia.com and repository main 667e57b1. This is a scoped technical review, not evidence of rankings, index coverage, real-user performance, or a complete editorial audit. No Search Console or GA4 property access was available.

## Observed

- The live homepage returned crawlable HTML with a title, description, navigation and featured universities before JavaScript. The React application replaces this content. The build prerenders catalogue and public content and generates a sitemap. This is static prerendering, not request-time SSR.
- robots.txt and sitemap.xml returned 200 to direct HTTP requests. Googlebot and OAI-SearchBot user-agent strings received 200 on /, /robots.txt, /sitemap.xml, /destinations/united-kingdom and /universities. User-agent spoofing cannot establish verified crawler access, IP treatment, indexing or future availability. Robots allows public paths and restricts account/workflow paths.
- The site has Organization, FAQ, university, course, article and scholarship structured data. A listing explicitly does not imply a university partnership. This change adds a visible university breadcrumb and matching BreadcrumbList. Validate with Google's tools after deployment; structured data does not guarantee a search feature.
- The homepage originally had generic international positioning; the UK destination page linked to university profiles, courses, FAQ and scholarships. The original homepage prerender differed from the visible React hero. This change aligns their meaning and introduces Africa-focused language without excluding other students.
- The free-consultation form already fires enquiry_start and enquiry_submit_success only through an existing gtag, with no form values in the event. A successful response is required before success is fired. This is not evidence that GA4 is installed or receiving events.
- The homepage defers video, avoids it on small screens, reduced-motion and slow connections, and uses a poster. These code observations are not a Core Web Vitals measurement. The targeted mobile, accessibility and live route checks below identify both coverage and remaining limits. A direct request is not a substitute for field data.
- Scholarship pages include status, dates, verification dates and official links when available; archived/closed pages are marked noindex. Status fields alone do not prove deadlines are current. Visa and scholarship content is dynamic and cannot be exhaustively verified from code. Assign an editor to review each live listing and article against its primary source, especially expired deadlines, changed fees, eligibility and visa rules; record owner, source, checked date and next review date. Do not treat this note as verification of any listing.

## Origin-guide publishing architecture

Create a guide only after an editor supplies a substantial country-specific brief: intended audience and UK destination, distinct qualification equivalencies (with university sources), application process, funding and cost considerations, official visa sources, named reviewer, checked date and review deadline. Keep source URLs and review metadata alongside each authored guide. Review expired items before publication or withdraw them from discovery. Do not generate one page per country from a shared template. Once the first guide is approved, add a typed content collection and route, generate prerendered HTML and sitemap entries only for published reviewed records, with unique metadata, visible source links, breadcrumbs and internal links to the UK hub and relevant universities. No country guides are published by this change because no country-specific evidence was provided.

## Measurement and release

1. Verify ownership and submit the canonical sitemap in Search Console. Compare indexed pages, coverage, queries and organic landing pages to a dated pre-release baseline; investigate excluded URLs and inspect a sample of canonical pages.
2. Confirm the existing consent-aware GA4 installation receives `enquiry_start` and `enquiry_submit_success` in DebugView; mark only success as a key event. Use GA4's organic-search channel and landing-page reports to segment enquiries; do not send names, contact details, form answers or query strings. Check attribution and consent configuration with the property owner. The existing event is a successful website enquiry, not confirmed enrolment.
3. On a staging deployment, crawl all sitemap URLs and public route families, including dynamic catalogue pages, unknown URLs, redirects, query variants and aliases. Check status, one canonical, robots directives, unique titles/descriptions, internal links, JSON-LD and server HTML against rendered content. Test verified Googlebot and OAI-SearchBot access using server logs and vendor verification procedures, not only user-agent strings.
4. Validate structured data with Rich Results Test and Schema Markup Validator; test mobile layouts, keyboard/focus, screen readers and Lighthouse under throttling. Use Search Console and CrUX field data where available. Check form submission and success event without disclosing personal data. Record screenshots and results before release.
5. After approved deployment, repeat critical route and bot checks, request inspection of representative pages, monitor errors and enquiry events, and compare Search Console performance over sufficient time. Do not infer causation or promise ranking changes.


## Follow-up audit: 30 October 2026

### Live routing and indexing

A five-worker, read-only GET crawl of all 1,538 URLs in the live XML sitemap returned 200 without redirects. For each response the audit checked one title, nonempty description, a single self-canonical, one H1, no `noindex` and syntactically valid JSON-LD. No violations of those checks were found. The median response time was 0.197 seconds and the 95th percentile was 0.357 seconds for this one network run; these are not page-load or field Core Web Vitals measurements. This crawl does not verify the factual accuracy of individual pages or JSON-LD semantics, discover pages outside the sitemap, or exercise every possible query string and alias. The built-in production build verification independently checked all 1,538 generated routes.

An unknown route (`/this-route-does-not-exist-audit`) and deleted article (`/blog/deleted-test`) returned HTTP 200 with the homepage title and homepage canonical in initial HTML. `/dashboard` also returned the same initial HTML with no X-Robots-Tag in this check; robots.txt disallows that path. This creates a soft-404 and misleading initial metadata risk. The existing optional worker returns a real 404 and noindex for unknown routes and noindex for SPA routes in local tests, but it is not established as production hosting. Correct the deployed host's fallback behavior and retest; do not deploy the optional worker without reviewing compatibility and obtaining deployment approval. The `www` UK URL returned a 302 to the non-www URL preserving query parameters, which then canonicalised to the query-free URL. The local optional adapter uses 301; do not assume the live 302 is permanent.

### Browser, accessibility and performance

The production build passed 42 Playwright checks on desktop and mobile: representative initial/rendered metadata and content, profile links, no overflow on sampled pages, scholarship controls at 320, 375, 768, 1024 and 1440px, mocked enquiry success/failure, anonymous dashboard redirect, an enquiry on simulated slow 3G, and programmatic labels for the directory and course sorting controls. Screenshots were captured locally in test-results; browser tests do not prove backend delivery or complete screen-reader usability.

Automated axe WCAG 2 A/AA and 2.1 A/AA scans used a local production preview at 390px and 1440px on the homepage, UK destination, universities directory and one profile, courses, scholarships, FAQ and consultation. No horizontal page overflow was observed. At the time of the scan: the UK hub had four low-contrast links; the directory had two unnamed selects; courses had one unnamed sort select, contrast and 100 course cards with label mismatch and nested interactive controls; scholarships had 18 cards with nested interactive controls; a profile had two contrast findings; and the shared desktop navigation had a label mismatch. Counts reflect the data loaded at scan time. This change darkens the UK hub links, associates labels with the directory and course sort controls, and aligns the shared navigation label. A repeat scan of the same pages after these fixes found no violations on the UK hub or university directory and no shared navigation mismatch. Course and scholarship nested card interactions and profile/course contrast remain and require careful fixes and keyboard/screen-reader testing; automated scans alone cannot establish accessibility compliance.

A single Lighthouse mobile lab run against live production gave the following results (performance / accessibility; FCP, LCP, total blocking time, CLS):

| Page | Scores | Lab metrics |
| --- | --- | --- |
| Home | 82 / 100 | 1.2s, 4.3s, 150ms, 0 |
| UK destination | 84 / 96 | 1.5s, 3.7s, 240ms, 0 |
| Free consultation | 80 / 100 | 1.6s, 1.6s, 650ms, 0 |

Lighthouse identified UK hub link contrast (4.4:1 versus 4.5:1 required for normal text); the PR changes those links. Estimated unused JavaScript savings were 136 KiB, 159 KiB and 164 KiB respectively. These are single synthetic observations, not real-user results; repeat on a stable environment and use CrUX/Search Console field data before setting priorities or claiming improvement.

### Editorial review queue

The public catalogue snapshot contained 19 scholarship records. On 30 October, four have a past stored deadline while still labelled Upcoming or Closing Soon. The date alone does not prove all intakes or future rounds are closed; an editor must compare the relevant intake and official source before correcting the record:

| Record | Stored status and deadline | Source to check |
| --- | --- | --- |
| `bath-spa-africa-regional-scholarship-2026-27` | Closing Soon; 3 August 2026 | [Bath Spa](https://www.bathspa.ac.uk/students/student-finance/scholarships-and-bursaries/regional-scholarship-africa/) |
| `birmingham-postgraduate-high-fliers-scholarship-2026-27` | Closing Soon; 31 July 2026 | [Birmingham](https://www.birmingham.ac.uk/study/scholarships-funding/postgraduate-high-fliers-scholarship) |
| `exeter-postgraduate-taught-scholarships-nigeria-2026-27` | Closing Soon; 31 July 2026 | [Exeter](https://www.exeter.ac.uk/study/funding/award/?id=5677); the related article also mentions a January intake deadline, so do not infer the entire award is closed |
| `chevening-scholarships-uk-2027-28` | Upcoming; 6 October 2026 | [Chevening timeline](https://www.chevening.org/scholarships/application-timeline/) |

The 15 records without a stored deadline need source review rather than an invented date. The article `/blog/4-uk-scholarships-african-students-before-autumn-2026` describes opportunities as open/closing soon and Chevening as upcoming; `/blog/chevening-scholarships-2027-28-application-checks` says applications are open despite its stated 6 October closing date. Both require urgent editorial status updates or a dated historical-context notice. They are database content and were not changed here.

The article `/blog/uk-graduate-visa-2027-timing-what-to-check` frames the applicable change around course completion and policy being under review. [Current Immigration Rules Appendix Graduate](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-graduate) distinguish the duration by application date for eligible non-doctoral qualifications, with a separate doctoral period. An editor should correct the article after checking the source; do not use completion date as the sole test. The article `/blog/uk-student-visa-funds-2026-evidence-mistakes` lists £1,529 London and £1,171 outside London; those figures match [GOV.UK's Student visa money page](https://www.gov.uk/student-visa/money) at this check, subject to its exceptions. This comparison is not a full legal review of the article. The Cameroon/Sudan visa-brake article needs a fresh editor review against [Home Office caseworker guidance](https://www.gov.uk/government/publications/student-route-caseworker-guidance/student-and-child-student), including application and passport circumstances. The six dated weekly policy-update posts should be labelled and maintained as historical reports and checked against current primary sources before being used as current advice. All 12 published article titles were inventoried; this is a prioritised review, not independent verification of every claim across countries.
