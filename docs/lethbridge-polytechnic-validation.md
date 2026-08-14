# Lethbridge Polytechnic showcase validation

Checked: 14 August 2026

## Actual import plan

| Check | Result |
| --- | --- |
| Institution | Lethbridge Polytechnic |
| International programmes discovered | 43 |
| Programmes planned for import | 43 creates |
| Preliminary count discrepancy | 0 |
| Official programme URLs discovered | 43 |
| Fees verified | 0 |
| Fees unresolved | 43 |
| Programmes with verified intake rows | 41 |
| PGWP eligible | 22 |
| PGWP ineligible | 19 |
| PGWP unknown | 2 (the two collaborative nursing pathways) |
| Programme-specific academic requirements verified | 0 |
| General English requirements verified | 1 official 2026/27 policy source |
| Duplicate programmes | 0 |
| Cross-university programme leakage | 0 by dataset identity and university-scoped importer |
| Claim workflow | Existing institutional-email verification and admin-approval workflow reused |
| Application routing | Guidance-only; no direct institutional submission claim |
| Build | Passed |
| Tests | 74 passed across 15 files |
| Lint | Existing-repository baseline fails with 7 unrelated errors; no new error was reported in changed files |

## Readiness decision

`profile_ready` has deliberately not been set. The listing is not yet outreach-ready because all programme fee amounts and programme-specific academic requirements remain unresolved. The official 2026/27 cost PDF is linked and reviewed, but its rows have not been imported because the table requires a separate, reviewed programme-name/year mapping to avoid attributing the wrong cost to similarly named direct-entry and post-diploma routes.

The two nursing pathways have no intake rows on the official international-programmes table. They are retained as informational collaborative pathways, explicitly routed to guidance rather than a normal Lethbridge Polytechnic application action.

## Official sources

- [International programmes, availability and PGWP/CIP](https://lethpolytech.ca/programs-and-courses/international-programs)
- [International admissions](https://lethpolytech.ca/departments/international-services/international-admissions)
- [International document assessment](https://lethpolytech.ca/departments/admissions/entrance-requirements/international-document-assessment)
- [2026/27 English-language proficiency](https://lethpolytech.ca/departments/admissions/entrance-requirements/english-language)
- [Application deadlines](https://lethpolytech.ca/departments/admissions/how-to-apply?no_redirect=true)
- [2026/27 programme cost estimates](https://lethpolytech.ca/document-centre/program-cost-estimates)
- [2026/27 residence rates](https://lethpolytech.ca/departments/residence-life/apply-for-residence)
- [Awards and scholarships](https://lethpolytech.ca/departments/student-awards-and-financial-aid/awards-and-scholarships)
- [Nursing After Degree collaboration](https://www.ulethbridge.ca/future-student/program/nursing-after-degree)

No third-party education-agent or aggregator source was used.
