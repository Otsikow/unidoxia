import type { ReactNode } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SEO } from "@/components/SEO";

type Section = {
  id: string;
  title: string;
  content: ReactNode;
  summary?: string;
};

const lastUpdated = 'October 22, 2025';

const highlights = [
  {
    title: 'Clear Responsibilities',
    description: 'Understand the expectations for maintaining your account and complying with platform policies.'
  },
  {
    title: 'Transparent Fees',
    description: 'We clearly communicate any paid services and provide notice before we make pricing changes.'
  },
  {
    title: 'Robust Safeguards',
    description: 'Security, privacy, and compliance are built into our workflows to protect your information.'
  }
];

const sections: Section[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: (
      <p>
        These Terms of Service (“Terms”) govern your access to and use of UniDoxia (“UniDoxia”, “we”,
        “us”, or “our”) products, websites, and services (collectively, the “Services”). By accessing or using the
        Services, you agree to be bound by these Terms and our Privacy Policy.
      </p>
    ),
    summary:
      'Use of the platform constitutes acceptance of these Terms and our Privacy Policy. You must ensure organizational consent when you act on behalf of someone else.'
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    content: (
      <p>
        You must be the age of majority in your jurisdiction (or have verifiable parental or guardian consent) to use
        the Services. You agree to provide accurate, current, and complete information during registration and to keep it
        up to date at all times.
      </p>
    )
  },
  {
    id: 'accounts',
    title: 'Accounts & Security',
    content: (
      <ul className="list-disc pl-6">
        <li>You are responsible for safeguarding your account credentials and all activity under your account.</li>
        <li>Notify us immediately of any unauthorized use or suspected breach of security.</li>
        <li>We may suspend or terminate accounts that violate these Terms or present security risks.</li>
      </ul>
    )
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <div className="space-y-4">
        <p>When using the Services, you agree not to:</p>
        <ul className="list-disc pl-6">
          <li>Violate any law, contract, intellectual property, or other third-party right.</li>
          <li>Access, tamper with, or use non-public areas or systems of the Services.</li>
          <li>Circumvent or probe any security or authentication measures.</li>
          <li>Scrape, crawl, or spider the Services without prior written consent.</li>
          <li>Use the Services to send spam, conduct fraud, or interfere with service integrity.</li>
          <li>Upload harmful code or content that is illegal, misleading, or defamatory.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'user-content',
    title: 'Your Content',
    content: (
      <p>
        You retain ownership of content you submit to the Services. You grant UniDoxia a worldwide, non-exclusive,
        royalty-free license to host, store, reproduce, and display that content solely to operate and improve the
        Services. You represent that you have the rights to submit the content and that it does not infringe the rights
        of others.
      </p>
    )
  },
  {
    id: 'payments',
    title: 'Fees & Payments',
    content: (
      <p>
        Some parts of the Services may be offered for a fee. Prices and features may change from time to time with
        reasonable notice where required. Unless otherwise stated, fees are non-refundable except where required by law.
      </p>
    )
  },
  {
    id: 'changes',
    title: 'Service Changes',
    content: (
      <p>
        We may add, modify, or discontinue all or part of the Services at any time. Where practicable, we will provide
        notice of material changes that adversely affect your use of the Services.
      </p>
    )
  },
  {
    id: 'third-parties',
    title: 'Third-Party Services',
    content: (
      <p>
        The Services may reference or integrate third-party products or services. Your use of any third-party services is
        subject to their separate terms, and we are not responsible for third-party content, products, or practices.
      </p>
    )
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    content: (
      <p>
        UniDoxia facilitates connections between students, agents, and educational institutions but does not control
        admissions decisions and does not guarantee specific outcomes, offers, or timelines. The Services are provided on
        an “AS IS” and “AS AVAILABLE” basis without warranties of any kind, whether express, implied, or statutory,
        including without limitation warranties of merchantability, fitness for a particular purpose, and
        non-infringement.
      </p>
    )
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <p>
        To the maximum extent permitted by law, UniDoxia and its affiliates will not be liable for any indirect, incidental,
        special, consequential, exemplary, or punitive damages, or for any loss of profits, revenues, data, goodwill, or
        other intangible losses resulting from your use of or inability to use the Services.
      </p>
    )
  },
  {
    id: 'indemnity',
    title: 'Indemnification',
    content: (
      <p>
        You agree to defend, indemnify, and hold harmless UniDoxia, its affiliates, and their respective officers, directors,
        employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including
        reasonable legal fees, arising out of or in any way connected with your violation of these Terms or your misuse of
        the Services.
      </p>
    )
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <p>
        We may suspend or terminate your access to the Services at any time, with or without notice, for conduct that we
        believe violates these Terms or is otherwise harmful to other users, us, or third parties. You may stop using the
        Services at any time.
      </p>
    )
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    content: (
      <p>
        These Terms are governed by the laws of the jurisdiction in which UniDoxia is established, without regard to its
        conflicts of law principles. Where required, exclusive venue will lie in the competent courts of that
        jurisdiction.
      </p>
    )
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to These Terms',
    content: (
      <p>
        We may update these Terms from time to time. If we make material changes, we will provide notice by posting an
        updated version and adjusting the “Last updated” date. Your continued use of the Services after changes become
        effective constitutes acceptance of the revised Terms.
      </p>
    )
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <p>
        Questions about these Terms? Email{' '}
        <a className="text-primary" href="mailto:info@unidoxia.com">
          info@unidoxia.com
        </a>
        .
      </p>
    )
  }
];

const LegalTerms = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="Terms of Service - UniDoxia"
        description="Review the UniDoxia terms of service. Understand your rights and responsibilities when using our platform for university applications and student services."
        keywords="terms of service, legal terms, platform agreement, student agreement, university partnership terms"
      />
      <header className="border-b bg-background/60 backdrop-blur">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Legal</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Please review these terms carefully. Last updated {lastUpdated}.</p>
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
              Our Terms of Service explain the commitments we make to you as you explore, apply, and collaborate through the
              UniDoxia platform. They outline your responsibilities, describe how we operate our services,
              and highlight how we protect your information and experience.
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

            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LegalTerms;
