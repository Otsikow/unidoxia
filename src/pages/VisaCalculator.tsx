import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import {
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
