/**
 * UniDoxia Weekly Scholarship Publishing Package
 * -----------------------------------------------
 * Topic:   4 UK Scholarships for African Students to Check Before Autumn 2026
 * Verified: 16 July 2026
 * Status:   DRAFT — pending editorial review and approval.
 *
 * This file is an internal, typed content package used by the weekly
 * scholarship publishing workflow (see SCHOLARSHIP_PUBLISHING_SYSTEM.md).
 * The social copy contained here MUST NOT be exposed on the public website.
 * Only the website article body may be adapted for /blog once the entry is
 * moved from DRAFT → APPROVED → PUBLISHED via the BlogAdmin workflow.
 */

export type WeeklyPackageStatus =
  | "Researching"
  | "Verified"
  | "Drafted"
  | "Approved"
  | "Published"
  | "Archived";

export interface WeeklyScholarshipPackage {
  slug: string;
  title: string;
  verifiedOn: string; // ISO date
  status: WeeklyPackageStatus;
  audience: string;
  destinations: string[];
  scholarshipIds: string[]; // ids in src/data/scholarshipsEditorial.ts
  graphic: {
    headline: string;
    subtitle: string;
  };
  hashtags: string[];
  article: {
    metaTitle: string;
    metaDescription: string;
    intro: string;
    sections: Array<{
      heading: string;
      body: string;
      officialSource: string;
    }>;
    closing: string;
    disclaimer: string;
  };
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
    whatsapp: string;
  };
  videoScript: string; // 45–60 seconds
  emailNewsletter: {
    subject: string;
    preheader: string;
    body: string;
  };
}

