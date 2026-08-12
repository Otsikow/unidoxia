# University catalogue Phase 1 evidence report

Checked: 12 August 2026

Scope: Teesside University, University of Sunderland and Northumbria University

Production effect: none — the migration and datasets have not been applied to production

## Current result

Official catalogue discovery and official-page classification are complete for all 1,222 unique candidates. Award-format review resolved the former manual queue using official titles and URLs; four non-course Northumbria records remain explicitly excluded. This is not the same as production completion: unresolved optional fields remain, the migration is not yet merged/applied, and live search/profile QA has not run.

| University | Discovered / classified | Import-eligible | Manual review | Archived | Verified international fee | Fee unresolved | Courses with 2027 intake | Requirements verified | Outreach |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Teesside | 513 / 513 | 513 | 0 | 0 | 354 | 159 | 0 | 251 | Needs Work |
| Sunderland | 166 / 166 | 165 | 0 | 1 | 0 | 165 | 2 | 164 | Needs Work |
| Northumbria | 543 / 543 | 539 | 0 | 0 | 247 | 292 | 252 | 3 | Needs Work |
| **Total** | **1,222 / 1,222** | **1,217** | **0** | **1** | **601** | **616** | **254** | **418** | **Outreach out of scope** |

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
- Legacy partner hard-delete access is removed; university users manage catalogue history through archive/publish actions, while public reads require an active programme and active university.
- Database-side paginated search provides aliases, typo tolerance, country/level/intake filters and active-only results.
- Public course and university views use server pagination; active catalogue records only are eligible for display and sitemap inclusion.
- Course search, search-result clicks, course views and university-profile views use the existing analytics event path.
- Admin readiness exposes discovered, processed, unresolved, verified and archive counts. All three pilots remain `needs_work`.

## Verification completed locally

- Import dry runs: Teesside 513 create; Sunderland 165 create / 1 skip; Northumbria 539 create / 4 skip.
- Duplicate count in each reviewed import plan: zero.
- Automated tests and production build pass; live database and production QA remain intentionally pending.
- Compatible dependency patches remove all high/critical production advisories. Two moderate React Router advisories remain because npm's offered resolution is a breaking v7 migration; no forced upgrade was used.

## Remaining completion gates

1. Review and merge the pull request, then apply the committed migration through the normal Supabase deployment path.
2. Run a production dry run, review its audit plan, apply once, and read back university/program/fee/intake counts.
3. Verify representative mobile and desktop searches, profiles, detail pages, pagination, analytics events and sitemap URLs against production data.
4. Resolve the remaining production dependency advisories through a separately reviewed compatible upgrade; do not force a React Router major migration into this phase.
5. University outreach remains outside this marketplace phase; no outreach functionality or message was created by this work.

## Seven additional universities

Hertfordshire, Portsmouth, Coventry, Greenwich, Middlesex, University of the West of Scotland and Wolverhampton remain inactive foundations with zero processed catalogue records. They are not public-profile-ready or outreach-ready.
