# Lambton College showcase validation

Checked: 14 August 2026

## Actual import plan

| Check | Result |
| --- | --- |
| Institution | Lambton College |
| International programmes discovered | 46 |
| Programmes planned for import | 46 creates |
| Preliminary expected count | 45 |
| Count discrepancy | +1; current official catalogue wins |
| Sarnia programmes | 38 |
| Ottawa programmes | 8 |
| Other campuses imported | 0 |
| Official programme URLs | 46 unique Lambton programme pages |
| Fees verified | 36 published estimated programme totals with term detail retained |
| Fees unresolved | 10; never represented as zero or free |
| Intakes verified | 46 programmes × 3 published intake columns |
| Fall 2026 open / closed / not offered | 0 / 33 / 13 |
| Winter 2027 open / closed / not offered | 3 / 1 / 42 |
| Spring 2027 open / closed / not offered | 4 / 1 / 41 |
| PGWP eligible | 44 |
| PGWP ineligible | 2 |
| PGWP unknown | 0 |
| CIP codes verified | 44 |
| Programme academic requirements verified | 3 published programme requirement blocks captured; 43 unresolved |
| English requirements verified | Current official diploma/certificate and graduate-certificate score tables |
| Scholarships verified | 12 published 2026/27 programme awards (11 entrance, 1 academic) |
| African English-exemption information | 14 relevant countries verified from current official possible-exemption list |
| Duplicate programmes | 0 by code and official URL |
| Cross-university leakage | 0 by dataset identity and university-scoped importer |
| Claim workflow | Existing institutional-email verification and admin-approval workflow reused |
| Application routing | Guidance-only; no direct institutional submission claim |
| Private-campus safeguard | Toronto/Mississauga excluded; only Sarnia Main Campus and Ottawa Saint Paul University Campus use DLI O19305293332 |

## Readiness decision

`profile_ready` has deliberately not been set. The current official catalogue is complete and suitable for review, but 10 programme totals and 43 programme-specific academic-requirement blocks remain unresolved. These gaps are reported rather than guessed. Lambton should review the complimentary showcase before UniDoxia treats it as outreach-ready.

The catalogue page currently contains 46 unique programme codes, one more than the preliminary estimate of 45. All 46 resolve to current official Lambton international programme URLs, so the live official source count is retained.

Current Fall 2026 availability has changed since earlier cached search results: the live catalogue now shows no programme as open for Fall 2026. The dataset records the live page, not cached snippets.

## Campus and PGWP boundary

IRCC lists Lambton College public locations at Sarnia Main Campus and Ottawa Saint Paul University Campus under DLI `O19305293332`. IRCC separately lists Lambton College at Cestar College in Toronto as a private institution under a different DLI. The active UniDoxia import contains only Sarnia and Ottawa programmes and never derives PGWP status from the institution DLI alone; it uses the official programme-level PGWP flag and published CIP code.

## English requirements and possible exemptions

The live official page lists the following relevant African countries among those that may qualify for an exemption: Botswana, Cameroon, Gambia, Ghana, Kenya, Liberia, Namibia, Nigeria, Sierra Leone, South Africa, Tanzania, Uganda, Zambia and Zimbabwe.

Public wording remains conditional: applicants from certain countries may qualify for an English-language proficiency exemption, subject to Lambton College eligibility requirements and assessment. Lambton College reserves the right to request proof of English proficiency. UniDoxia does not state “No IELTS required.”

## Official sources

- [International programmes, availability and PGWP/CIP](https://www.lambtoncollege.ca/programs/international)
- [English-language requirements and possible country exemptions](https://www.lambtoncollege.ca/international/international-education/language-requirements-esl)
- [International scholarships](https://www.lambtoncollege.ca/international/international-education/scholarships)
- [How to apply](https://www.lambtoncollege.ca/international/international-education/how-to-apply)
- [International academic dates](https://www.lambtoncollege.ca/international/sarnia/important-dates)
- [International housing](https://www.lambtoncollege.ca/international/sarnia/housing)
- [Residence fees](https://www.lambtoncollege.ca/future-students/residence/fees)
- [International graduate support](https://www.lambtoncollege.ca/international/international-education/international-graduate-services-support-centre)
- [IRCC designated learning institutions list](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html)

No third-party education-agent, aggregator, blog, Wikipedia or search snippet was used as a source of record.

## Implementation validation

| Gate | Result |
| --- | --- |
| Dataset and migration tests | Passed |
| Full repository test suite | Passed |
| Production build | Passed |
| Targeted ESLint on changed TypeScript/JavaScript | Passed |
| Repository-wide ESLint | Pre-existing baseline: 7 unrelated errors and 67 warnings |
| `git diff --check` | Passed |
| Import dry run | 46 creates; 0 duplicate or manual-review records |
| Shared institutional profile, desktop 1440 × 900 | Passed; no horizontal overflow |
| Shared institutional profile, tablet 768 × 1024 | Passed; no horizontal overflow |
| Shared institutional profile, mobile 390 × 844 | Passed; no horizontal overflow |
| Lovable-managed database materialisation | 46 programmes, 138 intakes, 46 fee records and 12 scholarships |
| Lovable Canada search preview | 104 courses across 5 universities; Lambton cards rendered |
| Lambton profile preview | 46 programmes and 12 scholarships rendered; claim/disclaimer controls present |

Initial responsive validation used the existing Lethbridge Polytechnic record before Lambton database materialisation. Both institutions use the same `UniversityProfile` implementation.

After GitHub merge, the reviewed Lambton migration was materialised through the Lovable-managed database. The direct Lambton preview and Canada catalogue were then rendered and checked, including a 390 × 844 mobile profile with no horizontal overflow. The record remains `needs_review` / `profile_incomplete` because the published-source gaps listed above are still real; appearing in the catalogue must not be confused with being fully complete for outreach.
