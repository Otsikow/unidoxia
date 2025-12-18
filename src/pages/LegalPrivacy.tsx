import type { ReactNode } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SEO } from "@/components/SEO";

type Section = {
  id: string;
  title: string;
  content: ReactNode;
  summary?: string;
};

const lastReviewed = 'October 22, 2025';

const highlights = [
  {
    title: 'No Data Sales',
    description: 'We never sell your personal information and only share it when necessary to provide our services.'
  },
  {
    title: 'Transparent Practices',
    description: 'You can review, update, or delete your data at any time by contacting our support team.'
  },
  {
    title: 'Secure Infrastructure',
    description: 'Industry-standard security, encryption, and governance protect every interaction on the platform.'
  }
];

const sections: Section[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <p>
        This Privacy Policy describes how UniDoxia (“UniDoxia”, “we”, “us”, or “our”) collects, uses, shares, and
        safeguards your personal information when you access our websites, applications, and related services
        (collectively, the “Services”).
      </p>
    ),
    summary:
      'We handle personal information responsibly and in line with applicable privacy laws so you can confidently pursue your education goals.'
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <div className="space-y-4">
        <p>We collect information from three primary sources:</p>
        <ul className="list-disc pl-6">
          <li>
            <strong>Information you provide.</strong> Account details, academic history, application materials, and
            communications you send us.
          </li>
          <li>
            <strong>Information collected automatically.</strong> Log data, device information, cookies, and analytics that
            help us improve platform performance.
          </li>
          <li>
            <strong>Information from partners.</strong> Education providers, agents, or payment processors may share data
            necessary to facilitate your applications and enrolment.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Information',
    content: (
      <div className="space-y-4">
        <p>Personal information supports essential platform experiences, including to:</p>
        <ul className="list-disc pl-6">
          <li>Operate and maintain your account, applications, and communication preferences.</li>
          <li>Match you with programs, advisors, and services relevant to your interests.</li>
          <li>Provide customer support, respond to inquiries, and resolve issues.</li>
          <li>Conduct analytics to improve product quality, safety, and reliability.</li>
          <li>Meet legal, regulatory, and compliance obligations, including fraud prevention.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'legal-bases',
    title: 'Legal Bases for Processing',
    content: (
      <p>
        We process your information under legitimate interests, consent, contractual necessity, and legal obligations. Where
        we rely on consent, you can withdraw it at any time without affecting the lawfulness of prior processing.
      </p>
    )
  },
  {
    id: 'sharing',
    title: 'How We Share Information',
    content: (
      <div className="space-y-4">
        <p>We share data only with trusted parties that support the Services:</p>
        <ul className="list-disc pl-6">
          <li>Educational institutions, advisors, or agents assisting with your applications.</li>
          <li>Vetted technology vendors that provide infrastructure, analytics, and communications tools.</li>
          <li>Payment processors and financial institutions that manage tuition or service payments.</li>
          <li>Regulators or law enforcement when required by applicable law.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </div>
    )
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: (
      <p>
        We retain personal information only for as long as it is needed to provide the Services, comply with legal
        obligations, resolve disputes, and enforce our agreements. When data is no longer required, we securely delete or
        anonymize it.
      </p>
    )
  },
  {
    id: 'your-rights',
    title: 'Your Choices & Rights',
    content: (
      <div className="space-y-4">
        <p>You have control over how your data is used. Depending on your location, you may:</p>
        <ul className="list-disc pl-6">
          <li>Request access to the personal data we hold about you.</li>
          <li>Ask us to update, correct, or delete inaccurate or outdated information.</li>
          <li>Object to or restrict certain processing activities.</li>
          <li>Receive a copy of your data in a portable format.</li>
          <li>Opt out of marketing communications using the unsubscribe link or by contacting support.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <p>
        We implement administrative, technical, and physical safeguards designed to protect personal information against
        loss, misuse, unauthorized access, disclosure, alteration, or destruction. These safeguards include encryption in
        transit and at rest, access controls, and regular security assessments.
      </p>
    )
  },
  {
    id: 'international-transfers',
    title: 'International Transfers',
    content: (
      <p>
        Because education pathways often span multiple countries, your data may be transferred internationally. We use
        approved transfer mechanisms and contractual protections to ensure equivalent levels of protection wherever your
        data travels.
      </p>
    )
  },
  {
    id: 'children',
    title: "Children's Privacy",
    content: (
      <p>
        The Services are not directed to children under the age of 13 (or the relevant minimum age in your jurisdiction).
        If we learn that we have collected personal information from a child without appropriate consent, we will delete
        it promptly.
      </p>
    )
  },
  {
    id: 'contact',
    title: 'Contact & Requests',
    content: (
      <div className="space-y-4">
        <p>
          For privacy questions or to submit a data request, email us at{' '}
          <a className="text-primary" href="mailto:info@unidoxia.com">
            info@unidoxia.com
          </a>
          .
        </p>
        <p>We respond to verified requests within the timelines required by applicable law.</p>
      </div>
    )
  }
];

const LegalPrivacy = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="Privacy Policy - UniDoxia"
        description="Read the UniDoxia privacy policy to understand how we collect, use, and protect your personal information throughout your study abroad journey."
        keywords="privacy policy, data protection, student data, GDPR, student privacy, university application data"
      />
      <header className="border-b bg-background/60 backdrop-blur">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Legal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last reviewed {lastReviewed}. Updated whenever practices change.</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground">On this page</h2>
              <div className="mt-3 space-y-2 text-sm">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <section className="space-y-12">
          <div className="prose dark:prose-invert max-w-none">
            <p>
              Our privacy program centers on respect, transparency, and strong controls. Review this policy to understand how
              data flows through UniDoxia and the safeguards that accompany every step.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <Card key={item.title} className="h-full">
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-12">
            {sections.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-24">
                <h2>{section.title}</h2>
                <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                  {section.summary ? <p className="font-medium text-foreground">{section.summary}</p> : null}
                  {section.content}
                </div>
              </article>
            ))}

            <p className="text-sm text-muted-foreground">Last reviewed: {lastReviewed}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LegalPrivacy;
