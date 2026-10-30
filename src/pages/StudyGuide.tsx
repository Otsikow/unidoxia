import { Link, useParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { publishedStudyGuides, studyGuideBreadcrumb } from '@/lib/studyGuides.mjs';
import NotFound from './NotFound';

export default function StudyGuide() {
  const { slug } = useParams();
  const guide = publishedStudyGuides().find(item => item.slug === slug);
  if (!guide) return <NotFound />;
  const path = `/study-guides/${guide.slug}`;
  return <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
    <SEO title={`${guide.title} | UniDoxia`} description={guide.description} canonicalPath={path} jsonLd={studyGuideBreadcrumb(guide)} />
    <nav aria-label="Breadcrumb" className="text-sm"><Link className="underline" to="/">Home</Link> / <Link className="underline" to="/destinations/united-kingdom">Study in the UK</Link> / <span aria-current="page">{guide.title}</span></nav>
    <h1 className="text-3xl font-bold">{guide.title}</h1><p>{guide.description}</p>
    <p className="text-sm">Reviewed by {guide.reviewer}; source checked {guide.checkedAt}. Verify current requirements with the official sources before acting.</p>
    {guide.sections.map(section => <section key={section.heading} className="space-y-2"><h2 className="text-2xl font-semibold">{section.heading}</h2><p className="whitespace-pre-line">{section.body}</p></section>)}
    <section><h2 className="text-2xl font-semibold">Sources</h2><ul className="list-disc pl-6">{guide.sources.map(source => <li key={source.url}><a className="underline" href={source.url}>{source.label}</a></li>)}</ul></section>
    <p>Guidance does not guarantee admission, funding or a visa. Check university and government fees and <Link className="underline" to="/pricing">UniDoxia service pricing</Link>.</p>
    <p><Link className="underline" to="/destinations/united-kingdom">Explore UK universities</Link> or <Link className="underline" to="/free-consultation">ask about your study plans</Link>.</p>
  </div>;
}
