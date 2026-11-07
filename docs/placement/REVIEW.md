# Registration-first recruitment: final review

7 November 2026. PR [#1290](https://github.com/Otsikow/unidoxia/pull/1290). Application source reviewed at `4ad24002df679765884f46b65667f9aac5c447d4`; the evidence commit adds documentation and screenshots. Local preview: <http://127.0.0.1:4192/>. Publication and production database activation remain on hold.

## Completed implementation

| Requirement | Result |
| --- | --- |
| Registration-first homepage | Register Your Interest is primary in the header, hero, preparation section, journey and closing invitation. Consultation remains secondary. The large homepage search form is replaced by four preparation steps. |
| Adviser-led message | Six stages explain registration, profile/documents, review, research, student choice and application guidance. The hero and FAQs explicitly address prospective students from Africa. |
| Student onboarding | Both student dashboard entry routes show eight milestones from saved profile, education, document, review, recommendation and application data. Existing signup, verification, login, profile and upload routes are reused. |
| Study plans | Subject, preferred countries, annual tuition budget/currency, financial constraints and potential scholarship interest can be saved and submitted for initial review. Failed saves preserve answers. |
| Staff review | Admin queue and student matching tab, plus an authorised staff workspace, expose the existing education/documents/application tabs and the new preferences, review notes and recommendations. |
| Researched recommendations | Staff select real active catalogue courses, explain suitability and record fee/scholarship sources and check dates. Unknown fees remain unknown. Students can express interest, decline or ask questions. Responses persist and are visible to staff. |
| Existing applications | Selected options hand off to the existing application system. Consent, profile, document, billing and submission gates remain in place. A recommendation response does not submit an application or make a payment. |
| Preserved content | Authentic photography, six destination photographs, additional destination enquiries, UK and international directory examples, published insights, partner invitations, seven social destinations, small WhatsApp, optional Zoe, footer icons and theme preferences remain. |
| Trust and fees | Wording identifies Eric Arthur's individual training and disclaims organisational accreditation or endorsement. Registration/initial consultation remain free; optional paid support and third-party charges are separate. Approved prices and checkout code are unchanged. |
| Failure handling | Course/university reads no longer turn connection errors into false missing listings. Article/detail errors have manual retries and useful adviser/navigation links. Build catalogue reads retry transient transport/server failures three times, then fail explicitly. |
| Accessibility corrections | Named the staff document expander, made missing-document upload controls native keyboard-operable buttons, and corrected destructive-action contrast. Existing profile-read errors now prevent false completeness messages. |

The migration is additive. It reuses existing student identities, qualifications, document metadata, catalogue records and applications. It introduces no production/demo recommendations and does not modify existing private bucket or billing permissions. The architecture, initial-review requirements, state transitions and activation procedure are in [the implementation guide](README.md), including student-journey and review-state diagrams.

## Visual evidence

Before images show the preceding local QA build `33d0060`, not a newly captured production page. After images show the running registration-led implementation. The previous production comparison remains documented in the earlier homepage reports. No claim is made that production has changed.

| Width | Full page before | Full page after | First-screen comparison |
| --- | --- | --- | --- |
| 390px | [Before](review/before-390.webp) | [After](review/after-390.webp) | [Compare](review/comparison-390.webp) |
| 768px | [Before](review/before-768.webp) | [After](review/after-768.webp) | [Compare](review/comparison-768.webp) |
| 1440px | [Before](review/before-1440.webp) | [After](review/after-1440.webp) | [Compare](review/comparison-1440.webp) |

The hero remains an editorial split layout on desktop and tablet, with the photograph below the copy on mobile. Adjusted headline sizing avoids a four-line desktop headline. The journey uses three columns of steps beside its photograph on desktop, two below the image on tablet, and one on mobile. No excessive blank column remains beneath the photograph. All homepage sections were inspected in actual screenshots.

The old homepage provided quicker direct access to a large course-search form. That intentional trade-off follows the new brief: registration and adviser research now lead, with course search retained in optional directory/footer resources. The previous four-stage explanation was shorter; the new six stages make the adviser's work and the student's choice explicit.

Portal evidence uses clearly synthetic students and catalogue fixtures, without real student details: [student desktop](review/student-desktop.webp), [student mobile](review/student-mobile.webp), [staff desktop](review/staff-desktop.webp), [staff mobile](review/staff-mobile.webp). These are the actual application components running against the candidate SQL in isolated PostgreSQL, not mock-up images.

Full-resolution PNGs, dark-theme captures, image/link/accessibility inventories, build provenance and raw logs are retained outside the repository at `../outputs/unidoxia-registration-led/`.

## Verification results

| Check | Verified result and boundary |
| --- | --- |
| Unit suite | **631 tests passed across 98 files**, using standard `npm test`. Existing application, document and billing tests remain included. |
| Browser suite | **122 passed**, desktop and mobile. Covers registration-first navigation, optional discovery, filters, articles, university/course pages, loading/error/empty/retry states, enquiry/consultation forms, partner entry routes, theme persistence, WhatsApp, Zoe entry, anonymous auth redirects, SEO and the student/adviser journey. A final **two focused workflow regressions passed** after the keyboard-upload correction. |
| Student/adviser browser journey | Save failure retains input; saved preferences reload; academic evidence gates submission; authorised staff starts matching and shares a sourced option; student question persists; staff sees feedback. The placement data runs through actual PostgreSQL functions and RLS. Browser Auth is synthetic and external backend calls are intercepted. |
| PostgreSQL security harness | **36 checks passed** for ownership, trusted roles, cross-tenant denial, validation, version conflicts, review/share/respond/withdraw state and retained history. Candidate migration unchanged since this check. |
| Actual Auth/Data API/private Storage | [Disposable backend acceptance run 42378030338](https://github.com/Otsikow/unidoxia/actions/runs/42378030338) passed **15/15 checks**, plus **15 target-boundary checks**. Real synthetic signup/password sessions, owner upload/download, cross-student/cross-tenant/anonymous denials, review, recommendations, responses and withdrawal passed. Independent SQL read-back confirmed zero fixture accounts/rows/storage objects and unchanged original tenants. No hosted credentials or production data were used. |
| Build and SEO | Production build passed, with **1,537 public URLs** verified for generated HTML, canonical, metadata, one H1 and business footer. Private/unknown route indexing and the optional local hosting adapter passed. The adapter was not deployed. |
| Type/lint | Application TypeScript checking, final changed-file ESLint and whitespace checks passed without warnings or errors. |
| Responsive homepage | **390, 768 and 1440px**, plus saved-dark samples at 390/1440px: all 15 main images decoded; no horizontal overflow, rendered em dashes or page errors; all 15 footer navigation icons retained; checked mobile footer targets at least 44px high. First-visit light mode and saved-dark reload passed. |
| Accessibility | Homepage axe WCAG A/AA checks at the three widths and two dark samples found zero violations. Student/staff workflow samples at desktop/mobile found zero violations after fonts and entrance animations settled. All four native FAQs opened/closed by keyboard. Staff transcript upload opens the file chooser using Enter. This is sampled evidence, not certification of the entire portal. |
| Read-only destination checks | UK: 1,229 courses/6 universities; Canada: 177/6; USA, Australia, Ireland and Germany: 15/3 each. Spain, Malta and UAE explicitly report unavailable listings and link to adviser help. Counts are displayed catalogue observations, not guaranteed current intakes or eligibility. |
| Contact email | The earlier single authorised internal test `UDX-HOME-QA-20261107` returned HTTP 200 and success at 10:25:22 UTC. Recipient inbox delivery remains unverified. No additional live message was sent in this implementation. Form error/retry/success behaviour was tested with isolated responses. |

Initial runs were not all green. Stale homepage selectors were corrected for the new brief; the partnership disclaimer was restored; persistent outage fixtures were corrected to account for SDK transport retries; intermittent public backend connection timeouts were recorded. The final full browser suite ran with one worker and passed. The build now retries transient public reads without emitting fabricated or empty catalogue data. Final test assertions were not replaced with unconditional success.

## Photography, training and performance

The existing Keira Burton hero, Yan Krukau study photograph, destination images, partner photographs and editorial thumbnails are retained. [Asset credits](../../public/home/ASSET-CREDITS.md) identify originals and responsive derivatives. The [Pexels licence](https://www.pexels.com/license/) permits website use while prohibiting implied endorsement. No generated human photograph was introduced. Illustrative students are not presented as named UniDoxia clients, staff or successful applicants.

The [British Council's current training guidance](https://www.britishcouncil.org/education/education-agents/training-agents) confirms that its certificate/badge applies to an individual and does not confer endorsement, accreditation or validation. The homepage now names Eric and links to his actual personal award. The previously owner-requested standalone logo is retained. **Separate authorisation for that organisation logo has not been established.** It must not be described as authorised branding on the present evidence.

Final independent Lighthouse samples, with analytics writes blocked:

| Profile | Performance | Accessibility / best practices / SEO | LCP | Blocking time | Layout shift |
| --- | --- | --- | --- | --- | --- |
| Mobile | 83 | 100 / 100 / 100 | 4.14s | 70ms | 0 |
| Desktop | 100 | 100 / 100 / 100 | 0.80s | 1ms | 0 |

Mobile loading remains a limitation, consistent with the preceding 82–83 samples. The React startup/handoff and shared initial JavaScript warrant a separate performance improvement. These are local simulated lab measurements, not field Core Web Vitals or proof of better conversion rates. The hero is discoverable in initial HTML, eager-loaded, responsive and high priority.

## Release boundaries and remaining work

The code is ready to merge after the recorded checks. **The new workflow is not yet approved for production activation or publication.**

Final backend read-back: [run 42381087912](https://github.com/Otsikow/unidoxia/actions/runs/42381087912) also passed on `aa43bfaad3dc60490a20f5e23ca39c722fb7225f`, including stack removal. The subsequent evidence-only update settles animations during portal capture; application source and candidate SQL remain unchanged.

1. Obtain approval to activate exact migration `20261107124135_adviser_led_student_placement.sql` through the managed UniDoxia release process. Until then, the preview can show the explicit backend-unavailable state for adviser review. Existing profile/document/contact links remain available.
2. After activation, regenerate main database types, verify the actual deployed schema and same-tenant staff/document permissions, and perform authorised disposable-account acceptance before publishing. The isolated private Storage fixture does not certify every existing production policy.
3. Confirm standalone British Council logo permission, or approve a text-only individual training treatment before publication.
4. External inbox receipt/manual verification-link clicks, live payment/final university submissions, actual partner onboarding persistence and a signed-in Zoe conversation were not tested against live users. No new live enquiry, application, account, message, offer or payment was created.
5. Improve mobile loading before claiming the whole experience meets a fast-loading production standard. No performance regression relative to the recorded preceding samples was established.

Merging code, managed database activation and publishing the live frontend are separate steps. Preserve review branches. Do not apply production migrations or publish as a side effect of accepting this report.
