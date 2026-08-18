import { Link } from "react-router-dom";
import britishCouncilLogo from "@/assets/british-council-logo.png";

import { SEO } from "@/components/SEO";
import { SITE_ORIGIN } from "@/components/SEO";

const About = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About UniDoxia",
    url: `${SITE_ORIGIN}/about`,
    description:
      "UniDoxia supports international students worldwide with study-abroad discovery and application guidance.",
    publisher: {
      "@type": "Organization",
      name: "UniDoxia",
      url: SITE_ORIGIN,
    },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <SEO
        title="About UniDoxia | Study Abroad Support for International Students"
        description="UniDoxia helps international students around the world discover courses, prepare applications and understand next steps — guidance, not guarantees."
        canonicalPath="/about"
        jsonLd={jsonLd}
      />
      <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 mb-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            Guidance for global study
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">About UniDoxia</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            UniDoxia is a study-abroad support platform built around the needs of international
            students worldwide. We help
            students research courses and universities, prepare applications, and understand
            common visa and scholarship requirements.
          </p>
        </div>
        <figure className="overflow-hidden rounded-2xl border bg-muted shadow-lg">
          <img
            src="/about/students-guidance.jpg"
            alt="International students from around the world reviewing study options with an education adviser around a laptop."
            width="1600"
            height="900"
            fetchPriority="high"
            className="aspect-[16/10] w-full object-cover object-center"
          />
        </figure>
      </section>

      <div className="max-w-3xl mx-auto">

      <h2 className="text-2xl font-semibold mt-8 mb-3">University listings and relationships</h2>
      <p className="text-muted-foreground mb-4">
        Universities may appear in UniDoxia search and featured listings so students can
        explore study options. A listing does not mean the institution endorses UniDoxia
        or has a formal recruitment agreement with us. Formal partnerships require a
        separate written agreement.
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
        Content is published under the UniDoxia Editorial Team byline. Technology,
        including AI, may assist with drafting. Our publishing workflow requires
        material factual claims to be checked against linked official sources, and
        we ask readers to confirm current official requirements before acting. Read
        the full{" "}
        <Link to="/editorial-policy" className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          editorial policy
        </Link>{" "}
        for details on sourcing, corrections, and AI-assisted drafting.
      </p>

      <section aria-labelledby="uk-knowledge-trained-leadership" className="mt-10">
        <h2
          id="uk-knowledge-trained-leadership"
          className="text-2xl font-semibold mb-3"
        >
          UK knowledge-trained leadership
        </h2>
        <img
          src={britishCouncilLogo}
          alt="British Council"
          loading="lazy"
          className="h-10 w-auto mb-4 dark:brightness-0 dark:invert"
        />
        <p className="text-muted-foreground mb-4">
          The leadership of UniDoxia has completed the British Council{" "}
          <em>UK knowledge agent and counsellor training</em> and agreed to the national
          code of ethical practice for UK education agents, having passed the assessments
          on the UK as a study destination. Students and university partners are therefore
          supported by advisers trained to recognised UK standards.
        </p>
        <ul className="text-muted-foreground text-sm space-y-1 mb-5">
          <li><span className="font-medium text-foreground">Training:</span> UK knowledge agent and counsellor training (British Council)</li>
          <li><span className="font-medium text-foreground">Certificate code:</span> 114757</li>
          <li><span className="font-medium text-foreground">Valid until:</span> 16 July 2028</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          The training certificate is awarded to an individual member of our leadership
          team. The British Council does not formally endorse, accredit or validate
          UniDoxia or its services.
        </p>
      </section>


      <h2 className="text-2xl font-semibold mt-10 mb-3">Contact</h2>
      <p className="text-muted-foreground">
        Email <a className="underline" href="mailto:info@unidoxia.com">info@unidoxia.com</a>{" "}
        or use our <Link to="/contact" className="underline">contact page</Link>.
      </p>
      </div>
    </div>
  );
};

export default About;
