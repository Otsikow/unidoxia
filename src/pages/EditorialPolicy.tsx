import { SEO, SITE_ORIGIN } from "@/components/SEO";

const EditorialPolicy = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "UniDoxia Editorial Policy",
    url: `${SITE_ORIGIN}/editorial-policy`,
    description:
      "How UniDoxia sources, source-checks, corrects, and discloses AI-assisted drafting in its study-abroad content.",
    publisher: { "@type": "Organization", name: "UniDoxia", url: SITE_ORIGIN },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEO
        title="Editorial Policy | UniDoxia"
        description="How UniDoxia sources, source-checks, corrects, and discloses AI-assisted drafting in its study-abroad guidance."
        canonicalPath="/editorial-policy"
        jsonLd={jsonLd}
      />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Editorial Policy</h1>
      <p className="text-muted-foreground mb-6">
        This policy explains how the UniDoxia editorial team researches, writes, reviews,
        and updates the guidance we publish for international students.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Official sources</h2>
      <p className="text-muted-foreground">
        We prioritise official sources — government immigration authorities, universities,
        and scholarship providers — and link to them so readers can verify current
        requirements before applying.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Source-check date</h2>
      <p className="text-muted-foreground">
        Every article shows a “Last checked” date. This is the most recent date on which
        the team reviewed the article against its official sources. Rules can change at
        any time, so we still ask readers to confirm the linked official source.
      </p>

      <h2 className="text-2xl function-semibold mt-8 mb-3">Corrections</h2>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Corrections</h2>
      <p className="text-muted-foreground">
        If you spot an error, email{" "}
        <a className="underline" href="mailto:info@unidoxia.com">info@unidoxia.com</a>.
        We update the article, refresh the source-check date, and note material
        corrections in the article itself.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">AI-assisted drafting</h2>
      <p className="text-muted-foreground">
        We use AI tools to help draft, structure, and edit articles. Every published
        article is reviewed by a human editor against official sources before it goes
        live. AI is a tool in our workflow, not the source of the guidance.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">No guarantees, not legal advice</h2>
      <p className="text-muted-foreground">
        UniDoxia provides educational guidance to help students plan. We do not guarantee
        admission, scholarship, or visa outcomes, and our content is not legal or
        immigration advice. Always confirm current requirements on the linked official
        source and, where appropriate, seek qualified professional advice.
      </p>
    </div>
  );
};

export default EditorialPolicy;
