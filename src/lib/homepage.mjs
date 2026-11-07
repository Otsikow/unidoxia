export const homeTitle = "Study Abroad from Africa | UniDoxia";
export const homeDescription = "Find university courses abroad and get help from UniDoxia with entry requirements, application documents and what to do after an offer.";
export const homeHeadline = ["Your ambition,", "beyond borders."];
export const homeIntro = "Explore university courses abroad with guidance built around you. We help students from Africa compare their options, prepare applications and plan what comes after an offer.";
export const homeEyebrow = "International study. Personal guidance.";
export const studentSignup = "/auth/signup?role=student";

export const homeNav = [
  { href: "/courses", label: "Courses" },
  { href: "/universities", label: "Universities" },
  { href: "#destinations", label: "Destinations" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/contact", label: "Contact" },
];

export const homePhoto = {
  src: "/home/student-1260.webp",
  srcSet: "/home/student-660.webp 660w, /home/student-810.webp 810w, /home/student-1260.webp 1260w",
  sizes: "(max-width: 767px) calc(100vw - 32px), (max-width: 1279px) 46vw, 600px",
  alt: "A student working through notes at an outdoor campus table",
  width: 1260,
  height: 840,
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
  { title: "Explore your options", text: "Compare courses, entry requirements and start dates. Build a shortlist around your interests and qualifications." },
  { title: "Prepare your profile", text: "Register, add your academic background and organise your documents. Ask our team about any course-specific requirements." },
  { title: "Apply and stay informed", text: "Prepare your application, follow its progress and respond to requests through your UniDoxia account." },
  { title: "Plan your next chapter", text: "If you receive an offer, review its conditions and discuss the practical steps ahead with our team." },
];

export function destinationHref(country) {
  return `/courses?${new URLSearchParams({ country })}`;
}

export const homeAssurances = [
  {
    title: "UK knowledge-trained leadership",
    text: "Eric Arthur has completed the British Council UK knowledge agent and counsellor training. Certificate 114757 is valid until 16 July 2028.",
    href: "/credentials/eric-arthur-uk-knowledge-training-certificate.pdf",
    label: "View the training certificate",
  },
  {
    title: "Clear costs from the start",
    text: "Your first consultation is free. Review UniDoxia service pricing and any separate university or government fees before you commit.",
    href: "/pricing",
    label: "Review service pricing",
  },
];
