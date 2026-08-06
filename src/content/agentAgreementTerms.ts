// UniDoxia Recruitment Agent and Education Counsellor Essential Terms.
// This file is shared verbatim with supabase/functions/_shared/agentAgreementTerms.ts
// so the on-screen agreement and the emailed PDF always match.

export const AGENT_AGREEMENT_VERSION = "v1.0-2026";

export const AGENT_AGREEMENT_TITLE =
  "UniDoxia Recruitment Agent and Education Counsellor Essential Terms";

export interface AgreementSection {
  title: string;
  /** A string renders as a paragraph, a string[] renders as a bullet list. */
  blocks: Array<string | string[]>;
}

export const AGENT_AGREEMENT_INTRO: Array<string | string[]> = [
  "Welcome to UniDoxia.",
  "By signing below and/or clicking \u201cI AGREE\u201d, you, or the company or organisation on whose behalf you are acting, agree to enter into a Recruitment Agent and Education Counsellor Agreement with UniDoxia.",
  "In this agreement, \u201cyou\u201d, \u201cAgent\u201d, \u201cRecruitment Agent\u201d or \u201cCounsellor\u201d refers to the individual or organisation accepting these terms. \u201cUniDoxia\u201d, \u201cwe\u201d, \u201cus\u201d and \u201cour\u201d refers to UniDoxia and its authorised representatives.",
  "By accepting this agreement, you confirm that you have read, understood and agreed to comply with these Essential Terms, together with any additional policies, procedures, commission arrangements and operational guidelines provided by UniDoxia.",
  "You must not represent UniDoxia, recruit students through UniDoxia, access the UniDoxia platform or submit student applications unless you agree to these terms.",
  "The following provisions summarise the essential conditions of your relationship with UniDoxia.",
];

