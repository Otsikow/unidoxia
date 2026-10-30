import { Link } from 'react-router-dom';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { publishedStudyGuides } from '@/lib/studyGuides.mjs';

export default function StudyUK() {
  const guides = publishedStudyGuides();
  const { data = [], isError } = useOptimizedQuery(['uk-universities'], async () => {
    const { data, error } = await supabase.from('universities').select('id,slug,name,city,description').eq('active', true).neq('listing_status', 'archived').eq('country', 'United Kingdom').order('name');
    if (error) throw error;
    return data;
  });
  return <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
    <SEO title="Study in the UK: Universities and Course Planning | UniDoxia" description="Explore listed UK universities and their courses. Plan your shortlist, compare entry requirements and prepare questions for a free study-abroad consultation." canonicalPath="/destinations/united-kingdom" />
    <h1 className="text-3xl md:text-4xl font-bold">Study in the UK</h1>
    <p>Start with the course you want to study, then compare locations, entry requirements and costs. UniDoxia's directory brings listed UK universities and their available course information together.</p>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Planning from Africa</h2><p>Check whether your qualifications meet each course’s requirements, and ask the university about acceptable English language evidence. Budget for tuition, living costs, travel and any application or visa fees. Verify current requirements with the university and <a className="text-primary underline" href="https://www.gov.uk/student-visa">UK government student visa guidance</a>.</p></section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Build your shortlist</h2><ol className="list-decimal pl-6 space-y-2"><li>Compare the course content, qualification, study mode and campus.</li><li>Check academic and English entry requirements against your background.</li><li>Review international tuition, scholarship conditions and future intakes using official sources.</li><li>Prepare questions about your choices before starting an application.</li></ol></section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Explore listed UK universities</h2><p>A directory listing does not by itself indicate a formal university partnership.</p>{isError && <p role="alert">We could not load the directory. Please try again.</p>}<ul className="space-y-4">{data.map(u => <li key={u.id}><Link className="text-primary underline font-semibold" to={`/universities/${u.slug || u.id}`}>{u.name}</Link>{u.city && <span> — {u.city}</span>}<p className="text-sm text-muted-foreground">{u.description}</p><Link className="text-primary underline text-sm" to={`/courses?university=${u.id}`}>Explore courses at {u.name}</Link></li>)}</ul></section>
    {guides.length > 0 && <section className="space-y-3"><h2 className="text-2xl font-semibold">Guides by country of origin</h2><ul className="list-disc pl-6">{guides.map(guide => <li key={guide.slug}><Link className="underline" to={`/study-guides/${guide.slug}`}>{guide.title}</Link></li>)}</ul></section>}
    <section className="rounded-xl border bg-muted/40 p-6 space-y-3"><h2 className="text-xl font-semibold">Prepare your next step</h2><p>Read <Link className="text-foreground underline" to="/faq">application and study-abroad questions</Link> and check <Link className="text-foreground underline" to="/scholarships">scholarship eligibility and deadlines</Link>. A consultation is free; review <Link className="text-foreground underline" to="/pricing">service pricing</Link> and confirm any university or government fees. Guidance does not guarantee admission, funding or a visa.</p><Link className="text-foreground underline" to="/free-consultation">Ask about your UK study plans</Link></section>
  </div>;
}
