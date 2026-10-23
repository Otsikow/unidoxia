import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { trackEnquiry } from '@/lib/enquiryAnalytics';

export default function FreeConsultation() {
  const [method, setMethod] = useState('email');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const started = useRef(false);
  const sending = useRef(false);
  const start = () => { if (!started.current) { started.current = true; trackEnquiry('enquiry_start'); } };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = new FormData(event.currentTarget);
    sending.current = true;
    setPending(true);
    setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke('submit-website-lead', { body: {
        enquiryType: 'initial', name: String(form.get('name')).trim(),
        [method === 'email' ? 'email' : 'phone']: String(form.get('contact')).trim(),
        preferredContact: method, preferredDestinations: [String(form.get('destination'))],
        additionalNotes: String(form.get('question') || '').trim(),
        consent: form.get('consent') === 'on', website: String(form.get('website') || ''),
        source: 'free_consultation', landingPage: '/free-consultation',
      } });
      if (failure || !data?.success || !data.reference_code) throw new Error('Submission failed');
      setReference(data.reference_code);
      trackEnquiry('enquiry_submit_success');
    } catch {
      setError('We could not save your enquiry. Your answers are still here. Please try again, or email info@unidoxia.com.');
    } finally { setPending(false); sending.current = false; }
  }

  return <div className="min-h-screen bg-gradient-subtle py-10">
    <SEO title="Free Study Abroad Consultation | UniDoxia" description="Ask UniDoxia about your study-abroad plans. Send a short enquiry with one contact method, your preferred destination and an optional question." canonicalPath="/free-consultation" />
    <div className="container mx-auto px-4 max-w-2xl space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold">Free study abroad consultation</h1>
      <p className="text-muted-foreground">Tell us where you would like to study and how to contact you. You can share academic and application details later.</p>
      <Card><CardContent className="pt-6">
        {reference ? <div role="status" className="space-y-4">
          <h2 className="text-xl font-semibold">We received your enquiry</h2>
          <p>Reference: {reference}. The admissions team will use your chosen contact method to discuss your plans and next steps.</p>
          <p>If you are ready to share more, <Link className="text-primary underline" to="/intake-form">complete the full student intake form</Link>.</p>
        </div> : <form onSubmit={submit} onFocus={start} className="space-y-5">
          <div><label htmlFor="enquiry-name">Your name</label><Input id="enquiry-name" name="name" autoComplete="name" required maxLength={160} /></div>
          <div><label htmlFor="enquiry-method">How should we contact you?</label><select id="enquiry-method" value={method} onChange={e => setMethod(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="email">Email</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option></select></div>
          <div><label htmlFor="enquiry-contact">{method === 'email' ? 'Email address' : 'Phone number (including country code)'}</label><Input key={method} id="enquiry-contact" name="contact" type={method === 'email' ? 'email' : 'tel'} autoComplete={method === 'email' ? 'email' : 'tel'} required minLength={method === 'email' ? undefined : 6} maxLength={method === 'email' ? 200 : 25} pattern={method === 'email' ? undefined : '[+0-9 ().\\-]{6,25}'} /></div>
          <div><label htmlFor="enquiry-destination">Preferred destination</label><select id="enquiry-destination" name="destination" required defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Select a destination</option>{['United Kingdom', 'Canada', 'United States', 'Australia', 'New Zealand', 'Ireland', 'Other', 'Not sure yet'].map(d => <option key={d}>{d}</option>)}</select></div>
          <div><label htmlFor="enquiry-question">Your question (optional)</label><Textarea id="enquiry-question" name="question" maxLength={1000} rows={4} /></div>
          <div className="hidden" aria-hidden="true"><label>Website<Input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="consent" required className="mt-1" /><span>I agree to UniDoxia using these details to respond to my enquiry. Read our <Link to="/legal/privacy" className="text-primary underline">privacy policy</Link>.</span></label>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">{pending ? 'Sending enquiry…' : 'Send enquiry'}</Button>
        </form>}
      </CardContent></Card>
      <section className="space-y-2"><h2 className="text-xl font-semibold">What happens next?</h2><p className="text-muted-foreground">Your enquiry is saved for the admissions team to follow up using your chosen contact method. We can then discuss your study plans and any further information needed. Submitting an enquiry does not submit a university application.</p></section>
      <p>Ready to provide your academic background? <Link to="/intake-form" className="text-primary underline">Use the full student intake form</Link>.</p>
    </div>
  </div>;
}