export const AGENT_AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: "Appointment and Scope of Services",
    blocks: [
      "UniDoxia appoints you as a non-exclusive independent recruitment agent or education counsellor.",
      "Your responsibilities may include:",
      [
        "Promoting UniDoxia\u2019s education recruitment services honestly and professionally.",
        "Identifying and supporting prospective international students.",
        "Providing accurate information about universities, colleges, programmes, tuition fees, admission requirements, scholarships and visa processes.",
        "Assisting students with registration, document collection and application preparation.",
        "Uploading or submitting student documents through UniDoxia\u2019s approved systems.",
        "Communicating with students throughout the application and enrolment process.",
        "Following all instructions, compliance procedures and quality standards issued by UniDoxia.",
      ],
      "You are not an employee, legal representative, partner or joint venture partner of UniDoxia. You must not make commitments, promises or representations on behalf of UniDoxia unless you have received written authorisation.",
    ],
  },
  {
    title: "Commission",
    blocks: [
      "Any commission payable to you will be determined by UniDoxia\u2019s applicable commission structure.",
      "The estimated commission may be displayed on your agent dashboard, confirmed by email or communicated through another authorised UniDoxia channel.",
      "Commission amounts may vary because of:",
      [
        "Currency exchange rates.",
        "University or institutional commission policies.",
        "Student enrolment status.",
        "Tuition fee payments.",
        "Visa outcomes.",
        "Refunds, withdrawals or deferrals.",
        "Deductions, taxes, banking fees or administrative charges.",
      ],
      "Commission will only become payable after UniDoxia has received the relevant commission from the university, college or education partner and has confirmed that all payment conditions have been satisfied.",
      "No commission will be payable where:",
      [
        "The student does not enrol.",
        "The student withdraws before the institution\u2019s commission requirements are satisfied.",
        "The student provides false, misleading or fraudulent documents.",
        "The institution refuses or withdraws the commission.",
        "The application was not correctly registered or assigned to you.",
        "You breached this agreement or UniDoxia\u2019s policies.",
        "The commission is subject to an unresolved dispute, refund or investigation.",
      ],
      "UniDoxia may withhold, reduce, recover or offset commission where an overpayment, refund, cancellation, misconduct or breach of agreement has occurred.",
    ],
  },
  {
    title: "Student Registration and Ownership",
    blocks: [
      "A student will only be recognised as your referred student where the student has been properly registered through your authorised agent account, referral link, agent code or another method approved by UniDoxia.",
      "You must not claim ownership of a student who:",
      [
        "Was already registered with UniDoxia.",
        "Was already being supported by another UniDoxia agent.",
        "Was introduced directly to UniDoxia before your involvement.",
        "Was registered using another agent\u2019s referral details.",
        "Has not provided permission for you to represent them.",
      ],
      "Where more than one agent claims the same student, UniDoxia will review the available records and make the final decision concerning student allocation and commission eligibility.",
    ],
  },
  {
    title: "Student Consent and Data Protection",
    blocks: [
      "You are responsible for obtaining clear and informed consent from every student before collecting, accessing, storing, uploading or sharing their personal information.",
      "This consent must authorise you and UniDoxia to:",
      [
        "Process the student\u2019s personal information.",
        "Share information with universities, colleges, education partners, visa support providers and other relevant organisations.",
        "Communicate with institutions on the student\u2019s behalf.",
        "Review and verify the student\u2019s documents and qualifications.",
        "Contact the student regarding applications, admissions, visas, scholarships and related services.",
      ],
      "You must handle personal information securely and comply with all applicable privacy and data protection laws, including the UK General Data Protection Regulation and the Data Protection Act 2018 where applicable.",
      "You must not download, retain, disclose, sell, misuse or share student information for any unauthorised purpose.",
      "Any suspected loss, misuse, unauthorised access or disclosure of student information must be reported to UniDoxia immediately.",
    ],
  },
  {
    title: "Accuracy and Honest Representation",
    blocks: [
      "You must provide students with accurate, current and honest information.",
      "You must not:",
      [
        "Guarantee admission, scholarships, visas, employment or permanent residency.",
        "Misrepresent tuition fees, living costs, course requirements or visa conditions.",
        "Give false information about UniDoxia, universities or education partners.",
        "Pressure students to apply for unsuitable programmes.",
        "Submit applications without the student\u2019s knowledge and approval.",
        "Create or alter documents.",
        "Encourage students to provide false information.",
        "Make unauthorised promises regarding refunds, discounts or commission.",
        "Collect money in UniDoxia\u2019s name without written authorisation.",
      ],
      "Where information is uncertain, you must verify it with UniDoxia before advising the student.",
    ],
  },
  {
    title: "Document Authenticity and Fraud Prevention",
    blocks: [
      "You must take reasonable steps to confirm that all documents submitted by students are genuine, complete and accurate.",
      "You must not knowingly submit:",
      [
        "Forged or altered certificates.",
        "Fraudulent bank statements.",
        "False employment records.",
        "Fabricated recommendation letters.",
        "False English-language evidence.",
        "Misleading personal statements.",
        "Documents belonging to another person.",
        "Any information intended to deceive UniDoxia, an institution or an immigration authority.",
      ],
      "Any suspected fraud must be reported to UniDoxia immediately.",
      "UniDoxia may suspend or terminate your account and report suspected fraud to universities, regulatory bodies, immigration authorities, law enforcement agencies or other appropriate organisations.",
    ],
  },
  {
    title: "Fees and Payments",
    blocks: [
      "You must not charge students unauthorised fees in UniDoxia\u2019s name.",
      "Any fee charged directly by you must:",
      [
        "Be lawful.",
        "Be clearly explained to the student.",
        "Be separate from UniDoxia unless UniDoxia has authorised the fee in writing.",
        "Not be presented as a university, visa or UniDoxia fee unless that is genuinely the case.",
        "Be supported by an appropriate receipt or payment record.",
      ],
      "You must not receive tuition fees, deposits or visa-related payments on behalf of UniDoxia or an institution unless you have received prior written authorisation.",
    ],
  },
  {
    title: "Professional Conduct",
    blocks: [
      "You must behave professionally, respectfully and ethically when dealing with students, parents, institutions, UniDoxia staff and other agents.",
      "You must not engage in:",
      [
        "Harassment, discrimination or abusive communication.",
        "Bribery, corruption or dishonest inducements.",
        "Unauthorised use of UniDoxia branding.",
        "Misleading advertising.",
        "Defamation of UniDoxia, its staff, partners or other agents.",
        "Conduct that may damage UniDoxia\u2019s reputation or institutional relationships.",
      ],
      "You must comply with all applicable anti-bribery, anti-corruption, consumer protection and education recruitment laws.",
    ],
  },
  {
    title: "Marketing and Use of the UniDoxia Brand",
    blocks: [
      "You may only use UniDoxia\u2019s name, logo, website content, marketing materials or intellectual property in the manner authorised by UniDoxia.",
      "You must not:",
      [
        "Create social media accounts, websites or advertisements that could be mistaken for official UniDoxia channels.",
        "Alter UniDoxia\u2019s logo or branding without permission.",
        "Publish misleading statements about partnerships or accreditations.",
        "Claim to be an employee, director or legal representative of UniDoxia.",
        "Use UniDoxia\u2019s brand after your agreement has ended.",
      ],
      "UniDoxia may require you to remove or correct any marketing material that does not meet its standards.",
    ],
  },
  {
    title: "Confidentiality",
    blocks: [
      "You must keep confidential all non-public information received from UniDoxia, including:",
      [
        "Commission structures.",
        "Student information.",
        "Institutional agreements.",
        "University contacts.",
        "Business strategies.",
        "Training materials.",
        "Internal systems and procedures.",
        "Login details.",
        "Agent performance information.",
        "Application processes.",
        "Financial and commercial information.",
      ],
      "You must not share confidential information with any third party unless authorised by UniDoxia or required by law.",
      "Your confidentiality obligations will continue after this agreement ends.",
    ],
  },
  {
    title: "Non-Solicitation and Protection of Business Relationships",
    blocks: [
      "During the term of this agreement and for 12 months after it ends, you must not knowingly bypass UniDoxia in relation to a student, university, college, education partner or business contact introduced to you through UniDoxia.",
      "Without UniDoxia\u2019s prior written consent, you must not:",
      [
        "Move UniDoxia students to another recruitment platform.",
        "Encourage UniDoxia students to apply through another agent.",
        "Contact UniDoxia\u2019s institutional partners to establish a competing relationship using confidential information obtained through UniDoxia.",
        "Recruit UniDoxia staff or authorised agents for a competing organisation.",
      ],
      "This provision does not prevent you from operating your own lawful business or working with organisations with whom you had a documented relationship before joining UniDoxia.",
    ],
  },
  {
    title: "Access to the UniDoxia Platform",
    blocks: [
      "Your UniDoxia account is personal to you or your authorised organisation.",
      "You must:",
      [
        "Keep your login information secure.",
        "Prevent unauthorised access.",
        "Provide accurate registration information.",
        "Inform UniDoxia of any change to your legal name, business details, address or contact information.",
        "Notify UniDoxia immediately if you believe your account has been compromised.",
      ],
      "You must not share your account with unauthorised individuals or allow another person to submit applications under your identity.",
      "UniDoxia may monitor platform activity for security, compliance, training and quality-control purposes.",
    ],
  },
  {
    title: "Performance and Quality Standards",
    blocks: [
      "UniDoxia may review your performance based on:",
      [
        "Number and quality of student referrals.",
        "Application accuracy.",
        "Student satisfaction.",
        "Document quality.",
        "Communication standards.",
        "Enrolment and visa outcomes.",
        "Compliance with instructions.",
        "Responsiveness to students and UniDoxia staff.",
      ],
      "UniDoxia may provide training, warnings, corrective instructions or performance improvement requirements.",
      "Failure to meet the required standards may result in restricted access, suspension or termination.",
    ],
  },
  {
    title: "Term and Renewal",
    blocks: [
      "The initial term of this agreement will be 12 months from the date on which you sign or click \u201cI AGREE\u201d.",
      "The agreement will automatically renew for additional 12-month periods unless either party provides written notice of termination.",
    ],
  },
  {
    title: "Suspension and Termination",
    blocks: [
      "Either party may terminate this agreement by providing written notice.",
      "UniDoxia may suspend or terminate your agreement immediately where there is suspected or confirmed:",
      [
        "Fraud.",
        "Document falsification.",
        "Misrepresentation.",
        "Data protection breach.",
        "Unauthorised collection of money.",
        "Serious student complaint.",
        "Misuse of the UniDoxia brand.",
        "Breach of confidentiality.",
        "Bribery or corruption.",
        "Damage to UniDoxia\u2019s reputation or institutional relationships.",
        "Breach of this agreement.",
      ],
      "Following termination, you must stop representing yourself as a UniDoxia agent and immediately stop using UniDoxia\u2019s systems, branding and confidential information.",
      "Termination will not automatically entitle you to commission. Any outstanding commission will remain subject to the payment conditions, institutional confirmation and compliance requirements contained in this agreement.",
    ],
  },
  {
    title: "Limitation of Liability",
    blocks: [
      "To the fullest extent permitted by law, UniDoxia will not be responsible for losses arising from:",
      [
        "University or college admission decisions.",
        "Visa refusals.",
        "Scholarship decisions.",
        "Institutional policy changes.",
        "Course cancellations.",
        "Changes in tuition fees.",
        "Student withdrawals.",
        "Delays caused by institutions, government bodies, immigration authorities or third parties.",
        "Currency fluctuations.",
        "Incorrect information provided by the student or agent.",
        "Unauthorised promises made by the agent.",
      ],
      "UniDoxia does not guarantee that any student will receive admission, a scholarship, a visa, employment or permanent residency.",
      "Where UniDoxia is found legally liable, its total liability will not exceed the confirmed unpaid commission properly due to you at the time the claim arose, unless applicable law requires otherwise.",
    ],
  },
  {
    title: "Changes to These Terms",
    blocks: [
      "UniDoxia may update these terms, commission arrangements, operational policies or platform procedures where reasonably necessary.",
      "Updated terms may be published on the UniDoxia platform or communicated by email or another authorised channel.",
      "You are responsible for reviewing any updates. Continued use of the UniDoxia platform or continued recruitment activity after an update will be treated as acceptance of the revised terms, where permitted by law.",
    ],
  },
  {
    title: "Governing Law",
    blocks: [
      "This agreement will be governed by the laws of England and Wales.",
      "The courts of England and Wales will have jurisdiction over disputes arising from this agreement, unless applicable law requires otherwise.",
    ],
  },
  {
    title: "Online Acceptance and Electronic Signature",
    blocks: [
      "By signing electronically or clicking \u201cI AGREE\u201d, you confirm that:",
      [
        "You have read and understood this agreement.",
        "You have had the opportunity to seek independent legal advice.",
        "The information you have provided is accurate.",
        "You have authority to enter into this agreement personally or on behalf of your organisation.",
        "You agree to be legally bound by these terms.",
      ],
    ],
  },
];

export const AGENT_AGREEMENT_ACCEPTANCE = [
  "I confirm that I have read, understood and agreed to the UniDoxia Recruitment Agent and Education Counsellor Essential Terms.",
  "I confirm that I have authority to enter into this agreement.",
  "I consent to UniDoxia verifying the personal, business and identification information I have provided.",
];
