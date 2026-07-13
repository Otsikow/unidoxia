import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SITE_ORIGIN } from "@/components/SEO";

const About = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About UniDoxia",
    url: `${SITE_ORIGIN}/about`,
    description:
      "UniDoxia supports international students with study-abroad discovery and application guidance.",
    publisher: {
      "@type": "Organization",
      name: "UniDoxia",
      url: SITE_ORIGIN,
    },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEO
        title="About UniDoxia | Study Abroad Support for International Students"
        description="UniDoxia helps international students discover courses and universities, prepare applications, and understand visa and scholarship requirements — guidance, not guarantees."
        canonicalPath="/about"
        jsonLd={jsonLd}
      />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">About UniDoxia</h1>
      <p className="text-muted-foreground mb-6">
        UniDoxia is a study-abroad support platform that helps international students
        research courses and universities, prepare stronger applications, and understand
        visa and scholarship requirements.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">What we do</h2>
      <p className="text-muted-foreground mb-4">
        We combine a course and university search experience with step-by-step
        application guidance and educational content on visas, scholarships, and
        admissions. Students can also connect with our team for help at any stage
        of the journey.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">What we don't do</h2>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
        <li>We do not guarantee admission, scholarship, or visa outcomes.</li>
        <li>We do not provide legal or immigration advice.</li>
        <li>We do not replace official government or university guidance — always
          confirm current requirements on the official source before applying.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Editorial standards</h2>
      <p className="text-muted-foreground">
        Our content is written and reviewed by the UniDoxia editorial team, references
        official sources, and shows a source-check date. Read the full{" "}
        <Link to="/editorial-policy" className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          editorial policy
        </Link>{" "}
        for details on sourcing, corrections, and AI-assisted drafting.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Contact</h2>
      <p className="text-muted-foreground">
        Email <a className="underline" href="mailto:info@unidoxia.com">info@unidoxia.com</a>{" "}
        or use our <Link to="/contact" className="underline">contact page</Link>.
      </p>
    </div>
  );
};

export default About;
