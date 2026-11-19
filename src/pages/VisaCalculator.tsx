import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import {
  GOVUK_CHECKLIST_INTRO,
  GOVUK_DOCUMENTS_PAGE,
  GOVUK_DOCUMENTS_YOU_MUST_PROVIDE,
  GOVUK_FIGURES_SOURCE_NOTE,
  GOVUK_MONEY_PAGE,
  GOVUK_OFFICIAL_FIGURES,
  OTHER_COUNTRY_VISA_INFORMATION_LINKS,
  UK_VISA_INFORMATION_LINKS,
  VISA_INFORMATION_CTA,
  VISA_INFORMATION_LONG_DISCLAIMER,
  VISA_INFORMATION_META_DESCRIPTION,
  VISA_INFORMATION_SHORT_DISCLAIMER,
  type OfficialVisaLink,
} from "@/lib/visaInformationLinks";

function OfficialLinks({ links }: { links: OfficialVisaLink[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            className="text-primary underline underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function VisaCalculatorPage() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="Visa information | UniDoxia"
        description={VISA_INFORMATION_META_DESCRIPTION}
        keywords="visa information, GOV.UK student visa, student visa information, official government visa pages"
      />
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Visa information</h1>
        <aside
          role="note"
          aria-label="Immigration advice disclaimer"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 dark:border-amber-700 dark:bg-amber-950/40"
        >
          <p className="text-base font-semibold text-foreground">{VISA_INFORMATION_SHORT_DISCLAIMER}</p>
          <p className="mt-2 text-sm text-muted-foreground">{VISA_INFORMATION_LONG_DISCLAIMER}</p>
        </aside>

        <section aria-labelledby="govuk-official-figures">
          <h2 id="govuk-official-figures" className="mb-3 text-xl font-semibold">
            Official GOV.UK figures
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            These figures are copied from the official{" "}
            <a
              href={GOVUK_MONEY_PAGE}
              className="text-primary underline underline-offset-2"
              rel="noopener noreferrer"
              target="_blank"
            >
              Money you need for a Student visa (GOV.UK)
            </a>{" "}
            page. {GOVUK_FIGURES_SOURCE_NOTE}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {GOVUK_OFFICIAL_FIGURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="govuk-document-checklist">
          <h2 id="govuk-document-checklist" className="mb-3 text-xl font-semibold">
            Documents you will need to apply
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {GOVUK_CHECKLIST_INTRO}{" "}
            <a
              href={GOVUK_DOCUMENTS_PAGE}
              className="text-primary underline underline-offset-2"
              rel="noopener noreferrer"
              target="_blank"
            >
              Documents you will need to apply (GOV.UK)
            </a>
            .
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {GOVUK_DOCUMENTS_YOU_MUST_PROVIDE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="uk-visa-information">
          <h2 id="uk-visa-information" className="mb-3 text-xl font-semibold">
            United Kingdom
          </h2>
          <OfficialLinks links={UK_VISA_INFORMATION_LINKS} />
        </section>

        <section aria-labelledby="other-visa-information">
          <h2 id="other-visa-information" className="mb-3 text-xl font-semibold">
            Other countries
          </h2>
          <OfficialLinks links={OTHER_COUNTRY_VISA_INFORMATION_LINKS} />
        </section>

        <p>
          <Link to="/free-consultation" className="text-primary font-medium underline underline-offset-2">
            {VISA_INFORMATION_CTA}
          </Link>
        </p>
      </div>
    </div>
  );
}
