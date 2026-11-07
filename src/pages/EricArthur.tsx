import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { counsellorCredential } from "@/lib/homeEditorial.mjs";

export default function EricArthur() {
  return (
    <article className="mx-auto max-w-5xl px-2 py-6 sm:px-6">
      <SEO title={counsellorCredential.title} description={counsellorCredential.description} canonicalPath={counsellorCredential.path} />
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Individual professional training</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Eric Arthur</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">UK knowledge-trained leadership at UniDoxia</p>
      <div className="mt-10 grid gap-10 md:grid-cols-[280px_1fr] md:items-start">
        <div className="bg-white p-8">
          <img src="/credentials/eric-arthur-uk-knowledge-badge.jpg" width={500} height={500}
            alt="British Council and UK Agent Quality Framework: I am a UK knowledge trained counsellor" className="mx-auto h-auto w-full min-w-[150px] max-w-[240px]" />
        </div>
        <div className="space-y-5 leading-relaxed">
          <h2 className="text-2xl font-semibold">British Council UK knowledge training</h2>
          <p>{counsellorCredential.descriptor}</p>
          <dl className="space-y-3 text-sm">
            <div><dt className="font-semibold">Training certificate 114757</dt><dd>Valid until 16 July 2028.</dd></div>
            <div><dt className="font-semibold">Individual digital badge</dt><dd>Awarded 18 July 2026. Valid until 17 July 2028.</dd></div>
          </dl>
          <div className="flex flex-wrap gap-4 font-medium text-primary underline underline-offset-4">
            <a href="/credentials/eric-arthur-uk-knowledge-training-certificate.pdf">View Eric’s training certificate</a>
            <a href="/credentials/eric-arthur-uk-knowledge-badge.pdf">View Eric’s badge award</a>
          </div>
          <p className="text-sm text-muted-foreground">This training and badge belong to Eric Arthur as an individual. They do not mean that the British Council endorses, accredits or validates UniDoxia or its services.</p>
          <a className="inline-block text-sm text-primary underline underline-offset-4" href="https://www.britishcouncil.org/education/education-agents/training-agents">About the British Council training</a>
        </div>
      </div>
      <p className="mt-12"><Link className="text-primary underline underline-offset-4" to="/free-consultation">Discuss your study plans with UniDoxia</Link></p>
    </article>
  );
}
