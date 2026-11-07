export const homeTitle = "Study Abroad from Africa | UniDoxia";
export const homeDescription = "Find university courses abroad and get help from UniDoxia with entry requirements, application documents and what to do after an offer.";
export const homeHeadline = ["Study abroad", "with UniDoxia."];
export const homeIntro = "We help students from Africa find university courses, prepare their documents and apply to study abroad. Start with a course search or speak to an adviser.";
export const homeEyebrow = "International study advice";
export const studentSignup = "/auth/signup?role=student";

export const homeNav = [
  { href: "/courses", label: "Courses" },
  { href: "/universities", label: "Universities" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "#destinations", label: "Destinations" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/blog", label: "Insights" },
  { href: "/contact", label: "Contact" },
];

export const homePhoto = {
  src: "/home/campus-study-1440.webp",
  srcSet: "/home/campus-study-660.webp 660w, /home/campus-study-810.webp 810w, /home/campus-study-1000.webp 1000w, /home/campus-study-1440.webp 1440w",
  sizes: "(max-width: 767px) calc(100vw - 32px), (max-width: 1279px) 46vw, 600px",
  alt: "Two neatly dressed students reviewing study notes together on a university campus",
  width: 1440,
  height: 1152,
};

export const homeDestinations = [
  { name: "United Kingdom", image: "london", alt: "Westminster Bridge and the Houses of Parliament in London", country: "United Kingdom" },
  { name: "Canada", image: "canada", alt: "Toronto skyline beside Lake Ontario", country: "Canada" },
  { name: "United States", image: "usa", alt: "The Statue of Liberty with the New York skyline beyond", country: "United States" },
  { name: "Germany", image: "germany", alt: "The Brandenburg Gate in Berlin", country: "Germany" },
  { name: "Ireland", image: "ireland", alt: "Samuel Beckett Bridge over the River Liffey in Dublin", country: "Ireland" },
  { name: "Australia", image: "australia", alt: "Sydney Opera House beside the harbour", country: "Australia" },
];

export const homeSteps = [
  { title: "Compare courses", text: "Check courses, entry requirements and start dates. Shortlist the options that suit your qualifications and interests.", href: "/courses", label: "Explore courses" },
  { title: "Create your profile", text: "Register, add your academic background and organise your documents. Ask us if you are unsure what a course requires.", href: "/auth/signup?role=student&next=%2Fstudent%2Fprofile", label: "Create your profile" },
  { title: "Prepare your application", text: "Prepare your application in your UniDoxia account. Use it to check progress and respond to requests for information.", href: "/auth/signup?role=student&next=%2Fstudent%2Fapplications%2Fnew", label: "Start an application" },
  { title: "Review your offer", text: "If a university offers you a place, check the conditions. Speak to us about what you need to do before you accept.", href: "/free-consultation", label: "Discuss your next steps" },
];

export function destinationHref(country) {
  return `/courses?${new URLSearchParams({ country })}`;
}

export const homeTraining = {
  title: "UK knowledge-trained guidance",
  text: "Eric Arthur, who leads UniDoxia, has completed the British Council UK knowledge agent and counsellor training, supporting his guidance for students planning to study in the UK.",
  detail: "Individual training award. Certificate 114757 is valid until 16 July 2028.",
  href: "/about/eric-arthur",
  label: "View training details",
  certificateHref: "/credentials/eric-arthur-uk-knowledge-training-certificate.pdf",
};

export const homeAssurances = [
  {
    title: "Consultation and service fees",
    text: "Your first consultation is free. Optional paid services include agent-supported application guidance. Check the plan and what it includes before paying. University fees, tuition, deposits and government charges are separate from UniDoxia’s fees.",
    href: "/pricing",
    label: "Review service pricing",
  },
];

export const whatsappIconPath = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.892a11.821 11.821 0 00-3.48-8.413Z";

export const homePhotoAvifSrcSet = "/home/campus-study-660.avif 660w, /home/campus-study-810.avif 810w, /home/campus-study-1000.avif 1000w, /home/campus-study-1440.avif 1440w";