export const WEEKLY_PACKAGE: WeeklyScholarshipPackage = {
  slug: "4-uk-scholarships-african-students-autumn-2026",
  title: "4 UK Scholarships for African Students to Check Before Autumn 2026",
  verifiedOn: "2026-07-16",
  status: "Drafted",
  audience: "African international students planning UK study for 2026/27 and 2027/28",
  destinations: ["United Kingdom"],
  scholarshipIds: [
    "chevening-2027-28",
    "birmingham-postgraduate-high-fliers-2026",
    "exeter-nigeria-pgt-2026-27",
    "bath-spa-africa-regional-2026",
  ],
  graphic: {
    headline: "4 UK Scholarships to Check Before Autumn 2026",
    subtitle: "For African international students — verified 16 July 2026",
  },
  hashtags: [
    "#UniDoxia",
    "#StudyInUK",
    "#Scholarships2026",
    "#AfricanStudents",
    "#Chevening",
    "#Birmingham",
    "#Exeter",
    "#BathSpa",
    "#StudyAbroad",
  ],
  article: {
    metaTitle:
      "4 UK Scholarships for African Students to Check Before Autumn 2026 | UniDoxia",
    metaDescription:
      "A verified round-up of four UK scholarships and tuition awards African students should check before autumn 2026, including Chevening, Birmingham, Exeter and Bath Spa.",
    intro:
      "If you are an African student planning to study in the United Kingdom, the next few weeks are important. Several UK universities close their 2026/27 scholarship windows before the autumn intake, and the Chevening 2027/28 cycle is about to open. Below is a verified summary of four opportunities to review this week. All details were confirmed against the official pages on 16 July 2026.",
    sections: [
      {
        heading: "1. Chevening Scholarships 2027/28 (upcoming — not yet open)",
        body:
          "Chevening is the UK government's flagship award for future leaders and funds a one-year taught master's programme in the UK. Applications for the 2027/28 cycle open on 4 August 2026 at 11:00 UTC and close on 6 October 2026 at 11:00 UTC. Applicants must be citizens of a Chevening-eligible country or territory and, if applying from an ODA-eligible country, must be resident in an ODA-eligible country. You will need at least two years or 2,800 hours of post-undergraduate work experience, an undergraduate degree completed at least two years before the deadline, and a commitment to return home for at least two years after your studies. You apply independently to three eligible UK master's courses and must hold at least one unconditional offer by 8 July 2027. The award covers tuition fees, economy return travel, arrival and departure allowances, the visa application cost, a TB testing contribution where required, a travel top-up where applicable and a monthly living stipend (the exact stipend amount is not published). Please note: Chevening 2027/28 is upcoming and not currently open on 16 July 2026.",
        officialSource:
          "https://www.chevening.org/scholarships/application-timeline/",
      },
      {
        heading:
          "2. University of Birmingham Postgraduate High Fliers Scholarship (closing soon)",
        body:
          "Birmingham offers a £5,000 tuition discount for eligible overseas fee-paying students starting a full-time taught master's on the Birmingham UK campus in September 2026. Eligible applicants are domiciled in selected countries including Cameroon, Egypt, Ghana, Ivory Coast, Kenya, Mauritius, Nigeria, Senegal, South Africa, Tanzania, Uganda, Zambia and Zimbabwe. You must hold or receive an offer, accept it, and pay the deposit by the deadline stated in your offer letter. There is no separate scholarship application — the award is granted automatically to eligible students. The scholarship deadline is 31 July 2026. It is not compatible with any external full or partial tuition sponsorship, and online/distance and research programmes are excluded. This is a partial tuition discount, not a full scholarship.",
        officialSource:
          "https://www.birmingham.ac.uk/study/scholarships-funding/postgraduate-high-fliers-scholarship",
      },
      {
        heading:
          "3. University of Exeter Postgraduate Taught Scholarships 2026/27 for Nigeria (closing soon)",
        body:
          "Exeter offers a £10,000 first-year tuition discount for eligible Nigerian applicants joining a campus-based taught master's programme in 2026/27. You must be a Nigerian citizen or passport holder, be classified as international for fees, self-funded, and hold an eligible offer. The September 2026 entry deadline is 31 July 2026; eligible January 2027 programmes have a deadline of 1 December 2026. There is no separate scholarship application — the award is allocated automatically to eligible applicants who meet their offer conditions, pay the deposit and enrol. Academic and English requirements follow those of your course offer.",
        officialSource: "https://www.exeter.ac.uk/study/funding/award/?id=5677",
      },
      {
        heading:
          "4. Bath Spa University Africa Regional Scholarship (closing soon)",
        body:
          "Bath Spa University offers an automatic £2,000 award for eligible African international students at its Bath campuses or £4,000 for the MBA in London. Eligible applicants are African students entering a three-year undergraduate programme or a one-year postgraduate programme at Bath, or the MBA in London. You must have accepted your offer. The course application deadline is 3 August 2026. There is no separate scholarship application. Exact academic and English requirements are not specified on the scholarship page — check your course requirements.",
        officialSource:
          "https://www.bathspa.ac.uk/students/student-finance/scholarships-and-bursaries/regional-scholarship-africa/",
      },
    ],
    closing:
      "Need support choosing a suitable university, preparing your application or understanding the admission process? Visit UniDoxia.com or contact the UniDoxia team for assistance. UniDoxia does not guarantee admission, scholarships or visas.",
    disclaimer:
      "Important notice: scholarship conditions can change without notice. Always confirm the latest eligibility, benefits and deadlines on the official provider or university website before applying.",
  },
  social: {
    facebook:
      "🎓 4 UK scholarships every African student should check before autumn 2026:\n\n1️⃣ Chevening 2027/28 — fully funded master's, opens 4 August 2026, closes 6 October 2026.\n2️⃣ University of Birmingham High Fliers — £5,000 tuition discount for eligible African students, deadline 31 July 2026.\n3️⃣ University of Exeter (Nigeria) — £10,000 first-year tuition discount for 2026/27, September entry deadline 31 July 2026.\n4️⃣ Bath Spa University Africa Regional — automatic £2,000 (or £4,000 MBA London), course deadline 3 August 2026.\n\nAlways confirm details on the official university website. Need help choosing the right course? Visit UniDoxia.com. UniDoxia does not guarantee admission, scholarships or visas.",
    instagram:
      "🇬🇧 4 UK scholarships to check before autumn 2026 👇\n\n• Chevening 2027/28 (opens 4 Aug)\n• Birmingham High Fliers £5,000 (31 Jul)\n• Exeter Nigeria £10,000 (31 Jul)\n• Bath Spa Africa £2,000–£4,000 (3 Aug)\n\nTap the link in bio for the full guide on UniDoxia.com. Always confirm details on the official website. UniDoxia does not guarantee admission, scholarships or visas.",
    linkedin:
      "Four UK scholarships African students should review before autumn 2026 — verified on 16 July 2026:\n\n1. Chevening 2027/28: fully funded one-year master's; applications open 4 August 2026 at 11:00 UTC and close 6 October 2026 at 11:00 UTC. Requires at least two years of work experience and a commitment to return home for two years.\n2. University of Birmingham Postgraduate High Fliers: £5,000 tuition discount for eligible African applicants for September 2026 entry; deadline 31 July 2026.\n3. University of Exeter Postgraduate Taught Scholarships (Nigeria): £10,000 first-year tuition discount for 2026/27; September entry deadline 31 July 2026, January 2027 deadline 1 December 2026.\n4. Bath Spa University Africa Regional Scholarship: automatic £2,000 (Bath campuses) or £4,000 (MBA London); course deadline 3 August 2026.\n\nAlways confirm eligibility and benefits on the official provider website. UniDoxia supports African students choosing UK, Canada and USA study destinations — we do not guarantee admission, scholarships or visas.",
    whatsapp:
      "📌 4 UK scholarships to check before autumn 2026:\n• Chevening 2027/28 – opens 4 Aug, closes 6 Oct\n• Birmingham £5,000 – 31 Jul\n• Exeter (Nigeria) £10,000 – 31 Jul\n• Bath Spa £2,000/£4,000 – 3 Aug\n\nFull details on UniDoxia.com. Confirm everything on the official university page. UniDoxia does not guarantee admission, scholarships or visas.",
  },
  videoScript:
    "[0:00–0:05] Hook: If you're an African student heading to the UK, don't miss these four scholarships before autumn 2026.\n[0:05–0:20] Chevening 2027/28 opens 4 August and closes 6 October 2026. It's a fully funded master's for future leaders. You'll need two years of work experience.\n[0:20–0:35] The University of Birmingham High Fliers scholarship gives eligible African students a £5,000 tuition discount. Deadline: 31 July 2026. No separate application.\n[0:35–0:45] Exeter offers Nigerian applicants a £10,000 first-year discount for 2026/27, and Bath Spa gives African students £2,000, or £4,000 for the MBA in London — deadline 3 August.\n[0:45–1:00] Always confirm on the official university page. For help choosing your course, visit UniDoxia.com. We don't guarantee admission, scholarships or visas — we guide you every step of the way.",
  emailNewsletter: {
    subject: "4 UK scholarships to check before autumn 2026",
    preheader:
      "Verified 16 July 2026 — Chevening, Birmingham, Exeter and Bath Spa.",
    body:
      "Hello,\n\nThis week we've verified four UK scholarships and tuition awards that African students should review before autumn 2026:\n\n1) Chevening 2027/28 — fully funded master's, applications open 4 August 2026 and close 6 October 2026.\n2) University of Birmingham Postgraduate High Fliers — £5,000 tuition discount, deadline 31 July 2026.\n3) University of Exeter (Nigeria) — £10,000 first-year tuition discount, September entry deadline 31 July 2026.\n4) Bath Spa University Africa Regional — automatic £2,000, or £4,000 for MBA London, course deadline 3 August 2026.\n\nRead the full guide on UniDoxia.com and always confirm the latest details on the official university website. Need help choosing a suitable university, preparing your application or understanding the admission process? Visit UniDoxia.com or contact the UniDoxia team for assistance. UniDoxia does not guarantee admission, scholarships or visas.\n\n— The UniDoxia team",
  },
};

export default WEEKLY_PACKAGE;
