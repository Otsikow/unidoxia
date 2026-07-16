import type { Scholarship } from "@/types/scholarship";

/**
 * Editorial scholarship dataset produced through the UniDoxia weekly
 * scholarship publishing workflow (see SCHOLARSHIP_PUBLISHING_SYSTEM.md).
 *
 * Every entry MUST be verified against the official source on the date
 * recorded in `lastVerified`. Public-facing surfaces must hide any entry
 * whose status is `Closed` or `Archived`.
 */

export const EDITORIAL_DISCLAIMER =
  "Scholarship conditions can change without notice. Always confirm the latest eligibility, benefits and deadlines on the official provider or university website before applying. UniDoxia does not guarantee admission, scholarships or visas.";

export const EDITORIAL_SCHOLARSHIPS: Scholarship[] = [
  {
    id: "chevening-2027-28",
    title: "Chevening Scholarships 2027/28",
    country: "United Kingdom",
    institution: "UK Foreign, Commonwealth & Development Office",
    sponsor: "UK Foreign, Commonwealth & Development Office and partners",
    level: "Masters",
    awardAmount:
      "Tuition fees, economy travel, arrival/departure allowances, visa cost, TB testing contribution (where required) and a monthly living stipend",
    fundingType: "Full",
    eligibility: {
      nationality: ["Chevening-eligible countries/territories"],
      experience:
        "At least 2 years or 2,800 hours of post-undergraduate work experience",
      notes:
        "Undergraduate degree completed at least 2 years before the deadline. If applying from an ODA-eligible country, applicants must be resident in an ODA-eligible country. Commitment to return home for at least 2 years after the award.",
    },
    eligibilitySummary:
      "For citizens of Chevening-eligible countries with at least two years of work experience who will apply to three eligible UK master's courses and secure at least one unconditional offer by 8 July 2027.",
    deadline: "2026-10-06",
    applicationOpensAt: "2026-08-04T11:00:00Z",
    academicYear: "2027/28",
    status: "Upcoming",
    lastVerified: "2026-07-16",
    description:
      "Chevening is the UK government's international awards programme, funding one-year taught master's study in the UK for future leaders. Applications open 4 August 2026 at 11:00 UTC and close 6 October 2026 at 11:00 UTC.",
    overview:
      "Applicants apply to three eligible UK master's courses independently and must hold at least one unconditional offer by 8 July 2027 to take up the award.",
    benefitsSummary:
      "Tuition fees, economy return travel, arrival/departure allowances, visa application cost, TB testing contribution where required, travel top-up where applicable and a monthly living stipend (exact stipend not published).",
    separateApplication: true,
    applicationSteps: [
      "Prepare essays, references and course selections before applications open on 4 August 2026",
      "Submit the Chevening online application before 11:00 UTC on 6 October 2026",
      "Apply independently to three eligible UK master's courses",
      "If shortlisted, attend the interview and provide required documents",
      "Secure at least one unconditional UK master's offer by 8 July 2027",
    ],
    documentsRequired: [
      "Valid passport or national ID",
      "Undergraduate transcripts",
      "Two references (requested if you are shortlisted)",
      "Unconditional UK offer letter (by 8 July 2027)",
    ],
    officialLink: "https://www.chevening.org/scholarships/application-timeline/",
    sourceUrls: [
      "https://www.chevening.org/scholarships/application-timeline/",
      "https://www.chevening.org/resource-hub/guidance/eligibility/",
      "https://www.chevening.org/faqs/what-does-a-chevening-scholarship-cover/",
    ],
    tags: ["uk", "fully-funded", "masters", "leadership", "africa-eligible"],
    aiScore: 96,
    languageSupport: ["English"],
    verified: true,
    applicantsEligible:
      "Citizens of Chevening-eligible countries and territories, including many African nations",
    disclaimer:
      "Chevening 2027/28 is upcoming and is not open on 16 July 2026. Confirm the current cycle and country eligibility on chevening.org before you apply.",
  },
  {
    id: "birmingham-postgraduate-high-fliers-2026",
    title: "University of Birmingham Postgraduate High Fliers Scholarship 2026",
    country: "United Kingdom",
    institution: "University of Birmingham",
    sponsor: "University of Birmingham",
    level: "Masters",
    awardAmount: "£5,000 tuition discount",
    fundingType: "Partial",
    eligibility: {
      nationality: [
        "Cameroon",
        "Egypt",
        "Ghana",
        "Ivory Coast",
        "Kenya",
        "Mauritius",
        "Nigeria",
        "Senegal",
        "South Africa",
        "Tanzania",
        "Uganda",
        "Zambia",
        "Zimbabwe",
      ],
      notes:
        "Overseas fee-paying students domiciled in an eligible country, holding an offer for a full-time taught master's at Birmingham UK campus starting September 2026. Not compatible with any external full or partial tuition sponsorship. Online/distance and research programmes are excluded.",
    },
    eligibilitySummary:
      "£5,000 tuition discount for overseas fee-paying students from selected African countries starting a full-time taught master's at Birmingham in September 2026.",
    deadline: "2026-07-31",
    academicYear: "2026/27",
    status: "Expiring soon",
    lastVerified: "2026-07-16",
    description:
      "The Postgraduate High Fliers Scholarship offers a £5,000 tuition discount to eligible international taught master's students at the University of Birmingham's UK campus for September 2026 entry.",
    benefitsSummary:
      "£5,000 tuition fee discount applied to a full-time, on-campus taught master's programme.",
    separateApplication: false,
    applicationSteps: [
      "Apply for an eligible full-time taught master's course at Birmingham (September 2026)",
      "Receive an offer and accept it",
      "Pay the tuition deposit by the deadline stated in your offer letter",
      "No separate scholarship application — the award is granted automatically to eligible students",
    ],
    documentsRequired: [
      "Course offer letter",
      "Proof of accepted offer and deposit payment",
    ],
    officialLink:
      "https://www.birmingham.ac.uk/study/scholarships-funding/postgraduate-high-fliers-scholarship",
    sourceUrls: [
      "https://www.birmingham.ac.uk/study/scholarships-funding/postgraduate-high-fliers-scholarship",
    ],
    tags: ["uk", "partial-funding", "masters", "africa"],
    aiScore: 88,
    languageSupport: ["English"],
    verified: true,
    applicantsEligible:
      "Overseas fee-paying master's applicants domiciled in the listed African countries",
    disclaimer:
      "This is a £5,000 tuition discount and is not a full scholarship. Confirm your programme eligibility and deposit deadline in your offer letter.",
  },
  {
    id: "exeter-nigeria-pgt-2026-27",
    title:
      "University of Exeter Postgraduate Taught Scholarships 2026/27 for Nigeria",
    country: "United Kingdom",
    institution: "University of Exeter",
    sponsor: "University of Exeter",
    level: "Masters",
    awardAmount: "£10,000 first-year tuition discount",
    fundingType: "Partial",
    eligibility: {
      nationality: ["Nigeria"],
      notes:
        "Nigerian citizen or passport holder, classified as international for fees, self-funded, holding an eligible offer for a campus-based taught master's for 2026/27 entry.",
    },
    eligibilitySummary:
      "£10,000 first-year tuition discount for self-funded Nigerian applicants holding an eligible campus-based taught master's offer at Exeter for 2026/27 entry.",
    deadline: "2026-07-31",
    academicYear: "2026/27",
    status: "Expiring soon",
    lastVerified: "2026-07-16",
    description:
      "Exeter offers a £10,000 first-year tuition discount for eligible Nigerian applicants joining a campus-based taught master's programme in 2026/27. September 2026 entry deadline is 31 July 2026; eligible January 2027 programmes have a deadline of 1 December 2026.",
    benefitsSummary:
      "£10,000 first-year tuition fee discount applied to eligible campus-based master's programmes.",
    separateApplication: false,
    applicationSteps: [
      "Apply for an eligible campus-based taught master's programme at Exeter",
      "Receive an offer and meet the offer conditions",
      "Pay the tuition deposit and enrol",
      "No separate scholarship application — the award is allocated automatically to eligible students",
    ],
    documentsRequired: [
      "Course offer letter",
      "Proof of Nigerian citizenship / passport",
      "Proof of deposit payment and enrolment",
    ],
    officialLink: "https://www.exeter.ac.uk/study/funding/award/?id=5677",
    sourceUrls: ["https://www.exeter.ac.uk/study/funding/award/?id=5677"],
    tags: ["uk", "partial-funding", "masters", "nigeria"],
    aiScore: 87,
    languageSupport: ["English"],
    verified: true,
    applicantsEligible:
      "Nigerian citizens holding an eligible Exeter campus-based master's offer for 2026/27",
    disclaimer:
      "This is a £10,000 tuition discount, not a full scholarship. Academic and English requirements follow those of your course offer.",
  },
  {
    id: "bath-spa-africa-regional-2026",
    title: "Bath Spa University Africa Regional Scholarship",
    country: "United Kingdom",
    institution: "Bath Spa University",
    sponsor: "Bath Spa University",
    level: "Undergraduate / Postgraduate",
    awardAmount:
      "£2,000 for Bath-based programmes or £4,000 for the MBA in London",
    fundingType: "Partial",
    eligibility: {
      nationality: ["African countries"],
      notes:
        "African applicants entering a three-year undergraduate programme or a one-year postgraduate programme at Bath, or the MBA in London. Applicants must have accepted their offer.",
    },
    eligibilitySummary:
      "Automatic partial award for eligible African applicants who have accepted an offer to study at Bath Spa University.",
    deadline: "2026-08-03",
    academicYear: "2026/27",
    status: "Expiring soon",
    lastVerified: "2026-07-16",
    description:
      "Bath Spa University's Africa Regional Scholarship offers an automatic £2,000 award for eligible international students at its Bath campuses or £4,000 for the MBA in London.",
    benefitsSummary:
      "Automatic £2,000 (Bath-based programmes) or £4,000 (MBA London) tuition award.",
    separateApplication: false,
    applicationSteps: [
      "Apply for an eligible undergraduate, postgraduate or MBA programme at Bath Spa University",
      "Accept your offer",
      "Complete course application by 3 August 2026",
      "No separate scholarship application — the award is applied automatically",
    ],
    documentsRequired: ["Course offer letter", "Acceptance of offer"],
    officialLink:
      "https://www.bathspa.ac.uk/students/student-finance/scholarships-and-bursaries/regional-scholarship-africa/",
    sourceUrls: [
      "https://www.bathspa.ac.uk/students/student-finance/scholarships-and-bursaries/regional-scholarship-africa/",
    ],
    tags: ["uk", "partial-funding", "africa", "undergraduate", "mba"],
    aiScore: 82,
    languageSupport: ["English"],
    verified: true,
    applicantsEligible:
      "African applicants who have accepted an eligible Bath Spa offer",
    disclaimer:
      "This is a partial award. Academic and English requirements are not specified on the scholarship page — check your course requirements.",
  },
];

/**
 * Deduplicate scholarships using a normalized signature of
 * title + institution + official link + academic year.
 */
export const dedupeScholarships = <T extends Scholarship>(list: T[]): T[] => {
  const norm = (v?: string) =>
    (v ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const seen = new Set<string>();
  const out: T[] = [];
  for (const s of list) {
    const key = [
      norm(s.title),
      norm(s.institution),
      norm(s.officialLink),
      norm(s.academicYear),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
};

/**
 * Statuses that must never be shown on public-facing surfaces as open.
 */
export const NON_PUBLIC_STATUSES: ReadonlySet<string> = new Set([
  "Closed",
  "Archived",
]);

export const isPubliclyVisible = (s: Scholarship): boolean =>
  !s.status || !NON_PUBLIC_STATUSES.has(s.status);
