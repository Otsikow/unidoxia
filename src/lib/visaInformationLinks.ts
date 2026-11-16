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
    href: "https://www.make-it-in-germany.com/en/visa-residence/types/studying-visa",
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
