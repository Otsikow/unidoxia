# University catalogue Phase 1 evidence report

Checked: 12 August 2026

Scope: Teesside University, University of Sunderland and Northumbria University

Production effect: none — the migration and datasets have not been applied to production

## Current result

Official catalogue discovery and official-page classification are complete for all 1,222 unique candidates. This is not the same as production completion: unresolved fields and manual-review records remain, the migration is not yet merged/applied, and live search/profile QA has not run.

| University | Discovered / classified | Import-eligible | Manual review | Archived | Verified international fee | Fee unresolved | Courses with 2027 intake | Requirements verified | Outreach |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Teesside | 513 / 513 | 473 | 40 | 0 | 354 | 159 | 0 | 251 | Needs Work |
| Sunderland | 166 / 166 | 163 | 2 | 1 | 0 | 165 | 2 | 164 | Needs Work |
| Northumbria | 543 / 543 | 487 | 56 | 0 | 247 | 296 | 252 | 3 | Needs Work |
| **Total** | **1,222 / 1,222** | **1,123** | **98** | **1** | **601** | **620** | **254** | **418** | **No outreach authorised** |

Northumbria’s official feed returned 545 rows; two exact duplicates were removed during discovery. No fee or intake was guessed: absent or unsafe values remain null, and no 2026 intake is promoted as a 2027 intake.

## Sources and processing

- Teesside: official undergraduate and postgraduate A–Z catalogues plus each official course page.
- Sunderland: canonical undergraduate and postgraduate routes from the official sitemap plus each official course page.
- Northumbria: official course-search results for undergraduate, postgraduate and research plus each official course page.
- The reviewer uses bounded concurrency, timeouts, retry/backoff and resumable checkpoints. It does not bypass access controls.
- Reviewed datasets preserve official URLs, check timestamps, classifications and explicit unresolved fields.

## Repository safeguards

- Additive migration for catalogue provenance, programme fees/intakes, import audit records, archive states, university completeness counters and outreach gates.
- Importer performs validation, variant-aware deduplication, university-field protection, dry runs and archive-candidate reporting instead of deletion.
- Database-side paginated search provides aliases, typo tolerance, country/level/intake filters and active-only results.
- Public course and university views use server pagination; active catalogue records only are eligible for display and sitemap inclusion.
- Course search, search-result clicks, course views and university-profile views use the existing analytics event path.
- Admin readiness exposes discovered, processed, unresolved, verified and archive counts. All three pilots remain `needs_work`.

## Verification completed locally

- Import dry runs: Teesside 473 create / 40 skip; Sunderland 163 create / 3 skip; Northumbria 487 create / 56 skip.
- Duplicate count in each reviewed import plan: zero.
- Automated tests and production build pass; live database and production QA remain intentionally pending.

## Remaining completion gates

1. Manually resolve or explicitly approve the 98 manual-review candidates and remaining requirements/fee gaps according to the agreed completeness threshold.
2. Review and merge the pull request, then apply the committed migration through the normal Supabase deployment path.
3. Run a production dry run, review its audit plan, apply once, and read back university/program/fee/intake counts.
4. Verify representative mobile and desktop searches, profiles, detail pages, pagination, analytics events and sitemap URLs against production data.
5. Keep outreach blocked until catalogue and profile readiness checks pass; no outreach message was prepared or sent by this work.

## Seven additional universities

Hertfordshire, Portsmouth, Coventry, Greenwich, Middlesex, University of the West of Scotland and Wolverhampton remain inactive foundations with zero processed catalogue records. They are not public-profile-ready or outreach-ready.
