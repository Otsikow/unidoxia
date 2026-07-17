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
        <p className="text-muted-foreground mb-4">
          Eric Arthur, CEO of UniDoxia, has completed the British Council{" "}
          <em>UK knowledge agent and counsellor training</em> and agreed to the national
          code of ethical practice for UK education agents, having passed the
          assessments on the UK as a study destination.
        </p>
        <ul className="text-muted-foreground text-sm space-y-1 mb-5">
          <li><span className="font-medium text-foreground">Awarded to:</span> Eric Arthur (Agent)</li>
          <li><span className="font-medium text-foreground">Certificate code:</span> 114757</li>
          <li><span className="font-medium text-foreground">Valid until:</span> 16 July 2028</li>
        </ul>
        <img
          src="/credentials/eric-arthur-uk-knowledge-training-certificate.png"
          alt="British Council UK knowledge agent and counsellor training Certificate of completion awarded to Eric Arthur, organisation UniDoxia.com, certificate code 114757, valid until 16 July 2028."
          loading="lazy"
          className="w-full h-auto max-w-2xl rounded-md border"
        />
        <p className="mt-4">
          <a
            href="/credentials/eric-arthur-uk-knowledge-training-certificate.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 text-sm"
          >
            View certificate PDF
          </a>
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          This certificate is awarded to Eric Arthur as an individual. The British
          Council does not formally endorse, accredit or validate UniDoxia or its
          services.
        </p>
      </section>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Contact</h2>
      <p className="text-muted-foreground">
        Email <a className="underline" href="mailto:info@unidoxia.com">info@unidoxia.com</a>{" "}
        or use our <Link to="/contact" className="underline">contact page</Link>.
      </p>
    </div>
  );
};

export default About;
