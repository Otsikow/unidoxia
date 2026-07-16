# UniDoxia Weekly Scholarship Publishing System

A lightweight, verification-first workflow for keeping the UniDoxia
scholarship section accurate, professional and useful to African
international students targeting the UK, Canada and USA.

## 1. Cadence

- **Working days:** Monday to Saturday.
- **No-run rule:** No scholarship research, drafting, publishing or
  scheduled social posting takes place on **Sunday**.
- **Weekly cycle** (indicative):
  - **Mon:** Research + shortlist the weekly topic and 3–5 opportunities.
  - **Tue:** Verify every fact against official sources; record `lastVerified`.
  - **Wed:** Draft the website article + typed content package.
  - **Thu:** Internal editorial review; corrections applied.
  - **Fri:** Approval gate (see §5). If approved, prepare social schedule.
  - **Sat:** Publish website article; queue social posts (never on Sunday).

## 2. Content fields (per scholarship)

Editorial entries live in `src/data/scholarshipsEditorial.ts` and reuse
the existing `Scholarship` type (see `src/types/scholarship.ts`), with
optional editorial metadata:

- `title`, `institution`, `sponsor`
- `country`, `level`, `academicYear`
- `applicantsEligible`, `eligibilitySummary`, `eligibility.*`
- `awardAmount`, `fundingType`, `benefitsSummary`, `stipendDetails`
- `deadline`, `applicationOpensAt`, `separateApplication`
- `officialLink`, `sourceUrls[]`
- `status` — one of: Researching, Verified, Drafted, Approved,
  Published, Upcoming, Expiring soon, Closed, Archived.
- `lastVerified` — ISO date the entry was last confirmed against the
  official source.
- `disclaimer` — opportunity-specific caveats (e.g. partial vs full).

The weekly package (article + social copy + video script + newsletter
+ graphic headline + hashtags) is stored as a typed file under
`src/content/scholarships/`. Social copy is internal draft content and
must never be exposed on the public website.

## 3. Verification checklist

Before an entry can move from **Researching → Verified**, confirm on
the official website:

1. Title, sponsor and hosting institution.
2. Country of study and study level.
3. Eligible applicants (nationality, residence, prior study, experience).
4. Funding scope — partial discounts must never be called "fully funded".
5. Verified application deadline (with timezone if provided).
6. Whether a separate scholarship application is required.
7. Official application URL is live and correct.
8. Record `lastVerified` = today's date (ISO).

## 4. Duplicate rule

Scholarships are deduplicated using a normalized signature of
**title + institution + official URL + academic year** (see
`dedupeScholarships` in `src/data/scholarshipsEditorial.ts`). Do not
introduce a new record if the signature already exists — update the
existing entry instead.

## 5. Approval gate

- Every new or updated entry starts as **Drafted** and is not published.
- The website article is created via the existing BlogAdmin draft
  workflow and remains a draft until an editor approves it in the
  admin UI. Do **not** insert or publish content to the production
  database from code.
- Only after editorial approval may an entry be marked **Approved**
  and then **Published**.

## 6. Status lifecycle

`Researching → Verified → Drafted → Approved → Published`

Time-based transitions:

- `Upcoming` — verified but not yet open.
- `Expiring soon` — deadline within ~30 days.
- `Closed` — deadline has passed.
- `Archived` — retained for reference only.

**Public rule:** entries with status `Closed` or `Archived` must never
be surfaced on the public `/scholarships` page as open opportunities.
This is enforced by `isPubliclyVisible` in
`src/data/scholarshipsEditorial.ts`.

## 7. Editorial voice & disclaimers

- UK English, student-friendly, factual.
- Never promise admission, scholarships or visas.
- Always cite the official source next to each opportunity.
- End every article with the standard UniDoxia closing:

  > Need support choosing a suitable university, preparing your
  > application or understanding the admission process? Visit
  > UniDoxia.com or contact the UniDoxia team for assistance.
  > UniDoxia does not guarantee admission, scholarships or visas.

- Include the standard important-notice disclaimer
  (`EDITORIAL_DISCLAIMER`) on every article and on the public
  `/scholarships` page.
