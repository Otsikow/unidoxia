/** Official student-visa or study-permit pages listed on /visa-calculator. */
export interface OfficialVisaLink {
  label: string;
  href: string;
  /** ISO date on which the URL was opened and returned HTTP 200, or a cited check. */
  checked: string;
  checkNote?: string;
}

export const VISA_INFORMATION_CHECKED_ON = "2026-11-16";

export const UK_VISA_INFORMATION_LINKS: OfficialVisaLink[] = [
  {
    label: "Check if you need a UK visa (GOV.UK)",
    href: "https://www.gov.uk/check-uk-visa",
    checked: "2026-11-16",
  },
  {
    label: "Student visa (GOV.UK)",
    href: "https://www.gov.uk/student-visa",
    checked: "2026-11-16",
  },
  {
    label: "Documents you'll need to apply (GOV.UK)",
    href: "https://www.gov.uk/student-visa/documents-you-must-provide",
    checked: "2026-11-19",
  },
  {
    label: "Money you need for a Student visa (GOV.UK)",
    href: "https://www.gov.uk/student-visa/money",
    checked: "2026-11-16",
  },
  {
    label: "Find a regulated immigration adviser (GOV.UK)",
    href: "https://www.gov.uk/find-an-immigration-adviser",
    checked: "2026-11-16",
  },
];

export const OTHER_COUNTRY_VISA_INFORMATION_LINKS: OfficialVisaLink[] = [
  {
    label: "Canada study permit (IRCC)",
    href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
    checked: "2026-11-16",
    checkNote:
      "Kojo recorded HTTP 200 on 16 Nov 2026. A later check from this box timed out or failed with an HTTP/2 error, so the same official IRCC URL is kept with that cited check.",
  },
  {
    label: "United States: students and exchange visitors (USCIS)",
    href: "https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors",
    checked: "2026-11-16",
  },
  {
    label: "Australia student visa or permit (Department of Home Affairs)",
    href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    checked: "2026-11-16",
  },
  {
    label: "Germany student visa or permit (Make it in Germany)",
    href: "https://www.make-it-in-germany.com/en/visa-recognition/visa-types/studying",
    checked: "2026-11-16",
  },
  {
    label: "Ireland study visa or permission (Immigration Service Delivery, ISD)",
    href: "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
    checked: "2026-11-16",
  },
];

export const VISA_INFORMATION_SHORT_DISCLAIMER =
  "General information only, not immigration advice. Each link goes to an official government website. Rules can change, so check the official page before you apply.";

export const VISA_INFORMATION_LONG_DISCLAIMER =
  "UniDoxia helps students choose and apply to universities. We do not give immigration advice. For advice about your own visa application, use the official government website, your university's international student team, or a regulated immigration adviser (in the UK: gov.uk/find-an-immigration-adviser).";

export const VISA_INFORMATION_CTA =
  "We help you choose and apply to universities. Book a free consultation.";

export const VISA_INFORMATION_META_DESCRIPTION =
  "Links to official student visa information from government websites. General information only, not immigration advice.";


/** Copied unedited from GOV.UK on 19 November 2026. */
export const GOVUK_DOCUMENTS_PAGE =
  "https://www.gov.uk/student-visa/documents-you-must-provide";

export const GOVUK_CHECKLIST_INTRO =
  "This is GOV.UK's general list; check which apply to you on GOV.UK";

export const GOVUK_DOCUMENTS_YOU_MUST_PROVIDE = [
  "a current passport or other valid travel documentation",
  "a Confirmation of Acceptance for Studies ( CAS ) from your course provider",
  "proof you have enough money to support yourself and pay for your course - this will vary depending on your circumstances",
  "a valid ATAS certificate if your course and nationality require it",
  "proof of parental or other legal guardian consent if you’re under 18",
  "proof of your relationship to your parent or guardian if you’re under 18",
  "your tuberculosis test results",
  "written consent for your application from your financial sponsor if you’ve received sponsorship for your course fees and living costs in the last 12 months",
] as const;

export const GOVUK_MONEY_PAGE = "https://www.gov.uk/student-visa/money";

export const GOVUK_FIGURES_CHECKED_ON = "2026-11-19";

/** Copied unedited from GOV.UK (Money you need) on 19 November 2026. */
export const GOVUK_OFFICIAL_FIGURES = [
  "You must have enough money to pay for your course and support yourself in the UK.",
  "How much money you need depends on your circumstances and what you’re applying for.",
  "You’ll need to show you have enough money to support yourself - unless you’ve been in the UK with a valid visa for at least 12 months on the date of your application.",
  "How much money you need depends on where you will be studying. You’ll need either:",
  "£1,529 per month (for up to 9 months) for courses in London",
  "£1,171 per month (for up to 9 months) for courses outside London",
  "London means the City of London and the 32 London boroughs.",
  "You must have this money for at least 28 days in a row. The end date of the 28-day period must be within 31 days of the date you apply for your visa.",
] as const;

export const GOVUK_FIGURES_SOURCE_NOTE =
  "Source: GOV.UK. Checked on 19 November 2026. Rules can change, so check GOV.UK before you apply.";
